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
- Settlement bonus: Rounds 1–15 only (auto-deactivated ≥16)
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

This section documents the detailed user experience flow at the component and API interaction level for each major user journey.

### 15.1 Pre-Authentication Flow

**User Journey**: New User Onboarding (Whitelist → OTP → Consent → Login → Dashboard)

#### Step 1: Whitelist Check

**Component**: `WhitelistCheckPage`

**User Focus**:
1. User sees centered form with club branding
2. User enters name in `TextField` (name-input)
3. User enters phone number with auto-formatting (010-XXXX-XXXX) in `TextField` (phone-input)
4. User clicks "확인" `Button` (submit-whitelist)

**Component Behavior**:
- `formatPhone()` utility auto-formats phone as user types (010-1234-5678)
- `handlePhoneChange()` updates local state
- `handleSubmit()` validates inputs (name.trim() && phone.trim())

**API Call**: `ApiService.sendOtp(name, phone)`
- **Backend Route**: POST `/api/otp/send`
- **Backend Handler**: `send_otp()` in `routes.py`
  - Normalizes phone (removes spaces/hyphens)
  - Hashes `{name}-{phone}` with SHA256
  - Queries `whitelist` table via `DatabaseClient`
  - If found: calls `OTPService.request_otp()`
  - Sends SMS via SOLAPI provider
  - Inserts record in `phone_otps` table
  - Returns `{ success: true, user_hash, expires_in_seconds }`
- **Frontend Response Handling**:
  - Success: stores `userHash`, sets `showOtpVerification=true`
  - Error: displays error message in `Alert`

**Transition**: Renders `OtpVerificationPage` component within `WhitelistCheckPage`

#### Step 2: OTP Verification

**Component**: `OtpVerificationPage`

**User Focus**:

1. User sees OTP entry form with countdown timer (MM:SS)
2. User enters 6-digit code in `TextField` (otp-input)
3. User clicks "인증" `Button` (verify-otp)
4. If expired/incorrect: User clicks "재전송" `Button` (resend-otp)
5. If need to change info: User clicks "이전" `Button` (back-button)

**Component Behavior**:

- `useEffect()` manages countdown timer
- `handleSendOtp()` resends OTP
- `handleVerify()` validates code entry
- Countdown starts at `0` on initial load; it is only seeded after the user taps "재전송" and receives `expires_in_seconds` from the resend response.

**API Call**: `ApiService.verifyOtp(phone, otpCode)`

- **Backend Route**: POST `/api/otp/verify`
- **Backend Handler**: `verify_otp()` in `routes.py`
  - Calls `OTPService.verify_otp()`
  - Queries `phone_otps` table
  - Validates HMAC hash of code
  - Checks expiration (5 minutes)
  - Checks attempt limit (6 attempts)
  - Updates `used=true` if valid
  - Returns `{ success: true, message }` or `{ success: false, message, remaining_attempts }`
- **Frontend Response Handling**:
  - Success: calls `onVerified(userHash)` callback
  - Error: displays backend-provided `message` via `Alert` (current UI does not surface `remaining_attempts`)

**Transition**: `AppController` receives `userHash` via `onVerified()` callback, triggers `useConsentFlow` hook

#### Step 3: Consent Flow Orchestration

**Component**: `AppController`

**Hook**: `useConsentFlow(user, userHash, page, setPage)`

**Behavior**:

1. `useEffect()` triggers when `userHash` is set and `user` is null
2. Hook calls `api.getUserConsents(userHash)` to check existing consent

**API Call**: `api.getUserConsents(userHash)`

- **Backend Route**: GET `/api/consents/{user_hash}`
- **Backend Handler**: `get_user_consents()` in `routes.py`
  - Verifies `user_hash` exists in `whitelist`
  - Returns every consent row for the user without filtering by `consent_type`
  - Responds with `{ consents: ConsentRecord[], success: true }`
- **Frontend Response Handling**:
  - Has consent: `setPage('login')`
  - No consent: `setPage('consent')`
  - Error (conservative): `setPage('consent')`

**Transition**: `AppController.renderPage()` switches to `ConsentPage` or `LoginPage`

#### Step 4: Privacy Policy Consent

**Component**: `ConsentPage`

**User Focus**:

1. User sees privacy policy content in scrollable container
2. User reads markdown-formatted policy via `ReactMarkdown`
3. User checks agreement `Checkbox` (consent-checkbox)
4. User clicks "동의" `Button` (accept-button) or "거부" `Button` (decline-button)

**Component Behavior**:

- `useEffect()` loads privacy policy on mount
- `handleAccept()` validates checkbox and records consent
- `onDecline()` returns to whitelist check

**API Calls**:

**Call 1**: `apiService.getPrivacyPolicy({ locale })`

- **Backend Route**: GET `/api/privacy-policy?locale=ko-KR`
- **Backend Handler**: `get_privacy_policy()` in `routes.py`
  - Queries `privacy_policies` table
  - Filters by `published=true` and locale
  - Orders by `effective_date DESC`
  - Returns latest version or fallback to static file
  - Responds with `{ version, content, last_updated, success, source }` (no `locale` field in payload)
- **Frontend Response Handling**:
  - Success: stores `policyContent`, `policyVersion`, `policyLastUpdated` in state
  - Error: displays fallback message

**Call 2**: `apiService.recordConsent(userHash, 'privacy_policy', policyVersion)`

- **Backend Route**: POST `/api/consents`
- **Backend Handler**: `record_consent()` in `routes.py`
  - Inserts or updates `consent_records` table
  - Captures IP, user agent, timestamp
  - Returns `{ user_hash, consent_type, consent_version, consent_given_at, ip_address, user_agent }`
- **Frontend Response Handling**:
  - Success: calls `onAccept()` callback
  - Error: displays error in `Alert`

**Transition**: `onAccept()` triggers `AppController.setPage('login')`

#### Step 5: OAuth Login

**Component**: `LoginPage`

**User Focus**:

1. User sees OAuth provider buttons (Google, Kakao)
2. If embedded browser detected: sees warning banner with "브라우저에서 열기" guidance
3. User clicks "Google로 로그인" `Button` (google-login-button) or "Kakao로 로그인" `Button` (kakao-login-button)
4. User redirected to OAuth provider
5. User completes authentication
6. User redirected back to app

**Component Behavior**:

- `useEffect()` detects embedded browser via `isEmbeddedBrowser()` utility
- If embedded: disables OAuth buttons, shows `EmbeddedBrowserWarningModal`
- `handleSocialLogin(provider)` triggers OAuth flow
- E2E mode: emits `window.dispatchEvent('e2e:oauth-click')` for testing

**OAuth Flow**: Handled by `supabase.auth.signInWithOAuth()` method

- **Frontend**: Supabase client redirects to provider OAuth URL
- **Backend**: No direct backend involvement (Supabase handles OAuth)
- **Frontend**: Supabase receives callback, exchanges code for JWT
- **Frontend**: `AuthContext` detects session change via `supabase.auth.onAuthStateChange()` listener
- **State Update**: `setUser()` and `setSession()` in `AuthContext`

**Transition**: `AppController` detects `user` is set, triggers page navigation to `MainPage`

#### Step 6: Post-Login Navigation

**Component**: `AppController`

**Behavior**: `useEffect()` monitors auth state changes and navigates based on user presence - if logged in and on login/consent pages, navigates to main; if logged out and on protected pages, navigates to whitelist

**Transition**: Renders `MainPage`

### 15.2 Simulation Management Flow

**User Journey**: Create and Run Simulation

#### Step 1: Open Plan Editor

**Component**: `MainPage`

**User Focus**:

1. User sees dashboard with simulation table
2. User clicks "새 시뮬레이션" `Button` (add-simulation-button)

**Component Behavior**:

- `onClick` handler calls `setPage('plan-editor')` and `setEditingPlan(null)`

**Transition**: `AppController` renders `PlanEditorPage`

#### Step 2: Plan Type Selection (Step 1/5)

**Component**: `PlanEditorPage` → `PlanTypeSelector`

**User Focus**:

1. User sees `Stepper` component showing current step (1/5)
2. User opens a single plan type dropdown (`Select`) listing A, B, C, D, E, F, G, K, P, R
3. User chooses the desired plan option from the menu
4. User clicks "다음" `Button` (next-button)

**Component Behavior**:

- `PlanTypeSelector` renders one MUI `Select` with `MenuItem` entries instead of discrete buttons
- `setPlan()` updates `plan.plan_id`
- `useEffect()` persists to localStorage via `setJSON('ui.planEditor.plan', plan)`
- Navigation: increments `step` state

**Validation**: Plan type required before proceeding

**Transition**: Step 2/5 (Starting Company Round Selector)

#### Step 3: Starting Company Round Selection (Step 2/5)

**Component**: `PlanEditorPage` → `StartingCompanyRoundSelector`

**User Focus**:

1. User sees round number input (1-100)
2. User enters starting company round in `TextField`
3. User clicks "다음" `Button`

**Component Behavior**:

- `handleStartingCompanyRoundChange()` updates `plan.starting_company_round`
- Validation: must be numeric, range 1-100
- If invalid: shows `StartingRoundValidationModal`

**Transition**: Step 3/5 (Current Company Round Selector)

#### Step 4: Current Company Round Selection (Step 3/5)

**Component**: `PlanEditorPage` → `CurrentCompanyRoundSelector`

**User Focus**:

1. User sees round number input
2. User enters current company round in `TextField`
3. User clicks "다음" `Button`

**Component Behavior**:

- Validation: `current_company_round >= starting_company_round`
- If invalid: shows `CurrentRoundValidationModal`

**Transition**: Step 4/5 (Simulation Rounds Selector)

#### Step 5: Simulation Rounds Selection (Step 4/5)

**Component**: `PlanEditorPage` → `SimulationRoundsSelector`

**User Focus**:

1. User sees simulation rounds input
2. User enters total simulation rounds in `TextField`
3. User clicks "다음" `Button`

**Component Behavior**:

- `getSimulationRoundLimits()` returns a global `{ min: 1, max: 100 }` range for every plan type
- `validateSimulationRounds()` applies that single range without plan-specific caps
- If user input falls outside 1–100: shows `ValidationModal` with the global bounds
- `generateInvestments()` creates default investment array

**Transition**: Step 5/5 (Investment Editor)

#### Step 6: Investment & Sales Achievement Rate Entry (Step 5/5)

**Component**: `PlanEditorPage` → `InvestmentEditor`

**User Focus**:

1. User sees table with rows for each simulation round
2. User enters investment amount per round in `TextField`
3. Starting at 개인 회차 4, user enters sales achievement rate (%) via inline input (rounds 1–3 show no rate field)
4. User clicks "저장" `Button` (save-button)

**Component Behavior**:

- Validates minimum investment amount per plan type
- If below minimum: shows `DefaultValueWarningModal`
- `InvestmentTable` renders `SalesRateInput` only when `round >= 4`, leaving earlier rounds blank
- `handleSave()` prepares plan data for API submission

**API Call**: `apiService.createSimulation()` or `apiService.updateSimulation()`

**Create Simulation**:

- **Backend Route**: POST `/api/simulation/create`
- **Backend Handler**: `create_simulation()` in `routes.py`
  - Depends on `authenticate_jwt_token()` for auth
  - Calls `SimulationService.create(request, user_id)`
  - Inserts into `simulations` table via `DatabaseClient`
  - Returns `{ simulation_id, plan_id, success: true }`
- **Frontend Response Handling**:
  - Success: updates `plan.simulation_id`, clears localStorage draft
  - Error: displays error in `Alert`

**Update Simulation** (if `editingPlan` exists):

- **Backend Route**: PATCH `/api/simulations/{simulation_id}`
- **Backend Handler**: `update_simulation()` in `routes.py`
  - Validates ownership (`user_id` match)
  - Updates `simulations` table
  - Returns `{ simulation_id, success: true }`

**Transition**: Returns to `MainPage` (`setPage('main')`)

#### Step 7: Run Simulation from Dashboard

**Component**: `MainPage`

**User Focus**:
1. User sees simulation list in `SimulationTable`
2. User clicks "결과 보기" `Button` (view-results-button) on simulation row

**Component Behavior**:
- `handleViewResults(plan)` invokes `useSimulationActions.handleViewResults()` for every run request
- The helper posts to `/api/simulation/run` on each click, even when `plan.simulation_results` already contains cached data
- Upon success, the hook stores the fresh payload and navigates to `ResultsPage`

**API Call**: `apiService.runSimulation(simulation_id, token)`
- **Backend Route**: POST `/api/simulation/run`
- **Backend Handler**: `run_simulation()` in `routes.py`
  - Calls `SimulationService.run(request, user_id)`
  - Loads plan from `simulations` table
  - Validates ownership
  - Instantiates `FinancialSimulationService` from `simulation_service.py`
  - Executes calculation logic:
    - Calculates investor count per round
    - Computes revenue (sales × commission 32%)
    - Applies settlement bonus (rounds 1-15 only)
    - Calculates tax (3.3%)
    - Generates `history[]` array with per-round breakdown
  - Updates `simulation_results` column in database
    - Returns `{ simulation_id, plan_id, starting_company_round, current_company_round, simulation_rounds, scheduled_payment, sales_achievement_rates?, history, success: true }`
- **Frontend Response Handling**:
  - Success: stores the newly fetched result via `setSimulationResult(result)`
  - Navigates to `ResultsPage` (`setPage('results')`)
    - Disables the "결과 보기" button for the active row while the request is in flight

**Transition**: `AppController` renders `ResultsPage`

#### Step 8: View Results

**Component**: `ResultsPage`

**User Focus**:
1. User sees result summary and per-round breakdown table
2. User reviews financial metrics in `Table`:
   - 회차 (company_round)
   - 아바타 개수 (investor_count)
   - 회차 매출액 (amount)
   - 매출계 (total_payment)
   - 수당계(세전) (total_revenue_before_tax)
   - 수당계(세후) (total_revenue_after_tax)
   - 실납입(세후) (net_profit_after_tax)
   - 실납입계(적자vs흑자) (cumulative_net_profit)
   - 매출 달성율 (sales_achievement_rate)
3. User clicks "수당표 보기" `Button` (view-allowance-table-button)
4. User clicks "돌아가기" `Button` (back-button)

**Component Behavior**:
- `injectDerivedHistory()` utility adds `company_round`, per-round `amount`, and defaults the `sales_achievement_rate` to 100 when missing
- `findMaxNegativeDeepIndex()` returns the last index before the cumulative net profit begins to recover
- Highlights the deepest cumulative-loss row (still negative) to mark when the trajectory starts improving

**Transition**:
- "수당표 보기": renders `AllowanceTablePage`
- "돌아가기": returns to `MainPage`

#### Step 9: View Allowance Table

**Component**: `AllowanceTablePage`

**User Focus**:
1. User sees detailed allowance breakdown by investor start round
2. User reviews per-investor revenue and payment details
3. User clicks "돌아가기" `Button`

**Component Behavior**:
- Processes `result.history[].investor_details[]` array
- Displays matrix table: rows = company rounds, columns = investor start rounds
- Calculates column totals for each investor cohort

**Transition**: Returns to `MainPage`

### 15.3 Simulation CRUD Operations

#### Edit Simulation

**Component**: `MainPage`

**User Focus**:
1. User clicks "수정" `Button` (edit-button) on simulation row

**Component Behavior**:
- `setEditingPlan(plan)` stores current plan
- `setPage('plan-editor')` navigates to editor

**Transition**: `PlanEditorPage` loads with existing plan data
**Backend**: Same as creation flow, but calls PATCH endpoint

#### Delete Simulation

**Component**: `MainPage`

**User Focus**:
1. User clicks "삭제" `Button` (delete-button) on simulation row
2. User sees `DeleteConfirmModal` with confirmation prompt
3. User clicks "삭제" to confirm or "취소" to cancel

**API Call**: `apiService.deleteSimulation(simulation_id, token)`
- **Backend Route**: DELETE `/api/simulations/{simulation_id}` or POST `/api/simulation/delete`
- **Backend Handler**: `delete_simulation()` in `routes.py`
  - Validates ownership
  - Deletes from `simulations` table
  - Returns `{ simulation_id, success: true }`
- **Frontend Response Handling**:
  - Success: calls `refreshPlans()` to reload list
  - Error: displays error in `Alert`

#### Update Memo

**Component**: `MainPage`

**User Focus**:
1. User clicks memo icon or "메모" button on simulation row
2. User sees `MemoModal` with current memo text
3. User edits memo in `TextField` (multiline)
4. User clicks "저장" `Button` or "닫기" `Button`

**API Call**: `apiService.updateSimulationMemo(simulation_id, memo, token)`
- **Backend Route**: PATCH `/api/simulations/{simulation_id}/memo`
- **Backend Handler**: `update_simulation_memo()` in `routes.py`
  - Validates ownership
  - Updates `memo` column in `simulations` table
  - Returns `{ simulation_id, memo, success: true }`
- **Frontend Response Handling**:
  - Success: updates local plan state
  - Error: displays error in `Alert`

### 15.4 Comprehensive Results Flow

**Component**: `MainPage` → `SummaryReport`

**User Focus**:
1. User selects multiple simulations via `Checkbox` (multi-select)
2. Validation: max one per plan type
3. User clicks "종합 결과" `Button` (summary-report-button)
4. User sees combined report in expandable section

**Component Behavior**:
- `useSelectedSimulations()` hook manages selection state
- Validates selection constraints (one per plan type)
- `generateSummaryReport()` re-runs each selected simulation via `api.runSimulation()` to gather fresh histories
- Aggregates the backend responses into combined totals and per-plan breakdown

**API Calls**:
- Issues POST `/api/simulation/run` for every selected simulation ID (identical to Step 7 handler)

**Transition**: Inline expansion within `MainPage`

### 15.5 Public Notices Flow

#### View Notices (User)

**Component**: `MainPage`

**User Focus**:
1. User clicks "공지사항" `Button` (notice-button)
2. User sees `NoticeBoardModal` with notice list
3. User clicks notice to view details
4. User reads notice content (HTML sanitized)
5. User clicks "닫기" `Button` to close modal

**API Call**: `api.listNotices()`
- **Backend Route**: GET `/api/notices`
- **Backend Handler**: `list_notices()` in `routes.py`
  - Queries `notices` table
  - Filters `published=true`
  - Orders by `pinned DESC, created_at DESC`
  - Returns `{ notices: [], success: true }`
- **Frontend Response Handling**:
  - Success: renders notice list in `List` component
  - Pinned notices show `Chip` badge
  - Active notice content displayed via `createSafeHtml()` sanitizer

**No Auth Required**: Public endpoint

#### Manage Notices (Admin)

**Component**: `NoticeBoardModal` (Admin Mode)

**User Focus**:
1. Admin sees "새 공지" `Button` if `isAdmin=true`
2. Admin clicks to create/edit notice
3. Admin enters title and content in `TextField`
4. Admin toggles "고정" `Switch` (pinned)
5. Admin toggles "게시됨" `Switch` (published)
6. Admin clicks "저장" `Button`

**Admin Verification**: `api.adminMe(token)`
- **Backend Route**: GET `/api/admin/me`
- **Backend Handler**: `admin_me()` in `routes.py`
  - Queries `admins` table for `user_id`
  - Returns `{ is_admin: true }` or 403
- **Frontend Response Handling**:
  - Success: enables admin UI elements
  - Error: hides admin features

**Create Notice**: `apiService.createNotice()`
- **Backend Route**: POST `/api/admin/notices`
- **Backend Handler**: `create_notice()` in `routes.py`
  - Depends on `authenticate_jwt_token()` + admin check
  - Inserts into `notices` table
  - Returns `{ id, title, content, pinned, published, success: true }`

**Update Notice**: `apiService.updateNotice(id, data, token)`
- **Backend Route**: PATCH `/api/admin/notices/{id}`
- **Backend Handler**: `update_notice()` in `routes.py`
  - Updates `notices` table
  - Returns updated notice data

**Delete Notice**: `apiService.deleteNotice(id, token)`
- **Backend Route**: DELETE `/api/admin/notices/{id}`
- **Backend Handler**: `delete_notice()` in `routes.py`
  - Deletes from `notices` table
  - Returns `{ success: true }`

### 15.6 Privacy Policy Management (Admin)

**Component**: `AdminPolicyPage`

**User Focus**:
1. Admin navigates to "개인 정보 보호 정책" from `MainPage`
2. Admin sees policy selector dropdown with versions
3. Admin clicks "새로 만들기" `Button` to create new policy
4. Admin enters version, locale, content, effective date
5. Admin toggles between edit and preview mode via "미리보기" `Button`
6. Admin clicks "저장" `Button` to save draft
7. Admin clicks "게시" `Button` to publish policy

**API Calls**:

**List Policies**: `api.listPrivacyPolicies(token)`
- **Backend Route**: GET `/api/admin/privacy-policies`
- **Backend Handler**: `list_privacy_policies()` in `routes.py`
  - Queries `privacy_policies` table
  - Returns all versions (published and draft)

**Create Policy**: `apiService.createPrivacyPolicy(data, token)`
- **Backend Route**: POST `/api/admin/privacy-policies`
- **Backend Handler**: `create_privacy_policy()` in `routes.py`
  - Inserts into `privacy_policies` table
  - Returns `{ id, version, locale, content, published, effective_date }`

**Update Policy**: `apiService.updatePrivacyPolicy(id, data, token)`
- **Backend Route**: PATCH `/api/admin/privacy-policies/{id}`
- **Backend Handler**: `update_privacy_policy()` in `routes.py`
  - Updates draft policy
  - Cannot update published policies

**Publish Policy**: `apiService.publishPrivacyPolicy(id, token)`
- **Backend Route**: POST `/api/admin/privacy-policies/{id}/publish`
- **Backend Handler**: `publish_privacy_policy()` in `routes.py`
  - Validates uniqueness constraint (one published per version+locale)
  - Sets `published=true`
  - Returns updated policy

### 15.7 Session Management

#### Logout

**Component**: `MainPage`

**User Focus**:
1. User clicks "로그아웃" `Button` (logout-button)
2. User sees loading indicator
3. User redirected to whitelist page

**Component Behavior**:
- `handleLogout()` calls `signOut()` from `useAuth()` hook
- `signOut()` calls `supabase.auth.signOut()`
- Clears local session state
- `AppController` detects `user=null`, navigates to whitelist

**No Direct Backend Call**: Supabase handles session invalidation

#### Session Persistence

**Component**: `AuthContext`

**Behavior**: On app mount, checks for existing session via `supabase.auth.getSession()` and subscribes to auth state changes via `supabase.auth.onAuthStateChange()` listener

**Auto-Refresh**: Supabase client automatically refreshes JWT tokens

### 15.8 Error Handling Patterns

#### Network Errors

**Components**: All API-calling components

**Behavior**:
- Try-catch blocks around API calls
- Display error message in `Alert` component
- Provide retry mechanism (e.g., resend OTP button)
- Generic fallback error message for unexpected failures

#### Authentication Errors

**Backend**: JWT validation in `authenticate_jwt_token()` dependency

**Errors**:
- 401: Missing/invalid token → Frontend redirects to login
- 403: Admin privileges required → Hide admin features

**Frontend Handling**: `ApiService` methods check response status and throw errors for non-OK responses

#### Validation Errors

**Backend**: Pydantic validation returns 422

**Frontend**: Display validation errors in modal or inline alert

**Components**: `ValidationModal`, `StartingRoundValidationModal`, `CurrentRoundValidationModal`

### 15.9 State Persistence Patterns

**localStorage Keys**:
- `ui.page`: Current page state
- `ui.editingPlan`: Plan being edited
- `ui.planEditor.step`: Current editor step
- `ui.planEditor.plan`: Draft plan data
- `ui.noticeOpen`: Notice modal state
- `ui.notice.activeId`: Selected notice ID
- `ui.simulationResult`: Last viewed result

**Utilities**: `getJSON()`, `setJSON()` in `persist.ts`

**Restoration**: `AppController` restores state on mount using lazy initialization pattern

**Cleanup**: Draft data cleared on successful save or explicit cancel

### 15.10 Component Dependency Injection

**Pattern**: Optional `apiService` prop for testability

**Components Supporting DI**:
- `WhitelistCheckPage`
- `OtpVerificationPage`
- `ConsentPage`
- `MainPage`
- `PlanEditorPage`
- `AdminPolicyPage`
- `NoticeBoardModal`

**Usage**: Components accept optional `apiService` prop of type `ApiServiceInterface`, defaulting to the `api` singleton instance

**Testing**: Inject mock API service in unit/integration tests
