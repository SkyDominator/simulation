"""API route registrations separated from application setup."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict
import hashlib

from auth.jwt import authenticate_jwt_token
from services.simulations import SimulationService
from models.schemas import (
    UserCheckRequest,
    SimulationCreateRequest, SimulationCreateResponse,
    SimulationRunRequest, SimulationRunResponse,
    SimulationUpdateRequest, SimulationUpdateResponse,
    SimulationDeleteRequest, SimulationDeleteResponse,
    SimulationMemoUpdateRequest, SimulationMemoUpdateResponse,
    NoticeListResponse, NoticeDetailResponse,
    NoticeCreateRequest, NoticeCreateResponse,
    NoticeUpdateRequest, NoticeUpdateResponse,
    NoticeDeleteResponse
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

@router.get("/api/notices", response_model=NoticeListResponse)
async def list_notices():
    client = create_client(settings.supabase_url, settings.supabase_service_key or settings.supabase_anon_key)
    # Expect a table 'notices' with columns: id (uuid), title (text), content (text), pinned (bool), published (bool), created_at, updated_at
    resp = client.table('notices').select('*').eq('published', True).order('pinned', desc=True).order('created_at', desc=True).execute()
    notices = resp.data or []
    return {"notices": notices, "success": True}

@router.get("/api/notices/{notice_id}", response_model=NoticeDetailResponse)
async def get_notice(notice_id: str):
    client = create_client(settings.supabase_url, settings.supabase_service_key or settings.supabase_anon_key)
    resp = client.table('notices').select('*').eq('id', notice_id).eq('published', True).limit(1).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Notice not found")
    return {"notice": resp.data[0], "success": True}


# ----------------------- Admin (protected) Notice CRUD -----------------------
def _assert_admin(user_id: str, client) -> None:
    """Authorize only if the user_id exists in the 'admins' table."""
    try:
        resp = client.table('admins').select('user_id').eq('user_id', user_id).limit(1).execute()
        if resp.data:
            return
    except Exception:
        # fall through to 403 if table lookup fails
        pass
    raise HTTPException(status_code=403, detail="Admin privileges required")

@router.get('/api/admin/me')
async def admin_me(user_id: str = Depends(authenticate_jwt_token)):
    client = create_client(settings.supabase_url, settings.supabase_service_key or settings.supabase_anon_key)
    _assert_admin(user_id, client)
    return {"is_admin": True, "success": True}

@router.post('/api/admin/notices', response_model=NoticeCreateResponse)
async def create_notice(req: NoticeCreateRequest, user_id: str = Depends(authenticate_jwt_token)):
    client = create_client(settings.supabase_url, settings.supabase_service_key or settings.supabase_anon_key)
    _assert_admin(user_id, client)
    payload = {
        'title': req.title.strip(),
        'content': req.content.strip(),
        'pinned': req.pinned,
        'published': req.published,
    }
    ins = client.table('notices').insert(payload).execute()
    if not ins.data:
        raise HTTPException(status_code=500, detail='Failed to create notice')
    return NoticeCreateResponse(id=ins.data[0]['id'], message='Notice created', success=True)

@router.patch('/api/admin/notices/{notice_id}', response_model=NoticeUpdateResponse)
async def update_notice(notice_id: str, req: NoticeUpdateRequest, user_id: str = Depends(authenticate_jwt_token)):
    client = create_client(settings.supabase_url, settings.supabase_service_key or settings.supabase_anon_key)
    _assert_admin(user_id, client)
    update_fields = {k: v for k, v in req.model_dump().items() if v is not None}
    if 'title' in update_fields:
        update_fields['title'] = update_fields['title'].strip()
    if 'content' in update_fields:
        update_fields['content'] = update_fields['content'].strip()
    if not update_fields:
        raise HTTPException(status_code=400, detail='No fields to update')
    upd = client.table('notices').update(update_fields).eq('id', notice_id).execute()
    if not upd.data:
        raise HTTPException(status_code=404, detail='Notice not found')
    return NoticeUpdateResponse(id=notice_id, message='Notice updated', success=True)

@router.delete('/api/admin/notices/{notice_id}', response_model=NoticeDeleteResponse)
async def delete_notice(notice_id: str, user_id: str = Depends(authenticate_jwt_token)):
    client = create_client(settings.supabase_url, settings.supabase_service_key or settings.supabase_anon_key)
    _assert_admin(user_id, client)
    del_resp = client.table('notices').delete().eq('id', notice_id).execute()
    if not del_resp.data:
        raise HTTPException(status_code=404, detail='Notice not found')
    return NoticeDeleteResponse(id=notice_id, message='Notice deleted', success=True)

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

@router.post("/api/simulation/run", response_model=SimulationRunResponse)
async def run_simulation(request: SimulationRunRequest, user_id: str = Depends(authenticate_jwt_token)):
    return _sim_service.run(request, user_id)

@router.patch("/api/simulations/{simulation_id}", response_model=SimulationUpdateResponse)
async def update_simulation(simulation_id: str, request: SimulationUpdateRequest, user_id: str = Depends(authenticate_jwt_token)):
    return _sim_service.update(simulation_id, request, user_id)

@router.patch("/api/simulations/{simulation_id}/memo", response_model=SimulationMemoUpdateResponse)
async def update_simulation_memo(simulation_id: str, request: SimulationMemoUpdateRequest, user_id: str = Depends(authenticate_jwt_token)):
    return _sim_service.update_memo(simulation_id, request, user_id)

@router.delete("/api/simulations/{simulation_id}", response_model=SimulationDeleteResponse)
async def delete_simulation(simulation_id: str, user_id: str = Depends(authenticate_jwt_token)):
    return _sim_service.delete(simulation_id, user_id)

@router.post("/api/simulation/delete", response_model=SimulationDeleteResponse)
async def delete_simulation_post(request: SimulationDeleteRequest, user_id: str = Depends(authenticate_jwt_token)):
    return _sim_service.delete(request.simulation_id, user_id)
