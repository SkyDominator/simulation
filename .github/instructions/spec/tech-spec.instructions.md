---
applyTo: "/src/backend/**/*.py, /src/frontend/**/*.tsx, /src/frontend/**/*.ts, /src/frontend/**/*.js, /docs/plans/**/*.md"
---

## Technical Specification

Keep edits small. Follow patterns. Verify with quick runs.

### Architecture

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

### Local Dev & Runtime

**Production**:
- Frontend: Vite preview on Windows (port 4173)
- Backend: Native Windows + uvicorn (port 8000)
- Access: Cloudflare Tunnel → `https://simulation.lightoflifeclub.com`
- DB: Supabase cloud

**Dev Environment**:
- Docker: Available but NOT used for deployment
- Env vars: Backend `.env`, Frontend `.env.local`
- Scripts: `windows-scripts/` PowerShell automation

**Commands**:
```powershell
# Frontend preview
cd src/frontend
npm run preview  # :4173

# Backend dev
cd src/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Tests
cd src/backend && python -m pytest -q
cd src/frontend && npm run test
```

### Configuration

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
https://simulation.lightoflifeclub.com
http://localhost:5173, http://127.0.0.1:5173
http://localhost:4173, http://127.0.0.1:4173
+ Local network IPs
```

**Frontend**:
- `VITE_SUPABASE_URL`: Same as backend
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Client key
- `VITE_API_BASE_URL`: Defaults in `vite.config.ts`

### Backend Patterns

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

### Adding Endpoints

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

### Frontend Integration

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

### Gotchas

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

**Windows Deploy**:
- Backend starts before frontend
- Ports: 4173 (frontend), 8000 (backend)
- Cloudflare Tunnel required

**Database**:
- RLS on all tables
- Schema: `.memo/CE/specs/schema/schema.md`
- Migrations: Consider existing data + RLS

**Development**:
- Windows optimized
- Ports: 5173 (dev), 4173 (preview), 8000 (backend)
- Production: `simulation.lightoflifeclub.com`

**API Contract**:
- Truth: `api/routes.py` > spec docs
- Some SSD endpoints not implemented
- Maintain backwards compatibility

### Key Files

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

Ask in PR for clarifications.