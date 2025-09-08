# LOLClub Simulation – Software Specification Document (SSD)

Version: 0.1.0  
Date: 2025-09-05  
Status: Draft (auto-generated from source)  
Owners: Product, Engineering (Backend/Frontend)

---

## 1. Introduction / Purpose

LOLClub Simulation is a PWA that allows whitelisted users to sign in via Supabase OAuth, manage investment plan simulations, and review results. The app enforces a pre-auth onboarding flow (whitelist + OTP + privacy consent) and provides an admin UI for managing privacy policies and notices. The backend is a FastAPI service integrated with Supabase (Auth, Postgres, Storage), and the frontend is a React/Vite app.

Goals:

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

---

## 4. System Architecture

- Frontend: React 19 + TypeScript + Vite (vite-plugin-pwa, MUI for UI). Auth via @supabase/supabase-js. State persisted selectively to localStorage/sessionStorage.
- Backend: FastAPI (Python 3.12), Pydantic v2 schemas, Supabase client (REST/RPC). JWT verification uses Supabase JWKS.
- Data: Supabase Postgres (tables below). Auth via Supabase; JWT audience "authenticated". Optional static fallback for policy content.
- Infra: Dockerized services; Cloudflare Tunnel for public frontend domain; CORS configured for local dev and tunnel domain.

High-level flow:

1) Pre-auth: OTP Authentication (includes WhitelistCheck) -> ConsentPage -> Login (Supabase OAuth).  
2) Auth: Backend validates JWT via Supabase JWKS; issues user-specific data access.  
3) App: Users manage simulations; admins manage notices/policies.  

---

## 5. Data & Models (Supabase)

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

## 6. Security & Authentication

- Frontend authenticates via Supabase OAuth providers: google, kakao. Sessions persisted with autoRefresh.
- Backend validates Authorization header using Supabase JWKS with audience "authenticated"; extracts sub as user_id.
- CORS: Allow list includes Cloudflare Tunnel domain and local dev hosts/ports.
- Secrets: SUPABASE_SECRET_KEY used server-side. Publishable key only in frontend. SMS provider keys (Solapi) loaded from env.
- PII handling: Consent recorded against user_hash pre-auth; onboarding links the consent version post-auth via user_id.

---

## 7. Functional Requirements

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

## 8. API Contracts (Selected)

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

## 9. Simulation Engine (Business Logic)

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

## 10. Non-Functional Requirements

- Performance: API endpoints should respond < 500ms for typical operations; simulation run depends on rounds but expected to be < 2s for common inputs.
- Availability: Health endpoint surfaces dependency issues; tolerate transient Supabase failures by surfacing errors gracefully.
- Security: JWT validation via JWKS; admin checks via admins table. No secrets in frontend code; use env vars.
- Rate limiting: OTP send limited by per-15-min and daily policies (15-min enforced, daily placeholder present); attempts per code limited (default 3).
- Observability: Minimal logging (avoid logging OTP codes); include error messages in admin flows; health includes supabase latency.
- PWA: Installable manifest and icons; service worker via vite-plugin-pwa (basic). No guaranteed offline behavior for dynamic routes.

---

## 11. PWA Requirements

- Manifest: name, icons (192–512 maskable). Start URL index.html; theme/background colors per UI theme.
- Service Worker: Provided via vite-plugin-pwa defaults; no custom runtime caching specified in source snapshot.
- UX: Mobile-first, landscape enforced component present. MUI theme, responsive layout.
- Installability: HTTPS required; Cloudflare Tunnel domain supported.

---

## 12. UI/UX Flows

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

## 13. Constraints & Assumptions

- Environment variables:
  - Backend: `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (server-only), `SUPABASE_PUBLISHABLE_KEY` (optional fallback), `SOLAPI_*` for SMS, `OTP_*` limits and secret.
  - Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_BASE_URL`.
- Supabase RLS should be configured on user-owned tables; admin APIs rely on server checks.
- Whitelist table exists with user_hash; seeding/management handled out-of-band.
- Consent records use user_hash pre-auth (note: production schema must match server expectations).
- Docker/Cloudflare Tunnel used for deployment; ports: frontend preview 4173 (currently serving on preview mode, dev: 5173), backend 8000.

---

## 14. Additional Guidelines about Tech Stacks

- Choose and operate the state management solution (e.g., Redux, MobX, Zustand, etc.) that best fits the project requirements and minimizes user friction.
- Follow best practices for directory structure and code organization.
- Ensure all dependencies are clearly documented and versioned.

## 15. Acceptance Criteria (samples)

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

## 15. Glossary

- Supabase: Backend-as-a-Service providing Postgres, Auth, Storage, and APIs.
- JWKS: JSON Web Key Set for verifying JWT signatures.
- OTP: One-time password sent via SMS.
- PWA: Progressive Web App supporting installability and service worker caching.

---

## 16. Appendices

- Health probe: /api/health returns status='ok' when Supabase reachable; latency in ms.
- Error handling: Backend returns structured HTTP errors with detail; frontend surfaces messages.
- Known caveats: consent_records schema must include user_hash to match implementation; ensure DB migrations align with API.
