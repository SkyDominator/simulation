# Research report: Simulation app architecture, flows, and risks (2025-09-05)

## Summary of findings

- The application is a two-tier PWA: a FastAPI backend (Python 3.11+) with Supabase as the data store/auth, and a React + TypeScript + Vite frontend using MUI and Supabase Auth.
- Backend responsibilities: JWT auth against Supabase JWKS, OTP issuance/verification via Solapi, whitelist gating, consent recording and retrieval, notices (public + admin CRUD), privacy policy (public + admin CRUD/publish), user onboarding flags, and simulation CRUD/run logic backed by a financial simulation engine.
- Frontend responsibilities: pre-auth flow (whitelist → OTP → consent → login), post-auth app (list simulations, run/view results, plan editor with validation, memo management, summary report, notice board modal, admin privacy policy UI). State persisted minimally in localStorage/sessionStorage (no secrets).
- Key risks found:
  - OTP phone normalization inconsistency leads to verification failure and SMS send issues (backend mismatch between storing and verifying). [backend/services/otp/otp_service.py]
  - Whitelist hash generation inconsistency between two endpoints (normalized vs raw phone) could cause user experience mismatch. [backend/api/routes.py]
  - Unauthenticated consent write tied to user_hash (SHA-256 of name-phone) is susceptible to spoofing if the hash is leaked or guessed; consider auth or anti-automation controls. [backend/api/routes.py]
  - JWT validation may break with JWK dict usage if library expects a constructed key; cache invalidation only on kid miss (no TTL). [backend/auth/jwt.py]
  - Privacy policy retrieval falls back to disk with elevated exceptions handled, but path fallback OK; ensure file presence in deployments. [backend/api/routes.py]
  - Supabase client created per request (lightweight), acceptable for current scale; watch for latency on cold starts.
  - Frontend persists UI state broadly; tokens handled by Supabase SDK (local/global signOut flows cover common quirks).

## Details of findings

### Backend architecture

- Entry: `src/backend/main.py`
  - Creates FastAPI app factory, applies CORS, mounts API router.
- Configuration: `src/backend/config/settings.py`
  - Dataclass-like settings loader for Supabase keys, OTP limits, SMS provider config, and CORS origins; sets up logging.
- Router: `src/backend/api/routes.py`
  - Public endpoints: root, health, notices list/detail, privacy policy fetch, consent record/get, OTP send/verify, whitelist verify (legacy).
  - Protected endpoints (Depends authenticate_jwt_token): simulations CRUD/run, admin notices CRUD, admin privacy policy CRUD/publish, onboarding link/status, admin self-check.
  - Uses a lazy `_supabase_client()` that prefers server-side secret key and falls back to publishable key.
- Auth: `src/backend/auth/jwt.py`
  - HTTP Bearer scheme; fetches JWKS from `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`, caches keys; decodes JWT and returns `sub` as user id.
- Domain models: `src/backend/models/schemas.py`
  - Pydantic models for requests/responses across simulations, notices, consent, OTP, privacy policy, onboarding.
- Simulation orchestration: `src/backend/services/simulations.py`
  - Thin service wrapping Supabase access and calling the simulation engine (`FinancialSimulationService` in `simulation_service.py`).
- Simulation engine: `src/backend/simulation_service.py`
  - Core stateful engine (Investors, per-round calculations, result aggregator) parameterized by plan.
- Constants: `src/backend/constants.py`
  - Plan parameter maps A–F, K, P, R with schedule, bonuses, rates, etc.
- OTP: `src/backend/services/otp/*`
  - `otp_service.py`: rate limits, generate/hash/store OTP, send via Solapi, verify and mark used.
  - `solapi_sms.py`: Solapi API client wrapper.
  - `nhn_cloud_sms.py`: NHN Cloud SMS client (legacy, not invoked now).

### Frontend architecture

- App shell: `src/frontend/src/App.tsx`
  - Theme + CssBaseline + AuthProvider + LandscapeEnforcer + Shell with `AppController`.
- Entry: `src/frontend/src/main.tsx`
  - Renders App, registers SW with update prompt.
- Auth context: `src/frontend/src/context/AuthContext.tsx` (+ `AuthContextBase.ts`, `useAuth.ts`)
  - Wraps Supabase session state; robust signOut including iOS quirks and storage purge.
- App controller and UX flow: `src/frontend/src/AppController.tsx`
  - Drives pre-auth flow (whitelist/consent/login) and post-auth navigation; persists non-sensitive UI state; links onboarding after login; checks consent version post-login.
- Pages:
  - `WhitelistCheckPage.tsx`: name+phone, sends OTP, drives OTP verification step.
  - `OtpVerificationPage.tsx`: input OTP, verify against backend, set userHash in sessionStorage.
  - `ConsentPage.tsx`: fetch policy, show markdown, require checkbox; on Accept, records consent; persists version in sessionStorage.
  - `LoginPage.tsx`: Supabase OAuth (Google/Kakao) with redirect.
  - `MainPage.tsx`: lists simulations, actions, logout, notice modal, policy page link, generates summary report.
  - `pages/PlanEditor/index.tsx`: wizard-like plan editor with validation and defaulting; creates/updates simulations.
  - `ResultsPage.tsx`, `AdminPolicyPage.tsx` (not detailed here; present and integrated).
- Services:
  - `services/api.ts`: typed fetch wrapper for all backend endpoints; base URL from Vite env or localhost.
- Types/utilities/components: MUI-based components; `utils/simulation.ts` provides calculations for derived stats.

## Code map (key files, symbols, and relationships)

Note: Line numbers are approximate and based on the current branch view.

### Backend

- `src/backend/main.py`
  - create_app(): lines ~9–20
  - app = create_app(): line ~25
  - __main__ uvicorn runner: lines ~27–32

- `src/backend/config/settings.py`
  - @dataclass Settings: lines ~10–64
  - __post_init__: lines ~44–64
  - settings = Settings(): line ~66

- `src/backend/api/routes.py`
  - router = APIRouter(): line ~23
  - _supabase_client(): lines ~26–36
  - root(): GET "/": line ~42
  - verify_user(): POST "/api/verify-user": lines ~45–57
  - send_otp(): POST "/api/otp/send": lines ~59–92
  - verify_otp(): POST "/api/otp/verify": lines ~94–103
  - list_notices(): GET "/api/notices": lines ~105–113
  - get_notice(): GET "/api/notices/{id}": lines ~115–121
  - _assert_admin(): lines ~125–136
  - admin_me(): GET "/api/admin/me": lines ~138–142
  - create_notice(): POST "/api/admin/notices": lines ~144–160
  - update_notice(): PATCH "/api/admin/notices/{id}": lines ~162–179
  - delete_notice(): DELETE "/api/admin/notices/{id}": lines ~181–188
  - create_privacy_policy(): POST "/api/admin/privacy-policies": lines ~192–224
  - update_privacy_policy(): PATCH "/api/admin/privacy-policies/{id}": lines ~226–260
  - delete_privacy_policy(): DELETE "/api/admin/privacy-policies/{id}": lines ~262–272
  - publish_privacy_policy(): POST "/api/admin/privacy-policies/{id}/publish": lines ~274–292
  - list_privacy_policies(): GET "/api/admin/privacy-policies": lines ~294–305
  - get_privacy_policy_admin(): GET "/api/admin/privacy-policies/{id}": lines ~307–314
  - get_simulations(): GET "/api/simulations": line ~316
  - get_simulation_details(): GET "/api/simulations/{id}": lines ~318–324
  - create_simulation(): POST "/api/simulation/create": line ~326
  - run_simulation(): POST "/api/simulation/run": line ~328
  - update_simulation(): PATCH "/api/simulations/{id}": line ~330
  - update_simulation_memo(): PATCH "/api/simulations/{id}/memo": line ~332
  - delete_simulation(): DELETE "/api/simulations/{id}": line ~334
  - delete_simulation_post(): POST "/api/simulation/delete": line ~336
  - health(): GET "/api/health": lines ~339–365
  - record_consent(): POST "/api/consents": lines ~371–409
  - get_user_consents(): GET "/api/consents/{user_hash}": lines ~411–430
  - get_privacy_policy(): GET "/api/privacy-policy": lines ~432–483
  - link_onboarding(): POST "/api/onboarding/link": lines ~489–508
  - get_onboarding_status(): GET "/api/onboarding/status": lines ~510–524

- `src/backend/auth/jwt.py`
  - JWKSClient: lines ~17–34
  - authenticate_jwt_token(): lines ~42–85

- `src/backend/models/schemas.py`
  - Pydantic models: UserCheckRequest, Simulation\* types, Notice\*, Consent\*, OTP\*, PrivacyPolicy\*, Onboarding\*; lines ~6–end.
  - Utility: scheduled_payment_from_investments(): lines ~101–103

- `src/backend/services/simulations.py`
  - get_supabase_client(): lines ~17–24
  - class SimulationService: lines ~26–141
    - create(): ~32–61
    - run(): ~63–102
    - update(): ~104–131
    - delete(): ~133–141
    - list_for_user(): ~143–148
    - update_memo(): ~150–164

- `src/backend/simulation_service.py`
  - class Investor: lines ~18–48
  - class SimulationRoundResult: lines ~51–77
  - class SimulationResults: lines ~80–97
  - class FinancialSimulationService: lines ~100–269
    - __init__(): ~115–157
    - _add_new_investor(): ~159–171
    - _check_settlement_bonus_condition(): ~173–184
    - _calculate_revenue(): ~186–230
    - _calculate_actual_payment(): ~232–254
    - run_single_round(): ~256–333
    - run_simulation(): ~335–366

- `src/backend/services/otp/otp_service.py`
  - class OTPService: lines ~9–177
    - __init__(): ~13–18
    - _check_rate_limits(): ~20–54
    - request_otp(): ~56–111
    - verify_otp(): ~113–177

- `src/backend/services/otp/solapi_sms.py`
  - class SolapiSMSClient: lines ~12–94
    - send_sms(): ~29–82
    - send_otp(): ~84–94

- `src/backend/constants.py`
  - PLAN_PARAMETERS: lines ~1–end

### Frontend

- `src/frontend/src/main.tsx`
  - SW registration and render: lines ~1–20

- `src/frontend/src/App.tsx`
  - App shell: lines ~1–21

- `src/frontend/src/context/AuthContext.tsx`
  - AuthProvider component: lines ~1–98
  - signOut(): lines ~35–83

- `src/frontend/src/context/useAuth.ts`
  - useAuth hook: lines ~1–12

- `src/frontend/src/AppController.tsx`
  - Pre/post-auth flow controller and UI state: lines ~1–220

- `src/frontend/src/services/api.ts`
  - API_BASE_URL and helper: lines ~1–23
  - Auth-protected: simulations CRUD/run, onboarding link/status, admin notices, admin policies
  - Public: notices, privacy policy, consents, OTP send/verify

- `src/frontend/src/pages/WhitelistCheckPage.tsx`
  - Form and OTP send flow component: lines ~1–140

- `src/frontend/src/pages/OtpVerificationPage.tsx`
  - OTP input/verify component: lines ~1–160

- `src/frontend/src/pages/ConsentPage.tsx`
  - Consent gate + policy viewer: lines ~1–220

- `src/frontend/src/pages/LoginPage.tsx`
  - OAuth buttons and navigation: lines ~1–120

- `src/frontend/src/pages/MainPage.tsx`
  - Sim list, actions, report, logout: lines ~1–280

- `src/frontend/src/pages/PlanEditor/index.tsx`
  - 5-step editor, validation, save: lines ~1–661

- `src/frontend/src/types/types.ts`
  - TS interfaces for Plans, API responses, Pages, etc.: lines ~1–200

- Components and hooks (selected):
  - `components/MainPage/SimulationTable.tsx`, `components/MainPage/SummaryReport.tsx`, modals, inputs, shell.
  - Hooks: `hooks/useMainPageState.ts`, `hooks/useSimulationActions.ts`, `hooks/useConsentFlow.ts`.

### Relationships between components

- Frontend
  - AppController determines which page to render based on auth state and consent (via `useConsentFlow` and post-auth checks using `api.getOnboardingStatus` + `api.getPrivacyPolicy`).
  - Whitelist → OTP verification sets `onboarding.userHash` in sessionStorage; ConsentPage uses this hash to record consent via `/api/consents`.
  - After login (Supabase OAuth), AppController links onboarding flags to the Supabase user via `/api/onboarding/link` with the consent version captured during pre-auth.
  - MainPage uses `api.getSimulations` and downstream actions to run/update/delete simulations.
  - PlanEditor builds simulation payloads and calls `/api/simulation/create` or `/api/simulations/{id}`.

- Backend
  - Auth dependency `authenticate_jwt_token` provides the `user_id` to protected routes.
  - SimulationService wraps Supabase calls and invokes `FinancialSimulationService` for compute.
  - OTPService uses SolapiSMSClient to send SMS and Supabase to store OTP metadata.
  - Consent routes tie `user_hash` to whitelist; onboarding routes tie consent/flags to authenticated user rows.
  - Admin routes protect via `_assert_admin` against an `admins` table.

## UX flows and edge cases

- Pre-auth flow
  1) User enters name/phone (hyphen-formatted) in Whitelist page, triggers `/api/otp/send`.
     - Backend performs whitelist check (hash of name-normalizedPhone) and issues OTP on success, returning `user_hash` and TTL.
     - Edge cases: non-whitelisted users (error message), rate-limit exceeded (messages from OTP service), phone formatting.
  2) User inputs OTP, `api.verifyOtp` posts to `/api/otp/verify` with phone and OTP (and user_hash forwarded by FE). On success FE stores `onboarding.userHash` in sessionStorage and proceeds to consent.
     - Edge: expired OTP, attempts exceeded with lock, mismatched OTP.
  3) Consent page fetches policy (`/api/privacy-policy`), renders markdown, requires checkbox; on Accept, records consent via `/api/consents` with `user_hash` and version, then navigates to Login.
     - Edge: policy fetch failure → page shows fallback message; consent record failure → retry.
  4) Login page uses Supabase OAuth; after redirect and session, AppController calls `/api/onboarding/link` to bind pre-auth state to `user_id` and clears temporary session storage entries.

- Post-auth flow
  - On app visible with session: AppController checks `/api/onboarding/status` and `/api/privacy-policy` to ensure consent version is up-to-date; routes user to consent if needed; otherwise goes to Main.
  - Main lists simulations, allows run/update/delete, memo updates, results view, summary across selections, and links to admin policy page.
  - PlanEditor provides a 5-step wizard; validates rounds, maintains investments, and saves.

- PWA behaviors
  - SW registered with update prompt; offline ready hook present (no explicit UI).
  - UI state persisted for resilience across tab visibility changes.

- Edge cases considered
  - OTP rate limits (15-min window enforced; daily commented out), attempts cap.
  - Missing simulations for user: backend 404; frontend returns [].
  - Consent fetch failure: conservative behavior to require consent.
  - Session sign-out robustness for iOS Safari standalone mode.

## Bugs, security issues, and performance bottlenecks (with references)

1. OTP phone normalization mismatch causes verification failure

- Where: `src/backend/services/otp/otp_service.py`
  - request_otp() sets `normalized_phone = phone` (no normalization) and hashes/stores with this value (lines ~70–79, 89–106).
  - verify_otp() normalizes via `.replace(" ", "").replace("-", "")` and then verifies the hash with the normalized phone (lines ~121–139, 158–176).
- Impact: The HMAC hash is computed on different phone strings between issuance and verification, making `verify_otp` fail even with correct code, especially when the input phone includes hyphens (frontend formats as `010-####-####`). Additionally, Solapi `send_sms` receives possibly hyphenated numbers.
- Fix: Normalize consistently in both issuance and verification (strip non-digits) and use the same canonical form for hashing, DB storage, and SMS send.

1. Solapi recipient formatting may be invalid with hyphens

- Where: `src/backend/services/otp/otp_service.py` request_otp() (lines ~70–75) and `src/backend/services/otp/solapi_sms.py` send_sms() (lines ~52–61)
- Impact: Recipient number may include hyphens; Solapi requires numeric string (E.164 without '+', or local style without separators). SMS may fail intermittently.
- Fix: Ensure recipient is digits-only before calling Solapi (e.g., `re.sub(r"\\D", "", phone)`).

1. Whitelist hash inconsistency between endpoints

- Where: `src/backend/api/routes.py`
  - verify_user(): hashes `f"{name}-{phone_number}"` without normalization (lines ~47–55).
  - send_otp(): hashes `f"{name}-{normalized_phone}"` after removing spaces/hyphens (lines ~67–77).
- Impact: If `verify_user` is ever used, it could disagree with OTP path, confusing users and admins. Currently FE uses only `/api/otp/send`, but keeping both inconsistent is risky.
- Fix: Normalize phone consistently across all whitelist hash computations.

1. OTP rate-limit daily cap commented out

- Where: `src/backend/services/otp/otp_service.py` _check_rate_limits() lines ~46–53
- Impact: Lifts daily cap; may permit abuse by repeated requests throughout the day.
- Fix: Reinstate the check or implement IP/device-based throttling; consider CAPTCHA for public endpoint.

1. Supabase select count usage may be incorrect

- Where: `src/backend/services/otp/otp_service.py` _check_rate_limits(): `.select("count", count="exact")` (lines ~34–53)
- Context: Supabase Python client typically uses `.select("*", count="exact")` and exposes `.count`. Selecting "count" as a column is not needed and may fail depending on client version.
- Fix: Use `.select("id", count="exact")` or `.select("*", count="exact")` and read `resp.count` reliably; add defensive `getattr(resp, "count", 0)`.

1. JWT verification with JWK dict may require key conversion

- Where: `src/backend/auth/jwt.py` authenticate_jwt_token() (lines ~57–83)
- Risk: `python-jose` often expects a prepared public key (e.g., via `jwk.construct`); passing a raw JWK dict sometimes works but can fail with certain algs/keys. Cache has no TTL (only clears on unknown `kid`).
- Fix: Convert JWK to a usable key (e.g., `jwt.PyJWK(public_key)` or use `jose.jwk.construct`), or use `authlib`/`PyJWT` JWKS support; add TTL for `_jwks_cache`.

1. Consent recording is unauthenticated and tied to a predictable user_hash

- Where: `src/backend/api/routes.py` record_consent() (lines ~371–409)
- Risk: If an attacker discovers a whitelisted hash (deterministic SHA-256 of name and phone), they could create/overwrite consent records for that hash without auth.
- Mitigations: Proof-of-ownership already ensured by OTP; tie consent record to an active OTP verification session or include a short-lived nonce from OTP issuance; rate-limit and audit log; at minimum record IP/UA (already done) and monitor anomalies.

1. SimulationService.run assumes non-null `sales_achievement_rates`

- Where: `src/backend/services/simulations.py` run() (line ~80)
- Risk: For older rows without `sales_achievement_rates`, calling `.items()` will raise; affects run and UX.
- Fix: Handle `None` by defaulting to constants or 100% values provided; e.g., `row.sales_achievement_rates or {}`.

1. Backend returns 404 for empty simulations list

- Where: `src/backend/services/simulations.py` list_for_user() (lines ~143–148)
- Impact: Frontend works around by returning `[]` on error, but 200 with empty array is more UX-friendly and cacheable.
- Fix: Return `[]` directly with 200 when none.

1. Logging PII (phone numbers) in OTP flows

- Where: `src/backend/services/otp/otp_service.py` (line ~108) `logger.info(f"OTP sent to {normalized_phone}")`
- Risk: Phone numbers in logs are sensitive; mask partially or remove in production.
- Fix: Mask middle digits, e.g., `010****5678`.

1. CORS allow_credentials with many http origins

- Where: `src/backend/main.py` CORS config lines ~11–19 and `config/settings.py` cors_origins ~44–64
- Risk: If cookies are later introduced, ensure origins are tightly controlled and always HTTPS in production; current setup is acceptable for token-in-header approach.

1. Privacy policy fallback depends on local file

- Where: `src/backend/api/routes.py` get_privacy_policy() (lines ~448–483)
- Risk: Missing file in container/image will return 404; ensure CI/CD bundles the file or DB publishing is in place.

1. Frontend storage and consent/version handling

- Where: `src/frontend/src/AppController.tsx` (post-auth consent gating lines ~153–190)
- Risk: If API calls fail, app conservatively shows consent again; can loop if backend is down.
- Mitigation: Add retry/backoff and user-friendly offline indicators.

## Recommendations (prioritized)

- P0: Normalize phone consistently in OTP issuance/verification and Solapi send; use a single canonical digits-only form across hash/storage and verification.
- P0: Align whitelist hashing across all endpoints; remove or refactor unused `/api/verify-user` to avoid confusion.
- P1: Reinstate daily OTP limits and consider CAPTCHA or additional throttling for public endpoints.
- P1: Harden consent recording: bind to recent OTP success (server-issued nonce) or require auth; at least store and mask PII in logs and monitor.
- P2: Make `list_for_user` return empty list instead of 404; handle `None` `sales_achievement_rates` defensively.
- P2: Add TTL-based JWKS cache and ensure JWK-to-key decoding is library-compatible.
- P3: Add a health UI banner for offline/degraded service; add retries/backoff for consent/policy checks.

## Appendix: Environment alignment with project instructions

- PWA, mobile-first UI: Frontend uses MUI and responsive layouts; SW registered with update prompt.
- Security: No secrets in FE; HTTPS assumed; tokens via Supabase SDK. Consider httpOnly cookie-based session proxy for stricter security if needed (beyond Supabase defaults).
- Scale: 60–100 users, 10–20 concurrent – current architecture fits; Supabase calls are straightforward; add minimal caching if notice/policy endpoints see frequent hits.

---

This report references the feature-login-process branch as inspected on 2025‑09‑05.
