"""API route registrations separated from application setup."""
from __future__ import annotations
from fastapi import APIRouter, Depends
from typing import Dict
import hashlib

from auth.jwt import authenticate_jwt_token
from services.simulations import SimulationService
from models.schemas import (
    UserCheckRequest,
    SimulationCreateRequest, SimulationCreateResponse,
    SimulationRunRequest, SimulationResponse,
    SimulationUpdateRequest, SimulationUpdateResponse,
    SimulationDeleteRequest, SimulationDeleteResponse,
)
from supabase import create_client
from config.settings import settings

router = APIRouter()

# instantiate service lazily (could use dependency injection)
_sim_service = SimulationService()

@router.get("/")
async def root():
    return {"message": "Investment Simulator API is running"}

@router.post("/api/verify-user")
async def verify_user(request: UserCheckRequest):
    combined_string = f"{request.name}-{request.phone_number}"
    hashed_value = hashlib.sha256(combined_string.encode('utf-8')).hexdigest()
    client = create_client(settings.supabase_url, settings.supabase_service_key or settings.supabase_anon_key)
    response = client.table('whitelist').select("user_hash").eq('user_hash', hashed_value).execute()
    if response.data:
        return {"is_whitelisted": True}
    return {"is_whitelisted": False, "detail": "User not in whitelist"}

@router.get("/api/simulations")
async def get_simulations(user_id: str = Depends(authenticate_jwt_token)):
    return _sim_service.list_for_user(user_id)

@router.get("/api/simulations/{simulation_id}")
async def get_simulation_details(simulation_id: str, user_id: str = Depends(authenticate_jwt_token)):
    client = _sim_service.client
    response = client.table('simulations').select("*").eq('id', simulation_id).eq('user_id', user_id).execute()
    if not response.data:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Simulation with ID {simulation_id} not found")
    return response.data[0]

@router.post("/api/simulation/create", response_model=SimulationCreateResponse)
async def create_simulation(request: SimulationCreateRequest, user_id: str = Depends(authenticate_jwt_token)):
    return _sim_service.create(request, user_id)

@router.post("/api/simulation/run", response_model=SimulationResponse)
async def run_simulation(request: SimulationRunRequest, user_id: str = Depends(authenticate_jwt_token)):
    return _sim_service.run(request, user_id)

@router.patch("/api/simulations/{simulation_id}", response_model=SimulationUpdateResponse)
async def update_simulation(simulation_id: str, request: SimulationUpdateRequest, user_id: str = Depends(authenticate_jwt_token)):
    return _sim_service.update(simulation_id, request, user_id)

@router.delete("/api/simulations/{simulation_id}", response_model=SimulationDeleteResponse)
async def delete_simulation(simulation_id: str, user_id: str = Depends(authenticate_jwt_token)):
    return _sim_service.delete(simulation_id, user_id)

@router.post("/api/simulation/delete", response_model=SimulationDeleteResponse)
async def delete_simulation_post(request: SimulationDeleteRequest, user_id: str = Depends(authenticate_jwt_token)):
    return _sim_service.delete(request.simulation_id, user_id)
