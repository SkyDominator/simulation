"""Pydantic models and domain schemas."""
from __future__ import annotations
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, ConfigDict

class UserCheckRequest(BaseModel):
    name: str
    phone_number: str

class SimulationCreateRequest(BaseModel):
    plan_id: str
    company_round: int
    simulation_rounds: int
    scheduled_payment: Dict[str, int]

class SimulationCreateResponse(BaseModel):
    simulation_id: str
    plan_id: str
    message: str
    success: bool

class SimulationRunRequest(BaseModel):
    simulation_id: str

class SimulationResponse(BaseModel):
    simulation_id: str
    plan_id: str
    company_round: int
    simulation_rounds: int
    scheduled_payment: Dict[str, int]
    history: List[Dict[str, Any]]
    message: str
    success: bool

class SimulationDeleteRequest(BaseModel):
    simulation_id: str

class SimulationDeleteResponse(BaseModel):
    simulation_id: str
    message: str
    success: bool

class SimulationUpdateRequest(BaseModel):
    plan_id: str
    company_round: int
    simulation_rounds: int
    scheduled_payment: Dict[str, int]

class SimulationUpdateResponse(BaseModel):
    simulation_id: str
    plan_id: str
    message: str
    success: bool

class InvestmentItem(BaseModel):
    round: int
    amount: int

class SimulationRow(BaseModel):
    id: str
    user_id: str
    plan_id: str
    company_round: int
    simulation_rounds: int
    investments: List[InvestmentItem] = []
    simulation_results: Optional[Dict[str, Any]] = None
    model_config = ConfigDict(extra='allow')

# Utility pure functions
from typing import Iterable

def scheduled_payment_from_investments(investments: Iterable[InvestmentItem]) -> Dict[str, int]:
    return {str(item.round): int(item.amount) for item in investments}
