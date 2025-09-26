## Project details

These notes help AI coding agents work effectively in this repo. Keep edits small, follow the patterns below, and verify with quick runs.

### Architecture at a glance

**Backend (FastAPI + Python 3.11+)**:
- **Application Factory**: `main.py` creates FastAPI app with CORS middleware and exception handlers
- **Router Layer**: `api/routes.py` (507+ lines) - centralized route definitions with thin delegation to services
- **Service Layer**: Domain logic in `services/` - `simulations.py` (simulation CRUD), `otp/otp_service.py` (SMS verification)
- **Core Engine**: `simulation_service.py` - sophisticated financial simulation with 10 investment plans
- **Data Models**: Pydantic schemas in `models/schemas.py` for request/response validation
- **Configuration**: Environment-based settings in `config/settings.py` with frozen dataclass pattern
- **Authentication**: JWT validation via Supabase JWKS in `auth/jwt.py`
- **Database**: Supabase PostgreSQL with Row Level Security (RLS) policies
- **Exception Handling**: Structured error hierarchy in `exceptions.py` with centralized handlers

**Authentication & Authorization**:
- Bearer JWT validated against Supabase JWKS (`auth/jwt.py`)
- Injection pattern: `user_id: str = Depends(authenticate_jwt_token)`
- Admin privileges check: `_assert_admin(user_id, client)` verifies `admins.user_id`

**OTP System**:
- Service: `services/otp/otp_service.py` writes to `phone_otps` table
- Rate limiting: Configurable via settings (3 per 15min, 10 per day by default)
- SMS delivery: Solapi API integration with Korean language support
- Flow: `/api/otp/send` checks `whitelist` → returns `user_hash` → `/api/otp/verify` validates and tracks attempts

**Financial Simulations**:
- Orchestration: `services/simulations.py` handles DB I/O and delegates to `FinancialSimulationService`
- Plans: 10 investment plans in `constants.py` with distinct parameters (max investors: 12-18, varying payment structures)
- Calculation: Revenue algorithm includes base calculation, commission rates (32%), round bonuses, tax (3.3%)
- Lifecycle: New investors → growth phase → graduation → re-entry investor replacement
- Caching: Simulation result invalidation on plan updates (sets `simulation_results` to `None`)

**Admin Content Management**:
- Notices: CRUD operations in `notices` table with admin-only endpoints
- Privacy Policies: Versioned in `privacy_policies` table with publishing workflow (unpublishes others on publish)

**Frontend (React 19 + TypeScript 5.8+ + Vite)**:
- **PWA Configuration**: `vite.config.ts` with `vite-plugin-pwa`, service worker, offline caching
- **UI Framework**: Material-UI (MUI) + Tailwind CSS for responsive design
- **Application Controller**: `AppController.tsx` manages page navigation and state persistence
- **Authentication**: Supabase client integration (`supabaseClient.ts`) with JWT session management
- **State Management**: React Context + hooks pattern, minimal localStorage usage
- **API Integration**: Services layer for backend communication with proper error handling
- **Caching Strategy**: NetworkFirst for notices, StaleWhileRevalidate for static assets
- **Responsive Design**: Mobile-first approach with landscape orientation preference

**Database Schema (Supabase PostgreSQL)**:
```
- simulations: User simulation data with JSON results and metadata
- whitelist: Pre-approved users (hash-based verification) 
- phone_otps: OTP verification records with rate limiting
- consent_records: Privacy policy consent tracking (IP, user agent, timestamps)
- notices: Admin-managed announcements with CRUD
- privacy_policies: Versioned policy documents with publishing status
- admins: Administrative user roles (user_id references)
- user_onboarding: Onboarding flags tied to Supabase user_id
```

### Local dev & runtime

**Current Deployment Architecture**:
- **Frontend**: Served via Vite preview on Windows laptop server (default port 4173)
- **Backend**: Runs locally on Windows via helper scripts in `windows-scripts/` or directly with `uvicorn` (default port 8000)
- **Public Access**: Frontend accessible via Cloudflare Tunnel at `https://simulation.lightoflifeclub.com`
- **Database**: Hosted on Supabase cloud (PostgreSQL, Auth, Storage)

**Development Environment**:
- **Docker Compose**: Available for full-stack development but NOT actively used for deployment
- **Environment Variables**: 
  - Backend: `.env` in repository root (configuration keys below)
  - Frontend: `.env.local` read by Vite at build/preview time
- **Windows Automation**: PowerShell scripts in `windows-scripts/` for service management with optional NSSM services

**Quick Start Commands (PowerShell)**:
```powershell
# Frontend preview (production-like)
cd src/frontend
npm run preview  # Default: http://localhost:4173

# Backend development server  
cd src/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Backend tests
cd src/backend
python -m pytest -q

# Frontend development
cd src/frontend  
npm run dev      # Default: http://localhost:5173
npm run test     # Vitest unit tests
```

**Docker Development (Optional)**:
- Containers available but not used for production deployment
- Services clone repo at startup via `/entrypoints/common-init.sh`
- Requires `REPO_URL` env variable and optional GitHub PAT in `.secrets/github_pat.txt`

### Configuration keys (backend)

**Required Environment Variables**:
- `SUPABASE_URL`: Supabase project URL (e.g., `https://xyz.supabase.co`)
- `SUPABASE_SECRET_KEY`: Server-side key (preferred) OR `SUPABASE_PUBLISHABLE_KEY` (fallback)

**OTP & SMS Configuration**:
- `OTP_SECRET_KEY`: Encryption key for OTP tokens (default: development key - replace in production)
- `OTP_VALIDITY_MINUTES`: OTP expiration time (default: 5 minutes)
- `OTP_RESEND_LIMIT_PER_15MIN`: Rate limit for OTP requests (default: 3)
- `OTP_RESEND_LIMIT_PER_DAY`: Daily OTP request limit (default: 10)  
- `otp_max_verification_attempts`: Maximum verification attempts (default: 6, lowercase in settings)

**SMS Provider Keys**:
- **Solapi** (Primary): `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER_NUMBER`
- **NHN Cloud** (Legacy): `NHN_CLOUD_APPKEY`, `NHN_CLOUD_SECRET_KEY`, `NHN_CLOUD_SENDER_NUMBER`

**CORS Configuration**:
- `settings.cors_origins`: Auto-configured for local development and production domains
- Default origins include:
  ```
  https://simulation.lightoflifeclub.com  # Production (Cloudflare Tunnel)
  http://localhost:5173, http://127.0.0.1:5173  # Vite dev server
  http://localhost:4173, http://127.0.0.1:4173  # Vite preview
  Local network IPs for development
  ```

**Frontend Environment Variables**:
- `VITE_SUPABASE_URL`: Supabase project URL (same as backend)
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Client-side Supabase key
- `VITE_API_BASE_URL`: Backend API base URL (defaults to production in `vite.config.ts`)

### Backend patterns to follow

**Router → Service → Model Architecture**:
- **Routes**: Add endpoints in `api/routes.py`, keep thin and delegate to services
- **Services**: Business logic in `services/` directory (domain-specific modules)
- **Models**: Request/response schemas in `models/schemas.py` using Pydantic v2
- **Error Handling**: Use custom exceptions from `exceptions.py` and raise `HTTPException` with appropriate status codes

**Supabase Client Pattern**:
```python
from supabase import create_client
from config.settings import settings

def _supabase_client():
    """Create Supabase client preferring Secret key, fallback to Publishable."""
    key = settings.supabase_secret_key or settings.supabase_publishable_key
    return create_client(settings.supabase_url, key)
```

**Authentication & Authorization**:
- **JWT Validation**: Use dependency injection pattern
  ```python
  from auth.jwt import authenticate_jwt_token
  
  async def my_endpoint(user_id: str = Depends(authenticate_jwt_token)):
      # user_id is validated JWT 'sub' field
      pass
  ```
- **Admin Guard**: Use `_assert_admin(user_id, client)` which checks `admins.user_id` table
- **Error Responses**: 401 for invalid auth, 403 for insufficient privileges

**Simulation Business Rules**:
- **Result Invalidation**: When modifying plan fields, set `simulation_results` to `None`
- **Plan Parameters**: Reference `constants.py` for the 10 investment plans (A, B, C, D, E, F, G, K, P, R)
- **Service Integration**: `SimulationService.update()` pattern shows result cache clearing

**Database Access Patterns**:
- **Client Creation**: Use service-level client instances or dependency injection
- **Error Handling**: Wrap Supabase operations in try/catch, use `handle_database_exception`
- **RLS Policies**: All tables protected by Row Level Security - respect user isolation

**API Response Patterns**:
```python
# Standard success responses
return ResponseModel(data=result, status="success")

# Error handling
from exceptions import SimulationNotFoundError
if not simulation:
    raise SimulationNotFoundError(f"Simulation {id} not found")
```

**Configuration & Environment**:
- **Settings Access**: Import from `config.settings import settings` 
- **Frozen Dataclass**: Settings uses immutable pattern with `__post_init__` customization
- **Environment Loading**: Automatic via `os.getenv()` with sensible defaults


### Adding an endpoint (example)

```python
from fastapi import APIRouter, Depends, HTTPException
from auth.jwt import authenticate_jwt_token
from models.schemas import MyReq, MyResp
router = APIRouter()

@router.post('/api/my-feature', response_model=MyResp)
async def my_feature(req: MyReq, user_id: str = Depends(authenticate_jwt_token)):
    ## delegate to a service; raise HTTPException on errors
    return MyResp(...)
```

Place models in `models/schemas.py` and business logic in `services/`.

### Frontend integration notes

**API Communication**:
- **Base URL**: `VITE_API_BASE_URL` defaults to `https://simulation.lightoflifeclub.com/api` in `vite.config.ts`
- **Local Development**: Set to `http://localhost:8000/api` for local backend testing
- **Authentication**: JWTs obtained from Supabase Auth and sent via Authorization header

**Supabase Integration**:
- **Client Setup**: Created in `src/frontend/src/supabaseClient.ts` with session persistence
- **Auto-refresh**: Sessions automatically renewed, JWTs available for backend API calls
- **Configuration**: Reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`

**State Management Architecture**:
- **Application Controller**: `AppController.tsx` orchestrates page navigation and state
- **Context Pattern**: Authentication context with `useAuth()` hook
- **Persistence**: Selective use of localStorage/sessionStorage (minimize for security)
- **API State**: Services layer handles backend communication with proper error boundaries

**Component Structure**:
```
src/
├── pages/           # Route components (WhitelistCheckPage, MainPage, etc.)
├── components/      # Reusable UI components  
├── context/         # React context providers (Auth, etc.)
├── hooks/           # Custom hooks (useAuth, useConsentFlow, etc.)
├── services/        # API communication layer
├── types/           # TypeScript type definitions
└── utils/           # Utility functions and helpers
```

**PWA Features**:
- **Service Worker**: Automated via `vite-plugin-pwa` with runtime caching
- **Offline Strategy**: NetworkFirst for `/api/notices`, StaleWhileRevalidate for assets
- **Manifest**: Configured for "Light of Life Club Simulation" with proper icons
- **Installation**: Custom prompts and native "Add to Home Screen" support

### Gotchas & Important Implementation Details

**Testing & Mocking**:
- **JWKS Network Calls**: Tests should mock `JWKSClient.get_keys()` to avoid real HTTP requests
- **Test Environment**: Backend requires environment variables; use test fixtures and mocks

**OTP & SMS Integration**:
- **Korean Language**: OTP messages include Korean strings - maintain existing contract
- **Rate Limiting**: Enforced at service level with database tracking
- **Verification Attempts**: Default 6 attempts via `otp_max_verification_attempts` (lowercase in `settings.py`)

**Simulation Behavior**:
- **Empty State**: `get_simulations` returns 404 when no simulations exist - UI handles empty vs 404
- **Result Caching**: Simulation results cached in database; cleared automatically on plan updates
- **Financial Calculations**: Complex revenue algorithm in `simulation_service.py` with multiple plan types

**Admin & Privacy Policy Management**:
- **Publishing Constraint**: Creating privacy policy cannot set `published=true`  
- **Publishing Workflow**: Use `/api/admin/privacy-policies/{id}/publish` to publish (auto-unpublishes others)
- **Admin Authentication**: All admin endpoints require `_assert_admin()` check

**Frontend Security & State**:
- **Minimal Local Storage**: Avoid storing sensitive data; prefer backend API calls
- **JWT Handling**: Tokens managed by Supabase client, not manually stored
- **Error Boundaries**: Implement proper error handling for failed API calls

**Database & Schema**:
- **RLS Policies**: All tables protected by Row Level Security - respect user isolation
- **Schema Documentation**: Full schema available in `.memo/CE/specs/schema/schema.md`
- **Migration Pattern**: Schema changes should consider existing data and RLS policies

**Development Environment**:
- **Windows Primary**: Development optimized for Windows with PowerShell scripts
- **Port Configuration**: Frontend dev (5173), frontend preview (4173), backend (8000)
- **Cloudflare Tunnel**: Production frontend served via tunnel at `simulation.lightoflifeclub.com`

**API Contract Alignment**:
- **Source of Truth**: `api/routes.py` is authoritative over specification documents  
- **Endpoint Coverage**: Some SSD-described endpoints may not be implemented yet
- **Backwards Compatibility**: Maintain existing API contracts for stability

### Where to look first

**Core Documentation**:
- **Software Specification Document**: `.memo/CE/specs/SSD.md` - software specification document
- **Database Schema**: `.memo/CE/specs/schema/schema.md` - complete table definitions and RLS policies
- **Test Plans**: `.memo/CE/plans/test-code-v1/` - comprehensive testing strategy and implementation

**Core Backend Files**:
- **API Endpoints**: `src/backend/api/routes.py` (507+ lines) - all REST endpoints
- **Business Logic**: `src/backend/services/simulations.py` - simulation CRUD operations  
- **Financial Engine**: `src/backend/simulation_service.py` - core calculation logic
- **Plan Configuration**: `src/backend/constants.py` - 10 investment plan parameters
- **Authentication**: `src/backend/auth/jwt.py` - JWT validation and Supabase JWKS
- **Data Models**: `src/backend/models/schemas.py` - Pydantic request/response models
- **Configuration**: `src/backend/config/settings.py` - environment and app settings
- **Error Handling**: `src/backend/exceptions.py` - structured exception hierarchy

**Core Frontend Files**:
- **App Controller**: `src/frontend/src/AppController.tsx` - main application orchestrator
- **Vite Config**: `src/frontend/vite.config.ts` - PWA, build, and development configuration
- **Supabase Setup**: `src/frontend/src/supabaseClient.ts` - authentication and API client
- **Main Pages**: `src/frontend/src/pages/` - WhitelistCheckPage, MainPage, PlanEditor, etc.
- **Context**: `src/frontend/src/context/` - React context providers for state management
- **API Services**: `src/frontend/src/services/` - backend API communication layer

If anything above seems off or you need deeper conventions (e.g., testing/mocking patterns), ask in PR or ping to refine these notes.