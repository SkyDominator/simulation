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

This section outlines the key user focus steps for each major user journey.

### 15.1 Pre-Authentication Flow

**User Journey**: New User Onboarding (Whitelist → OTP → Consent → Login → Dashboard)

#### Step 1: Whitelist Check

**User Focus**:

1. User sees centered form with club branding
2. User enters name in `TextField`
3. User enters phone number with auto-formatting (010-XXXX-XXXX) in `TextField`
4. User clicks "인증번호 받기" `Button`

#### Step 2: OTP Verification

**User Focus**:

1. User sees OTP entry form; countdown timer appears only after requesting a resend
2. User enters 6-digit code in `TextField`
3. User clicks "인증하기" `Button`
4. If expired/incorrect: User clicks "인증번호 재전송" `Button`
5. If need to change info: User clicks "이전으로" `Button`

#### Step 3: Consent Flow Orchestration

**User Focus**:

1. User automatically proceeds once OTP verification succeeds
2. User is taken to the consent page when no prior privacy approval exists
3. User is sent straight to the login page when consent has already been recorded

#### Step 4: Privacy Policy Consent

**User Focus**:

1. User sees privacy policy content in scrollable container
2. User reads markdown-formatted policy via `ReactMarkdown`
3. User checks agreement `Checkbox`
4. User clicks "계속하기" `Button` or "취소" `Button`

#### Step 5: OAuth Login

**User Focus**:

1. User sees OAuth provider buttons (Google, Kakao)
2. If embedded browser is detected, user reads banner explaining why login buttons are disabled
3. User clicks "Google로 로그인" `Button` or "Kakao로 로그인" `Button`
4. User completes provider authentication and returns to the app
5. User regains control once Supabase session is established

#### Step 6: Post-Login Navigation

**User Focus**:

1. Once authenticated, the app routes user to the main dashboard automatically
2. If the session expires on a protected page, the app redirects user back to the whitelist entry flow

### 15.2 Simulation Management Flow

**User Journey**: Create and Run Simulation

#### Step 1: Open Plan Editor

**User Focus**:

1. User sees dashboard with simulation table
2. User clicks "새 시뮬레이션" `Button`

#### Step 2: Plan Type Selection (Step 1/5)

**User Focus**:

1. User views stepper indicator showing current progress (1/5)
2. User opens plan type dropdown listing A, B, C, D, E, F, G, K, P, R
3. User selects the desired plan option
4. User advances with "다음 단계" `Button`

#### Step 3: Starting Company Round Selection (Step 2/5)

**User Focus**:

1. User enters starting company round between 1 and 100
2. User adjusts value until validation passes
3. User continues with "다음 단계" `Button`

#### Step 4: Current Company Round Selection (Step 3/5)

**User Focus**:

1. User inputs current company round that's at least the starting round
2. User resolves validation prompts if the value is too low
3. User proceeds with "다음 단계" `Button`

#### Step 5: Simulation Rounds Selection (Step 4/5)

**User Focus**:

1. User enters total simulation rounds within the allowed range
2. User corrects entries that fall outside global limits
3. User moves forward with "다음 단계" `Button`

#### Step 6: Investment & Sales Achievement Rate Entry (Step 5/5)

**User Focus**:

1. User sees table with rows for each simulation round
2. User enters investment amount per round in `TextField`
3. Starting at 개인 회차 4, user inputs sales achievement rate (%) via inline field
4. User clicks "저장" `Button` to commit entries

#### Step 7: Run Simulation from Dashboard

**User Focus**:

1. User reviews simulation list in `SimulationTable`
2. User taps the green play icon (`결과 보기` tooltip) in the desired row
3. User waits for processing and then views the results page

#### Step 8: View Results

**User Focus**:

1. User sees result summary and per-round breakdown table
2. User reviews financial metrics such as 회차, 아바타 개수, 회차 매출액, 매출계, 수당계(세전), 수당계(세후), 실납입(세후), 실납입계, 매출 달성율
3. User opens the allowance table via "수당표 보기" `Button` when detailed payouts are needed
4. User returns to the dashboard with the "돌아가기" `Button`

#### Step 9: View Allowance Table

**User Focus**:

1. User sees allowance breakdown organized by investor start round
2. User reviews per-investor revenue and payment details for each round
3. User closes the view with the "돌아가기" `Button`

### 15.3 Simulation CRUD Operations

#### Edit Simulation

**User Focus**:

1. User taps the pencil icon (`편집` tooltip) on a simulation row
2. User returns to the plan editor pre-filled with existing plan data
3. User adjusts fields and saves changes to update the simulation

#### Delete Simulation

**User Focus**:

1. User taps the trash can icon (`삭제` tooltip) on a simulation row
2. User reviews the confirmation modal and decides whether to proceed
3. User confirms deletion to remove the plan from the dashboard

#### Update Memo

**User Focus**:

1. User opens the memo modal by selecting the memo chip, which shows the memo snippet or "메모 없음" when empty
2. User edits memo text in the multiline field
3. User saves to persist the updated memo with the simulation
4. User cancels or closes the modal to discard changes when needed

### 15.4 Comprehensive Results Flow

**User Focus**:

1. User selects simulations via checkboxes with one selection per plan type
2. User clicks "종합 결과" `Button`
3. User waits while combined calculations finish
4. User reviews consolidated metrics inside the dashboard summary section

### 15.5 Public Notices Flow

#### View Notices (User)

**User Focus**:

1. User clicks "공지사항" `Button`
2. User browses the notice list inside the modal
3. User selects a notice to read sanitized content
4. User closes the modal after reviewing announcements
5. User returns to the dashboard without losing context

#### Manage Notices (Admin)

**User Focus**:

1. Admin opens the notice modal and sees management controls when authorized
2. Admin clicks "새 공지" to draft or edits existing notices
3. Admin fills in title and content fields and adjusts pin/publish switches
4. Admin saves changes to update the notice list for members
5. Admin deletes outdated notices when necessary, confirming the action if prompted
6. Admin closes the modal once management tasks finish

### 15.6 Privacy Policy Management (Admin)

**User Focus**:

1. Admin navigates to "개인 정보 보호 정책" from the dashboard
2. Admin selects an existing policy version or starts a new draft
3. Admin enters version, locale, content, and effective date details
4. Admin previews content to verify formatting before publishing
5. Admin saves drafts to persist edits safely
6. Admin publishes the policy when ready for member consent
7. Admin returns to the dashboard after confirming the latest policy state

### 15.7 Session Management

#### Logout

**User Focus**:

1. User clicks "로그아웃" `Button`
2. User observes a brief loading state while the session clears
3. User returns to the whitelist page ready for a fresh login

#### Session Persistence

**User Focus**:

1. User reopening the app sees the current session restored when still valid
2. User stays signed in as Supabase refreshes tokens in the background
3. User is prompted to reauthenticate if automatic renewal fails

### 15.8 Error Handling Patterns

**User Focus**:

1. User sees inline alerts on pre-auth screens, while dashboard actions and the plan editor surface failures via browser alert dialogs
2. User retries actions using prompts like "재전송" when errors appear
3. User is guided back to the whitelist check flow if authentication becomes invalid
4. User receives targeted validation tips to correct incorrect input

### 15.9 State Persistence Patterns

**User Focus**:

1. User resumes draft simulations from the last saved step after reopening the editor
2. User returns to dashboard views with previous selections still applied
3. User reopens the notice modal or results page in the same state after refresh
4. User sees temporary data cleared automatically once a save completes or they cancel
