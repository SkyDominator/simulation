# Software Specification Document (SSD)

This Software Specification Document (SSD) provides the technical specifications for the financial simulation PWA, including system architecture, data models, API contracts, security mechanisms, and non-functional requirements.

## 1. Environment Profiles

### 1.1 Development

- **OS**: Windows 11
- **IDE**: VS Code
- **Browser**: Chrome 1920x1080
- **Python**: 3.11.6+
- **TypeScript**: 5.8.4+
- **React**: 19.1.0
- **Ports**: Frontend 5173, Backend 8001

### 1.2 Test

- **Desktop**: Windows 11 + Chrome latest
- **Mobile**: iPhone 11 Pro (iOS 18.1.1) + Chrome
- **Testing**: Pytest (backend), Vitest + Playwright (frontend)

### 1.3 Production & Staging

- **Desktop**: Windows 11+ (Chrome latest-2)
- **Mobile iOS**: iPhone 11+ (iOS 18.1.1+) Chrome
- **Mobile Android**: Galaxy S21+ (Android 12+) Chrome
- **Hosting**: DigitalOcean Droplet (Ubuntu 22.04, 1 CPU, 1GB RAM) + Supabase (DB/Auth)
- **Deployment**: Docker Compose + GitHub Actions CI/CD + Nginx reverse proxy + Cloudflare Tunnel
- **Production**: `simulation.lightoflifeclub.com` (port 3000 frontend, 8000 backend)
- **Staging**: `staging-simulation.lightoflifeclub.com` (port 4173 frontend, 8001 backend)

### 1.4 Load

- Total users: 60–100 (approx.)
- Peak concurrent: 30–60 (approx.)

## 2. System Architecture

**Frontend**:

- React 19.1.0 + TypeScript 5.8.4+ + Vite 5.4.10+
- vite-plugin-pwa 0.20.0, MUI 5.14.0+, Tailwind 3.4.4+
- @supabase/supabase-js 2.51.0+
- localStorage/sessionStorage persistence

**Backend**:

- FastAPI 0.116.1+ (Python 3.11.6+)
- Pydantic v2, Supabase client 2.16.0+
- JWT via Supabase JWKS

**Infrastructure**:

- DigitalOcean Droplet with Docker Compose
- Nginx reverse proxy (host-based routing on port 8080)
- Cloudflare Tunnel: `simulation.lightoflifeclub.com` (production), `staging-simulation.lightoflifeclub.com` (staging)
- GitHub Actions CI/CD: Hybrid runners (GitHub-hosted for tests, self-hosted for deployment)
- CORS: Production/staging domains + local dev (localhost:5173, 127.0.0.1)

**Authentication Flow**:

1. Pre-auth: Whitelist check → OTP → Consent → Login
2. Auth: JWT validation via JWKS
3. App: Simulations (users), Notices/Policies (admin)

## 3. Data Models

**Core Tables**:

- `whitelist`: user_hash text (sha256 "{name}-{phone}")
- `admins`: user_id uuid
- `notices`: id, title, content, pinned, published, timestamps
- `privacy_policies`: id, version, locale, content, published, effective_date, unique(version,locale)
- `phone_otps`: id, phone, code_hash, attempts, used, expires_at, provider_msg_id, client_ip, user_agent
- `simulations`: id, user_id, plan_id, starting_company_round, current_company_round, simulation_rounds, investments jsonb, sales_achievement_rates jsonb, simulation_results jsonb, memo
- `consent_records`: id, user_hash, user_id, consent_type, consent_version, timestamps

**Notes**:

- API `scheduled_payment` → DB `investments` jsonb
- See [schema.md](schema.md) for complete schema and RLS policies

## 4. Security & Authentication

**Security Controls**:

| Control | Implementation |
|---------|--------------|
| JWT validation | Supabase JWKS, python-jose, 5s timeout, global cache |
| Admin check | `admins.user_id` lookup via `_assert_admin()` |
| OTP rate limit | 3/15min send, 10/day send, 6 verify attempts |
| OTP hashing | HMAC with `OTP_SECRET_KEY` |
| RLS | Supabase policies on user tables |
| Exceptions | `BaseAPIException` with structured logging |
| Bearer auth | FastAPI `HTTPBearer()`, 401/403 distinction |

**Implementation Details**:

- Frontend: Supabase OAuth with autoRefresh
- Backend: JWT validation, audience "authenticated", extract sub as user_id
- CORS: Cloudflare + local dev hosts
- Secrets: `SUPABASE_SECRET_KEY` server-side only
- Privacy: Static file fallback if DB unavailable

## 5. API Endpoints

### 5.1 Pre-auth

- **POST /api/otp/send**: name, phone → whitelist check → send OTP
- **POST /api/otp/verify**: phone, code → validate

### 5.2 Privacy & Consent

- **GET /api/privacy-policy**: ?version&locale → DB/fallback (public)
- **POST /api/consents**: user_hash, type, version (pre-auth, public)
- **GET /api/consents/{user_hash}**: retrieve records (pre-auth, public)

### 5.3 Auth

- Supabase OAuth redirect (Google, Kakao providers)

### 5.4 Simulations (auth required)

- **GET /api/simulations**: user list
- **GET /api/simulations/{id}**: detail (owner only)
- **POST /api/simulation/create**: plan parameters
- **POST /api/simulation/run**: execute + persist
- **PATCH /api/simulations/{id}**: update inputs
- **PATCH /api/simulations/{id}/memo**: update memo
- **DELETE /api/simulations/{id}**: delete
- **POST /api/simulation/delete**: delete (alternative POST method)

### 5.5 Notices (public read, admin write)

- **GET /api/notices**: list published notices
- **GET /api/notices/{id}**: get notice detail
- **POST /api/admin/notices**: create notice (admin)
- **PATCH /api/admin/notices/{id}**: update notice (admin)
- **DELETE /api/admin/notices/{id}**: delete notice (admin)

### 5.6 Admin Privacy Policies

- **GET /api/admin/privacy-policies**: list all policies (admin)
- **GET /api/admin/privacy-policies/{id}**: get policy detail (admin)
- **POST /api/admin/privacy-policies**: create policy (admin)
- **PATCH /api/admin/privacy-policies/{id}**: update policy (admin)
- **POST /api/admin/privacy-policies/{id}/publish**: publish policy (admin)
- **DELETE /api/admin/privacy-policies/{id}**: delete policy (admin)

### 5.7 Admin

- **GET /api/admin/me**: verify admin privileges

### 5.8 Health

- **GET /api/health**: supabase probe + latency

## 6. API Contracts

All JSON. Auth: `Authorization: Bearer {token}` where noted.

```javascript
// POST /api/otp/send (includes automatic whitelist check)
{
  req: { name: string, phone_number: string },
  res: { success: boolean, message: string, expires_in_seconds?: number, user_hash?: string }
}

// POST /api/otp/verify
{
  req: { phone_number: string, otp_code: string },
  res: { success: boolean, message: string, remaining_attempts?: number }
}

// POST /api/consents (pre-auth)
{
  req: { user_hash: string, consent_type: string, consent_version: string, 
         ip_address?: string, user_agent?: string },
  res: { user_hash: string, consent_type: string, consent_version: string, 
         consent_given_at: string, ip_address?: string, user_agent?: string }
}

// GET /api/consents/{user_hash}
{
  res: { consents: Array<ConsentRecord>, success: boolean }
}

// GET /api/privacy-policy?version&locale
{
  res: { version: string, last_updated: string, content: string, 
         success: boolean, source: "db" | "static-file", locale?: string }
}
```

## 7. Simulation Engine

**Plans**: A, B, C, D, E, F, G, K, P, R (10 plan types)

**Core Logic**:

- `max_investor_count`: Controls growth/stable phase
- Tax: 3.3% on revenue
- Settlement bonus: Configurable per plan
  - Plans A, B, C, D, E, F, K, P, R: Rounds 1–15 only (auto-deactivated ≥16)
  - Plan G: Active for all rounds (never deactivated)
- Service class: `FinancialSimulationService(plan_id, scheduled_payment?, sales_achievement_rates?)`

**Common Parameters** (All Plans):

- `revenue_base_divisor`: 1.1
- `sales_commission`: 0.32 (32%)
- `settlement_bonus`: 100000

**Plan Variations**:

- **Plans A, B**: max_investor_count 15, max_bonus 30M (B) / 50M (C)
- **Plans C, D, E, R**: max_investor_count 15 (C) / 18 (others), max_bonus 50M-100M
- **Plans F, K, P**: max_investor_count 18, max_bonus 300M, higher initial payment
- **Plan G**: max_investor_count 12, simplified structure
  - **Unique settlement_bonus behavior**: Active for all rounds (never deactivated)
    - Unlike other plans, Plan G maintains settlement_bonus beyond company round 15
    - Ensures consistent revenue calculations throughout the plan lifecycle

For complete plan specifications, see `src/backend/constants.py` (PLAN_PARAMETERS).

## 8. Non-Functional Requirements

- **Performance**: APIs <500ms typical, simulation <2s
- **Availability**: Health endpoint, graceful Supabase failures
- **Security**: JWT/JWKS, admin table checks
- **Rate limiting**: OTP 3/15min, 6 attempts/code
- **PWA**: Installable manifest, basic service worker

## 9. PWA Requirements

**Manifest**:

- Name: "Light of Life Club Simulation"
- Icons: 192x192, 384x384, 512x512 (standard + maskable)
- Display: standalone, Orientation: landscape
- Theme: #1976d2, Background: #ffffff

**Service Worker** (vite-plugin-pwa):

- Network-first: `/api/notices` (3s timeout, 1h cache)
- Stale-while-revalidate: images
- Auto-update registration

**Mobile UX**:

- Landscape enforcer component
- Responsive MUI + Tailwind

## 10. Constraints

**Environment Variables**:

Backend:

- `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
- `OTP_SECRET_KEY`, `OTP_VALIDITY_MINUTES=5`
- `OTP_RESEND_LIMIT_PER_15MIN=3`, `otp_max_verification_attempts=6`
- `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER_NUMBER`

Frontend:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_API_BASE_URL=https://simulation.lightoflifeclub.com/api`

**CORS**: `simulation.lightoflifeclub.com`, `staging-simulation.lightoflifeclub.com`, localhost:5173, 127.0.0.1

**Dependencies**:

- Supabase RLS configured
- Whitelist table pre-seeded
- DigitalOcean Droplet with Docker + Cloudflare Tunnel
- GitHub self-hosted runner on Droplet

## 11. Error Handling

**Exception Hierarchy**:

- 401: `AuthenticationError`
- 403: `AdminPrivilegesRequiredError`, `AuthorizationError`
- 404: `ResourceNotFoundError`, `SimulationNotFoundError`, etc.
- 400: `WhitelistError`, `InvalidDataError`
- 409: `PublishingConstraintError`
- 500: `DatabaseError`, `InternalServerError`

**Response Format**:

- OTP/admin: `{ success: boolean, message: string, ... }`
- FastAPI: `{ "detail": "..." }`

## 12. Testing Strategy

| Layer | Tool | Target |
|-------|------|--------|
| Backend unit | pytest | ≥75% |
| Frontend unit | Vitest + RTL | ≥60% |
| Integration | pytest + test DB | Critical paths |
| Contract | OpenAPI validation | API stability |
| E2E | Smoke tests | Core flows |

**CI Gates**:

- Lint + Type Check
- Unit tests and integration tests
- E2E tests are optional

## 13. Acceptance Criteria

- **OTP**: Whitelist check → send → verify with rate limits
- **Consent**: Policy retrieval (DB/fallback) → record (idempotent)
- **Simulations**: Create → update → run → persist results
- **Admin**: Verify privileges → manage policies and notices (publish exclusivity)

## 14. Performance Baselines

### 14.1 API Performance Targets

| Endpoint | Target (p95) | Acceptable (p99) | Timeout |
|----------|--------------|------------------|---------|
| POST /api/otp/send | < 2000ms | < 4000ms | 10s |
| POST /api/otp/verify | < 300ms | < 500ms | 5s |
| POST /api/simulation/create | < 400ms | < 600ms | 10s |
| POST /api/simulation/run | < 1500ms | < 3000ms | 15s |
| GET /api/simulations | < 200ms | < 400ms | 5s |
| GET /api/health | < 100ms | < 200ms | 3s |

### 14.2 Frontend Performance

**Core Web Vitals**:

- **LCP**: < 2.5s for MainPage
- **FID**: < 100ms for interactive elements
- **CLS**: < 0.1 for stable layouts

### 14.3 Scalability

**Load Profile** (60-100 users):

- Concurrent: 30-60 peak, 5-15 average
- API: ~1000 requests/hour peak
- DB: 5-10 concurrent connections

## 15. Detailed UX Flow

Read [User Flow Document (UXD)](ux-flow.md) for detailed user journeys and interaction patterns.
