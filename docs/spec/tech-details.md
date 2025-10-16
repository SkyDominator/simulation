
# Technical Specification

This document outlines implementation patterns, configuration, deployment procedures, and developer guidelines for the Investment Simulation PWA.

## Architecture

**Backend (FastAPI + Python 3.11+)**:

```
src/backend/
├── main.py                 # FastAPI app factory with CORS + exception handlers
├── api/routes.py           # All API endpoints (507+ lines) - thin delegation layer
├── services/               # Domain logic layer
│   ├── simulations.py      # Simulation CRUD operations
│   ├── otp/otp_service.py  # OTP send/verify + rate limiting
│   └── ...
├── simulation_service.py   # Financial engine for 10 investment plans
├── models/schemas.py       # Pydantic v2 request/response models
├── config/settings.py      # Environment configuration (frozen dataclass)
├── auth/jwt.py             # Supabase JWKS validation
├── exceptions.py           # Custom exception hierarchy
└── constants.py            # Plan configurations (A,B,C,D,E,F,G,K,P,R)
```

**Backend Core**:
- `api/routes.py` → All endpoints (507+ lines)
- `services/simulations.py` → CRUD ops
- `simulation_service.py` → Financial engine
- `constants.py` → 10 plan configs
- `auth/jwt.py` → JWT + JWKS
- `models/schemas.py` → Pydantic models
- `config/settings.py` → Environment
- `exceptions.py` → Error hierarchy


**OTP Service Flow**:

1. `/api/otp/send` → whitelist check → generate code → SMS via Solapi → store hashed code
2. Rate limits: 3 sends per 15min, 10 per day (configurable via env vars)
3. `/api/otp/verify` → compare hashed code → max 6 attempts → mark used

**Simulation Cache Invalidation**:

- Update operations set `simulation_results` → `None`
- Re-run required to regenerate results

$PLACEHOLDER$

**Frontend (React 19 + TypeScript 5.8+ + Vite)**:

```
src/frontend/src/
├── pages/                    # Route-level components
├── components/               # Reusable UI with domain folders
├── context/                  # React Context providers
├── hooks/                    # Custom business logic hooks
├── services/                 # API communication layer
├── types/                    # TypeScript definitions
├── utils/                    # Pure utility functions
├── AppController.tsx         # Main navigation + state orchestrator
├── supabaseClient.ts         # Supabase client with autoRefresh
└── vite.config.ts            # PWA config + build settings
```

**Frontend Core**:
- `AppController.tsx` → Main orchestrator
- `vite.config.ts` → PWA + build config
- `supabaseClient.ts` → Auth + API
- `pages/` → WhitelistCheckPage, MainPage, etc.
- `context/` → React providers
- `services/` → API communication

$PLACEHOLDER$

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

## Backend Implementation Patterns

**Supabase Client Factory**:

```python
from supabase import create_client
from config.settings import settings

def _supabase_client():
    key = settings.supabase_secret_key or settings.supabase_publishable_key
    return create_client(settings.supabase_url, key)
```

**Response Patterns**:

```python
# Success response
return ResponseModel(data=result, status="success")

# Error handling
from exceptions import SimulationNotFoundError
if not simulation:
    raise SimulationNotFoundError(f"Simulation {id} not found")
```

**Auth Flow Implementation**:

```python
# JWT validation with dependency injection
from auth.jwt import authenticate_jwt_token

async def my_endpoint(user_id: str = Depends(authenticate_jwt_token)):
    # user_id extracted from validated JWT 'sub' claim
    pass
```

**Admin Guard Pattern**:

```python
# Check admin privileges
_assert_admin(user_id, client)  # Checks admins.user_id table, raises 403 if not admin
```

**Database Access Guidelines**:

- Use service-level clients with dependency injection
- Wrap operations in try/catch → `handle_database_exception`
- Respect RLS policies configured in Supabase
- Simulation updates invalidate results: `simulation_results` → `None`

**Adding Endpoints**:

Models → `models/schemas.py`  
Logic → `services/`

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


## Frontend Implementation Patterns

**Browser Detection Pattern**:

```typescript
// utils/browserDetection.ts
export const isEmbeddedBrowser = () => {
  // Detects KakaoTalk, Facebook, Instagram, etc.
};

// components/EmbeddedBrowserWarningModal.tsx
// Shows warning before OAuth → guides to external browser
```

## Backend-Frontend Integration

$PLACEHOLDER$




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

