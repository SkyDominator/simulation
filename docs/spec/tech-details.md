
# Technical Specification

This document provides implementation-level details for the Investment Simulation PWA. It covers architecture patterns, configuration, deployment, and development workflows for a solo full-stack developer managing a 50-100 user application.

**Scope**: Unlike the PRD (product vision) and SSD (system contracts), this document focuses on **how** to implement features using specific technologies, tools, and patterns.

## 1. System Architecture

### 1.1 Backend Architecture

FastAPI application with layered architecture pattern:

```text
src/backend/
├── main.py                 # App factory: CORS, middleware, exception handlers
├── api/routes.py           # API endpoints (~476 lines) - thin routing layer
├── services/               # Business logic layer
│   ├── simulations.py      # Simulation CRUD operations
│   ├── otp/otp_service.py  # OTP send/verify + rate limiting
│   └── ...
├── simulation_service.py   # Financial calculation engine
├── models/schemas.py       # Pydantic v2 models
├── config/settings.py      # Environment configuration
├── auth/jwt.py             # JWT validation via Supabase JWKS
├── exceptions.py           # Custom exception hierarchy
├── constants.py            # Plan configurations (10 types)
├── container.py            # Dependency injection container
├── interfaces.py           # Abstract interfaces for DI
└── implementations.py      # Concrete implementations
```

**Key Components**:

- **API Layer** (`api/routes.py`): Route definitions, request validation, response formatting
- **Service Layer** (`services/`): Business logic, orchestration, database operations
- **Financial Engine** (`simulation_service.py`): Complex calculation logic for 10 investment plans
- **Auth** (`auth/jwt.py`): JWT validation using Supabase JWKS with 5s timeout and global cache
- **DI Container** (`container.py`): Manages dependencies with TEST_MODE environment variable support

**Critical Flows**:

- **OTP Flow**: whitelist check → generate 6-digit code → SMS via Solapi → store HMAC-hashed code in DB → verify with max 6 attempts
- **Simulation Cache**: Update/delete operations set `simulation_results` to `null` → requires re-run to regenerate
- **Admin Check**: Query `admins.user_id` table → raise 403 if not found

### 1.2 Frontend Architecture

React 19 PWA with TypeScript 5.8+:

```text
src/frontend/src/
├── pages/                  # Route-level components
├── components/             # Reusable UI (domain-organized)
├── context/                # React Context (Auth, etc.)
├── hooks/                  # Custom hooks (API actions, consent flow)
├── services/               # API client layer
├── types/                  # TypeScript type definitions
├── utils/                  # Pure utility functions
│   ├── browserDetection.ts # Embedded browser detection
│   ├── persist.ts          # localStorage helpers
│   └── ...
├── AppController.tsx       # Main navigation orchestrator
├── supabaseClient.ts       # Supabase client setup
└── vite.config.ts          # Build + PWA configuration
```

**Key Patterns**:

- **State Management**: React Context for auth, localStorage for UI state only
- **API Layer**: Centralized `services/api.ts` with Bearer token injection
- **Embedded Browser**: Detect KakaoTalk/Facebook/Instagram webviews before OAuth → guide to external browser
- **PWA**: NetworkFirst for `/api/notices`, StaleWhileRevalidate for images

## 2. Deployment & Runtime

### 2.1 Production & Staging Environments

**Infrastructure**:

- **Platform**: DigitalOcean Droplet (Ubuntu 22.04, 1 CPU, 1GB RAM)
- **Deployment**: Docker Compose via GitHub Actions CI/CD
- **Database**: Supabase cloud (managed PostgreSQL with RLS)
- **Ingress**: Cloudflare Tunnel for secure HTTPS

**Port Configuration**:

| Environment | Frontend | Backend | Nginx |
|------------|----------|---------|-------|
| Production | 3000 | 8000 | 8080 (host-based routing) |
| Staging | 4173 | 8001 | 8080 (host-based routing) |
| Local Dev | 5173 | 8001 | N/A |

**Domains**:

- Production: `simulation.lightoflifeclub.com`
- Staging: `staging-simulation.lightoflifeclub.com`

**Nginx Reverse Proxy**: Routes by hostname on port 8080, forwards to appropriate frontend/backend containers.

**Docker Compose Details**:

- **Startup Order**: Backend starts before frontend (healthcheck dependency)
- **Port Mapping**: Production (3000 frontend, 8000 backend), Staging (4173 frontend, 8001 backend)
- **CI/CD**: GitHub Actions with self-hosted runner on Droplet

### 2.2 Local Development

**Development Environment**:

- **OS**: Windows 11 with VS Code
- **Port Configuration**: Frontend dev (5173), Backend dev (8001)
- **Environment Files**: Backend `.env`, Frontend `.env.local` required
- **Docker Usage**: Only for production builds/testing, not for local development

**Setup**:

- Frontend: Vite dev server with HMR (port 5173)
- Backend: Uvicorn with hot reload (port 8001)
- Environment variables: Backend `.env`, Frontend `.env.local`
- Docker: Not used for local dev (only for production builds/testing)

**Common Commands**:

```powershell
# Start frontend dev server
cd src/frontend
npm run dev

# Start backend dev server
cd src/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8001

# Run tests
cd src/backend && python -m pytest -q
cd src/frontend && npm run test

# Production build
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d

# Staging build
docker compose -f docker-compose.staging.yml build
docker compose -f docker-compose.staging.yml up -d
```

## 3. Configuration

### 3.1 Backend Environment Variables

**Required**:

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SECRET_KEY` OR `SUPABASE_PUBLISHABLE_KEY`: API key (secret preferred for server)

**OTP/SMS Configuration**:

- `OTP_SECRET_KEY`: HMAC encryption key for OTP hashing
- `OTP_VALIDITY_MINUTES`: OTP expiration (default: 5)
- `OTP_RESEND_LIMIT_PER_15MIN`: Send rate limit (default: 3)
- `OTP_RESEND_LIMIT_PER_DAY`: Daily send limit (default: 10)
- `otp_max_verification_attempts`: Max verification attempts (default: 6, **lowercase variable name**)

**SMS Providers**:

- **Solapi** (current): `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER_NUMBER`
- **NHN Cloud** (legacy): `NHN_CLOUD_APPKEY`, `NHN_CLOUD_SECRET_KEY`, `NHN_CLOUD_SENDER_NUMBER`

**CORS Configuration**:

Origins defined in `config/settings.py`:

- `https://simulation.lightoflifeclub.com` (production)
- `https://staging-simulation.lightoflifeclub.com` (staging)
- `http://localhost:5173`, `http://127.0.0.1:5173` (local dev)

### 3.2 Frontend Environment Variables

**Required** (`.env.local`):

- `VITE_SUPABASE_URL`: Same as backend Supabase URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase client (publishable) key
- `VITE_API_BASE_URL`: API endpoint (defaults in `vite.config.ts` to production domain)

### 3.3 Database Configuration

**Supabase Cloud Setup**:

- **RLS Policies**: Row-Level Security enabled on all tables
- **Schema Reference**: See `docs/spec/schema.md` for complete schema definition
- **Connection Pooling**: Managed automatically by Supabase cloud
- **Migrations**: Consider existing data and RLS policies when modifying schema

## 4. Backend Implementation Patterns

### 4.1 Supabase Client Factory

```python
from supabase import create_client
from config.settings import settings

def _supabase_client():
    """Create Supabase client with secret key fallback to publishable key."""
    key = settings.supabase_secret_key or settings.supabase_publishable_key
    return create_client(settings.supabase_url, key)
```

### 4.2 Response Patterns

```python
# Success response (OTP/admin endpoints)
return {"success": True, "message": "Operation completed", "data": result}

# Error handling with custom exceptions
from exceptions import SimulationNotFoundError
if not simulation:
    raise SimulationNotFoundError(f"Simulation {id} not found")
```

### 4.3 Auth Flow Implementation

```python
from auth.jwt import authenticate_jwt_token
from fastapi import Depends

async def my_endpoint(user_id: str = Depends(authenticate_jwt_token)):
    """JWT validated, user_id extracted from 'sub' claim."""
    # Implementation here
    pass
```

### 4.4 Admin Guard Pattern

```python
def _assert_admin(user_id: str, client) -> None:
    """Check if user_id exists in admins table. Raises 403 if not."""
    resp = client.table('admins').select('user_id').eq('user_id', user_id).limit(1).execute()
    if not resp.data:
        raise AdminPrivilegesRequiredError()
```

### 4.5 Database Access Guidelines

- Use dependency injection via `container.py` for database clients
- Wrap operations in try/catch → call `handle_database_exception`
- Respect RLS policies configured in Supabase
- Simulation updates invalidate cached results: set `simulation_results` → `None`

### 4.6 Adding New Endpoints

**Step 1**: Define Pydantic models in `models/schemas.py`:

```python
class MyFeatureRequest(BaseModel):
    field1: str
    field2: int

class MyFeatureResponse(BaseModel):
    result: str
    status: str
```

**Step 2**: Implement business logic in `services/`:

```python
class MyFeatureService:
    def __init__(self, db_client: DatabaseClient):
        self.db_client = db_client
    
    def execute(self, req: MyFeatureRequest, user_id: str) -> MyFeatureResponse:
        # Business logic here
        return MyFeatureResponse(result="success", status="ok")
```

**Step 3**: Add route in `api/routes.py`:

```python
@router.post('/api/my-feature', response_model=MyFeatureResponse)
async def my_feature(
    req: MyFeatureRequest, 
    user_id: str = Depends(authenticate_jwt_token)
):
    service = MyFeatureService(db_client=_supabase_client())
    return service.execute(req, user_id)
```

### 4.7 API Development Guidelines

**Source of Truth**: `api/routes.py` implementation is authoritative over specification documents.

**Best Practices**:

- **Endpoint Design**: Keep `api/routes.py` thin (~476 lines currently) - delegate logic to services
- **Backwards Compatibility**: Maintain compatibility when updating existing endpoints
- **Incomplete Specs**: Some SSD endpoints may not be implemented yet - verify against actual code

## 5. Frontend Implementation Patterns

### 5.1 Embedded Browser Detection

**Detection Utility** (`utils/browserDetection.ts`):

```typescript
export function isEmbeddedBrowser(): boolean {
  const ua = navigator.userAgent || "";
  const embeddedMarkers = ["KAKAOTALK", "wv", "FBAN", "Instagram", "Twitter", "Line", "Naver"];
  return embeddedMarkers.some(marker => ua.includes(marker));
}
```

**Usage Pattern**: Before OAuth, check and show warning modal to guide users to external browser.

### 5.2 State Persistence

```typescript
import { getJSON, setJSON } from './utils/persist';

// Read from localStorage with default
const [page, setPage] = useState<Page>(() => 
  getJSON<Page>('ui.page', 'whitelist')
);

// Write to localStorage
const updatePage = (newPage: Page) => {
  setPage(newPage);
  setJSON('ui.page', newPage);
};
```

### 5.3 API Communication

**Centralized API Client** (`services/api.ts`):

```typescript
export const api = {
  async createSimulation(data: SimulationCreate, token: string): Promise<SimulationResponse> {
    const response = await fetch(`${API_BASE_URL}/simulation/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('API Error');
    return response.json();
  }
};
```

### 5.4 Custom Hooks Pattern

```typescript
export const useSimulationActions = () => {
  const { session } = useAuth();
  
  const deleteSimulation = useCallback(async (id: string) => {
    if (!session?.access_token) throw new Error('No session');
    return await api.deleteSimulation(id, session.access_token);
  }, [session?.access_token]);
  
  return { deleteSimulation };
};
```

### 5.5 Frontend Security Guidelines

**Critical Rules**:

- **No Sensitive Storage**: Never store sensitive data (tokens, passwords, PII) in localStorage or sessionStorage
- **JWT Management**: Let Supabase client handle all JWT operations (no manual token storage)
- **Error Boundaries**: Implement React error boundaries for graceful failure handling
- **Input Validation**: Validate and sanitize all user inputs before API calls
- **XSS Prevention**: React escapes by default, but be careful with `dangerouslySetInnerHTML`

## 6. Common Pitfalls

### 6.1 OTP/SMS Issues

- **Variable Name**: `otp_max_verification_attempts` is **lowercase** (not camelCase) - common configuration error
- **Korean Messages**: Must maintain exact Korean message format contracts with SMS provider (Solapi)
- **Rate Limits**: Tracked via database queries, not in-memory - restart won't reset limits
- **Hash Storage**: OTP codes stored as HMAC hashes with `OTP_SECRET_KEY` - never store plaintext

### 6.2 Simulation State Management

- **Empty State**: `GET /api/simulations` returns 404 (not empty array) when user has no simulations
- **Cache Invalidation**: Update/delete operations set `simulation_results` → `null` automatically
- **Re-run Required**: After parameter updates, must explicitly call `/api/simulation/run` to regenerate results
- **Plan Parameters**: Verify plan_id exists in `constants.py` PLAN_PARAMETERS before processing

### 6.3 Admin/Privacy Policy Constraints

- **Create vs Publish**: Cannot set `published=true` directly when creating - must use separate publish endpoint
- **Publish Endpoint**: Use `POST /api/admin/privacy-policies/{id}/publish` after creation
- **Version Uniqueness**: Database enforces unique constraint on `(version, locale)` pair
- **Admin Verification**: All admin endpoints call `_assert_admin()` which queries `admins` table

### 6.4 Embedded Browser OAuth

**Problem**: Google OAuth fails with 403 in embedded browsers (KakaoTalk, Facebook, Instagram in-app browsers)

**Detection & Solution**:

1. Use `isEmbeddedBrowser()` from `utils/browserDetection.ts` before OAuth flow
2. Show `EmbeddedBrowserWarningModal` to inform user
3. Call `openInExternalBrowser()` to guide user to system browser

**Testing**: Verify with actual KakaoTalk, Facebook, Instagram apps on mobile devices

### 6.5 Testing Configuration

- **Mock JWKS**: Always mock `JWKSClient.get_keys()` in tests to avoid external HTTP calls
- **Test Mode**: Set `TEST_MODE=true` environment variable to use test implementations from `test_implementations.py`
- **Environment Variables**: Backend tests require `.env` file or pytest fixtures for Supabase credentials
- **Integration Tests**: Located in `src/backend/tests/integration/` with separate test database

