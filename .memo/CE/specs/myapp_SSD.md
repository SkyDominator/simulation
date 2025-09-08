# LOLClub Simulation – Software Specification Document (SSD)

Version: 0.1.4  
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
  - engine_version text default '1.0.0'  -- semantic identifier of algorithm used for latest results
  - investments jsonb [{round:int, amount:int}]
  - sales_achievement_rates jsonb {round(str): percent(int 50..100)}
  - simulation_results jsonb (history array)
  - memo text null
  - created_at timestamptz, updated_at timestamptz

  NOTE: Error conditions related to simulations MUST map to Section 18.3 codes:
  - Concurrency limit → SIMULATION_RATE_LIMIT
  - Engine version mismatch → ENGINE_VERSION_MISMATCH
  - Optimistic locking failure (updated_at drift) → CONFLICT_MODIFIED
  - Not owner / forbidden access → FORBIDDEN
  - Missing simulation id / unknown resource → SIMULATION_NOT_FOUND
  Implementations adding new simulation-related failure paths MUST register a new code (Section 18.3) and update the Event→Outcome mapping (Appendix 22.1).

- consent_records (implementation expectation)
  - id uuid (pk)
  - user_hash text (pre-auth context)
  - user_id uuid null (auth.users.id; null for pre-auth)
  - consent_type text (e.g., 'privacy_policy')
  - consent_version text
  - consent_given_at timestamptz default now()
  - ip_address text null
  - user_agent text null

### 6.2 Canonical table schemas (authoritative sources)
The following canonical column lists are derived from the backend migrations and Pydantic models (single source of truth for the API and DB). These are intentionally explicit to prevent schema drift between the SSD and implementation.

- whitelist
  - user_hash text PRIMARY KEY -- sha256("{name}-{normalized_phone}")

- admins
  - user_id uuid PRIMARY KEY -- references auth.users(id)

- notices
  - id uuid PRIMARY KEY
  - title text NOT NULL
  - content text NOT NULL
  - pinned boolean DEFAULT false
  - published boolean DEFAULT false
  - created_at timestamptz DEFAULT now()
  - updated_at timestamptz DEFAULT now()

- privacy_policies
  - id uuid PRIMARY KEY DEFAULT gen_random_uuid()
  - version text NOT NULL
  - locale text NOT NULL DEFAULT 'ko-KR'
  - content text NOT NULL
  - published boolean NOT NULL DEFAULT false
  - effective_date date NULL
  - updated_at timestamptz NOT NULL DEFAULT now()  -- canonical field name: `updated_at`
  - created_at timestamptz NOT NULL DEFAULT now()
  - created_by text NULL
  - unique(version, locale)

- phone_otps
  - id uuid PRIMARY KEY DEFAULT gen_random_uuid()
  - phone text NOT NULL -- E.164 normalized form
  - code_hash text NOT NULL -- HMAC(secret, phone|code)
  - created_at timestamptz NOT NULL DEFAULT now()
  - expires_at timestamptz NOT NULL
  - attempts smallint NOT NULL DEFAULT 0
  - used boolean NOT NULL DEFAULT false
  - provider_msg_id text NULL
  - client_ip inet NULL
  - user_agent text NULL
  - indexes: phone, created_at, (phone, used, expires_at)

- user_onboarding
  - user_id uuid PRIMARY KEY
  - user_hash text NULL
  - phone_last4 text NULL
  - whitelist_passed boolean DEFAULT false
  - otp_verified boolean DEFAULT false
  - consent_version text NULL
  - consent_given_at timestamptz NULL
  - created_at timestamptz DEFAULT now()
  - updated_at timestamptz DEFAULT now()

- consent_records
  - id uuid PRIMARY KEY DEFAULT uuid_generate_v4()
  - user_id uuid REFERENCES auth.users(id) NOT NULL
  - consent_type text NOT NULL -- e.g., 'privacy_policy'
  - consent_version text NOT NULL
  - consent_given_at timestamptz DEFAULT now()
  - ip_address text NULL
  - user_agent text NULL
  - RLS: users can access their own records (see Section 17.7)

- simulations (application model)
  - id uuid PRIMARY KEY
  - user_id uuid REFERENCES auth.users(id) NOT NULL
  - plan_id text NOT NULL -- enum (A,B,C,...)
  - starting_company_round integer NOT NULL
  - current_company_round integer NOT NULL
  - simulation_rounds integer NOT NULL
  - investments jsonb NULL -- normalized list of {round:int, amount:int}
  - sales_achievement_rates jsonb NULL -- map round->percent
  - simulation_results jsonb NULL -- persisted output + engine_version metadata
  - memo text NULL
  - created_at timestamptz DEFAULT now()
  - updated_at timestamptz DEFAULT now()

Notes:
- These canonical fields are intentionally normalized for the API surface (Pydantic models reflect the same names and shapes). If schema changes are required, update the migrations, Pydantic models in `src/backend/models/schemas.py`, and this SSD simultaneously.

Canonical date/field naming convention:
- The canonical column name for entity update timestamps across all tables is `updated_at` (timestamp with time zone). Where legacy or alternative names appear (for example `last_updated` in some docs), `updated_at` is authoritative; APIs and migrations MUST use `updated_at` and map/convert incoming/outgoing names as needed.


### 6.1 Planned Audit / Analytics Tables

Proposed tables to support Sections 17.10 (Logging & Monitoring), 19.3 (Audit Logging) and 19.4 (User Action Analytics). Will be introduced via migrations once implementation begins.

```sql
-- Administrative actions (publish, create, delete)
create table if not exists audit_admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references admins(user_id),
  action_type text not null check (action_type in (
    'policy_create','policy_update','policy_publish','notice_create','notice_update','notice_delete'
  )),
  entity_id uuid null,
  previous_published_id uuid null,
  new_version text null,
  created_at timestamptz not null default now()
);

-- User events (privacy-aware usage analytics)
create table if not exists audit_user_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event_type text not null check (event_type in (
    'page_view','session_start','session_end','otp_step','consent_accept','simulation_created','simulation_run'
  )),
  event_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Optional: store historical simulation outputs if multiple versions need retention beyond latest
create table if not exists simulation_results_history (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null references simulations(id) on delete cascade,
  engine_version text not null,
  results jsonb not null,
  created_at timestamptz not null default now()
);
```

Retention Alignment (see 17.12):

- audit_admin_actions: 1 year
- audit_user_events: 6 months
- simulation_results_history: retained per simulation lifetime (deleted on simulation delete)

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
| RLS on user-owned tables | MUST (release blocker) | Enforce before production launch; target: before production deployment (sprint+1) |
| Admin server-side check | Implemented | Table lookup each request |
| OTP hashing (HMAC-SHA256) | MUST (release blocker) | Implement HMAC-based OTP storage & verification; target: sprint+1 cutover with dual-version validation |

NOTE: The two items above (RLS and OTP HMAC) are considered release blockers for production. Implementation MUST be completed and validated in staging before promotion. A minimal test matrix (RLS policy verification, OTP code lifecycle, and rate-limit behavior) MUST be added to CI.
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

The service MUST enforce the following rate limits. Where Status is "Planned" the control MUST be implemented before production readiness. Breaches MUST yield the specified error condition and SHOULD include a `Retry-After` header when a retry window is defined.

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

Rate Limit Implementation Guidance: Implementation MUST use an in-memory token bucket (fast path) with a persistent (Supabase) fallback for sliding window accuracy. A `Retry-After` header MUST be returned for OTP send, OTP verify, and simulation run throttles. Limits SHOULD be configurable via environment variables with sane defaults.

### 17.10 Logging & Monitoring

| Aspect | Spec |
|--------|------|
| Log Format | JSON lines (timestamp, level, trace_id, user_id?, route, latency_ms, outcome_code) |
| Redaction | Mask phone (show last 2 digits), never log OTP code, redact Authorization header |
| Trace Correlation | Generate trace_id per request; propagate to downstream calls (Supabase via custom header if supported) |
| Metrics | request_count{route,status}; latency_histogram_ms; otp_send_attempts; otp_verify_failures; simulation_run_latency_ms; policy_publish_count; admin_action_count |
| Alerts | >5 consecutive OTP send failures (provider outage); p95 latency > target for 15m; 5xx rate >1% over 5m; unusual admin publish burst (>3 in 5m) |
| Dashboard | Onboarding funnel (verify → otp → consent → link → first simulation) |

- Logs MUST redact phone numbers except last 2 digits.
- Logs MUST NOT include raw OTP codes or Authorization headers.
- Each request MUST include a generated `trace_id` for correlation.
- Alert thresholds listed MUST trigger an operational notification.

### 17.11 Key & Secret Management

| Secret | Rotation Policy | Storage (Current) | Migration Plan |
|--------|-----------------|-------------------|----------------|
| Supabase service key | 90 days | .env | Move to managed secret store (e.g., GitHub Actions secrets + runtime injection) |
| Solapi API key | 180 days | .env | Same as above |
| OTP HMAC secret | 180 days (stagger) | .env | Use versioned secret; store secret_version in OTP rows |
| JWKS cache | 5–15 min refresh | Memory | Maintain fallback old key set for grace period |

- Secrets MUST NOT be committed to source control.
- Rotation intervals MUST be documented and scheduled.
- OTP HMAC secret MUST rotate at least every 180 days with overlap permitting validation of codes from the previous version for ≤5 minutes.

### 17.12 Data Retention & Purge

The following retention windows are mandatory; the system MUST implement automated purge for any time-bounded data. Permanent tables MUST NOT be purged except through explicit administrative archival procedures.

| Table | Retention | Purge Mechanism | Rationale |
|-------|-----------|----------------|-----------|
| phone_otps | 24h after expires_at | Daily job (DELETE) | Minimize PII exposure |
| consent_records | Indefinite (legal) | None (export on request) | Compliance trail |
| simulations | Active lifetime | User delete → hard delete (internal stage) | No legal retention requirement yet |
| user_onboarding | Until account deletion | Cascade on user removal | Re-link not required post-delete |
| notices / privacy_policies | Permanent | Never purge (archiving) | Historical reference |
| logs (app) | 30 days | Rolling retention in log store | Cost + internal needs |

- `phone_otps` rows MUST be deleted within 24h after `expires_at`.
- `logs` MUST be pruned to maintain ≤ 30 rolling days.
- Planned audit tables MUST honor specified retention (admin: 1 year; user events: 6 months).
- Purge jobs SHOULD emit a summary metric (purged_row_count).
 
### Privacy compliance note
The service follows a privacy-by-design posture: only collect the minimal PII required (phone E.164 and last-4 masking when possible), store transient OTP data for a maximum of 24 hours after expiry, and keep consent records as a legal audit trail. A documented Subject Access / Data Deletion process (DSAR) will be provided to product and legal teams and implemented as an administrative workflow (export + deletion) prior to production launch.

### CI / Contract test checklist (minimal)
The following checks MUST run in CI for every main/staging merge before production promotion:
- OpenAPI snapshot diff: regenerate `docs/api/openapi.snapshot.json` and fail CI on contract drift.
- Spectral (or equivalent) lint: run OpenAPI linting and fail on policy violations for error codes and response schemas.
- Security header smoke: basic HTTP check that core endpoints include HSTS and CSP response headers.
- Accessibility smoke: run a simple axe-core scan against a small set of critical pages (OTPPage, LoginPage, SimulationList) and fail on any critical violations.


### 17.13 Validation & Input Constraints (Security-Relevant Subset)

| Field | Constraint | Security Reason |
|-------|-----------|-----------------|
| phone_number | E.164, length 10–15 | Prevent injection / storage bloat |
| otp_code | 6 digits numeric | Uniform entropy; reject formatting variance |
| plan_id | Enum (A,B,C,D,K,P,R,F,E) | Prevent arbitrary plan execution |
| simulation_rounds | 1–1000 | Prevent CPU abuse |
| memo | ≤ 1000 chars UTF-8 | Avoid oversized payloads |

- All listed constraints MUST be enforced server-side; frontend validation is advisory.
- Violations MUST yield `VALIDATION_ERROR` with field-level detail where feasible.

### 17.14 Operational Security Procedures

| Procedure | Trigger | Action |
|-----------|--------|--------|
| Key Rotation | Scheduled (90d) | Generate new key, deploy, revoke old after 24h overlap |
| OTP Abuse Spike | > 20 send failures (distinct phones) in 5m | Temporarily tighten rate limits & alert |
| Policy Publish | New version published | Invalidate cache; log audit record |
| Security Incident (P1) | Confirmed data exposure | Revoke tokens, rotate keys, notify stakeholders, post-mortem in 72h |

- A confirmed P1 incident MUST trigger token revocation and key rotation within 60 minutes.
- A post-mortem MUST be published internally within 72 hours.

### 17.15 Acceptance / Verification

| Control | Verification Method |
|---------|--------------------|
| Rate Limits | Automated test hitting boundary; expect 429 and Retry-After |
| OTP Hashing | Confirm no raw code persisted (DB inspection) |
| Logging Redaction | Sample logs: ensure masked phone & no secrets |
| RLS Enforcement | Attempt cross-user simulation fetch → 0 rows |
| Latency SLO | Weekly report summarizing p50/p95 vs targets |

---

### 17.16 Security Headers & CSP Baseline

| Header | Value / Pattern | Rationale |
|--------|-----------------|-----------|
| Content-Security-Policy | default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; font-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' | Mitigate XSS; restrict external origins (temporary relax inline/eval) |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-Frame-Options | DENY | Clickjacking defense |
| Referrer-Policy | strict-origin-when-cross-origin | Reduce leaking path info |
| Permissions-Policy | geolocation=(), microphone=(), camera=(), payment=() | Least privilege |
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload | Enforce long-term HTTPS |
| Cross-Origin-Embedder-Policy | require-corp | Future isolation for advanced features |
| Cross-Origin-Opener-Policy | same-origin | Prevent cross-window interference |
| Cross-Origin-Resource-Policy | same-origin | Prevent resource embedding leaks |

Validation:

- Middleware `security_headers_mw` MUST inject headers; startup self-test MUST fetch root & assert presence.
- Playwright smoke validates CSP presence & denies inline script removed test (future when hashes in place).
- Report-Only CSP phase (2 weeks) logging violations to console (future endpoint) before strict mode.

Debt / Follow-up:

- Remove 'unsafe-inline' & 'unsafe-eval' by introducing build-time hashed scripts (target: within 2 sprints).
- Evaluate need for blob: after refactoring workers.

Incident Triggers:

| Missing HSTS or CSP for >5m on prod | MUST alert ops channel |
| CSP violation spike (>50/day) | MUST open investigation ticket |

- All non-health responses MUST include the listed security headers.
- CSP MUST transition from Report-Only to Enforce after violation rate remains below threshold for 14 consecutive days.
- 'unsafe-inline' and 'unsafe-eval' MUST be removed by the target deprecation date; extensions require explicit approval.

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

- `code` MUST be an UPPER_SNAKE identifier defined in Section 18.3.
- `message` MUST be present (localization-ready, default ko-KR).
- `trace_id` MUST correlate to request logs.
- `details` MAY provide structured context and MUST NOT expose secrets or PII beyond masked identifiers.

### 18.3 Error & Status Code Matrix (Comprehensive)

| Endpoint | Scenario | HTTP | code | Message (EN draft) | Notes |
|----------|----------|------|------|--------------------|-------|
| POST /api/verify-user | Not whitelisted | 404 | USER_NOT_WHITELISTED | User not found | Generic to avoid enumeration |
| POST /api/verify-user | Invalid phone format | 400 | VALIDATION_ERROR | Invalid phone number format. | Field errors in details |
| POST /api/otp/send | Rate limit exceeded | 429 | OTP_SEND_RATE_LIMIT | Too many requests. Try again later. | Retry-After |
| POST /api/otp/send | SMS provider failure | 502 | OTP_PROVIDER_FAILURE | Failed to send code. Retry shortly. | Provider hidden |
| POST /api/otp/send | Not whitelisted | 404 | USER_NOT_WHITELISTED | User not found | Same semantics as verify-user |
| POST /api/otp/verify | Wrong code | 400 | OTP_INVALID | Incorrect code. | remaining_attempts included |
| POST /api/otp/verify | Expired | 400 | OTP_EXPIRED | Code expired. Request a new one. | |
| POST /api/otp/verify | Attempts exhausted | 423 | OTP_LOCKED | Too many attempts. Request new code. | Locked until resend |
| POST /api/otp/verify | Rate limit exceeded | 429 | OTP_VERIFY_RATE_LIMIT | Too many verification attempts. | |
| GET /api/privacy-policy | Version not found | 404 | POLICY_NOT_FOUND | Policy version not found. | |
| POST /api/consents | Version mismatch | 409 | CONSENT_VERSION_MISMATCH | Supplied version not current. | Refresh required |
| POST /api/consents | Invalid consent_type | 400 | VALIDATION_ERROR | Invalid consent type. | |
| GET /api/consents/{user_hash} | Not found | 404 | CONSENT_NOT_FOUND | No records for user. | Expected early onboarding |
| POST /api/onboarding/link | Missing prior consent | 409 | CONSENT_REQUIRED | Re-accept current policy. | Blocks linking |
| POST /api/onboarding/link | Already linked | 200 | (none) | Already linked. | Idempotent |
| GET /api/onboarding/status | Not linked yet | 200 | (none) | success true with flags | Normal path |
| POST /api/simulation/create | Invalid plan | 400 | PLAN_UNSUPPORTED | Unsupported plan id. | |
| POST /api/simulation/create | Rounds out of bounds | 400 | SIM_ROUNDS_OOB | simulation_rounds out of bounds. | |
| POST /api/simulation/create | Payment total too large | 400 | PAYMENT_TOTAL_EXCEEDED | Total scheduled payment exceeds cap. | |
| GET /api/simulations | Unauthorized | 401 | UNAUTHORIZED | Authentication required. | |
| GET /api/simulations/{id} | Not owner | 403 | FORBIDDEN | Access denied. | |
| GET /api/simulations/{id} | Not found | 404 | SIMULATION_NOT_FOUND | Simulation not found. | |
| POST /api/simulation/run | Engine version mismatch | 409 | ENGINE_VERSION_MISMATCH | Engine updated; re-run required. | |
| POST /api/simulation/run | Concurrency cap reached | 429 | SIMULATION_RATE_LIMIT | Too many concurrent runs. | |
| PATCH /api/simulations/{id} | Concurrent update | 409 | CONFLICT_MODIFIED | Simulation changed; reload. | optimistic lock |
| PATCH /api/simulations/{id} | Validation fail | 400 | VALIDATION_ERROR | Field constraints violated. | Field list in details |
| PATCH /api/simulations/{id}/memo | Memo too long | 400 | MEMO_TOO_LONG | Memo length exceeds limit. | |
| DELETE /api/simulations/{id} | Not found | 404 | SIMULATION_NOT_FOUND | Simulation not found. | |
| DELETE /api/simulations/{id} | Not owner | 403 | FORBIDDEN | Access denied. | |
| POST /api/admin/privacy-policies | Duplicate version | 409 | POLICY_VERSION_EXISTS | Version exists. | |
| POST /api/admin/privacy-policies/{id}/publish | Already published | 409 | POLICY_ALREADY_PUBLISHED | Policy already published. | |
| POST /api/admin/privacy-policies/{id}/publish | Not found | 404 | POLICY_NOT_FOUND | Policy not found. | |
| PATCH /api/admin/privacy-policies/{id} | Published immutable | 409 | POLICY_PUBLISHED_IMMUTABLE | Cannot modify published policy. | |
| GET /api/admin/privacy-policies/{id} | Not found | 404 | POLICY_NOT_FOUND | Policy not found. | |
| GET /api/admin/me | Not admin | 403 | FORBIDDEN | Admin privileges required. | |
| POST /api/admin/notices | Validation fail | 400 | VALIDATION_ERROR | Invalid notice fields. | |
| PATCH /api/admin/notices/{id} | Not found | 404 | NOTICE_NOT_FOUND | Notice not found. | |
| DELETE /api/admin/notices/{id} | Not found | 404 | NOTICE_NOT_FOUND | Notice not found. | |
| DELETE /api/admin/notices/{id} | Not admin | 403 | FORBIDDEN | Admin privileges required. | |
| GET /api/notices/{id} | Not found | 404 | NOTICE_NOT_FOUND | Notice not found. | |
| GET /api/health | Degraded | 200 | HEALTH_DEGRADED | Service degraded. | Include latency metrics |
| Any | Validation error | 400 | VALIDATION_ERROR | Invalid request payload. | |
| Any | Method not allowed | 405 | METHOD_NOT_ALLOWED | Method not allowed. | Framework default |
| Any | Unauthorized | 401 | UNAUTHORIZED | Authentication required. | |
| Any | Forbidden | 403 | FORBIDDEN | Access denied. | |
| Any | Rate limited | 429 | RATE_LIMITED | Too many requests. | Generic fallback |
| Any | Not found | 404 | NOT_FOUND | Resource not found. | Generic fallback |
| Any | Internal error | 500 | INTERNAL_ERROR | Unexpected error occurred. | trace_id logged |

Maintenance: New endpoints MUST append a row and update OpenAPI responses. Removing or changing semantics of an existing code MUST trigger a major API version bump (see 20.1). Cross-References: SIMULATION_RATE_LIMIT & ENGINE_VERSION_MISMATCH (Section 18.8 Pagination & Concurrency Policies), CONFLICT_MODIFIED (Optimistic locking policy Section 18.8), POLICY_VERSION_EXISTS / POLICY_ALREADY_PUBLISHED (Policy lifecycle Section 20.3), and ENGINE_VERSION_MISMATCH (Engine governance Section 20.2). When introducing a new code implementers MUST: (a) add to this matrix, (b) add an outcome code if user-visible state change, (c) update Appendix 22.1 Event→Outcome mapping, (d) extend contract tests for negative path coverage.

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

- Snapshot path: `docs/api/openapi.snapshot.json` (authoritative committed contract) and MUST be present on main.
- Regeneration (local): `curl -s http://localhost:8000/openapi.json > docs/api/openapi.snapshot.json` (backend running) OR programmatic extraction. Generation MUST be reproducible.
- CI pipeline:
  1. Run tests.
  2. Fetch live spec → temporary file.
  3. Diff with snapshot. If drift: fail unless snapshot + CHANGELOG updated.
  4. Spectral lint for style / completeness (e.g., error responses present, tag naming).
  5. (Optional) Generate TS types: `npx openapi-typescript docs/api/openapi.snapshot.json -o src/frontend/src/types/api.ts`.
- Contract tests MUST validate representative negative paths return matrix-defined error codes (Section 18.3) and MUST fail the pipeline on drift.
- Backward compatibility rules:
  - Additive optional fields: non-breaking.
  - Removal / required field addition / semantic change: breaking (major version bump Section 20).
  - Deprecations: mark with `deprecated: true` and add CHANGELOG entry.

### 18.7 Structured Outcome Codes

Outcome codes unify logs & analytics and MUST align with error matrix codes where applicable: `SUCCESS`, `VALIDATION_ERROR`, `RATE_LIMITED`, `NOT_FOUND`, `FORBIDDEN`, `CONFLICT_MODIFIED`, `INTERNAL_ERROR`, `ENGINE_VERSION_MISMATCH`, `SIMULATION_RUN_COMPLETED`, `POLICY_PUBLISHED`, `OTP_INVALID`, `OTP_EXPIRED`, `OTP_LOCKED`. Introducing a new outcome code MUST add logging + dashboard updates.

### 18.8 Pagination & Concurrency Policies

| Topic | Policy | Rationale |
|-------|--------|-----------|
| Default page size | 50 | Balanced payload & latency |
| Max page size | 200 | Prevent large scans |
| Pagination style | Offset+limit (initial) | Simplicity; evaluate cursor later |
| Sorting (simulations) | created_at desc | Stable recency ordering |
| Sorting (notices) | created_at desc | Recency priority |
| Concurrency (sim runs) | 1 active run/user (MUST enforce) | Prevent CPU spikes |
| Conflict detection | updated_at compare → 409 | Optimistic locking semantics |
| Rate-limited run error | SIMULATION_RATE_LIMIT | Communicate retry condition |
| Engine mismatch | ENGINE_VERSION_MISMATCH | Ensures deterministic expectations |

Clients SHOULD refetch entity on 409 and MUST handle 429 by delaying retries using backoff (1s, 2s, 4s...). Server MUST supply appropriate status codes and SHOULD include a diagnostic message.

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

- Introduce `engine_version` (semantic) recorded in `simulations.simulation_results` metadata (MUST exist for every persisted result set).
- Changes that alter numeric outcomes MUST increment minor (e.g., formula tweak). Algorithmic shift increments major.
- Historical results are immutable: MUST NOT recompute in-place under a new engine version; re-run produces a new result set.
- Determinism: same inputs + engine_version MUST yield identical results; regression snapshot tests cover canonical scenarios.
- Migration Note: initial backfill sets engine_version='1.0.0' for all existing rows; future version bumps require (a) CHANGELOG entry, (b) new regression snapshot tests, (c) adding upgrade rationale to audit log on first deploy.
- Regression Test Scaffold:
  - Directory: `backend/tests/engine_snapshots/`
  - Fixture: `{ "input": {...}, "expected": { "engine_version": "1.0.0", "results_hash": "<sha256>", "metrics": { ... } } }`
  - Hash = SHA256 of canonical JSON (sorted keys) of numeric outputs.
  - CI job `engine-snapshot` fails if hash drift occurs without engine_version bump.

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

### 22.1 Event → Outcome Code Mapping

| Event (Audit / User) | Trigger Scenario | Outcome Code | Notes |
|----------------------|------------------|--------------|-------|
| simulation_run.start | User initiates run (pre-exec) | (none) | Logged prior to execution for duration calc |
| simulation_run.complete | Successful execution | SIMULATION_RUN_COMPLETED | Add duration_ms metric |
| simulation_run.engine_mismatch | engine_version stale | ENGINE_VERSION_MISMATCH | Client MUST re-run after refresh |
| simulation_run.rate_limited | Concurrency cap hit | SIMULATION_RATE_LIMIT | Client SHOULD backoff (see 18.8) |
| otp.verify.invalid | Wrong code | OTP_INVALID | Include remaining_attempts in details |
| otp.verify.expired | Code expired | OTP_EXPIRED |  |
| otp.verify.locked | Attempts exhausted | OTP_LOCKED | Further attempts blocked until resend |
| otp.send.rate_limited | Exceeded send policy | OTP_SEND_RATE_LIMIT | 429 with Retry-After |
| consent.accept.version_mismatch | Version not current | CONSENT_VERSION_MISMATCH | Requires refresh of policy |
| policy.publish.success | Admin publishes | POLICY_PUBLISHED | Tracked for audit dashboard |
| policy.publish.conflict | Already published | POLICY_ALREADY_PUBLISHED | Admin UX surfaces prior state |
| simulation.update.conflict | Optimistic lock fail | CONFLICT_MODIFIED | Client MUST refetch |
| any.validation.failure | Payload invalid | VALIDATION_ERROR | Field list in details |
| any.rate.limit.generic | Generic rate limiting | RATE_LIMITED | Fallback throttle |
| any.internal.error | Unhandled exception | INTERNAL_ERROR | trace_id logged |

Adding a new outcome-producing event MUST: (1) update this table, (2) add/confirm error code in Section 18.3, (3) ensure logging pipeline captures event_type, outcome_code, trace_id.

### 22.2 Accessibility Requirement ↔ WCAG Mapping

| Requirement (Section 18.5) | WCAG 2.1 Success Criteria | Notes |
|---------------------------|----------------------------|-------|
| Color Contrast ≥4.5:1 | 1.4.3 Contrast (Minimum) | Use design token contrast checks in CI (optional) |
| Focus ring visible & programmatic focus | 2.4.3 Focus Order; 2.4.7 Focus Visible | Ensure no outline suppression via CSS reset |
| Keyboard navigation for interactive elements | 2.1.1 Keyboard | Include skip link at top of page |
| Semantic form labeling | 1.3.1 Info and Relationships; 3.3.2 Labels or Instructions | ARIA only where native semantics insufficient |
| Live region for errors | 4.1.3 Status Messages | aria-live="polite" region near form root |
| Stable layout (avoid shifts) | 2.2.1 Timing Adjustable (indirect), 2.3.3 Animation from Interactions | Reserve space for validation messages |
| I18n string externalization | 3.1.2 Language of Parts | Future multi-locale expansion |

Axe-core CI scan MUST report 0 critical violations; additions require justification & tracked remediation issue.

### 22.3 Performance Test Acceptance Targets

These targets inform the lightweight performance smoke (Section 23) and are distinct from production SLOs; exceeding them FAILS the perf job.

| Endpoint Group | p50 (ms) | p95 (ms) | Max Test Rounds | Concurrent Virtual Users | Notes |
|----------------|----------|----------|------------------|--------------------------|-------|
| OTP send (verify-user + send) | 120 | 400 | 200 | 5 | External SMS mocked |
| OTP verify | 80 | 300 | 200 | 5 | Includes DB read/update |
| Simulations list (GET /api/simulations) | 60 | 250 | 150 | 5 | Warm cache expectations |
| Simulation create | 90 | 350 | 150 | 5 | Insert + validation |
| Simulation run (algorithm) | 150 | 600 | 120 | 3 | CPU-bound deterministic run |
| Privacy policy fetch | 40 | 180 | 150 | 5 | Simple select + cache |

If p95 exceeds target by >10% the pipeline MUST mark build unstable and require manual approval before deploy.

---

## 23. Testing & CI Pipeline

### 23.1 Test Layers

| Layer | Tooling | Purpose |
|-------|---------|---------|
| Backend unit | pytest | Validate pure logic & helpers |
| Backend integration | pytest + test DB | Endpoint + DB contract |
| Simulation invariants | pytest + hypothesis | Detect algorithm edge regressions |
| Frontend unit | Vitest + RTL | Component & hook behavior |
| Contract (API) | Custom script + JSON schema + Spectral | Ensure responses match OpenAPI snapshot & style rules |
| Accessibility | axe-core (Playwright/JS) | Baseline WCAG scanning for critical flows |
| Performance smoke | k6/Locust (light) | SLO guard (p95 latency) |
| Security scanning | pip-audit, npm audit, optional Bandit | Dependency/code risk |

### 23.2 Gates & Thresholds

| Metric | Threshold |
|--------|-----------|
| Backend coverage | ≥75% lines (critical modules ≥90%) |
| Frontend coverage | ≥60% lines |
| OpenAPI drift | 0 (snapshot updated or fail) |
| Axe critical violations | 0 |
| Contract tests | 100% pass |

### 23.3 CI Job Order (Proposed)
 
1. Lint & Type Check (ESLint, tsc).
2. Backend tests + coverage.
3. Frontend tests + coverage.
4. Generate & diff OpenAPI snapshot (workflow: `openapi-snapshot.yml`) – pipeline MUST fail if any breaking (non-additive) change detected.
5. Spectral lint spec via `.spectral.yaml` (rules: operation-tags, no-unused-components, operationId-unique, path-kebab-case) – MUST pass with zero errors.
6. Contract tests (uses snapshot + running app where needed).
7. Accessibility scan (headless pages: OTP, Consent, Main, Admin Policy).
8. Security scans (pip-audit, npm audit) fail on HIGH.
9. Build & tag images (content digest).
10. Publish artifacts (coverage, spec, images).

### 23.4 Failure Handling

- On drift: provide unified diff; developer updates snapshot + CHANGELOG section.
- On flaky test (tagged @flaky): auto retry once; otherwise fail.
- On performance regression (p95 > budget + 10%): mark build unstable, require investigation.
- On engine snapshot drift: hash mismatch without engine_version bump -> fail; with bump -> require fixture regen.

### 23.5 Local Developer Commands (Illustrative)

| Command | Description |
|---------|-------------|
| make test-backend | Run backend unit/integration tests |
| make test-frontend | Run frontend tests |
| make openapi-snapshot | Regenerate OpenAPI snapshot file |
| make contract-test | Run contract test suite |

### 23.6 Reporting

- PR comment summarizing coverage deltas & drift status.
- Weekly trend (optional) for latency + error rate extracted from logs.

---

### 23.7 Security Test Checklist (Mandatory in CI)

Automated security validation step MUST execute after contract tests and BEFORE image publish. All MUST pass:

| Category | Test | Method | Expected Result |
|----------|------|--------|-----------------|
| Headers | HSTS, CSP, X-Content-Type-Options, X-Frame-Options present | HTTP probe against running container | All headers present with configured values |
| Rate Limiting | OTP send > policy threshold | Repeated POST /api/otp/send | 429 with OTP_SEND_RATE_LIMIT + Retry-After |
| OTP Lockout | Exhaust attempts | Repeated wrong codes | 423 with OTP_LOCKED after max attempts |
| Concurrency | Parallel simulation runs >1 | Spawn 2 run requests | Second returns 429 SIMULATION_RATE_LIMIT |
| Engine Version | Run with stale engine_version | Simulate engine bump & run | 409 ENGINE_VERSION_MISMATCH |
| Authorization | Access another user's simulation | Force ID swap in token context | 403 FORBIDDEN or 404 SIMULATION_NOT_FOUND per policy |
| JWT Audience | Invalid aud claim | Forge token with wrong aud | 401 UNAUTHORIZED |
| Error Schema | Malformed request | Send invalid JSON | 400 VALIDATION_ERROR; schema matches Section 18.2 |
| Dependency Scan | pip-audit / npm audit | Tooling | No HIGH (fail otherwise) |
| CSP Violation Budget | Inject inline script in test page | Headless browser evaluation | Block execution; no 'unsafe-inline' |

Failures MUST block merge. New security-relevant endpoints MUST add at least one negative-path test here.
