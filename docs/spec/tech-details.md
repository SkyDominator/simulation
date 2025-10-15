
# Technical Specification

This document outlines the technical details of the Investment Simulation PWA project, including architecture, technologies, patterns, and deployment.

## Architecture

**Backend (FastAPI + Python 3.11+)**:
- **Entry**: `main.py` → FastAPI app factory with CORS + exception handlers
- **Routes**: `api/routes.py` (507+ lines) → thin delegation to services
- **Services**: `services/` → domain logic (simulations, OTP)
- **Engine**: `simulation_service.py` → 10 investment plans
- **Models**: `models/schemas.py` → Pydantic v2 validation
- **Config**: `config/settings.py` → frozen dataclass pattern
- **Auth**: `auth/jwt.py` → Supabase JWKS validation
- **DB**: Supabase PostgreSQL + RLS
- **Errors**: `exceptions.py` → structured hierarchy

**Auth Flow**:
- JWT: Bearer token → Supabase JWKS
- Inject: `user_id: str = Depends(authenticate_jwt_token)`
- Admin: `_assert_admin(user_id, client)` → checks `admins.user_id`

**OTP**:
- Service: `services/otp/otp_service.py` → `phone_otps` table
- Limits: 3/15min, 10/day (configurable)
- SMS: Solapi API (Korean)
- Flow: `/api/otp/send` → whitelist check → `user_hash` → `/api/otp/verify`

**Simulations**:
- Orchestrator: `services/simulations.py` → DB I/O
- Plans: 10 types in `constants.py` (max investors: 12-18)
- Math: Revenue + commission (32%) + bonuses + tax (3.3%)
- Cache: Invalidate on update (`simulation_results` → `None`)

**Admin**:
- Notices: CRUD in `notices` table
- Policies: Versioned in `privacy_policies` + publish workflow

**Frontend (React 19 + TypeScript 5.8+ + Vite)**:
- **PWA**: `vite.config.ts` + `vite-plugin-pwa`
- **UI**: MUI + Tailwind CSS
- **Controller**: `AppController.tsx` → navigation + state
- **Auth**: Supabase client (`supabaseClient.ts`)
- **Browser Detection**: `utils/browserDetection.ts` → embedded browser detection
- **OAuth Protection**: `EmbeddedBrowserWarningModal.tsx` → warn users in embedded browsers
- **State**: Context + hooks, minimal localStorage
- **API**: Services layer with error handling
- **Cache**: NetworkFirst (notices), StaleWhileRevalidate (assets)
- **Design**: Mobile-first, landscape preferred

**Database (Supabase)**:
```
simulations        → user simulation data + JSON results
whitelist         → hash-based verification
phone_otps        → OTP records + rate limiting
consent_records   → privacy consent tracking
notices          → admin announcements
privacy_policies → versioned policies
admins          → admin roles
user_onboarding → onboarding flags
```

## Deployment & Runtime

**Production & Staging**:
- **Platform**: DigitalOcean Droplet (Ubuntu 22.04, 1 CPU, 1GB RAM)
- **Deployment**: Docker Compose via GitHub Actions CI/CD
- **Production**: `simulation.lightoflifeclub.com` (port 3000 frontend, 8000 backend)
- **Staging**: `staging-simulation.lightoflifeclub.com` (port 4173 frontend, 8001 backend)
- **Nginx**: Reverse proxy on port 8080 with host-based routing
- **Tunnel**: Cloudflare Tunnel for secure ingress
- **DB**: Supabase cloud

**Local Dev Environment**:
- **Frontend Dev**: Vite dev server (port 5173)
- **Backend Dev**: Uvicorn (port 8001)
- **Env vars**: Backend `.env`, Frontend `.env.local`
- **Docker**: Used for production builds and testing, not local dev

**Commands**:
```powershell
# Local Development
cd src/frontend
npm run dev  # :5173

cd src/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8001

# Tests
cd src/backend && python -m pytest -q
cd src/frontend && npm run test

# Production Build (Docker)
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d

# Staging Build (Docker)
docker compose -f docker-compose.staging.yml build
docker compose -f docker-compose.staging.yml up -d
```

## Configuration

**Backend Required**:
- `SUPABASE_URL`: Project URL
- `SUPABASE_SECRET_KEY` OR `SUPABASE_PUBLISHABLE_KEY`

**OTP/SMS**:
- `OTP_SECRET_KEY`: Encryption key
- `OTP_VALIDITY_MINUTES`: Default 5
- `OTP_RESEND_LIMIT_PER_15MIN`: Default 3
- `OTP_RESEND_LIMIT_PER_DAY`: Default 10
- `otp_max_verification_attempts`: Default 6 (lowercase!)

**SMS Providers**:
- Solapi: `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER_NUMBER`
- NHN (legacy): `NHN_CLOUD_APPKEY`, `NHN_CLOUD_SECRET_KEY`, `NHN_CLOUD_SENDER_NUMBER`

**CORS Origins**:
```
https://simulation.lightoflifeclub.com (production)
https://staging-simulation.lightoflifeclub.com (staging)
http://localhost:5173, http://127.0.0.1:5173 (local dev)
```

**Frontend**:
- `VITE_SUPABASE_URL`: Same as backend
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Client key
- `VITE_API_BASE_URL`: Defaults in `vite.config.ts`

## Backend Patterns

**Architecture**: Router → Service → Model

**Supabase Client**:
```python
from supabase import create_client
from config.settings import settings

def _supabase_client():
    key = settings.supabase_secret_key or settings.supabase_publishable_key
    return create_client(settings.supabase_url, key)
```

**Auth Pattern**:
```python
from auth.jwt import authenticate_jwt_token

async def my_endpoint(user_id: str = Depends(authenticate_jwt_token)):
    # user_id = validated JWT 'sub'
    pass
```

**Admin Guard**:
```python
_assert_admin(user_id, client)  # Checks admins.user_id table
```

**Error Codes**:
- 401: Invalid auth
- 403: Insufficient privileges

**Simulation Rules**:
- Update invalidates results: `simulation_results` → `None`
- Plans: See `constants.py` (A,B,C,D,E,F,G,K,P,R)

**DB Access**:
- Service-level clients or DI
- Wrap in try/catch → `handle_database_exception`
- Respect RLS policies

**Response Pattern**:
```python
# Success
return ResponseModel(data=result, status="success")

# Error
from exceptions import SimulationNotFoundError
if not simulation:
    raise SimulationNotFoundError(f"Simulation {id} not found")
```

## Adding Endpoints

```python
from fastapi import APIRouter, Depends, HTTPException
from auth.jwt import authenticate_jwt_token
from models.schemas import MyReq, MyResp

router = APIRouter()

@router.post('/api/my-feature', response_model=MyResp)
async def my_feature(req: MyReq, user_id: str = Depends(authenticate_jwt_token)):
    # Delegate to service
    # Raise HTTPException on errors
    return MyResp(...)
```

Models → `models/schemas.py`  
Logic → `services/`

## Frontend Integration

**API**:
- Base: `VITE_API_BASE_URL` → defaults in `vite.config.ts`
- Dev: Set to `http://localhost:8000/api`
- Auth: JWT via Authorization header

**Supabase**:
- Client: `src/frontend/src/supabaseClient.ts`
- Auto-refresh enabled
- Config: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

**State**:
- Controller: `AppController.tsx`
- Context: `useAuth()` hook
- Storage: Minimize localStorage use

**Browser Detection**:
- Utility: `utils/browserDetection.ts` → detects embedded browsers
- Modal: `components/EmbeddedBrowserWarningModal.tsx` → guides users to external browser
- Flow: Detect embedded → Warn before OAuth → Redirect to standard browser
- Supported: KakaoTalk, Facebook, Instagram, Twitter, Line, Naver webviews

**Structure**:
```
src/
├── pages/        # Routes
├── components/   # UI
├── context/      # Providers
├── hooks/        # Custom hooks
├── services/     # API layer
├── types/        # TypeScript
└── utils/        # Helpers
```

**PWA**:
- Worker: `vite-plugin-pwa`
- Cache: NetworkFirst `/api/notices`, StaleWhileRevalidate assets
- Manifest: "Light of Life Club Simulation"

## Gotchas

**Testing**:
- Mock `JWKSClient.get_keys()` → avoid real HTTP
- Backend needs env vars → use fixtures
- Integration: `src/backend/tests/integration/`
- Frontend: Vitest + RTL

**OTP/SMS**:
- Korean messages → maintain contract
- Rate limits: Service-level DB tracking
- Attempts: `otp_max_verification_attempts` (lowercase!)

**Simulations**:
- Empty: `get_simulations` → 404 if none exist
- Cache: Results in DB, auto-clear on update
- Math: Complex algorithm in `simulation_service.py`

**Admin/Privacy**:
- Create: Cannot set `published=true`
- Publish: Use `/api/admin/privacy-policies/{id}/publish`
- Auth: All admin endpoints need `_assert_admin()`

**Frontend Security**:
- No sensitive data in localStorage
- JWTs managed by Supabase client
- Implement error boundaries

**Embedded Browser Handling**:
- Detect before OAuth → Google blocks in embedded browsers (403 error)
- Show warning modal → guide users to open in external browser
- Test with KakaoTalk, Facebook, Instagram webviews
- Pattern: `isEmbeddedBrowser()` → `EmbeddedBrowserWarningModal` → `openInExternalBrowser()`

**Docker Compose Deploy**:
- Backend starts before frontend (healthcheck dependency)
- Production: 3000 (frontend), 8000 (backend)
- Staging: 4173 (frontend), 8001 (backend)
- Nginx on 8080 routes by hostname
- Cloudflare Tunnel for secure ingress
- GitHub Actions CI/CD with self-hosted runner

**Database**:
- RLS on all tables
- Schema: `.memo/CE/specs/schema/schema.md`
- Migrations: Consider existing data + RLS

**Development**:
- Local: Windows 11 with VS Code
- Ports: 5173 (frontend dev), 8001 (backend dev)
- Production: `simulation.lightoflifeclub.com` (DigitalOcean + Docker)
- Staging: `staging-simulation.lightoflifeclub.com` (DigitalOcean + Docker)

**API Contract**:
- Truth: `api/routes.py` > spec docs
- Some SSD endpoints not implemented
- Maintain backwards compatibility

## Key Files

**Docs**:
- SSD: `.github/copilot-instructions.md`
- Schema: `.memo/CE/specs/schema/schema.md`
- Tests: `docs/plans/test-code-v1/`

**Backend Core**:
- `api/routes.py` → All endpoints (507+ lines)
- `services/simulations.py` → CRUD ops
- `simulation_service.py` → Financial engine
- `constants.py` → 10 plan configs
- `auth/jwt.py` → JWT + JWKS
- `models/schemas.py` → Pydantic models
- `config/settings.py` → Environment
- `exceptions.py` → Error hierarchy

**Frontend Core**:
- `AppController.tsx` → Main orchestrator
- `vite.config.ts` → PWA + build config
- `supabaseClient.ts` → Auth + API
- `pages/` → WhitelistCheckPage, MainPage, etc.
- `context/` → React providers
- `services/` → API communication