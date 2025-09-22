# Copilot project instructions

These notes help AI coding agents work effectively in this repo. Keep edits small, follow the patterns below, and verify with quick runs.

## Architecture at a glance
- Backend: FastAPI (`src/backend`) with a thin router layer (`api/routes.py`) delegating to services (`services/**`). Data access is via Supabase Python client; responses use Pydantic models in `models/schemas.py`.
- Auth: Bearer JWT validated against Supabase JWKS (`auth/jwt.py`); injection pattern: `user_id: str = Depends(authenticate_jwt_token)`.
- OTP: `services/otp/otp_service.py` writes to `phone_otps`, rate limits via settings, and sends SMS via Solapi. `/api/otp/send` first checks `whitelist` and returns `user_hash` when allowed; `/api/otp/verify` increments attempts and returns `remaining_attempts`.
- Simulations: `services/simulations.py` orchestrates DB IO and `FinancialSimulationService` (`simulation_service.py`). Updating a simulation clears `simulation_results`; running recomputes and persists results.
- Admin content: Notices and privacy policies live in `notices` and `privacy_policies` tables. Publishing a policy unpublishes all others.
- Frontend: React + Vite PWA (`src/frontend`). Supabase client reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. PWA caches GET `/api/notices` with NetworkFirst.

## Local dev & runtime
- Docker Compose drives the full stack (see `docker-compose.yml`). Containers clone this repo at startup via `/entrypoints/common-init.sh` using `REPO_URL` and an optional PAT in `.secrets/github_pat.txt`.
- Backend container runs `uvicorn main:app --reload` on 8000. Frontend runs Vite on 5173 and depends on backend health.
- Env: put backend `.env` in repo root for compose (keys below). Frontend `.env.local` is read by Vite at build/dev time.
- Windows helpers are under `windows-scripts/` (start/stop, NSSM services). VS Code task `frontend:dev` exists for dev server inside Docker.

Minimal commands (PowerShell):
- Start stack: `docker compose up -d`
- Tail backend logs: `docker compose logs -f backend`
- Run backend tests (locally): `cd src/backend; python -m pytest -q`

## Configuration keys (backend)
- Required: `SUPABASE_URL`, (`SUPABASE_SECRET_KEY` preferred) or `SUPABASE_PUBLISHABLE_KEY`.
- OTP: `OTP_VALIDITY_MINUTES`, `OTP_RESEND_LIMIT_PER_15MIN`, `OTP_RESEND_LIMIT_PER_DAY`, `OTP_SECRET_KEY`.
- SMS: `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER_NUMBER` (NHN keys also supported but legacy).
- CORS: `settings.cors_origins` default to local and prod domains; override if adding hosts.

## Backend patterns to follow
- Router->Service->Model: add endpoints in `api/routes.py`, keep logic in a service, and define request/response models in `models/schemas.py`.
- Supabase client: prefer Secret key; fallback to Publishable.
  ```python
  from supabase import create_client
  from config.settings import settings
  def _supabase_client():
      key = settings.supabase_secret_key or settings.supabase_publishable_key
      return create_client(settings.supabase_url, key)
  ```
- Auth guard for admin: use `_assert_admin(user_id, client)` which checks `admins.user_id`.
- Simulation update invalidation: when modifying plan fields, set `simulation_results` to `None` (see `SimulationService.update`).

## Adding an endpoint (example)
```python
from fastapi import APIRouter, Depends, HTTPException
from auth.jwt import authenticate_jwt_token
from models.schemas import MyReq, MyResp
router = APIRouter()

@router.post('/api/my-feature', response_model=MyResp)
async def my_feature(req: MyReq, user_id: str = Depends(authenticate_jwt_token)):
    # delegate to a service; raise HTTPException on errors
    return MyResp(...)
```
Place models in `models/schemas.py` and business logic in `services/`.

## Frontend integration notes
- API base: `VITE_API_BASE_URL` defaults to production in `vite.config.ts`. Set it for local dev, e.g., `http://localhost:8000/api`.
- Supabase client is created in `src/frontend/src/supabaseClient.ts` and persists sessions; JWTs come from Supabase auth.

## Gotchas
- JWKS fetch is networked; tests should mock `JWKSClient.get_keys()` to avoid real HTTP.
- OTP messages include Korean strings; keep success/remaining_attempts contract unchanged.
- `get_simulations` returns 404 if none; UI should handle empty state vs 404 accordingly.
- Privacy policy creation cannot set `published`; use `/api/admin/privacy-policies/{id}/publish` to toggle and auto-unpublish others.

## Where to look first
- API: `src/backend/api/routes.py`
- Core domain: `src/backend/services/simulations.py`, `src/backend/simulation_service.py`, `src/backend/constants.py`
- Auth: `src/backend/auth/jwt.py`
- Models: `src/backend/models/schemas.py`
- Frontend config: `src/frontend/vite.config.ts`, `src/frontend/src/supabaseClient.ts`

If anything above seems off or you need deeper conventions (e.g., testing/mocking patterns), ask in PR or ping to refine these notes.
