# Software Specification Document (SSD)

This Software Specification Document (SSD) provides the technical specifications for the Investment Simulation PWA, including system architecture, data models, API contracts, security mechanisms, and non-functional requirements. For product features and user flows, see PRD. For implementation patterns and developer guidelines, see Technical Specification.

## 1. Environment Profiles

### 4.1 Development
- **OS**: Windows 11
- **IDE**: VS Code
- **Browser**: Chrome 1920x1080
- **Python**: 3.11.6+
- **TypeScript**: 5.8.4+
- **React**: 19.1.0
- **Ports**: Frontend 5173, Backend 8001

### 4.2 Test
- **Desktop**: Windows 11 + Chrome latest
- **Mobile**: iPhone 11 Pro (iOS 18.1.1) + Chrome
- **Testing**: Pytest (backend), Vitest + Playwright (frontend)

### 4.3 Production & Staging
- **Desktop**: Windows 11+ (Chrome latest-2)
- **Mobile iOS**: iPhone 11+ (iOS 18.1.1+) Chrome
- **Mobile Android**: Galaxy S21+ (Android 12+) Chrome
- **Hosting**: DigitalOcean Droplet (Ubuntu 22.04, 1 CPU, 1GB RAM) + Supabase (DB/Auth)
- **Deployment**: Docker Compose + GitHub Actions CI/CD
- **Production**: `simulation.lightoflifeclub.com` (port 3000 frontend, 8000 backend)
- **Staging**: `staging-simulation.lightoflifeclub.com` (port 4173 frontend, 8001 backend)

### 4.4 Load
- Total users: 60–100
- Peak concurrent: 30–60

## 5. System Architecture

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

**Flow**:
1. Pre-auth: OTP → Consent → Login
2. Auth: JWT validation via JWKS
3. App: Simulations (users), Notices/Policies (admin)

## 6. Data Models (Supabase)

**Tables**:
- `whitelist`: user_hash text (sha256 "{name}-{phone}")
- `admins`: user_id uuid
- `notices`: id, title, content, pinned, published, timestamps
- `privacy_policies`: id, version, locale, content, published, effective_date, unique(version,locale)
- `phone_otps`: id, phone, code_hash, attempts, used, expires_at, provider_msg_id, client_ip, user_agent
- `simulations`: id, user_id, plan_id, rounds, investments jsonb, sales_achievement_rates jsonb, simulation_results jsonb
- `consent_records`: id, user_hash, user_id, consent_type, consent_version, timestamps

**Notes**:
- API `scheduled_payment` → DB `investments` jsonb
- See [schema](/.memo/CE/specs/schema/schema.md) for details

## 7. Security & Authentication

**Security Controls**:

| Control | Implementation |
|---------|--------------|
| JWT validation | Supabase JWKS, python-jose, 5s timeout, global cache |
| Admin check | `admins.user_id` lookup via `_assert_admin()` |
| OTP rate limit | 3/15min send, 6 verify attempts |
| OTP hashing | HMAC with `OTP_SECRET_KEY` |
| RLS | Supabase policies on user tables |
| Exceptions | `BaseAPIException` with structured logging |
| Bearer auth | FastAPI `HTTPBearer()`, 401/403 distinction |

**Implementation**:
- Frontend: Supabase OAuth with autoRefresh
- Backend: JWT validation, audience "authenticated", extract sub as user_id
- CORS: Cloudflare + local dev hosts
- Secrets: `SUPABASE_SECRET_KEY` server-side only
- Privacy: Static file fallback if DB unavailable

## 8. Functional Requirements

### 8.1 Pre-auth
- **POST /api/otp/send**: name, phone → whitelist check → send OTP
- **POST /api/otp/verify**: phone, code → validate

### 8.2 Privacy & Consent
- **GET /api/privacy-policy**: ?version&locale → DB/fallback
- **POST /api/consents**: user_hash, type, version (pre-auth)
- **GET /api/consents/{user_hash}**: retrieve records

### 8.3 Auth
- Supabase OAuth redirect

### 8.4 Simulations (auth required)
- **GET /api/simulations**: user list
- **GET /api/simulations/{id}**: detail (owner only)
- **POST /api/simulation/create**: plan parameters
- **POST /api/simulation/run**: execute + persist
- **PATCH /api/simulations/{id}**: update inputs
- **PATCH /api/simulations/{id}/memo**: update memo
- **DELETE /api/simulations/{id}**: delete

### 8.5 Admin (auth + admin)
- **GET /api/admin/me**: verify privileges
- **Notices**: POST/PATCH/DELETE /api/admin/notices/{id}
- **Policies**: 
  - POST/PATCH/DELETE /api/admin/privacy-policies/{id}
  - POST /api/admin/privacy-policies/{id}/publish

### 8.6 Health
- **GET /api/health**: supabase probe + latency

## 9. API Contracts

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

## 10. Simulation Engine

**Plans**: A, B, C, D, K, P, R, F, E, G

**Core Logic**:
- `max_investor_count`: controls growth/stable phase
- Tax: 3.3% on revenue
- Settlement bonus: rounds 1–15 only (auto-deactivated ≥16)

**Service**: `FinancialSimulationService(plan_id, scheduled_payment?, sales_achievement_rates?)`

### 10.1 Plan Specifications

**Common Structure**:
- `min_payment_new`: Round-based minimums
- `min_payment_re`: Re-investment minimum
- `max_bonus`: Maximum bonus amount
- `round_bonus_rates`: Round-specific multipliers
- `revenue_base_divisor`: 1.1 (all plans)
- `sales_commission`: 0.32 (all plans)
- `settlement_bonus`: 100000 (all plans)

**Plan Details**:
- **Plan A** (max_investor_count: 15):
  - min_payment_new: {1: 110000, 2: 220000, 3: 440000, ..., 19: 33000000}
  - min_payment_re: 11000000
  - max_bonus: 30000000
  - round_bonus_rates: {4: 1, 5: 1, 6: 2, 7: 2, 8: 3, 9: 3, 10: 5, 11: 5, 12: 10, 13: 20, 14: 50, 15: 100}

- **Plan B** (max_investor_count: 15):
  - Same parameters as Plan A

- **Plan C** (max_investor_count: 15):
  - Same min_payment structure as Plans A & B
  - max_bonus: 50000000

- **Plan D** (max_investor_count: 18):
  - Same min_payment structure as Plans A, B, C
  - min_payment_re: 33000000
  - max_bonus: 100000000
  - round_bonus_rates: Extended to {4: 1, ..., 15: 100, 16: 300, 17: 1000, 18: 1000}
  - sales_achievement_rates: Extended to rounds 4-36

- **Plan K** (max_investor_count: 18):
  - min_payment_new: {1: 330000, 2: 330000, 3: 440000, ..., 19: 33000000}
  - min_payment_re: 33000000
  - max_bonus: 300000000
  - round_bonus_rates: Same as Plan D (4-18)
  - sales_achievement_rates: Rounds 4-30

- **Plan P** (max_investor_count: 18):
  - Same parameters as Plan K
  - sales_achievement_rates: Extended to rounds 4-36

- **Plan R** (max_investor_count: 18):
  - min_payment_new: Same as Plans A, B, C (starting at 110000)
  - min_payment_re: 33000000
  - max_bonus: 100000000
  - round_bonus_rates: Same as Plan D (4-18)
  - sales_achievement_rates: Extended to rounds 4-36

- **Plan F** (max_investor_count: 18):
  - Same parameters as Plan K
  - sales_achievement_rates: Extended to rounds 4-36

- **Plan E** (max_investor_count: 18):
  - min_payment_new: Same as Plans A, B, C (starting at 110000)
  - min_payment_re: 33000000
  - max_bonus: 100000000
  - round_bonus_rates: Same as Plan D (4-18)
  - sales_achievement_rates: Extended to rounds 4-36

- **Plan G** (max_investor_count: 12):
  - min_payment_new: {1-12: 110000} (flat 110000 for all rounds)
  - min_payment_re: 220000
  - max_bonus: 30000000
  - round_bonus_rates: {4: 1, 5: 1, 6: 2, 7: 2, 8: 3, 9: 3, 10: 5, 11: 5, 12: 10}
  - sales_achievement_rates: Rounds 4-12

## 11. Non-Functional Requirements

- **Performance**: APIs <500ms typical, simulation <2s
- **Availability**: Health endpoint, graceful Supabase failures
- **Security**: JWT/JWKS, admin table checks
- **Rate limiting**: OTP 3/15min, 6 attempts/code
- **PWA**: Installable manifest, basic service worker

## 13. PWA Requirements

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

## 14. Constraints

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

## 15. Error Handling

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

## 16. Testing Strategy

| Layer | Tool | Target |
|-------|------|--------|
| Backend unit | pytest | ≥75% |
| Frontend unit | Vitest + RTL | ≥60% |
| Integration | pytest + test DB | Critical paths |
| Contract | OpenAPI validation | API stability |
| E2E | Smoke tests | Core flows |

**CI Gates**:
- Lint + Type Check
- Unit tests with coverage
- OpenAPI snapshot validation
- Dependency security scan

## 17. Acceptance Criteria

- **OTP**: Whitelist check → send → verify with rate limits
- **Consent**: Policy retrieval (DB/fallback) → record (idempotent)
- **Simulations**: Create → update → run → persist results
- **Admin**: Verify privileges → manage policies (publish exclusivity)

## 18. Performance Baselines

### 18.1 API Performance Targets

| Endpoint | Target (p95) | Acceptable (p99) | Timeout |
|----------|--------------|------------------|---------|
| POST /api/otp/send | < 2000ms | < 4000ms | 10s |
| POST /api/otp/verify | < 300ms | < 500ms | 5s |
| POST /api/simulation/create | < 400ms | < 600ms | 10s |
| POST /api/simulation/run | < 1500ms | < 3000ms | 15s |
| GET /api/simulations | < 200ms | < 400ms | 5s |
| GET /api/health | < 100ms | < 200ms | 3s |

### 18.2 Frontend Performance

**Core Web Vitals**:
- **LCP**: < 2.5s for MainPage
- **FID**: < 100ms for interactive elements
- **CLS**: < 0.1 for stable layouts

### 18.3 Scalability

**Load Profile** (60-100 users):
- Concurrent: 30-60 peak, 5-15 average
- API: ~1000 requests/hour peak
- DB: 5-10 concurrent connections

## 19. Data Migration & Recovery

### 19.1 Migration Strategy
- Additive changes with defaults
- Backward-compatible JSONB evolution
- Grace periods for deprecation

### 19.2 Backup & Recovery
- Daily Supabase snapshots (7-day retention)
- Point-in-time recovery available
- Service degradation modes (read-only, cached policy)

**Recovery Objectives**:
- Database restore: < 4 hours
- Service restart: < 30 minutes
- User notification: < 2 hours

## 20. Glossary

- **Supabase**: Backend-as-a-Service providing Postgres, Auth, Storage, and APIs
- **JWKS**: JSON Web Key Set for verifying JWT signatures
- **OTP**: One-time password sent via SMS
- **PWA**: Progressive Web App supporting installability and service worker caching
- **RLS**: Row Level Security (Postgres policy-based row access control)
- **P95/P99**: 95th and 99th percentile performance metrics
- **LCP/FID/CLS**: Core Web Vitals performance metrics
- **RTT**: Round-trip time for network requests
- **Pre-auth user**: User before completing OTP verification, privacy policy consent, and OAuth authentication
