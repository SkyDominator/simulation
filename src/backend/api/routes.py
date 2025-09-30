"""API route registrations separated from application setup."""
from __future__ import annotations
from fastapi import APIRouter, Depends, Request
import hashlib
from datetime import datetime, timezone
from pathlib import Path

from auth.jwt import authenticate_jwt_token
from container import get_service
from services.simulations import SimulationService
from services.otp.otp_service import OTPService
from interfaces import DatabaseClient
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
    OTPSendRequest, OTPVerifyRequest, OTPSendResponse, OTPVerifyResponse,
    PrivacyPolicyCreateRequest, PrivacyPolicyCreateResponse,
    PrivacyPolicyUpdateRequest, PrivacyPolicyUpdateResponse,
    PrivacyPolicyPublishResponse,
    PrivacyPolicyListResponse, PrivacyPolicyDetailResponse,
)
from supabase import create_client
from config.settings import settings
from time import perf_counter
from exceptions import (
    NoticeNotFoundError, PrivacyPolicyNotFoundError, AdminPrivilegesRequiredError,
    NoFieldsToUpdateError, PublishingConstraintError, WhitelistError,
    DatabaseError, InvalidDataError, SimulationNotFoundError, ResourceNotFoundError,
    InternalServerError, handle_database_exception
)

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

# Remove global service instances - use dependency injection instead

@router.get("/")
async def root():
    return {"message": "Investment Simulator API is running"}

@router.post("/api/otp/send", response_model=OTPSendResponse)
async def send_otp(request: OTPSendRequest, client_request: Request):
    """Send OTP to the provided phone number after whitelist check."""
    # First perform the whitelist check
    normalized_phone = request.phone_number.replace(" ", "").replace("-", "")
    
    # Hash the name and phone number for whitelist check
    combined_string = f"{request.name}-{normalized_phone}"
    hashed_value = hashlib.sha256(combined_string.encode('utf-8')).hexdigest()
    
    # Check if user is whitelisted
    db_client = get_service(DatabaseClient)
    response = db_client.table('whitelist').select("user_hash").eq('user_hash', hashed_value).execute()
    
    if not response.data:
        raise WhitelistError()
    
    # User is whitelisted, proceed with OTP
    otp_service = get_service(OTPService)
    result = otp_service.request_otp(
        normalized_phone, 
        client_ip=str(client_request.client.host) if client_request.client else "unknown",
        user_agent=client_request.headers.get("user-agent")
    )
    
    # Include the user_hash in success response for later verification
    if result["success"]:
        result["user_hash"] = hashed_value
    return result

@router.post("/api/otp/verify", response_model=OTPVerifyResponse)
async def verify_otp(request: OTPVerifyRequest, client_request: Request):
    """Verify OTP code for a phone number."""
    otp_service = get_service(OTPService)
    result = otp_service.verify_otp(
        request.phone_number,
        request.otp_code,
        client_ip=str(client_request.client.host) if client_request.client else "unknown"
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
        raise NoticeNotFoundError(notice_id)
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
    raise AdminPrivilegesRequiredError()

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
        raise DatabaseError("insert", "notices")
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
        raise NoFieldsToUpdateError()
    upd = client.table('notices').update(update_fields).eq('id', notice_id).execute()
    if not upd.data:
        raise NoticeNotFoundError(notice_id)
    return NoticeUpdateResponse(id=notice_id, message='Notice updated', success=True)

@router.delete('/api/admin/notices/{notice_id}', response_model=NoticeDeleteResponse)
async def delete_notice(notice_id: str, user_id: str = Depends(authenticate_jwt_token)):
    client = _supabase_client()
    _assert_admin(user_id, client)
    del_resp = client.table('notices').delete().eq('id', notice_id).execute()
    if not del_resp.data:
        raise NoticeNotFoundError(notice_id)
    return NoticeDeleteResponse(id=notice_id, message='Notice deleted', success=True)

# ----------------------- Admin (protected) Privacy Policy CRUD -----------------------
@router.post('/api/admin/privacy-policies', response_model=PrivacyPolicyCreateResponse)
async def create_privacy_policy(req: PrivacyPolicyCreateRequest, user_id: str = Depends(authenticate_jwt_token)):
    client = _supabase_client()
    _assert_admin(user_id, client)
    # Enforce centralized publishing via publish endpoint only
    if req.published:
        raise PublishingConstraintError()
    # Normalize date fields to ISO strings for JSON serialization
    effective_iso = req.effective_date.isoformat() if req.effective_date else None
    last_updated_date = req.last_updated or req.effective_date or datetime.now(timezone.utc).date()
    last_updated_iso = last_updated_date.isoformat()
    payload = {
        'version': req.version.strip(),
        'content': req.content,
        'locale': (req.locale or 'ko-KR').strip() or 'ko-KR',
        'published': False,  # new policies are created as unpublished
        'effective_date': effective_iso,
        'last_updated': last_updated_iso,
        'created_by': user_id,
    }
    try:
        ins = client.table('privacy_policies').insert(payload).execute()
        if not ins.data:
            raise DatabaseError("insert", "privacy_policies")
    except Exception as e:
        if isinstance(e, DatabaseError):
            raise
        handle_database_exception(e, "insert", "privacy_policies")
    return PrivacyPolicyCreateResponse(id=ins.data[0]['id'], message='Policy created', success=True)

@router.patch('/api/admin/privacy-policies/{policy_id}', response_model=PrivacyPolicyUpdateResponse)
async def update_privacy_policy(policy_id: str, req: PrivacyPolicyUpdateRequest, user_id: str = Depends(authenticate_jwt_token)):
    client = _supabase_client()
    _assert_admin(user_id, client)
    update_fields = {k: v for k, v in req.model_dump().items() if v is not None}
    # Enforce centralized publishing via publish endpoint only
    if 'published' in update_fields:
        if req.published:
            raise PublishingConstraintError('Publishing state cannot be changed here; use the publish endpoint')
    if 'version' in update_fields:
        update_fields['version'] = str(update_fields['version']).strip()
    if 'locale' in update_fields and update_fields['locale']:
        update_fields['locale'] = str(update_fields['locale']).strip() or 'ko-KR'
    if 'content' in update_fields and update_fields['content'] is not None:
        # leave as-is; content may include leading/trailing whitespace intentionally
        pass
    # Normalize any date fields to ISO strings
    if 'effective_date' in update_fields and update_fields['effective_date'] is not None:
        try:
            update_fields['effective_date'] = update_fields['effective_date'].isoformat()
        except AttributeError:
            # if already a string, leave it
            pass
    if 'last_updated' in update_fields and update_fields['last_updated'] is not None:
        try:
            update_fields['last_updated'] = update_fields['last_updated'].isoformat()
        except AttributeError:
            pass
    if not update_fields:
        raise NoFieldsToUpdateError()
    try:
        upd = client.table('privacy_policies').update(update_fields).eq('id', policy_id).execute()
        if not upd.data:
            raise PrivacyPolicyNotFoundError(policy_id)
    except Exception as e:
        if isinstance(e, PrivacyPolicyNotFoundError):
            raise
        handle_database_exception(e, "update", "privacy_policies")
    return PrivacyPolicyUpdateResponse(id=policy_id, message='Policy updated', success=True)

@router.delete('/api/admin/privacy-policies/{policy_id}', response_model=PrivacyPolicyUpdateResponse)
async def delete_privacy_policy(policy_id: str, user_id: str = Depends(authenticate_jwt_token)):
    client = _supabase_client()
    _assert_admin(user_id, client)
    try:
        del_resp = client.table('privacy_policies').delete().eq('id', policy_id).execute()
        if not del_resp.data:
            raise PrivacyPolicyNotFoundError(policy_id)
    except Exception as e:
        if isinstance(e, PrivacyPolicyNotFoundError):
            raise
        handle_database_exception(e, "delete", "privacy_policies")
    return PrivacyPolicyUpdateResponse(id=policy_id, message='Policy deleted', success=True)

@router.post('/api/admin/privacy-policies/{policy_id}/publish', response_model=PrivacyPolicyPublishResponse)
async def publish_privacy_policy(policy_id: str, user_id: str = Depends(authenticate_jwt_token)):
    """Publish the specified policy and unpublish all others so only one is active at a time."""
    client = _supabase_client()
    _assert_admin(user_id, client)
    try:
        # Unpublish all other policies first
        try:
            client.table('privacy_policies').update({'published': False}).neq('id', policy_id).eq('published', True).execute()
        except Exception:
            # Continue even if this fails; we still attempt to publish the target policy
            pass
        # Publish this policy
        upd = client.table('privacy_policies').update({'published': True}).eq('id', policy_id).execute()
        if not upd.data:
            raise PrivacyPolicyNotFoundError(policy_id)
    except Exception as e:
        if isinstance(e, PrivacyPolicyNotFoundError):
            raise
        handle_database_exception(e, "update", "privacy_policies")
    return PrivacyPolicyPublishResponse(id=policy_id, message='Policy published', success=True)

@router.get('/api/admin/privacy-policies', response_model=PrivacyPolicyListResponse)
async def list_privacy_policies(user_id: str = Depends(authenticate_jwt_token)):
    client = _supabase_client()
    _assert_admin(user_id, client)
    resp = (
        client
        .table('privacy_policies')
        .select('*')
        .order('effective_date', desc=True)
        .order('updated_at', desc=True)
        .execute()
    )
    return {"policies": resp.data or [], "success": True}

@router.get('/api/admin/privacy-policies/{policy_id}', response_model=PrivacyPolicyDetailResponse)
async def get_privacy_policy_admin(policy_id: str, user_id: str = Depends(authenticate_jwt_token)):
    client = _supabase_client()
    _assert_admin(user_id, client)
    resp = client.table('privacy_policies').select('*').eq('id', policy_id).limit(1).execute()
    if not resp.data:
        raise PrivacyPolicyNotFoundError(policy_id)
    return {"policy": resp.data[0], "success": True}

@router.get("/api/simulations")
async def get_simulations(user_id: str = Depends(authenticate_jwt_token)):
    sim_service = get_service(SimulationService)
    return sim_service.list_for_user(user_id)

@router.get("/api/simulations/{simulation_id}")
async def get_simulation_details(simulation_id: str, user_id: str = Depends(authenticate_jwt_token)):
    db_client = get_service(DatabaseClient)
    response = db_client.table('simulations').select("*").eq('id', simulation_id).eq('user_id', user_id).execute()
    if not response.data:
        raise SimulationNotFoundError(simulation_id)
    return response.data[0]

@router.post("/api/simulation/create", response_model=SimulationCreateResponse)
async def create_simulation(request: SimulationCreateRequest, user_id: str = Depends(authenticate_jwt_token)):
    sim_service = get_service(SimulationService)
    return sim_service.create(request, user_id)

@router.post("/api/simulation/run", response_model=SimulationRunResponse)
async def run_simulation(request: SimulationRunRequest, user_id: str = Depends(authenticate_jwt_token)):
    sim_service = get_service(SimulationService)
    return sim_service.run(request, user_id)

@router.patch("/api/simulations/{simulation_id}", response_model=SimulationUpdateResponse)
async def update_simulation(simulation_id: str, request: SimulationUpdateRequest, user_id: str = Depends(authenticate_jwt_token)):
    sim_service = get_service(SimulationService)
    return sim_service.update(simulation_id, request, user_id)

@router.patch("/api/simulations/{simulation_id}/memo", response_model=SimulationMemoUpdateResponse)
async def update_simulation_memo(simulation_id: str, request: SimulationMemoUpdateRequest, user_id: str = Depends(authenticate_jwt_token)):
    sim_service = get_service(SimulationService)
    return sim_service.update_memo(simulation_id, request, user_id)

@router.delete("/api/simulations/{simulation_id}", response_model=SimulationDeleteResponse)
async def delete_simulation(simulation_id: str, user_id: str = Depends(authenticate_jwt_token)):
    sim_service = get_service(SimulationService)
    return sim_service.delete(simulation_id, user_id)

@router.post("/api/simulation/delete", response_model=SimulationDeleteResponse)
async def delete_simulation_post(request: SimulationDeleteRequest, user_id: str = Depends(authenticate_jwt_token)):
    sim_service = get_service(SimulationService)
    return sim_service.delete(request.simulation_id, user_id)


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
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }

# ------------------------------- Consent management routes -------------------------------
@router.post("/api/consents", response_model=ConsentRecordResponse)
async def record_consent(
    request: ConsentRecordRequest,
    client_request: Request
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
        raise WhitelistError()
    
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
        raise DatabaseError("upsert", "consent_records")
    
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
        raise WhitelistError()
    
    # Then get consent records
    response = client.table('consent_records').select("*").eq('user_hash', user_hash).execute()
    
    return {
        "consents": response.data or [],
        "success": True
    }

@router.get("/api/privacy-policy")
async def get_privacy_policy(version: str | None = None, locale: str | None = None):
    """Get the current privacy policy document.

    Tries DB (privacy_policies) first with optional version/locale; falls back to static content.
    """
    DEFAULT_LOCALE = (locale or "ko-KR").strip() or "ko-KR"
    client = _supabase_client()

    try:
        query = client.table("privacy_policies").select("version, locale, content, last_updated, effective_date")
        if version:
            query = query.eq("version", version).eq("locale", DEFAULT_LOCALE).limit(1)
        else:
            query = (
                query
                .eq("published", True)
                .eq("locale", DEFAULT_LOCALE)
                .order("effective_date", desc=True)
                .order("updated_at", desc=True)
                .limit(1)
            )
        resp = query.execute()
        if resp.data:
            row = resp.data[0]
            return {
                "version": row.get("version"),
                "last_updated": row.get("last_updated") or row.get("effective_date"),
                "content": row.get("content", ""),
                "success": True,
                "source": "db",
            }
    except Exception:
        # Swallow DB errors and fall back to static below
        pass

    # Static file fallback (docs/privacy-policy-ko.md)
    try:
        project_root = Path(__file__).resolve().parents[3]
        md_path = project_root / "docs" / "privacy-policy-ko.md"
        content = md_path.read_text(encoding="utf-8")
        # Derive last_updated from file mtime
        last_updated = datetime.fromtimestamp(md_path.stat().st_mtime, tz=timezone.utc).date().isoformat()
        return {
            "version": "1.1",
            "last_updated": last_updated,
            "content": content,
            "success": True,
            "source": "static-file",
        }
    except FileNotFoundError as e:
        settings.logger.error(f"Privacy policy file not found: {e}")
        raise ResourceNotFoundError(
            "Privacy policy document",
            error_context={"detail": "Please contact support."}
        )
    except PermissionError as e:
        settings.logger.error(f"Permission denied accessing privacy policy: {e}")
        raise InternalServerError(
            detail="Unable to access privacy policy. Please try again later.",
            error_code="FILE_ACCESS_ERROR"
        )
    except Exception as e:
        settings.logger.error(f"Unexpected error loading privacy policy: {e}", exc_info=True)
        raise InternalServerError(
            detail="An error occurred while loading the privacy policy. Please try again later.",
            error_code="PRIVACY_POLICY_LOAD_ERROR"
        )
