# LOLClub Simulation – Software Specification Document (SSD)

Version: 0.1.0  
Date: 2025-09-05  
Status: Draft (auto-generated from source)  
Owners: Product, Engineering (Backend/Frontend)

---

## 1. Introduction / Purpose

LOLClub Simulation is a PWA that allows whitelisted users to sign in via Supabase OAuth, manage investment plan simulations, and review results. The app enforces a pre-auth onboarding flow (whitelist + OTP + privacy consent) and provides an admin UI for managing privacy policies and notices. The backend is a FastAPI service integrated with Supabase (Auth, Postgres, Storage), and the frontend is a React/Vite app.

The Goals of this Project:

- Provide an authenticated experience for running configurable financial simulations and storing results per user.
- Enforce onboarding: whitelist check, OTP verification, and privacy policy consent.
- Allow admins to manage privacy policies (versioned, publishable) and end-user notices.

Outcomes:

- Clear API contracts (FastAPI + Pydantic) and UI flows.
- Documented data models (Supabase tables, constraints, RLS policies).
- Non-functional and security requirements aligned with PWA + Supabase integration.

---

## 2. Scope

In-scope (current release):

- Pre-auth user validation: OTP send/verify.
    - Whitelist check (name+phone hash) on OTP send request.
- Privacy policy retrieval (public) and consent recording (pre-auth context).
- Supabase OAuth login (Google, Kakao) and JWT-based backend auth.
- Onboarding status (OTP, consent) persistence management (per authenticated user).
- Simulation plan CRUD and run (persist inputs and results).
- Public notices list/detail; admin CRUD for notices and privacy policies.
- PWA shell with basic installability (manifest, icons).

Out-of-scope (deferred):

- Payments/settlements processing outside simulation logic.
- Advanced analytics/dashboards.
- Full offline simulation execution (frontend-only) and background sync.
- Internationalization beyond ko-KR defaults for policy.

---

## 3. Stakeholders & Roles

- End user
    - Runs simulations after onboarding (OTP authentication, privacy consent) and login.
        - Creates or modifies or deletes simulations
    - Reviews simulation results and reports.
    - Reads notices and privacy policies.
- Admin
    - Manages notices and privacy policies; can view admin-only routes.
- Engineering
    - Maintains backend services, data schema, and frontend app.



## 4. Environment Profiles

### 4.1 Local Development Environment

| Component | Specification |
|-----------|--------------|
| OS | Windows 11 |
| IDE | Visual Studio Code |
| Browser | Google Chrome (1920x1080) |
| Device | Desktop (LG Gram Notebook) |
| Python | 3.11.6 or later (backend runtime; container may pin 3.12 in future) |
| TypeScript | 5.8.3 or later |
| React | 19.1.0 or later |

Notes:

- Primary dev workflow uses Docker Compose (frontend + backend + ancillary services as needed).
- Chrome is the reference browser for layout and PWA install behavior during development.

### 4.2 Test (Internal App Test) Environment

Target devices for functional / UX validation:

- Desktop: Windows 11 + Google Chrome (latest stable).
- Mobile: iPhone 11 Pro (iOS 18.1.1) + Google Chrome.

### 4.3 Live (Production) Environment Targets

Supported / validated device & browser matrix (minimum baselines):

- Desktop: Windows 11+ (latest two Chrome versions).
- Mobile (iOS): iPhone 11+ on iOS 18.1.1+ using Google Chrome (Chromium-based WebKit wrapper on iOS).
- Mobile (Android): Samsung Galaxy S21+ (Android 12+) using Google Chrome (latest two versions).

Accessibility / Responsiveness:

- Mobile-first layout priority; desktop receives adaptive scaling (max content width, responsive breakpoints consistent with MUI defaults or custom theme breakpoints).

### 4.4 Expected User Load

| Metric | Estimate (Initial Internal Phase) |
|--------|-----------------------------------|
| Total registered/whitelisted users | 60–100 |
| Simultaneous active users (peak) | 30–60 |

Implications:

- Scaling requirements modest; single-region Supabase + minimal horizontal scaling acceptable.
- Rate limiting + abuse detection should still be enforced early to prevent misuse of OTP or simulation endpoints.

### 4.5 Validation & Testing Notes

- Cross-browser smoke checklist to include: PWA install prompt, OTP flow, consent acceptance, OAuth redirect, simulation run, notice viewing.
- Performance sampling at expected concurrency: ensure median simulation run (< 2s) under peak simultaneous use assumptions.
- Provide synthetic test users covering both admin and standard roles across device classes.

### 4.6 Risks / Considerations

| Risk | Description | Mitigation |
|------|-------------|------------|
| Device variability | Limited initial device matrix may hide layout bugs on smaller Android screens | Add one sub-6" Android test device in later cycle |
| Private distribution friction | Users may not understand PWA install flow | Add onboarding tooltip / install CTA guidance |
| iOS Chrome limitations | Uses WebKit; some APIs (e.g., push notifications) limited | Document unsupported capabilities; degrade gracefully |
| Peak simultaneous simulations | Running many high-round simulations concurrently could spike CPU | Introduce server-side execution queue or per-user run throttle if needed |

---

## 5. System Architecture

- Frontend: React 19 + TypeScript + Vite (vite-plugin-pwa, MUI for UI). Auth via @supabase/supabase-js. State persisted selectively to localStorage/sessionStorage.
- Backend: FastAPI (Python 3.12), Pydantic v2 schemas, Supabase client (REST/RPC). JWT verification uses Supabase JWKS.
- Data: Supabase Postgres (tables below). Auth via Supabase; JWT audience "authenticated". Optional static fallback for policy content.
- Infra: Dockerized services; Cloudflare Tunnel for public frontend domain; CORS configured for local dev and tunnel domain.

High-level flow:

1) Pre-auth: OTP Authentication (includes WhitelistCheck) -> ConsentPage -> Login (Supabase OAuth).  
2) Auth: Backend validates JWT via Supabase JWKS; issues user-specific data access.  
3) App: Users manage simulations; admins manage notices/policies.  

---

## 6. Data & Models (Supabase)

Note: Field types reflect usage in code. Additional audit fields (created_at/updated_at) often exist and are managed by Supabase.

- whitelist (external/seeded)
  - user_hash text (sha256 of "{name}-{normalized_phone}")

- admins
  - user_id uuid (Supabase auth.users.id)

- notices
  - id uuid (pk)
  - title text
  - content text
  - pinned boolean (default false)
  - published boolean (default true)
  - created_at timestamptz, updated_at timestamptz

- privacy_policies
  - id uuid (pk)
  - version text
  - locale text default 'ko-KR'
  - content text
  - published boolean default false
  - effective_date date null
  - last_updated date default current_date
  - created_by text null
  - created_at timestamptz, updated_at timestamptz (trigger maintains updated_at)
  - unique(version, locale)

- phone_otps
  - id uuid (pk)
  - phone text
  - code_hash text (hashed OTP)
  - attempts smallint default 0
  - used boolean default false
  - provider_msg_id text null
  - client_ip inet null
  - user_agent text null
  - created_at timestamptz default now()
  - expires_at timestamptz
  - indexes: phone, created_at; composite (phone, used, expires_at)

- user_onboarding
  - user_id uuid (pk)
  - user_hash text
  - whitelist_passed boolean default false
  - otp_verified boolean default false
  - consent_version text null
  - created_at timestamptz default now()
  - updated_at timestamptz default now()

- simulations
  - id uuid (pk)
  - user_id uuid (auth.users.id)
  - plan_id text (A, B, C, D, K, P, R, F, E)
  - starting_company_round int
  - current_company_round int
  - simulation_rounds int
  - investments jsonb [{round:int, amount:int}]
  - sales_achievement_rates jsonb {round(str): percent(int 50..100)}
  - simulation_results jsonb (history array)
  - memo text null
  - created_at timestamptz, updated_at timestamptz

- consent_records (implementation expectation)
  - id uuid (pk)
  - user_hash text (pre-auth context)
  - user_id uuid null (auth.users.id; null for pre-auth)
  - consent_type text (e.g., 'privacy_policy')
  - consent_version text
  - consent_given_at timestamptz default now()
  - ip_address text null
  - user_agent text null

Security notes:

- RLS recommended: users can only access their own rows (e.g., simulations.user_id = auth.uid()).
- Admin table used to gate admin APIs (server-side check).

---

## 7. Security & Authentication

- Frontend authenticates via Supabase OAuth providers: google, kakao. Sessions persisted with autoRefresh.
- Backend validates Authorization header using Supabase JWKS with audience "authenticated"; extracts sub as user_id.
- CORS: Allow list includes Cloudflare Tunnel domain and local dev hosts/ports.
- Secrets: SUPABASE_SECRET_KEY used server-side. Publishable key only in frontend. SMS provider keys (Solapi) loaded from env.
- PII handling: Consent recorded against user_hash pre-auth; onboarding links the consent version post-auth via user_id.

---

## 8. Functional Requirements

7.1 Pre-auth Whitelist & OTP

- Verify User: POST /api/verify-user with name, phone_number → checks whitelist by sha256(name-phone). Returns is_whitelisted and user_hash when present.
- Send OTP: POST /api/otp/send with name, phone_number → checks whitelist; creates phone_otps; sends via Solapi; returns expires_in_seconds and user_hash when success.
- Verify OTP: POST /api/otp/verify with phone_number, otp_code → validates against latest unused, unexpired record; tracks attempts; marks used on success.

7.2 Privacy Policy & Consent

- Get Policy: GET /api/privacy-policy?version&locale → returns current or specific version; source=db or static-file fallback.
- Record Consent: POST /api/consents with user_hash, consent_type, consent_version, ip/user_agent → upsert into consent_records.
- Get User Consents: GET /api/consents/{user_hash} → list of consent records (pre-auth).

7.3 Authentication & Onboarding Link

- Login: Supabase OAuth redirects back to app.
- Link Onboarding: POST /api/onboarding/link (auth) with whitelist_passed, otp_verified, consent_version → upsert by user_id.
- Onboarding Status: GET /api/onboarding/status (auth) → returns flags and consent_version for gating.

7.4 Simulations

- List: GET /api/simulations (auth) → user-specific list of simulations.
- Detail: GET /api/simulations/{simulation_id} (auth) → single row (owner only).
- Create: POST /api/simulation/create (auth) with plan parameters → inserts row.
- Run: POST /api/simulation/run (auth) with simulation_id → executes FinancialSimulationService; persists results; returns history.
- Update: PATCH /api/simulations/{id} (auth) → updates inputs; clears results.
- Update Memo: PATCH /api/simulations/{id}/memo (auth) → set memo.
- Delete: DELETE /api/simulations/{id} or POST /api/simulation/delete (auth) → delete row if owner.

7.5 Notices (Public + Admin)

- Public list/detail: GET /api/notices, GET /api/notices/{id} (published only).
- Admin (auth + admin):
  - Self-check: GET /api/admin/me
  - Create: POST /api/admin/notices
  - Update: PATCH /api/admin/notices/{id}
  - Delete: DELETE /api/admin/notices/{id}

7.6 Privacy Policies (Admin)

- Create: POST /api/admin/privacy-policies (published must be false at create).
- Update: PATCH /api/admin/privacy-policies/{id} (cannot change published here).
- Publish: POST /api/admin/privacy-policies/{id}/publish (unpublishes others first).
- List/Detail: GET /api/admin/privacy-policies, GET /api/admin/privacy-policies/{id}

7.7 Health

- GET /api/health → supabase probe and latency.

---

## 9. API Contracts (Selected)

Notation: All JSON. Auth header required where noted: `Authorization: Bearer {token}`.

- POST /api/verify-user
  - req: { name: string, phone_number: string }
  - res: { is_whitelisted: boolean, user_hash?: string, detail?: string }

- POST /api/otp/send
  - req: { name: string, phone_number: string }
  - res: { success: boolean, message: string, expires_in_seconds?: number, user_hash?: string }

- POST /api/otp/verify
  - req: { phone_number: string, otp_code: string }
  - res: { success: boolean, message: string, remaining_attempts?: number }

- GET /api/privacy-policy
  - qs: version?, locale?
  - res: { version: string, last_updated: string, content: string, success: boolean, source?: 'db'|'static-file', locale?: string }

- POST /api/consents
  - req: { user_hash: string, consent_type: string, consent_version: string, ip_address?: string, user_agent?: string }
  - res: { user_hash, consent_type, consent_version, consent_given_at, ip_address?, user_agent? }

- POST /api/onboarding/link (auth)
  - req: { whitelist_passed?: boolean, otp_verified?: boolean, consent_version?: string }
  - res: { user_id: string, linked: boolean, message: string, success: true }

- GET /api/onboarding/status (auth)
  - res: { user_id?: string, whitelist_passed: boolean, otp_verified: boolean, consent_version?: string, success: true }

- POST /api/simulation/create (auth)
  - req: { plan_id: string, starting_company_round: number, current_company_round: number, simulation_rounds: number, scheduled_payment: Record<string, number>, sales_achievement_rates?: Record<string, number> }
  - res: { simulation_id: string, plan_id: string, message: string, success: boolean }

- POST /api/simulation/run (auth)
  - req: { simulation_id: string }
  - res: { simulation_id, plan_id, starting_company_round, current_company_round, simulation_rounds, scheduled_payment: Record<string,number>, sales_achievement_rates?: Record<string,number>, history: Array<...>, message, success }

- PATCH /api/simulations/{id} (auth)
  - req: as create payload
  - res: { simulation_id, plan_id, message, success }

- PATCH /api/simulations/{id}/memo (auth)
  - req: { memo: string | null }
  - res: { simulation_id, memo?, message, success }

- DELETE /api/simulations/{id} (auth)
  - res: { simulation_id, message, success }

- Notices (public/admin) and Policies (admin) follow typical CRUD payloads as per services/api.ts.

---

## 10. Simulation Engine (Business Logic)

- Plans: A, B, C, D, K, P, R, F, E with parameters (PLAN_PARAMETERS).
- Core concepts:
  - max_investor_count controls growth vs stable phase.
  - scheduled_payment per start round; min_payment_new/re and revenue_base_divisor.
  - sales_commission, settlement_bonus; round_bonus_rates and sales_achievement_rates.
  - Round 3 sets base return; from round 4, additional revenue = `min(base*bonus_rate, max_bonus) * achievement_rate`.
  - Tax 3.3% applied to total revenue; net profit and cumulative tracked each round.
- Service: FinancialSimulationService(plan_id, scheduled_payment?, sales_achievement_rates?) → run_simulation(rounds) → results.history.
- Persistence: results stored in simulations.simulation_results; recalculated on demand if missing or when inputs change.

---

## 11. Non-Functional Requirements

- Performance: API endpoints should respond < 500ms for typical operations; simulation run depends on rounds but expected to be < 2s for common inputs.
- Availability: Health endpoint surfaces dependency issues; tolerate transient Supabase failures by surfacing errors gracefully.
- Security: JWT validation via JWKS; admin checks via admins table. No secrets in frontend code; use env vars.
- Rate limiting: OTP send limited by per-15-min and daily policies (15-min enforced, daily placeholder present); attempts per code limited (default 3).
- Observability: Minimal logging (avoid logging OTP codes); include error messages in admin flows; health includes supabase latency.
- PWA: Installable manifest and icons; service worker via vite-plugin-pwa (basic). No guaranteed offline behavior for dynamic routes.

---

## 12. PWA Requirements

- Manifest: name, icons (192–512 maskable). Start URL index.html; theme/background colors per UI theme.
- Service Worker: Provided via vite-plugin-pwa defaults; no custom runtime caching specified in source snapshot.
- UX: Mobile-first, landscape enforced component present. MUI theme, responsive layout.
- Installability: HTTPS required; Cloudflare Tunnel domain supported.

---

## 13. UI/UX Flows

- Pre-auth Flow:
  1) OTPPage: user enters name/phone; on success receives user_hash.
  2) ConsentPage: fetch current policy; user must accept; backend records consent (user_hash, version).
  3) LoginPage: Supabase OAuth (Google/Kakao). User can navigate back to OTPPage if needed.

- Post-auth Flow:
  - Onboarding link: App links prior context (whitelist_passed=true, otp_verified=true, consent_version) to user_id.
  - Onboarding gate: If stored consent_version != current policy.version, redirect to ConsentPage. If the stored consent_version is updated at last, redirect users to the MainPage.
  - MainPage: list simulations; open notice board; navigate to PlanEditor, Results.
  - PlanEditor: create/update plans; on run, call simulation/run; ResultsPage renders results.
  - AdminPolicyPage: admin-only CRUD for policies; publish management.

---

## 14. Constraints & Assumptions

- Environment variables:
  - Backend: `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (server-only), `SUPABASE_PUBLISHABLE_KEY` (optional fallback), `SOLAPI_*` for SMS, `OTP_*` limits and secret.
  - Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_BASE_URL`.
- Supabase RLS should be configured on user-owned tables; admin APIs rely on server checks.
- Whitelist table exists with user_hash; seeding/management handled out-of-band.
- Consent records use user_hash pre-auth (note: production schema must match server expectations).
- Docker/Cloudflare Tunnel used for deployment; ports: frontend preview 4173 (currently serving on preview mode, dev: 5173), backend 8000.

---

## 15. Additional Guidelines about Tech Stacks

- Choose and operate the state management solution (e.g., Redux, MobX, Zustand, etc.) that best fits the project requirements and minimizes user friction.
- Follow best practices for directory structure and code organization.
- Ensure all dependencies are clearly documented and versioned.

## 16. Acceptance Criteria (samples)

- OTP & Whitelist
  - Given a whitelisted name+phone, when POST /api/verify-user, then is_whitelisted=true and user_hash returned.
    - The whitelist checking should be part of the OTP authentication process. It should only exist as part of the OTP authentication process. The user_hash itself should only be used for whitelist checking and Onboarding status linking.
  - Given OTP sent, when correct code provided to /api/otp/verify before expiry, then success=true.
  - Given OTP attempts exceed max, when another attempt is made, then success=false and remaining_attempts=0.

- Consent & Policy
  - Given a published policy, when GET /api/privacy-policy, then latest published content returned with source=db.
  - Given user_hash and version, when POST /api/consents, then record exists and GET /api/consents/{user_hash} includes it.

- Auth & Onboarding
  - Given a valid Supabase session token, when calling /api/onboarding/status, then user flags returned; if consent_version != current, app navigates to consent.

- Simulations
  - Given valid inputs, when POST /api/simulation/create, then a simulation row is created with id.
  - Given a created simulation, when POST /api/simulation/run, then results.history is non-empty and saved.
  - Given an updated simulation, when PATCH /api/simulations/{id}, then results are invalidated and re-generated on next run.

- Admin
  - Given an admin user, when GET /api/admin/me, then is_admin=true.
  - Given an admin user, when publishing a policy, then other policies become unpublished, and GET public returns the published one.

- General
 - Navigating back and forth between pages does not cause data loss or unexpected behavior.

---

## 17. Security & Performance Appendix

### 17.1 Scope & Objectives

This appendix formalizes (a) threat model, (b) security controls, (c) service level objectives (SLOs), (d) rate limits, (e) logging & monitoring, (f) data retention. It reflects 2025 best practice for a small internal PWA (60–100 users; peak 30–60) using Supabase + FastAPI + Cloudflare Tunnel.

### 17.2 Assets (Ranked by Sensitivity)

1. Authentication tokens (Supabase JWT).
2. OTP codes (transient) / phone numbers (PII) – NOTE: only hashed OTP stored; phone stored in `phone_otps`.
3. User onboarding status (`user_onboarding` row: whitelist_passed, otp_verified, consent_version).
4. Simulation definitions & results (`simulations`).
5. Admin capabilities (publish/unpublish policies, create notices).
6. Privacy policy content (integrity concern).
7. Infrastructure secrets (Supabase service key, Solapi API keys).
8. user_hash (pseudo-identifier linking pre-auth actions).

### 17.3 Actors

| Actor | Description | Trust Level |
|-------|-------------|-------------|
| End User | Whitelisted internal participant | Low → Elevated post-auth |
| Admin User | User with admin entry in `admins` | Medium (requires server-side verification each request) |
| Attacker (External) | Unauthenticated internet client | None |
| Attacker (Internal) | Whitelisted but malicious | Low (after auth) |
| Supabase | Managed backend (DB/Auth) | High (trusted service) |
| SMS Provider (Solapi) | OTP delivery channel | Medium (assumed correct delivery, not trusted with system auth) |
| Cloudflare Tunnel | Exposure layer for frontend/backend | Medium (network edge) |
| Build / CI System | Produces container images | High (supply chain) |

### 17.4 Trust Boundaries

1. Browser ↔ Backend API (HTTPS, JWT boundary).
2. Backend ↔ Supabase REST/RPC (service key boundary).
3. Backend ↔ SMS Provider (outbound HTTP with API key).
4. Admin UI actions ↔ Admin authorization (table lookup each request).
5. Pre-auth context (user_hash only) ↔ Authenticated context (user_id mapping at onboarding link).

### 17.5 Attack Surface (Key Endpoints / Vectors)

| Surface | Risks | Core Mitigations |
|---------|------|------------------|
| /api/otp/send | Enumeration (phone discovery), abuse (SMS flooding) | Hash whitelist; generic responses; strict rate limits; IP + phone counters |
| /api/otp/verify | Brute force guessing | Attempt counter; lockout; constant-time hash compare; rate limiting |
| /api/onboarding/link | Unauthorized linking / replay | Require valid JWT; idempotent upsert; audit log (planned) |
| /api/admin/* | Privilege escalation | Server-side admin check (not client claim); deny by default; per-action audit |
| /api/simulation/run | Resource exhaustion | User-level rate limit; max rounds constraint; sane defaults |
| JWT Validation | Forged tokens / key rotation lag | Supabase JWKS fetch with caching & TTL; kid verification; audience & issuer checks |
| Cloudflare Tunnel | Exposure config drift | Restrict origins; CORS allowlist; infra change review |
| Dependency Chain | Supply chain | Pin versions; weekly vulnerability scan; lockfile integrity |

### 17.6 Threat Enumeration (STRIDE Summary)

| Category | Example Threat | Impact | Mitigation |
|----------|---------------|--------|-----------|
| Spoofing | Forged admin JWT | Unauthorized admin actions | JWKS signature check + admin table verification |
| Tampering | Modify simulation results | Incorrect analytics | Results regeneration on input change; restrict update fields |
| Repudiation | Admin denies publishing policy | Lack of accountability | Add audit log (timestamp, admin user_id, policy_id) (Planned) |
| Information Disclosure | OTP code leakage in logs | Account takeover | Never log raw codes; store hashed; redact phone except last 2 digits |
| Denial of Service | OTP flood or simulation spam | Service degradation | Layered rate limits, concurrency cap per user, exponential backoff |
| Elevation of Privilege | Normal user hits admin route | Unauthorized access | Centralized dependency `is_admin(user_id)` check each request |

### 17.7 Security Controls (Current vs Planned)

| Control | Status | Notes |
|---------|--------|-------|
| JWT (RS256) validation via JWKS | Implemented | Cache keys (TTL 5–15m) |
| RLS on user-owned tables | Planned | Enforce before production launch |
| Admin server-side check | Implemented | Table lookup each request |
| OTP hashing (HMAC-SHA256) | Planned | Present spec: generic hash; upgrade to HMAC with server secret |
| Rate limiting (OTP send/verify) | Partial | Add per-IP dimension + sliding window |
| Secrets in environment (vault) | Planned | Currently .env in container build context |
| Structured logging (JSON) | Planned | Add trace_id per request |
| Audit logging (admin & onboarding link) | Planned | Append-only table |
| Dependency vulnerability scanning | Planned | Enable GitHub Dependabot / pip-audit weekly |

### 17.8 Service Level Objectives (SLOs)

| Dimension | Target | Measurement | Rationale |
|----------|--------|-------------|-----------|
| API CRUD latency (non-simulation) | p50 < 300ms, p95 < 800ms | From backend timing logs | Internal user responsiveness |
| Simulation run (≤ 500 rounds) | p95 < 2s | Timed endpoint | User feedback threshold |
| Availability (Core API set) | Monthly 99.5% | (Total time - error/outage) / total | Internal stage tolerance |
| OTP send success | > 98% | Count success / attempts | Reliability of onboarding |
| Error rate (5xx) | < 1% of requests | Log aggregation | Stability indicator |
| Policy publish propagation | < 5s | Time diff publish -> visible | Cache invalidation correctness |

Error Budget: 0.5% monthly unavailability; if consumed > 50% mid-period, freeze feature deployment until budget recovers.

### 17.9 Rate Limits (Enforced / Planned)

| Endpoint Group | Limit | Window | Scope Keys | Action on Breach | Status |
|----------------|-------|--------|------------|------------------|--------|
| OTP Send | 3 | 15 min | phone+IP | 429 + generic cooldown msg | Enforce now |
| OTP Send | 10 | 24 h | phone | 429; require manual support | Planned |
| OTP Verify | 6 | 15 min | phone | Lock OTP; require resend | Enforce now |
| OTP Verify | 15 | 24 h | phone | Throttle (fixed 60s delay) | Planned |
| Onboarding Link | 10 | 1 h | user_id | 429 | Planned |
| Simulation Run | 30 | 10 min | user_id | 429; suggest adjust rounds | Planned |
| Admin Policy Publish | 5 | 1 h | admin user_id | 429; log security event | Planned |
| Notices Create | 10 | 1 h | admin user_id | 429 | Planned |

Rate Limit Implementation Guidance: Use in-memory token bucket (fast path) + persistent fallback (Supabase) for sliding window. Include `Retry-After` header where meaningful.

### 17.10 Logging & Monitoring

| Aspect | Spec |
|--------|------|
| Log Format | JSON lines (timestamp, level, trace_id, user_id?, route, latency_ms, outcome_code) |
| Redaction | Mask phone (show last 2 digits), never log OTP code, redact Authorization header |
| Trace Correlation | Generate trace_id per request; propagate to downstream calls (Supabase via custom header if supported) |
| Metrics | request_count{route,status}; latency_histogram_ms; otp_send_attempts; otp_verify_failures; simulation_run_latency_ms; policy_publish_count; admin_action_count |
| Alerts | >5 consecutive OTP send failures (provider outage); p95 latency > target for 15m; 5xx rate >1% over 5m; unusual admin publish burst (>3 in 5m) |
| Dashboard | Onboarding funnel (verify → otp → consent → link → first simulation) |

### 17.11 Key & Secret Management

| Secret | Rotation Policy | Storage (Current) | Migration Plan |
|--------|-----------------|-------------------|----------------|
| Supabase service key | 90 days | .env | Move to managed secret store (e.g., GitHub Actions secrets + runtime injection) |
| Solapi API key | 180 days | .env | Same as above |
| OTP HMAC secret | 180 days (stagger) | .env | Use versioned secret; store secret_version in OTP rows |
| JWKS cache | 5–15 min refresh | Memory | Maintain fallback old key set for grace period |

### 17.12 Data Retention & Purge

| Table | Retention | Purge Mechanism | Rationale |
|-------|-----------|----------------|-----------|
| phone_otps | 24h after expires_at | Daily job (DELETE) | Minimize PII exposure |
| consent_records | Indefinite (legal) | None (export on request) | Compliance trail |
| simulations | Active lifetime | User delete → hard delete (internal stage) | No legal retention requirement yet |
| user_onboarding | Until account deletion | Cascade on user removal | Re-link not required post-delete |
| notices / privacy_policies | Permanent | Never purge (archiving) | Historical reference |
| logs (app) | 30 days | Rolling retention in log store | Cost + internal needs |

### 17.13 Validation & Input Constraints (Security-Relevant Subset)

| Field | Constraint | Security Reason |
|-------|-----------|-----------------|
| phone_number | E.164, length 10–15 | Prevent injection / storage bloat |
| otp_code | 6 digits numeric | Uniform entropy; reject formatting variance |
| plan_id | Enum (A,B,C,D,K,P,R,F,E) | Prevent arbitrary plan execution |
| simulation_rounds | 1–1000 | Prevent CPU abuse |
| memo | ≤ 1000 chars UTF-8 | Avoid oversized payloads |

### 17.14 Operational Security Procedures

| Procedure | Trigger | Action |
|-----------|--------|--------|
| Key Rotation | Scheduled (90d) | Generate new key, deploy, revoke old after 24h overlap |
| OTP Abuse Spike | > 20 send failures (distinct phones) in 5m | Temporarily tighten rate limits & alert |
| Policy Publish | New version published | Invalidate cache; log audit record |
| Security Incident (P1) | Confirmed data exposure | Revoke tokens, rotate keys, notify stakeholders, post-mortem in 72h |

### 17.15 Acceptance / Verification

| Control | Verification Method |
|---------|--------------------|
| Rate Limits | Automated test hitting boundary; expect 429 and Retry-After |
| OTP Hashing | Confirm no raw code persisted (DB inspection) |
| Logging Redaction | Sample logs: ensure masked phone & no secrets |
| RLS Enforcement | Attempt cross-user simulation fetch → 0 rows |
| Latency SLO | Weekly report summarizing p50/p95 vs targets |

---

## 18. Validation & Error Model

### 18.1 Validation Constraints (Comprehensive)

| Domain | Field | Type | Constraints (Min/Max/Format) | Required | Notes |
|--------|-------|------|--------------------------------|----------|-------|
| User | name | string | 1..50, Unicode NFC | Yes (verify-user, otp) | Normalize whitespace |
| User | phone_number | string | E.164, length 10..15 | Yes | Normalized before hashing |
| OTP | otp_code | string | 6 digits (^[0-9]{6}$) | Yes (verify) | Reject leading zeros? (No) |
| Simulation | plan_id | enum | A,B,C,D,K,P,R,F,E | Yes | Validate against constant set |
| Simulation | starting_company_round | int | 1..100 | Yes | Must be <= current_company_round |
| Simulation | current_company_round | int | 1..100 | Yes | >= starting round |
| Simulation | simulation_rounds | int | 1..100 | Yes | Hard cap to prevent abuse |
| Simulation | scheduled_payment | object | keys round:int -> amount: >=0 int | Yes | Validate total sum < configurable cap |
| Simulation | sales_achievement_rates | object | round:string -> 50..100 int | Optional | If absent default plan baseline |
| Simulation | memo | string | 0..1000 chars | Optional | Null allowed to clear |
| Policy | version | string | ^v?[0-9]+\.[0-9]+\.[0-9]+$ (semver) | Yes | Leading v optional |
| Policy | locale | string | ^[a-z]{2}-[A-Z]{2}$ | Yes | Default ko-KR |
| Consent | consent_type | string | whitelist: privacy_policy | Yes | Enum expansion gated |
| Consent | consent_version | string | As policy.version | Yes | Must match published version |
| Onboarding | consent_version | string | As policy.version | Conditional | Only if consent recorded |

### 18.2 Structured Error Object

All error responses MUST return HTTP status != 2xx with JSON body:

```json
{
  "error": {
    "code": "OTP_INVALID",
    "message": "The code you entered is incorrect.",
    "details": { "remaining_attempts": 2 },
    "trace_id": "<uuid>"
  }
}
```

Fields:

- code (string; UPPER_SNAKE): machine parsable.
- message (string; localized-ready, default ko-KR).
- details (object; optional contextual data).
- trace_id (string; correlates logs & metrics).

### 18.3 Error & Status Code Matrix (Excerpt)

| Endpoint | Scenario | HTTP | code | Message (EN draft) | Notes |
|----------|----------|------|------|--------------------|-------|
| POST /api/verify-user | Not whitelisted | 404 | USER_NOT_WHITELISTED | User not found | Hide enumeration (same as invalid?) |
| POST /api/otp/send | Rate limit exceeded | 429 | OTP_SEND_RATE_LIMIT | Too many requests. Try again later. | Include retry_after header |
| POST /api/otp/send | SMS provider failure | 502 | OTP_PROVIDER_FAILURE | Failed to send code. Retry shortly. | Do not reveal provider error |
| POST /api/otp/verify | Wrong code | 400 | OTP_INVALID | Incorrect code. | Decrement attempts |
| POST /api/otp/verify | Expired | 400 | OTP_EXPIRED | Code expired. Request a new one. | No attempt decrement |
| POST /api/otp/verify | Attempts exhausted | 423 | OTP_LOCKED | Too many attempts. Request new code. | 423 Locked |
| POST /api/onboarding/link | Missing consent | 409 | CONSENT_REQUIRED | Please re-accept current policy. | Client should redirect |
| GET /api/onboarding/status | Not linked yet | 200 | (none) | success true with flags | Normal path |
| POST /api/simulation/create | Invalid plan | 400 | PLAN_UNSUPPORTED | Unsupported plan id. | Validation |
| POST /api/simulation/run | Not owner | 403 | FORBIDDEN | You don't have access to this simulation. | RLS + server check |
| PATCH /api/simulations/{id} | Concurrent update | 409 | CONFLICT_MODIFIED | Simulation changed; reload and retry. | Optional optimistic lock |
| POST /api/admin/privacy-policies | Duplicate version | 409 | POLICY_VERSION_EXISTS | Version already exists. | Unique(version,locale) |
| POST /api/admin/privacy-policies/{id}/publish | Already published | 409 | POLICY_ALREADY_PUBLISHED | Policy already published. | Idempotent safety |
| Any | Unhandled exception | 500 | INTERNAL_ERROR | Unexpected error occurred. | trace_id logged |

### 18.4 OTP Resend Policy & UX Microcopy

Policy:

- Initial send: immediate.
- Cooldown between resends: 60s (show countdown).
- Max resends per 10 minutes: 3 (OTP_SEND_RATE_LIMIT if exceeded).
- Expiry: 5 minutes from creation.
- Attempts: 6 attempts per code; after exhaustion require new OTP.

Microcopy (ko-KR baseline examples):

- Sending: "인증 코드를 전송 중입니다..."
- Sent success: "인증 코드가 전송되었습니다. 유효 시간은 5분입니다."
- Resend disabled: "재전송 가능까지 {seconds}초 남았습니다."
- Wrong code: "코드가 올바르지 않습니다. 다시 시도하세요. (남은 시도 {remaining_attempts}회)"
- Expired: "코드가 만료되었습니다. 새 코드를 요청하세요."
- Locked: "시도 가능 횟수를 초과했습니다. 새 코드를 요청하세요."

### 18.5 Accessibility & Internationalization (Minimal Checklist)

| Area | Baseline Requirement |
|------|----------------------|
| Color Contrast | All text/background pairs WCAG 2.1 AA (contrast ≥ 4.5:1) |
| Focus Management | Focus ring visible; programmatic focus on error summary & dialogs |
| Keyboard Nav | All interactive elements reachable via Tab; skip links supported |
| Semantics | Forms use labels; ARIA only for gaps; no div-only buttons |
| Error Announce | Live region (aria-live polite) for form errors & success messages |
| Motion | Avoid layout shift on OTP field; reserve space for errors |
| I18n Prep | All user-visible strings behind translation function `t(key)` placeholder; default ko-KR; no concatenated dynamic strings |
| Date/Number | Use locale-aware formatting utilities |

### 18.6 OpenAPI Specification Integration

- FastAPI auto-generates OpenAPI JSON at `/openapi.json`.
- CI Step: fetch spec after test stage, compare against committed snapshot `docs/api/openapi.snapshot.json`.
- If diff: require PR to include updated snapshot + CHANGELOG note (API Added / Changed / Deprecated).
- Client Generation (optional future): Use openapi-typescript to produce `frontend/src/types/api.ts` (ensuring single source of truth for contracts).
- Backward Compatibility Rules:
  - Adding optional response fields: Allowed (non-breaking).
  - Removing fields or changing semantics: Requires version bump (see Section 20 Versioning & Evolution).
  - Deprecations annotated with `deprecated: true` in OpenAPI and documented in CHANGELOG.

### 18.7 Structured Outcome Codes

Outcome codes (subset) unify logs & analytics: `SUCCESS`, `VALIDATION_ERROR`, `RATE_LIMITED`, `NOT_FOUND`, `FORBIDDEN`, `CONFLICT`, `INTERNAL_ERROR`.

---

## 19. Operational Playbook (Deploy, Monitor, Rollback)

### 19.1 Deployment Workflow

| Stage | Action | Validation | Promotion Criteria |
|-------|--------|-----------|--------------------|
| Dev | Merge to feature branch | Unit & lint pass | Branch policy |
| Staging (optional) | Deploy tagged pre-release | Smoke tests + OpenAPI diff | Manual approval |
| Prod (Internal) | Deploy signed image tag | Health check, migration success | 0 blocking alerts in 15m |

Deployment Steps:

1. Build images with pinned dependency hashes.
2. Run DB migrations inside a transaction (idempotent).
3. Run smoke script: verify /api/health, run OTP send dry-run (provider sandbox), fetch latest policy.
4. If failure: rollback by re-deploying last known-good image + reverse unsafe migrations (forward-only design preferred; use compensating migration if needed).

### 19.2 Monitoring & Alerting Runbook

| Alert | Threshold | Immediate Action | Escalation |
|-------|-----------|------------------|------------|
| OTP provider failure spike | >30% failures 5m | Switch to fallback provider (future) / notify | Engineering lead |
| p95 CRUD latency breach | > 800ms 15m | Inspect DB (locks); check Supabase status | Infra owner |
| 5xx error rate | >1% 5m | Pull logs by trace_id; identify recent deploy | Rollback if deploy-related |
| Admin publish burst | >3 publishes 5m | Verify legitimacy; temporarily raise threshold | Security contact |

### 19.3 Audit Logging Requirements

| Event | Fields | Retention | Purpose |
|-------|--------|-----------|---------|
| policy_publish | policy_id, new_version, admin_user_id, ts, previous_published_id | 1 year | Accountability |
| policy_create | policy_id, version, admin_user_id, ts | 1 year | Change trace |
| notice_create | notice_id, admin_user_id, ts | 6 months | Content provenance |
| onboarding_link | user_id, whitelist_passed, otp_verified, consent_version, ts | 6 months | Onboarding trace |
| admin_login_check | admin_user_id, ts, ip_hash | 3 months | Security anomaly detection |
| simulation_run | simulation_id, user_id, rounds, duration_ms, engine_version, ts | 6 months | Performance & usage |

### 19.4 User Action Analytics (Privacy-Aware)

Anonymous event model (user_id pseudonymous; avoid phone or raw PII):

| Event | Fields | Note |
|-------|--------|------|
| page_view | user_id, path, ts | Path whitelist only |
| session_start | user_id, ts | Derived from first activity after inactivity (30m) |
| session_end | user_id, duration_s, pages_viewed | Calculated asynchronously |
| otp_step | user_id/hash_context, outcome, ts | outcome: sent, verified, expired |
| consent_accept | user_hash/user_id, version, ts | Pre vs post auth mapping |
| simulation_created | user_id, plan_id, ts | Usage metric |
| simulation_run | user_id, simulation_id, rounds, duration_ms | Performance + capacity |

Page dwell time: compute client-side heartbeat (every 15s) aggregated server-side; cap at 5 min per page for analytics normalization.

### 19.5 Rollback Strategy

| Scenario | Action |
|----------|--------|
| API regression | Redeploy previous image (immutably tagged) |
| Failed migration (non-destructive) | Apply down migration (only if explicitly authored) |
| Failed migration (destructive) | Restore from last snapshot backup (Supabase) + replay accepted writes (if feasible) |
| Security incident | Rotate keys (Supabase service, Solapi, OTP secret) sequentially; revoke sessions |

### 19.6 Operational Metrics Dashboard (Recommended Widgets)

- Latency heatmap (p50/p95) by endpoint group.
- OTP funnel (send -> verify success ratio).
- Simulation throughput (runs/hour) & average duration.
- Policy publish history timeline.
- Error code distribution (top 10).

---

## 20. Versioning & Evolution (API, Simulation Engine, Policy Content)

### 20.1 API Versioning Strategy

- Style: URL-less (implicit) minor evolution; add `X-API-Version` response header referencing current semantic version (e.g., 1.3.0).
- Backward Compatible Changes: additive fields, new endpoints.
- Breaking Changes: field removal/rename, semantic change, auth scope change → require major version bump noted in CHANGELOG and OpenAPI `info.version`.
- Deprecation Lifecycle: mark deprecated in OpenAPI + response header `Deprecation: true`; maintain for ≥1 minor version before removal.

### 20.2 Simulation Engine Versioning

- Introduce `engine_version` (semantic) recorded in `simulations.simulation_results` metadata.
- Changes that alter numeric outcomes MUST increment minor (e.g., formula tweak). Algorithmic shift increments major.
- Historical results are immutable: never recompute in-place under a new engine version; re-run produces a new result set with new engine_version.
- Determinism: same inputs + engine_version guarantee identical result; add regression tests snapshotting key scenarios.

### 20.3 Policy Content Versioning

- Existing `privacy_policies.version` acts as semantic version (allow patch bump for typo corrections; patch-level may allow content diff if non-material—log reason in audit).
- Publish flow ensures single active published policy per locale.
- Deprecation: superseded versions remain readable to admins (historical record) but not returned as “current”.

### 20.4 Migration Governance

| Change Type | Version Impact | Required Artifacts |
|-------------|---------------|--------------------|
| Add optional response field | Patch | OpenAPI update, tests |
| Add new endpoint | Minor | OpenAPI, tests, docs entry |
| Remove field / break semantics | Major | Migration plan, comms note |
| Simulation formula adjustment | Minor (engine) | Engine version bump, fixture diffs |
| Simulation structural change | Major (engine) | Migration note, dual-run validation |

### 20.5 CHANGELOG Discipline

- Keep `CHANGELOG.md` with sections: Added, Changed, Deprecated, Removed, Fixed, Security.
- Each release tags commit; link to OpenAPI diff.

### 20.6 Backward Compatibility Testing

- Nightly job: regenerate client types from OpenAPI; diff to previous commit—if incompatible, alert engineering.
- Contract tests call critical endpoints using previous version fixtures to validate additive-only change.

---

## 21. Glossary

- Supabase: Backend-as-a-Service providing Postgres, Auth, Storage, and APIs.
- JWKS: JSON Web Key Set for verifying JWT signatures.
- OTP: One-time password sent via SMS.
- PWA: Progressive Web App supporting installability and service worker caching.
- RLS: Row Level Security (Postgres policy-based row access control).
- SLO: Service Level Objective.
- STRIDE: Threat modeling mnemonic (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).
- Engine Version: Semantic identifier for simulation algorithm revision.

---

## 22. Appendices

- Health probe: /api/health returns status='ok' when Supabase reachable; latency in ms.
- Error handling: Backend returns structured HTTP errors with detail; frontend surfaces messages (see Section 18).
- Known caveats: consent_records schema must include user_hash to match implementation; ensure DB migrations align with API.
- Future Considerations: offline caching strategy, multi-locale policy storage, feature flag framework.

---
