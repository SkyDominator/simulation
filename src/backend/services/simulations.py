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
from datetime import datetime

logger = logging.getLogger(__name__)

# Supabase client factory (could be injected/mocked in tests)

def get_supabase_client() -> Client:
    # Prefer new Secret key (server-only). Fallback to legacy service/anon if not set.
    key = (
        settings.supabase_secret_key
        or settings.supabase_publishable_key
    )
    return create_client(settings.supabase_url, key)

def _parse_iso8601(ts: str) -> datetime:
    # Normalize 'Z' to '+00:00' for fromisoformat
    sanitized = ts.replace('Z', '+00:00')
    return datetime.fromisoformat(sanitized)

def _is_timestamp_older(actual: str | None, expected: str) -> bool:
    """Check if actual timestamp is older than expected. Returns True if older or None."""
    if actual is None:
        return True
    
    try:
        dt_expected = _parse_iso8601(str(expected))
        dt_actual = _parse_iso8601(str(actual))
        return dt_actual < dt_expected
    except ValueError:
        # Fall back to string comparison if parsing fails
        return str(actual) < str(expected)

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
            "starting_company_round": req.starting_company_round,
            "current_company_round": req.current_company_round,
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

        # Optional optimistic concurrency check using updated_at
        expected = getattr(req, "expected_updated_at", None)
        if expected is not None:
            actual = (row_data or {}).get("updated_at")
            if _is_timestamp_older(actual, expected):
                raise HTTPException(status_code=409, detail="Simulation data not up to date yet. Please retry.")

        # Always compute fresh results
        sched_map = scheduled_payment_from_investments(row.investments)
        sched_int = {int(k): v for k, v in sched_map.items()}
        # Convert sales achievement rates percent -> fraction for simulator override
        rates_percent = row.sales_achievement_rates or {}
        sales_rates_fraction = {int(k): (v / 100.0) for k, v in rates_percent.items()}
        simulator = FinancialSimulationService(plan_id=row.plan_id, scheduled_payment=sched_int, sales_achievement_rates=sales_rates_fraction)
        results = simulator.run_simulation(row.simulation_rounds).to_dict()

        # Best-effort persist
        try:
            upd = self.client.table("simulations").update({"simulation_results": results}).eq("id", req.simulation_id).execute()
            if not upd.data:
                logger.error("Failed to persist simulation results for %s", req.simulation_id)
        except Exception as e:
            logger.warning("Error persisting simulation results for %s: %s", req.simulation_id, e)

        return SimulationRunResponse(
            simulation_id=row.id,
            plan_id=row.plan_id,
            starting_company_round=row.starting_company_round,
            current_company_round=row.current_company_round,
            simulation_rounds=row.simulation_rounds,
            scheduled_payment=sched_map,
            sales_achievement_rates=row.sales_achievement_rates,
            history=results.get("history", []),
            message="Simulation completed",
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
            "starting_company_round": req.starting_company_round,
            "current_company_round": req.current_company_round,
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
            updated_at=upd.data[0].get("updated_at") if isinstance(upd.data, list) and upd.data else None,
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
        resp = self.client.table('simulations').select("id, starting_company_round, current_company_round, investments, sales_achievement_rates, simulation_rounds, created_at, updated_at, plan_id, memo").eq('user_id', user_id).execute()
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
