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
    # Per company round sales achievement rates provided by user (percentage 50-100)
    sales_achievement_rates: Dict[str, int] | None = None

class SimulationCreateResponse(BaseModel):
    simulation_id: str
    plan_id: str
    message: str
    success: bool

class SimulationRunRequest(BaseModel):
    simulation_id: str

class SimulationRunResponse(BaseModel):
    simulation_id: str
    plan_id: str
    company_round: int
    simulation_rounds: int
    scheduled_payment: Dict[str, int]
    # Echo back sales achievement rates actually used (percent form) for transparency
    sales_achievement_rates: Dict[str, int] | None = None
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
    sales_achievement_rates: Dict[str, int] | None = None

class SimulationUpdateResponse(BaseModel):
    simulation_id: str
    plan_id: str
    message: str
    success: bool

class SimulationMemoUpdateRequest(BaseModel):
    memo: Optional[str] = None

class SimulationMemoUpdateResponse(BaseModel):
    simulation_id: str
    memo: Optional[str] = None
    message: str
    success: bool

class Notice(BaseModel):
    id: str
    title: str
    content: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    pinned: Optional[bool] = False
    published: Optional[bool] = True
    model_config = ConfigDict(extra='allow')

class NoticeListResponse(BaseModel):
    notices: List[Notice]
    success: bool = True

class NoticeDetailResponse(BaseModel):
    notice: Notice
    success: bool = True

class NoticeCreateRequest(BaseModel):
    title: str
    content: str
    pinned: bool = False
    published: bool = True

class NoticeCreateResponse(BaseModel):
    id: str
    message: str
    success: bool

class NoticeUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    
# Consent related schemas
class ConsentRecordRequest(BaseModel):
    user_hash: str  # Hash from whitelist table
    consent_type: str  # e.g., 'privacy_policy', 'terms_of_service'
    consent_version: str  # e.g., '1.0'
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class ConsentRecordResponse(BaseModel):
    user_hash: str
    consent_type: str
    consent_version: str
    consent_given_at: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class NoticeUpdateResponse(BaseModel):
    id: str
    message: str
    success: bool

class NoticeDeleteResponse(BaseModel):
    id: str
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
    # New normalized column: mapping of round(str)->percent (50-100)
    sales_achievement_rates: Optional[Dict[str, int]] = None
    simulation_results: Optional[Dict[str, Any]] = None
    memo: Optional[str] = None
    model_config = ConfigDict(extra='allow')

# Utility pure functions
from typing import Iterable

def scheduled_payment_from_investments(investments: Iterable[InvestmentItem]) -> Dict[str, int]:
    return {str(item.round): int(item.amount) for item in investments}
