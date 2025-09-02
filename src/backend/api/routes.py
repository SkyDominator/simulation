"""API route registrations separated from application setup."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Request
import hashlib
from datetime import datetime

from auth.jwt import authenticate_jwt_token
from services.simulations import SimulationService
from services.otp.otp_service import OTPService
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
    NoticeDeleteResponse,
    ConsentRecordRequest, ConsentRecordResponse,
    OTPSendRequest, OTPVerifyRequest, OTPSendResponse, OTPVerifyResponse
)
from supabase import create_client
from config.settings import settings
from time import perf_counter

router = APIRouter()


def _supabase_client():
    """Create Supabase client preferring new Secret/Publishable keys.
    Falls back to legacy envs when not provided.
    """
    key = (
        settings.supabase_secret_key
        or settings.supabase_publishable_key
    )
    return create_client(settings.supabase_url, key)

# instantiate services lazily (could use dependency injection)
_sim_service = SimulationService()

@router.get("/")
async def root():
    return {"message": "Investment Simulator API is running"}

@router.post("/api/verify-user")
async def verify_user(request: UserCheckRequest):
    combined_string = f"{request.name}-{request.phone_number}"
    hashed_value = hashlib.sha256(combined_string.encode('utf-8')).hexdigest()
    client = _supabase_client()
    response = client.table('whitelist').select("user_hash").eq('user_hash', hashed_value).execute()
    if response.data:
        # Return the user_hash in the response for use in consent verification
        return {"is_whitelisted": True, "user_hash": hashed_value}
    return {"is_whitelisted": False, "detail": "가입 허용 명단에 없는 사용자입니다."}

@router.post("/api/otp/send", response_model=OTPSendResponse)
async def send_otp(request: OTPSendRequest, client_request: Request):
    """Send OTP to the provided phone number after whitelist check."""
    # First perform the whitelist check
    normalized_phone = request.phone_number.replace(" ", "").replace("-", "")
    
    # Hash the name and phone number for whitelist check
    combined_string = f"{request.name}-{normalized_phone}"
    hashed_value = hashlib.sha256(combined_string.encode('utf-8')).hexdigest()
    
    # Check if user is whitelisted
    _otp_service = OTPService(db_client=_supabase_client())
    response = _otp_service.db_client.table('whitelist').select("user_hash").eq('user_hash', hashed_value).execute()
    
    if not response.data:
        return {"success": False, "message": "가입 허용 명단에 없는 사용자입니다."}
    
    # User is whitelisted, proceed with OTP
    result = _otp_service.request_otp(
        normalized_phone, 
        client_ip=str(client_request.client.host),
        user_agent=client_request.headers.get("user-agent")
    )
    
    # Include the user_hash in success response for later verification
    if result["success"]:
        result["user_hash"] = hashed_value
    return result

@router.post("/api/otp/verify", response_model=OTPVerifyResponse)
async def verify_otp(request: OTPVerifyRequest, client_request: Request):
    """Verify OTP code for a phone number."""
    _otp_service = OTPService(db_client=_supabase_client())
    result = _otp_service.verify_otp(
        request.phone_number,
        request.otp_code,
        client_ip=str(client_request.client.host)
    )
    return result

@router.get("/api/notices", response_model=NoticeListResponse)
async def list_notices():
    client = _supabase_client()
    # Expect a table 'notices' with columns: id (uuid), title (text), content (text), pinned (bool), published (bool), created_at, updated_at
    resp = client.table('notices').select('*').eq('published', True).order('pinned', desc=True).order('created_at', desc=True).execute()
    notices = resp.data or []
    return {"notices": notices, "success": True}

@router.get("/api/notices/{notice_id}", response_model=NoticeDetailResponse)
async def get_notice(notice_id: str):
    client = _supabase_client()
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
    client = _supabase_client()
    _assert_admin(user_id, client)
    return {"is_admin": True, "success": True}

@router.post('/api/admin/notices', response_model=NoticeCreateResponse)
async def create_notice(req: NoticeCreateRequest, user_id: str = Depends(authenticate_jwt_token)):
    client = _supabase_client()
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
    client = _supabase_client()
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
    client = _supabase_client()
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


@router.get("/api/health")
async def health():
    """Readiness probe with dependency checks (e.g., Supabase)."""
    supabase_ok = False
    latency_ms = None
    error_msg = None
    try:
        start = perf_counter()
        client = _supabase_client()
        client.table("notices").select("id").limit(1).execute()
        latency_ms = round((perf_counter() - start) * 1000, 2)
        supabase_ok = True
    except Exception as exc:
        error_msg = str(exc)

    status = "ok" if supabase_ok else "degraded"
    return {
        "status": status,
        "services": {
            "supabase": {
                "ok": supabase_ok,
                "latency_ms": latency_ms,
                "error": error_msg,
            }
        },
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

# ------------------------------- Consent management routes -------------------------------
@router.post("/api/consents", response_model=ConsentRecordResponse)
async def record_consent(
    request: ConsentRecordRequest,
    client_request: Request = None
):
    """
    Record a user's consent to data collection and privacy policy.
    
    This creates a permanent record of when and what the user consented to.
    Links the consent to the user's hash from the whitelist.
    """
    client = _supabase_client()
    
    # Verify user_hash exists in whitelist first
    whitelist_check = client.table('whitelist').select("user_hash").eq('user_hash', request.user_hash).execute()
    if not whitelist_check.data:
        raise HTTPException(status_code=404, detail="User not found in whitelist")
    
    # Get client IP if not provided (through headers or direct connection)
    ip_address = request.ip_address
    if not ip_address and client_request and client_request.client:
        ip_address = client_request.client.host
    
    consent_data = {
        "user_hash": request.user_hash,
        "consent_type": request.consent_type,
        "consent_version": request.consent_version,
        "consent_given_at": datetime.now().isoformat(),
        "ip_address": ip_address,
        "user_agent": request.user_agent
    }
    
    # Use upsert to handle case where consent already exists for this user_hash
    response = client.table('consent_records').upsert(consent_data).execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to record consent")
    
    result = response.data[0]
    return ConsentRecordResponse(
        user_hash=request.user_hash,
        consent_type=request.consent_type,
        consent_version=request.consent_version,
        consent_given_at=result["consent_given_at"],
        ip_address=result["ip_address"],
        user_agent=result["user_agent"]
    )

@router.get("/api/consents/{user_hash}")
async def get_user_consents(user_hash: str):
    """
    Get all consent records for a whitelisted user by their user_hash.
    No authentication required since this is used pre-login.
    """
    client = _supabase_client()
    
    # First verify the user_hash exists in whitelist
    whitelist_check = client.table('whitelist').select("user_hash").eq('user_hash', user_hash).execute()
    if not whitelist_check.data:
        raise HTTPException(status_code=404, detail="User not found in whitelist")
    
    # Then get consent records
    response = client.table('consent_records').select("*").eq('user_hash', user_hash).execute()
    
    return {
        "consents": response.data or [],
        "success": True
    }

@router.get("/api/privacy-policy")
async def get_privacy_policy():
    """Get the current privacy policy document."""
    # For simplicity, we're returning a static policy here
    # In a production environment, you might want to store this in the database
    # or fetch it from a CMS
    return {
    "version": "1.1",
    "last_updated": "2025-09-02",
        "content": """
# 개인정보처리방침

## 1. 수집하는 개인정보 항목

본 애플리케이션은 다음과 같은 개인정보를 수집합니다:
- 소셜 로그인 계정을 통한 이메일 주소
- 소셜 로그인 계정 이름 또는 닉네임
- 사용자 계정에 연결된 신원 확인 정보

## 2. 개인정보의 수집 및 이용목적

수집한 개인정보는 다음의 목적을 위해 활용됩니다:
- 사용자 식별 및 본인 확인
- 서비스 이용 기록 관리
- 서비스 개선 및 맞춤형 서비스 제공

## 3. 개인정보의 보유 및 이용기간

개인정보는 사용자가 서비스를 이용하는 기간 동안에만 보유합니다. 사용자가 계정 삭제를 요청할 경우, 관련 개인정보는 지체 없이 파기됩니다.

## 4. 개인정보의 제3자 제공

본 애플리케이션은 사용자의 개인정보를 제3자에게 제공하지 않습니다.

## 5. 사용자의 권리

사용자는 언제든지 자신의 개인정보에 대해 접근, 수정, 삭제를 요청할 수 있습니다.

## 6. 관리자 접근 및 이용자 요청에 따른 데이터 수정

본 애플리케이션은 원활한 고객 지원과 서비스 품질 유지를 위해, 다음의 조건에서 일부 관리자 계정의 제한적 접근을 허용합니다:

- 접근 대상: 이용자의 시뮬레이션 데이터 전반(플랜, 입력값, 실행 결과 포함)
- 접근/수정 조건: "이용자의 명시적 요청"이 있는 경우에 한함
- 이용 목적: 오류 수정, 요청 기반 데이터 복구·정정, 기술 지원
- 법적 근거: 이용자의 동의(요청) 및 정당한 이익(서비스 개선)
- 기록 관리: 관리자 접근 및 수정 이력(담당자, 시간, 변경 내용)을 내부적으로 기록·보관합니다.
- 제3자 제공 아님: 위 접근은 내부 권한 범위 내에서만 수행되며, 제3자에게 제공되지 않습니다.

이용자는 언제든지 이러한 접근·수정에 대한 내역 확인을 요청할 수 있으며, 필요 시 접근 제한을 요청할 수 있습니다.
        """,
        "success": True
    }