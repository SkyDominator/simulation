"""Simulation DB interaction and orchestration service."""
from __future__ import annotations
import logging
from typing import Dict, Any
from supabase import Client, create_client

from config.settings import settings
from models.schemas import (
    SimulationCreateRequest, SimulationCreateResponse,
    SimulationRunRequest, SimulationRunResponse,
    SimulationUpdateRequest, SimulationUpdateResponse,
    SimulationDeleteRequest, SimulationDeleteResponse,
    SimulationMemoUpdateRequest, SimulationMemoUpdateResponse,
    SimulationRow, scheduled_payment_from_investments,
)
from constants import PLAN_PARAMETERS
from simulation_service import FinancialSimulationService
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Supabase client factory (could be injected/mocked in tests)

def get_supabase_client() -> Client:
    service_key = settings.supabase_service_key or settings.supabase_anon_key
    return create_client(settings.supabase_url, service_key)

class SimulationService:
    def __init__(self, client: Client | None = None) -> None:
        self.client = client or get_supabase_client()

    def create(self, req: SimulationCreateRequest, user_id: str) -> SimulationCreateResponse:
        if req.plan_id not in PLAN_PARAMETERS:
            raise HTTPException(status_code=400, detail=f"Invalid plan type: {req.plan_id}")
        # Build investments list (only round & amount) now that sales_achievement_rates is normalized
        investments = [{"round": int(r), "amount": amt} for r, amt in req.scheduled_payment.items()]

        plan_data = {
            "user_id": user_id,
            "plan_id": req.plan_id,
            "company_round": req.company_round,
            "simulation_rounds": req.simulation_rounds,
            "investments": investments,
            "sales_achievement_rates": req.sales_achievement_rates,
        }
        db_response = self.client.table("simulations").insert(plan_data).execute()
        if not db_response or not db_response.data:
            logger.error("Failed to save plan: %s", db_response)
            raise HTTPException(status_code=500, detail="Failed to save plan to database")
        created = db_response.data[0]
        return SimulationCreateResponse(
            simulation_id=created['id'],
            plan_id=req.plan_id,
            message="Simulation request saved successfully",
            success=True,
        )

    def run(self, req: SimulationRunRequest, user_id: str) -> SimulationRunResponse:
        db_response = self.client.table("simulations").select("*").eq("id", req.simulation_id).eq("user_id", user_id).execute()
        if not db_response.data:
            raise HTTPException(status_code=404, detail=f"Plan with ID {req.simulation_id} not found")
        row_data = db_response.data[0]
        row = SimulationRow.model_validate(row_data)
        sched_map = scheduled_payment_from_investments(row.investments)
        if row.simulation_results:
            res_dict = row.simulation_results or {}
            return SimulationRunResponse(
                simulation_id=row.id,
                plan_id=row.plan_id,
                company_round=row.company_round,
                simulation_rounds=row.simulation_rounds,
                scheduled_payment=sched_map,
                sales_achievement_rates=row.sales_achievement_rates,
                history=res_dict.get("history", []),
                message="Retrieved existing simulation results",
                success=True,
            )
        sched_int = {int(k): v for k, v in sched_map.items()}
        # Convert sales achievement rates percent -> fraction for simulator override
        sales_rates_fraction = {int(k): (v / 100.0) for k, v in row.sales_achievement_rates.items()}
        simulator = FinancialSimulationService(plan_id=row.plan_id, scheduled_payment=sched_int, sales_achievement_rates=sales_rates_fraction)
        results = simulator.run_simulation(row.simulation_rounds).to_dict()
        upd = self.client.table("simulations").update({"simulation_results": results}).eq("id", req.simulation_id).execute()
        if not upd.data:
            logger.error("Failed to persist simulation results for %s", req.simulation_id)
        return SimulationRunResponse(
            simulation_id=row.id,
            plan_id=row.plan_id,
            company_round=row.company_round,
            simulation_rounds=row.simulation_rounds,
            scheduled_payment=sched_map,
            sales_achievement_rates=row.sales_achievement_rates,
            history=results.get("history", []),
            message="Simulation completed and results saved",
            success=True,
        )

    def update(self, simulation_id: str, req: SimulationUpdateRequest, user_id: str) -> SimulationUpdateResponse:
        if req.plan_id not in PLAN_PARAMETERS:
            raise HTTPException(status_code=400, detail=f"Invalid plan type: {req.plan_id}")
        existing = self.client.table("simulations").select("id").eq("id", simulation_id).eq("user_id", user_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail=f"Simulation with ID {simulation_id} not found")
        investments = [{"round": int(r), "amount": amt} for r, amt in req.scheduled_payment.items()]
        payload = {
            "plan_id": req.plan_id,
            "company_round": req.company_round,
            "simulation_rounds": req.simulation_rounds,
            "investments": investments,
            "sales_achievement_rates": req.sales_achievement_rates,
            "simulation_results": None,
        }
        upd = self.client.table("simulations").update(payload).eq("id", simulation_id).eq("user_id", user_id).execute()
        if not upd.data:
            raise HTTPException(status_code=500, detail="Failed to update simulation")
        return SimulationUpdateResponse(
            simulation_id=simulation_id,
            plan_id=req.plan_id,
            message="Simulation updated successfully (previous results invalidated)",
            success=True,
        )

    def delete(self, simulation_id: str, user_id: str) -> SimulationDeleteResponse:
        check = self.client.table("simulations").select("id").eq("id", simulation_id).eq("user_id", user_id).execute()
        if not check.data:
            raise HTTPException(status_code=404, detail=f"Simulation with ID {simulation_id} not found")
        _ = self.client.table("simulations").delete().eq("id", simulation_id).eq("user_id", user_id).execute()
        return SimulationDeleteResponse(
            simulation_id=simulation_id,
            message="Simulation deleted",
            success=True,
        )

    def list_for_user(self, user_id: str):  # return raw supabase rows for now
        resp = self.client.table('simulations').select("id, company_round, investments, sales_achievement_rates, simulation_rounds, created_at, updated_at, plan_id, memo").eq('user_id', user_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="No simulations found for this user")
        return resp.data

    def update_memo(self, simulation_id: str, req: SimulationMemoUpdateRequest, user_id: str) -> SimulationMemoUpdateResponse:
        # Ensure the simulation exists and belongs to user
        existing = self.client.table("simulations").select("id").eq("id", simulation_id).eq("user_id", user_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail=f"Simulation with ID {simulation_id} not found")
        upd = self.client.table("simulations").update({"memo": (req.memo or '').strip() if req.memo is not None else None}).eq("id", simulation_id).eq("user_id", user_id).execute()
        if not upd.data:
            raise HTTPException(status_code=500, detail="Failed to update memo")
        return SimulationMemoUpdateResponse(
            simulation_id=simulation_id,
            memo=upd.data[0].get('memo'),
            message="Memo updated successfully",
            success=True,
        )
