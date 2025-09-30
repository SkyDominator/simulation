# Copilot Instructions

This document provides the broad and deep context of my application to help you understand my project for improving the quality of tasks including planning, code suggestions, and implementations.

## 1. Introduction

**System**: PWA for whitelisted users to run investment simulations  
**Auth**: Supabase OAuth (Google, Kakao)  
**Enforcement**: Pre-auth onboarding (whitelist → OTP → consent → login)  
**Admin**: Manage privacy policies and notices  
**Stack**: FastAPI backend + React/Vite frontend  

**Goals**:
- Authenticated financial simulations with user-specific storage
- Enforced onboarding flow
- Admin management UI

## 2. Scope

**In-scope**:
- Pre-auth validation: OTP send/verify with whitelist check
- Privacy policy retrieval (public) + consent recording (pre-auth)
- Supabase OAuth + JWT backend auth
- Simulation CRUD + run + persist
- Public notices + admin CRUD
- PWA installability

**Out-of-scope**:
- Payment processing
- Advanced analytics
- Full offline execution
- i18n beyond ko-KR

## 3. Stakeholders & Roles

**Users**:
- End users: 60–100 whitelisted (30–60 concurrent peak)
- Admins: 1–3 internal
- Owner: Maintains system + admin privileges

**Roles**:
- Pre-auth user: Access OTP, policy, consent endpoints
- Authenticated user: Run simulations, read notices
- Admin user: Manage notices + policies

## 4. Environment Profiles

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

### 4.3 Production
- **Desktop**: Windows 11+ (Chrome latest-2)
- **Mobile iOS**: iPhone 11+ (iOS 18.1.1+) Chrome
- **Mobile Android**: Galaxy S21+ (Android 12+) Chrome
- **Hosting**: Supabase (DB/Auth) + Windows local (24h)
- **Ports**: Frontend 4173, Backend 8000

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
- Windows native production
- Cloudflare Tunnel: `simulation.lightoflifeclub.com`
- CORS: local dev + tunnel domain

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

## 11. UI/UX Flows

### 11.1 Shell
**Layout**:
- Header: "생명빛 클럽 시뮬레이션" (max-width: 600px)
- Content: max-width 1400px, padding xs:2/md:4
- LandscapeEnforcer: Z-index 2000 overlay for portrait detection

### 11.2 Pre-auth Journey

**State**: AppController manages `page` state in localStorage

**Pages**:

1. **WhitelistCheckPage** (`page: "whitelist"`):
   - Inputs: name, phone (auto-format 010-1234-5678)
   - Phone supports 010/011/016/017/018/019 prefixes
   - Submit: POST /api/otp/send
   - Success: Embed OtpVerificationPage

2. **OtpVerificationPage**:
   - Input: 6-digit code, auto-complete "one-time-code"
   - Timer: MM:SS countdown
   - Resend: Rate-limited button states (3 sends per 15min)
   - Navigation: "이전으로" returns to whitelist form

3. **ConsentPage** (`page: "consent"`):
   - Fetch policy via API with DB/fallback
   - Checkbox + accept/decline buttons
   - Records: user_hash-based consent
   - Flow: Accept → login, Decline → whitelist

4. **LoginPage** (`page: "login"`):
   - OAuth: Google, Kakao buttons
   - Loading states per provider
   - Error recovery with retry options

### 11.3 Main App

**MainPage** (`page: "main"`):
- Actions: Add simulation, notices, help, logout
- Table: Sortable columns, multi-select, batch delete
- States: Loading (LinearProgress), empty (welcome CTA)

**PlanEditor** (`page: "plan-editor"`):
- 5-step wizard (Stepper component)
- Validation modals
- localStorage draft persistence
- Auto-generation based on plan type

**ResultsPage** (`page: "results"`):
- Tables, charts, export functions

**AdminPolicyPage** (`page: "admin-policy"`):
- Create, edit, publish policies

**OfflineResultsPage** (`page: "offline-results"`):
- Display simulation results for special authentication flow

### 11.4 Mobile Design

- **Breakpoints**: xs (mobile), md+ (desktop)
- **Touch**: 44px targets minimum
- **Modals**: Full-screen mobile, overlay desktop
- **Table**: Horizontal scroll on narrow screens

### 11.5 Error & Accessibility

**Error Handling**:
- Network: Exponential backoff retry
- Validation: Inline messages
- Session: Auto-redirect with context

**Accessibility**:
- Keyboard navigation
- ARIA labels
- WCAG color contrast
- Screen reader support

## 12. Non-Functional Requirements

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

## 14. Constraints & Assumptions

**Environment Variables**:

Backend:
- `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
- `OTP_SECRET_KEY`, `OTP_VALIDITY_MINUTES=5`
- `OTP_RESEND_LIMIT_PER_15MIN=3`, `otp_max_verification_attempts=6`
- `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER_NUMBER`

Frontend:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_API_BASE_URL=https://simulation.lightoflifeclub.com/api`

**CORS**: `simulation.lightoflifeclub.com`, localhost:5173/4173, 127.0.0.1, local IPs

**Dependencies**:
- Supabase RLS configured
- Whitelist table pre-seeded
- Docker/Cloudflare Tunnel deployment

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

- **Supabase**: Backend-as-a-Service (Postgres, Auth, Storage, APIs)
- **JWKS**: JSON Web Key Set for JWT verification
- **OTP**: One-time password via SMS
- **PWA**: Progressive Web App
- **RLS**: Row Level Security (Postgres)
- **LCP/FID/CLS**: Core Web Vitals metrics
- **Pre-auth user**: User before OTP + consent + OAuth completion
  - **Context Detection**: Determines flow based on authentication state and calling context
- **Privacy Policy Integration**:
  - Fetches current policy version via `api.getPrivacyPolicy()`
  - Inline summary with key data collection points
  - Modal dialog for full policy text with ReactMarkdown rendering
  - Version tracking and last updated date display
- **Consent UI**:
  - Checkbox with explicit consent text
  - Two-button layout: "취소" (decline) and "계속하기" (accept)
  - Disabled submit until checkbox is checked
- **Data Recording**: Records consent with `userHash`, `consent_type: "privacy_policy"`, `policyVersion`
- **Flow Control**:
  - Accept: Stores `consentVersion` in sessionStorage, proceeds to login
  - Decline: Returns to whitelist check

**Step 4: LoginPage** (`page: "login"`):

- **OAuth Integration**: Supabase auth with Google and Kakao providers
- **Provider Buttons**: Branded buttons with loading states and error handling
- **Navigation**: "이전으로" option to return to whitelist check
- **Loading States**: Individual loading indicators per provider to prevent double-clicks
- **Error Recovery**: Alert messages for authentication failures with retry options

### 13.3 Authentication State Transitions

**State Restoration**: App visibility change handlers for session recovery

- **Persistence**: UI state (page, editingPlan, noticeOpen, simulationResult) in localStorage
- **Restoration**: On app focus/visibility change, restores state with diff checking
- **Session Management**: Supabase session auto-refresh maintains authentication

### 13.4 Main Application Experience

**MainPage Navigation** (`page: "main"`):

- **Header Actions**:
  - Add simulation button (+ icon) navigates to plan editor
  - Notice board icon opens global notice modal
  - Help icon opens contact modal
  - Logout with confirmation
- **Simulation Management**:
  - **Table Interface**: Sortable columns (plan type, rounds, dates) with sort indicators
  - **Bulk Operations**: Multi-select checkboxes with batch delete functionality
  - **Row Actions**: Edit, run, view results, memo, delete icons per simulation
  - **Loading States**: LinearProgress during simulation runs, skeleton loading for table
  - **Empty States**: Welcome message and CTA for first-time users
- **Summary Reports**: Statistical overview of selected simulations with export capabilities

**PlanEditor Multi-step Wizard** (`page: "plan-editor"`):

- **Step Navigation**: Material-UI Stepper component with 5 steps:
  1. Plan Type Selector (A, B, C, D, K, P, R, F, E, G)
  2. Starting Company Round
  3. Current Company Round (must be ≥ starting round)
  4. Simulation Rounds (plan-specific defaults: A/B/C/G=12-15, others=18)
  5. Investment Schedule Editor with round-by-round investment input
- **Validation Modals**: Step-specific validation with detailed error messages
- **State Persistence**: Draft plans saved to localStorage for session recovery
- **Auto-generation**: Default investment amounts based on plan type and round
- **Progress Indicators**: Current step highlighting with completion status

**ResultsPage** (`page: "results"`):

- **Data Visualization**: Responsive tables and charts for simulation results
- **Navigation**: Back to main page with preserved context
- **Export Functions**: Download simulation results in various formats

**Offline Results Page** (`page: "offline-results"`):

- **Result Table**: Displays the simulation results for offline authentication (Here the "offline authentication" means the unique type of authentication process that is not covered in the current scope. It does not mean the opposite of the 'network connected' state.)
- **Buttons**
  - "Back to main page" button to return to the main page.

**Admin Policy Page** (`page: "admin-policy"`):

- **Policy Management**: Administrative interface for creating, editing, and publishing privacy policies
- **Policy List**: Displays all policies with version, status, and publication information
- **Policy Editor**: Form for creating and editing policy content, version, and metadata
- **Publishing Controls**: Interface for publishing policies and managing active versions

### 13.5 Mobile-First Responsive Design

**Breakpoint Strategy**: Material-UI responsive design with mobile-first approach

- **Mobile (xs)**: Single-column layouts, full-width inputs, touch-friendly button sizing
- **Desktop (md+)**: Multi-column layouts, optimized spacing, hover states

**Touch Interaction Patterns**:

- **Button Sizing**: Minimum 44px touch targets for accessibility
- **Input Fields**: Large, clearly labeled form controls with appropriate input modes
- **Table Scrolling**: Horizontal scroll for simulation table on narrow screens
- **Modal Handling**: Full-screen modals on mobile, overlay on desktop

**Progressive Enhancement**:

- **Core Functionality**: Works without JavaScript for basic policy viewing
- **Enhanced Features**: Interactive sorting, real-time validation, auto-save
- **Offline Indicators**: Connection status awareness (future enhancement)

### 13.6 Error Recovery & Accessibility

**Error State Management**:

- **Network Failures**: Retry mechanisms with exponential backoff
- **Validation Errors**: Inline error messages with clear recovery instructions
- **Session Expiry**: Automatic redirect to login with context preservation

**Accessibility Features**:

- **Keyboard Navigation**: Tab order and focus management throughout forms
- **Screen Reader Support**: Proper ARIA labels and semantic HTML structure
- **Auto-complete Support**: OTP fields with `one-time-code` attribute for SMS integration
- **Color Contrast**: Material-UI theme ensures WCAG compliance

**Loading & Feedback States**:

- **Progress Indicators**: CircularProgress for actions, LinearProgress for data loading
- **Success Confirmations**: Toast notifications for completed actions
- **State Preservation**: Form inputs maintained across navigation and errors

---

## 14. Constraints & Assumptions

- **Environment variables**:
  - Backend: `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (preferred) or `SUPABASE_PUBLISHABLE_KEY`, `OTP_SECRET_KEY`, `OTP_VALIDITY_MINUTES` (default: 5), `OTP_RESEND_LIMIT_PER_15MIN` (default: 3), `otp_max_verification_attempts` (default: 6), `OTP_RESEND_LIMIT_PER_DAY` (default: 10)
  - SMS Provider: `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER_NUMBER` (primary); Legacy: `NHN_CLOUD_APPKEY`, `NHN_CLOUD_SECRET_KEY`, `NHN_CLOUD_SENDER_NUMBER`
  - Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_BASE_URL` (default: `https://simulation.lightoflifeclub.com/api`)
- **CORS Configuration**: Includes `simulation.lightoflifeclub.com`, localhost and 127.0.0.1 on ports 5173 (dev), 4173 (preview), plus local network IP addresses for development (`10.10.113.129`, `172.30.1.39` but can vary by environment)
- **Supabase RLS** should be configured on user-owned tables; admin APIs rely on server checks
- **Whitelist table** exists with user_hash; seeding/management handled out-of-band
- **Docker/Cloudflare Tunnel** used for deployment; ports: frontend 5173 (dev), 4173 (preview), backend 8000 (production), 8001 (development)
- **Privacy Policy Source of Truth**: Published DB row is primary; static file fallback available if DB unavailable
- **PWA Manifest**: Name "Light of Life Club Simulation", landscape orientation preferred, theme color #1976d2

---

## 15. Error Handling

- **Structured Exception System**: Custom `BaseAPIException` class with error codes, context, and structured logging
- **HTTP Status Code Mapping**:
  - 401: `AuthenticationError` - Missing or invalid authentication  
  - 403: `AdminPrivilegesRequiredError`, `AuthorizationError` - Insufficient permissions
  - 404: `ResourceNotFoundError`, `SimulationNotFoundError`, `NoticeNotFoundError`, `PrivacyPolicyNotFoundError` - Resource not found
  - 400: `WhitelistError`, `InvalidDataError`, `NoFieldsToUpdateError` - Business logic validation errors
  - 409: `PublishingConstraintError` - Conflict errors (e.g., policy publishing constraints)
  - 422: FastAPI request validation errors
  - 500: `DatabaseError`, `InternalServerError` - Server errors
- **Response Formats**:
  - OTP & admin endpoints: `{ success: boolean, message: string, ... }`
  - Standard FastAPI errors: `{ "detail": "..." }`
- **Error Context**: Exceptions include optional `error_code` and `error_context` for debugging
- **Logging**: All exceptions automatically logged with structured context for monitoring

---

## 16. Testing Strategy (Simplified)

### 16.1 Test Layers

| Layer | Tooling | Coverage Target |
|-------|---------|-----------------|
| Backend unit | pytest | ≥75% |
| Frontend unit | Vitest + RTL | ≥60% |
| Integration | pytest + test DB | Critical paths |
| Contract | OpenAPI validation | API stability |
| E2E | Basic smoke tests | Core user flows |

### 16.2 CI Gates

- Lint & Type Check (ESLint, tsc)
- Unit tests pass with coverage
- OpenAPI snapshot validation (no breaking changes)
- Basic security checks (dependency scan)

---

## 17. Acceptance Criteria

### 17.1 OTP & Whitelist

- Given a whitelisted name+phone, when POST /api/otp/send, then OTP is sent and user_hash returned
- Given OTP attempts exceed max, when another attempt is made, then success=false and remaining_attempts=0

### 17.2 Consent & Policy

- Given a policy (DB or fallback), when GET /api/privacy-policy, content is returned.
- Given user_hash + version, when POST /api/consents, record is stored (idempotent via upsert).
- Post-auth enforcement & decline flows are not part of current implementation.

### 17.3 Simulations

- Given valid inputs, when POST /api/simulation/create, then a simulation row is created with id
- Given an updated simulation, when PATCH /api/simulations/{id}, then results are invalidated and re-generated on next run

### 17.4 Admin

- Given an admin user, when GET /api/admin/me, then is_admin=true
- Given an admin user, when publishing a policy, then other policies become unpublished

---

## 19. User Experience Flows

### 19.1 Pre-auth User Journey

**Onboarding Flow (First-time Users)**:

1. **WhitelistCheckPage**: User enters name + phone → system validates against SHA256 hash in whitelist table
   - **Success**: Redirects to OTP verification with `user_hash` stored in sessionStorage
   - **Failure**: Shows error message with retry option
   - **UX Considerations**: Clear error messaging, input validation, mobile-optimized form layout

2. **OtpVerificationPage**: User receives and enters 6-digit code
   - **Loading States**: Shows spinner during send/verify operations
   - **Error Handling**: Displays remaining attempts, resend timer, clear error messages
   - **Rate Limiting UX**: Progressive backoff messaging (3 sends per 15min, 6 verify attempts)
   - **Accessibility**: Large input fields for mobile, auto-focus, numeric keypad

3. **ConsentPage**: Privacy policy acceptance
   - **Content**: Fetches current published policy version via GET /api/privacy-policy
   - **UX**: Scrollable policy text, clear "Accept" button, cannot proceed without consent
   - **State Persistence**: Consent recorded against user_hash before authentication

4. **LoginPage**: Supabase OAuth selection
   - **Providers**: Google, Kakao buttons with brand-appropriate styling
   - **Fallback**: Back navigation to previous steps if needed
   - **Mobile**: Touch-friendly button sizing, clear provider identification

### 19.2 Authenticated User Experience

**Post-login Flow**:

1. **MainPage Navigation**:
   - **Loading States**: Skeleton loaders for simulation table, progressive data loading
   - **Empty States**: Welcome message and CTA for first simulation creation
   - **Bulk Operations**: Multi-select with batch actions (delete, export)

**Simulation Management UX**:

- **Plan Editor**: Multi-step wizard with validation, progress indicators, contextual help
- **Results Visualization**: Responsive tables, mobile-scrollable layouts, summary cards
- **State Management**: Auto-save drafts to localStorage, session recovery on browser refresh

### 19.3 Error Recovery Patterns

**Network Resilience**:

- **Retry Logic**: Exponential backoff for failed API calls with user-friendly retry buttons
- **Offline Indicators**: Connection status in header, cached content when possible
- **Progressive Enhancement**: Core functionality available even with slow connections

**Validation & Feedback**:

- **Real-time Validation**: Input field validation with inline error messages
- **Form State Recovery**: Preserve user inputs across navigation and errors
- **Success Confirmations**: Clear feedback for completed actions (simulation created, policy updated)

---

## 20. Data Migration Strategy

### 20.1 Schema Evolution Approach

**Version-Safe Migrations**:

- **Additive Changes**: New columns added with default values, backward-compatible
- **Deprecation Pattern**: Mark columns for removal with migration comments, grace period before DROP
- **Index Management**: Create indexes concurrently, drop only after confirming usage patterns

**Migration Execution**:

```sql
-- Example: Adding new simulation metadata
ALTER TABLE simulations 
ADD COLUMN metadata JSONB DEFAULT '{}';

-- Example: Evolving privacy policy structure
ALTER TABLE privacy_policies 
ADD COLUMN category TEXT DEFAULT 'general',
ADD COLUMN mandatory BOOLEAN DEFAULT true;
```

### 20.2 Data Consistency Patterns

**Supabase-Specific Considerations**:

- **RLS Policy Updates**: Test policy changes in staging before production deployment
- **Foreign Key Constraints**: Maintain referential integrity during user_id migrations
- **JSONB Evolution**: Use backwards-compatible JSONB schema changes for `simulation_results`, `investments`

**User Data Migration**:

- **Consent Version Tracking**: When privacy policies update, flag users requiring re-consent
- **Consent Status Migration**: Backfill consent_records for existing authenticated users with current published policy version (one-off script)
- **Simulation Schema Updates**: Preserve historical simulation data while supporting new plan parameters
- **Whitelist Management**: Support bulk import/export for whitelist hash updates
- **Retroactive Consent Linking**: Link existing consent_records to user_id for authenticated users

### 20.3 Rollback Procedures

**Safe Rollback Strategy**:

- **Database**: Keep old columns during migration grace period, restore from Supabase backups if needed
- **Application**: Feature flags to disable new functionality, graceful degradation
- **User State**: Preserve pre-migration user preferences and simulation history

---

## 21. Backup and Recovery

### 21.1 Data Protection Strategy

**Supabase Managed Backups**:

- **Automatic Backups**: Daily snapshots with 7-day retention (Supabase Pro tier)
- **Point-in-Time Recovery**: Up to 7 days for critical data recovery scenarios
- **Geographic Redundancy**: Multi-region backup storage via Supabase infrastructure

**Application-Level Backups**:

- **Simulation Export**: User-initiated export of personal simulation history to JSON/CSV
- **Policy Archive**: Administrative backup of all privacy policy versions before publication
- **Whitelist Management**: External backup of hashed whitelist for disaster recovery

### 21.2 Recovery Procedures

**Data Loss Scenarios**:

1. **User Simulation Data**: Restore from daily Supabase backup, user notification of potential data loss window
2. **Privacy Policy Corruption**: Restore from version control + database backup combination
3. **Whitelist Compromise**: Re-hash from master list, coordinate with user communication

**Recovery Time Objectives**:

- **Database Restore**: < 4 hours for complete restoration from backup
- **Application Recovery**: < 30 minutes for service restoration (Docker container restart)
- **User Notification**: < 2 hours for incident communication

### 21.3 Business Continuity

**Service Degradation Modes**:

- **Read-Only Mode**: If write operations fail, allow simulation viewing and export
- **Cached Policy**: Serve privacy policy from static backup if database unavailable
- **OTP Fallback**: Manual verification process if SMS provider fails

---

## 22. Performance Baselines

### 22.1 API Performance Targets

**Core Endpoints**:

| Endpoint | Target (p95) | Acceptable (p99) | Timeout |
|----------|--------------|------------------|---------|
| POST /api/otp/send | < 2000ms | < 4000ms | 10s |
| POST /api/otp/verify | < 300ms | < 500ms | 5s |
| POST /api/simulation/create | < 400ms | < 600ms | 10s |
| POST /api/simulation/run | < 1500ms | < 3000ms | 15s |
| GET /api/simulations | < 200ms | < 400ms | 5s |
| GET /api/health | < 100ms | < 200ms | 3s |

**Database Operations**:

- **Supabase Query Performance**: < 100ms for simple selects, < 500ms for complex joins
- **JWT Verification**: < 50ms including JWKS cache lookup (5-15min TTL)
- **Simulation Engine**: < 1000ms for 10-round simulation with complex investment schedules

### 22.2 Frontend Performance Metrics

**Core Web Vitals Targets**:

- **Largest Contentful Paint (LCP)**: < 2.5s for MainPage initial load
- **First Input Delay (FID)**: < 100ms for all interactive elements
- **Cumulative Layout Shift (CLS)**: < 0.1 for stable page layouts

**Application-Specific Metrics**:

- **Page Transitions**: < 200ms between authenticated pages
- **Simulation Table Rendering**: < 500ms for 100+ simulation rows
- **Plan Editor**: < 100ms response time for input validation

### 22.3 Scalability Considerations

**Current Load Profile** (60-100 users):

- **Concurrent Users**: 30-60 peak, 5-15 average
- **API Requests**: ~1000 requests/hour peak, mostly GET operations
- **Database Connections**: 5-10 concurrent via Supabase connection pooling

**Performance Monitoring**:

- **Health Endpoint**: Tracks Supabase latency and availability
- **Client-side Telemetry**: Error rates, page load times via browser performance APIs
- **Rate Limiting**: OTP endpoints protected (3/15min send, 6 attempts per code)

**Scaling Thresholds**:

- **Database**: Current Supabase tier supports 500+ concurrent connections
- **Backend**: Single FastAPI instance handles current load; horizontal scaling at 200+ concurrent users
- **Frontend**: Cloudflare CDN provides global distribution, Vite build optimizations for bundle size

---

## 23. Privacy Policy Management

- Create / update / delete / publish policies (admin endpoints).
- Fetch policy (public) with DB-first then static-file fallback.


---

## 24. Glossary

- **Supabase**: Backend-as-a-Service providing Postgres, Auth, Storage, and APIs
- **JWKS**: JSON Web Key Set for verifying JWT signatures
- **OTP**: One-time password sent via SMS
- **PWA**: Progressive Web App supporting installability and service worker caching
- **RLS**: Row Level Security (Postgres policy-based row access control)
- **P95/P99**: 95th and 99th percentile performance metrics
- **LCP/FID/CLS**: Core Web Vitals performance metrics
- **RTT**: Round-trip time for network requests
- **Pre-auth user**: User before completing OTP verification, privacy policy consent, and OAuth authentication

## 25. Technical Specification

### Architecture

**Backend (FastAPI + Python 3.11+)**:
- **Entry**: `main.py` → FastAPI app factory with CORS + exception handlers
- **Routes**: `api/routes.py` (507+ lines) → thin delegation to services
- **Services**: `services/` → domain logic (simulations, OTP)
- **Engine**: `simulation_service.py` → 10 investment plans
- **Models**: `models/schemas.py` → Pydantic v2 validation
- **Config**: `config/settings.py` → frozen dataclass pattern
- **Auth**: `auth/jwt.py` → Supabase JWKS validation
- **DB**: Supabase PostgreSQL + RLS
- **Errors**: `exceptions.py` → structured hierarchy

**Auth Flow**:
- JWT: Bearer token → Supabase JWKS
- Inject: `user_id: str = Depends(authenticate_jwt_token)`
- Admin: `_assert_admin(user_id, client)` → checks `admins.user_id`

**OTP**:
- Service: `services/otp/otp_service.py` → `phone_otps` table
- Limits: 3/15min, 10/day (configurable)
- SMS: Solapi API (Korean)
- Flow: `/api/otp/send` → whitelist check → `user_hash` → `/api/otp/verify`

**Simulations**:
- Orchestrator: `services/simulations.py` → DB I/O
- Plans: 10 types in `constants.py` (max investors: 12-18)
- Math: Revenue + commission (32%) + bonuses + tax (3.3%)
- Cache: Invalidate on update (`simulation_results` → `None`)

**Admin**:
- Notices: CRUD in `notices` table
- Policies: Versioned in `privacy_policies` + publish workflow

**Frontend (React 19 + TypeScript 5.8+ + Vite)**:
- **PWA**: `vite.config.ts` + `vite-plugin-pwa`
- **UI**: MUI + Tailwind CSS
- **Controller**: `AppController.tsx` → navigation + state
- **Auth**: Supabase client (`supabaseClient.ts`)
- **State**: Context + hooks, minimal localStorage
- **API**: Services layer with error handling
- **Cache**: NetworkFirst (notices), StaleWhileRevalidate (assets)
- **Design**: Mobile-first, landscape preferred

**Database (Supabase)**:
```
simulations        → user simulation data + JSON results
whitelist         → hash-based verification
phone_otps        → OTP records + rate limiting
consent_records   → privacy consent tracking
notices          → admin announcements
privacy_policies → versioned policies
admins          → admin roles
user_onboarding → onboarding flags
```

### Local Dev & Runtime

**Production**:
- Frontend: Vite preview on Windows (port 4173)
- Backend: Native Windows + uvicorn (port 8000)
- Access: Cloudflare Tunnel → `https://simulation.lightoflifeclub.com`
- DB: Supabase cloud

**Dev Environment**:
- Docker: Available but NOT used for deployment
- Env vars: Backend `.env`, Frontend `.env.local`
- Scripts: `windows-scripts/` PowerShell automation

**Commands**:
```powershell
# Frontend preview
cd src/frontend
npm run preview  # :4173

# Backend dev
cd src/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Tests
cd src/backend && python -m pytest -q
cd src/frontend && npm run test
```

### Configuration

**Backend Required**:
- `SUPABASE_URL`: Project URL
- `SUPABASE_SECRET_KEY` OR `SUPABASE_PUBLISHABLE_KEY`

**OTP/SMS**:
- `OTP_SECRET_KEY`: Encryption key
- `OTP_VALIDITY_MINUTES`: Default 5
- `OTP_RESEND_LIMIT_PER_15MIN`: Default 3
- `OTP_RESEND_LIMIT_PER_DAY`: Default 10
- `otp_max_verification_attempts`: Default 6 (lowercase!)

**SMS Providers**:
- Solapi: `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER_NUMBER`
- NHN (legacy): `NHN_CLOUD_APPKEY`, `NHN_CLOUD_SECRET_KEY`, `NHN_CLOUD_SENDER_NUMBER`

**CORS Origins**:
```
https://simulation.lightoflifeclub.com
http://localhost:5173, http://127.0.0.1:5173
http://localhost:4173, http://127.0.0.1:4173
+ Local network IPs
```

**Frontend**:
- `VITE_SUPABASE_URL`: Same as backend
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Client key
- `VITE_API_BASE_URL`: Defaults in `vite.config.ts`

### Backend Patterns

**Architecture**: Router → Service → Model

**Supabase Client**:
```python
from supabase import create_client
from config.settings import settings

def _supabase_client():
    key = settings.supabase_secret_key or settings.supabase_publishable_key
    return create_client(settings.supabase_url, key)
```

**Auth Pattern**:
```python
from auth.jwt import authenticate_jwt_token

async def my_endpoint(user_id: str = Depends(authenticate_jwt_token)):
    # user_id = validated JWT 'sub'
    pass
```

**Admin Guard**:
```python
_assert_admin(user_id, client)  # Checks admins.user_id table
```

**Error Codes**:
- 401: Invalid auth
- 403: Insufficient privileges

**Simulation Rules**:
- Update invalidates results: `simulation_results` → `None`
- Plans: See `constants.py` (A,B,C,D,E,F,G,K,P,R)

**DB Access**:
- Service-level clients or DI
- Wrap in try/catch → `handle_database_exception`
- Respect RLS policies

**Response Pattern**:
```python
# Success
return ResponseModel(data=result, status="success")

# Error
from exceptions import SimulationNotFoundError
if not simulation:
    raise SimulationNotFoundError(f"Simulation {id} not found")
```

### Adding Endpoints

```python
from fastapi import APIRouter, Depends, HTTPException
from auth.jwt import authenticate_jwt_token
from models.schemas import MyReq, MyResp

router = APIRouter()

@router.post('/api/my-feature', response_model=MyResp)
async def my_feature(req: MyReq, user_id: str = Depends(authenticate_jwt_token)):
    # Delegate to service
    # Raise HTTPException on errors
    return MyResp(...)
```

Models → `models/schemas.py`  
Logic → `services/`

### Frontend Integration

**API**:
- Base: `VITE_API_BASE_URL` → defaults in `vite.config.ts`
- Dev: Set to `http://localhost:8000/api`
- Auth: JWT via Authorization header

**Supabase**:
- Client: `src/frontend/src/supabaseClient.ts`
- Auto-refresh enabled
- Config: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

**State**:
- Controller: `AppController.tsx`
- Context: `useAuth()` hook
- Storage: Minimize localStorage use

**Structure**:
```
src/
├── pages/        # Routes
├── components/   # UI
├── context/      # Providers
├── hooks/        # Custom hooks
├── services/     # API layer
├── types/        # TypeScript
└── utils/        # Helpers
```

**PWA**:
- Worker: `vite-plugin-pwa`
- Cache: NetworkFirst `/api/notices`, StaleWhileRevalidate assets
- Manifest: "Light of Life Club Simulation"

### Gotchas

**Testing**:
- Mock `JWKSClient.get_keys()` → avoid real HTTP
- Backend needs env vars → use fixtures
- Integration: `src/backend/tests/integration/`
- Frontend: Vitest + RTL

**OTP/SMS**:
- Korean messages → maintain contract
- Rate limits: Service-level DB tracking
- Attempts: `otp_max_verification_attempts` (lowercase!)

**Simulations**:
- Empty: `get_simulations` → 404 if none exist
- Cache: Results in DB, auto-clear on update
- Math: Complex algorithm in `simulation_service.py`

**Admin/Privacy**:
- Create: Cannot set `published=true`
- Publish: Use `/api/admin/privacy-policies/{id}/publish`
- Auth: All admin endpoints need `_assert_admin()`

**Frontend Security**:
- No sensitive data in localStorage
- JWTs managed by Supabase client
- Implement error boundaries

**Windows Deploy**:
- Backend starts before frontend
- Ports: 4173 (frontend), 8000 (backend)
- Cloudflare Tunnel required

**Database**:
- RLS on all tables
- Schema: `.memo/CE/specs/schema/schema.md`
- Migrations: Consider existing data + RLS

**Development**:
- Windows optimized
- Ports: 5173 (dev), 4173 (preview), 8000 (backend)
- Production: `simulation.lightoflifeclub.com`

**API Contract**:
- Truth: `api/routes.py` > spec docs
- Some SSD endpoints not implemented
- Maintain backwards compatibility

### Key Files

**Docs**:
- SSD: `.github/copilot-instructions.md`
- Schema: `.memo/CE/specs/schema/schema.md`
- Tests: `docs/plans/test-code-v1/`

**Backend Core**:
- `api/routes.py` → All endpoints (507+ lines)
- `services/simulations.py` → CRUD ops
- `simulation_service.py` → Financial engine
- `constants.py` → 10 plan configs
- `auth/jwt.py` → JWT + JWKS
- `models/schemas.py` → Pydantic models
- `config/settings.py` → Environment
- `exceptions.py` → Error hierarchy

**Frontend Core**:
- `AppController.tsx` → Main orchestrator
- `vite.config.ts` → PWA + build config
- `supabaseClient.ts` → Auth + API
- `pages/` → WhitelistCheckPage, MainPage, etc.
- `context/` → React providers
- `services/` → API communication

## 26. Guidelines for Copilot Agents

### Basic behavioral patterns

ALWAYS FOLLOW these patterns when doing tasks.

#### Task Approach

**DO:**
- Focus ONLY on requested tasks
- Take time to think and plan before executing
- Raise questions for issues/improvements outside scope

**DON'T:**
- Add unrequested features or fixes
- Make assumptions without user confirmation
- Rush into implementation without planning

#### When to Ask User

**ASK when:**
- Multiple best practice options exist
- Choice depends on preference/taste
- Decision impacts future implementation
- Requirements are ambiguous

**PROVIDE:**
- Clear options list with explanations
- Pros/cons for each option
- Recommended choice with rationale

#### Priority Evaluation

Evaluate ALL requests against these priorities (highest to lowest):

##### 1st Priority: Market Environment
- Total users count
- Concurrent users count
- Target devices/regions
- Target OS + versions
- Target browsers + versions
- Network conditions (online/offline)

##### 2nd Priority: Technical Requirements
- Application type (web/mobile/desktop/embedded)
- Architecture (monolith/microservices/serverless)
- Tech stack (languages/frameworks/libraries/databases)
- Performance requirements (latency/throughput)
- Security requirements (data protection/auth/authorization)
- Scalability requirements (horizontal/vertical scaling)
- Maintainability requirements (code quality/docs/testing)

##### 3rd Priority: Industry Standards
- Best practices for application type
- Standards for application scale
- Environment-specific conventions

**ACTION:** If request violates priorities, STOP and suggest alternatives with explanations.

#### Task Completion Checklist

**VERIFY:**
- [ ] Did ONLY requested tasks
- [ ] Followed user-provided context
- [ ] Applied priority evaluation
- [ ] No unauthorized additions
- [ ] No assumption-based decisions
- [ ] Removed the legacy codes not used anymore

**ACTION:** If verification fails, revisit implementation or ASK user for clarification.

### Pull Requests Guidelines

Before submitting a Pull Request, ensure it meets these guidelines:

#### 1. General Guidelines

Keep PRs small and focused on a single change. Avoid mixing features with refactoring or adding unrelated changes. This approach:

- Speeds up review process
- Simplifies cherry-picking for bug-fix releases
- Reduces reviewer cognitive load

For larger changes, consider maintaining a Draft PR and creating smaller, reviewable PRs from it.

#### 2. Commit Messages

Follow these conventions:

1. **Separate subject from body with a blank line**
2. **Limit subject line to ~50 characters**
3. **Capitalize the subject line**
4. **No period at the end of subject**
5. **Use imperative mood** (e.g., "Add feature", "Fix bug")
   - Test: _"If applied, this commit will **\<subject\>**"_
6. **Wrap body at 72 characters**
7. **Explain what and why, not how**
   - Include context and reasoning
   - Reference related issues/PRs at bottom
     _“If applied, this commit will **<subject>**”._

6. **Wrap the body at 72 characters**  
   - Improves readability in terminals and tools.

7. **Use the body to explain *what* and *why*, not *how***  
   - The diff already shows *how*.  
   - Explain the context, purpose, and reasoning behind the change.  
   - Optionally, reference related issues or PRs at the bottom.

## 27. Back-end Coding Guidelines

Python backend application guidelines.

### Core Principles

**DO:**
- Apply SOLID principles (SRP, OCP, LSP, ISP, DIP)
- Use dependency injection
- Break code into small, focused functions/classes
- Organize by features/domains, not types
- Extract common functionality into reusable components
- Use design patterns where appropriate
- Keep modules loosely coupled with clear interfaces
- Use configuration files/env variables for settings
- Write testable code (easy to test in isolation)

**DON'T:**
- Create monolithic functions/classes
- Duplicate code across modules
- Hard-code configuration values
- Write tightly coupled modules

### Code Quality

**DO:**
- Add docstrings to all functions/classes
- Add inline comments for complex logic
- Use type hints for all functions
- Use meaningful variable/function names
- Use f-strings for string formatting
- Use list comprehensions/generator expressions
- Use dataclasses or pydantic for class definitions
- Make functions "pure" (no side effects, consistent output)
- Use context7 MCP

**DON'T:**
- Use ambiguous names
- Create deep nesting (>3 levels)
- Mix responsibilities in single function
- Ignore type hints

### Error Handling

**DO:**
- Implement structured, categorized exceptions
- Create custom error classes for specific conditions
- Use try-except blocks with meaningful messages
- Log errors with structured logging
- Capture relevant context/metadata in logs

**DON'T:**
- Use generic exceptions
- Swallow exceptions silently
- Expose internal error details to users

### API Standards

**Status Codes:**
- `200`: Successful GET
- `201`: Successful POST/PUT
- `400`: Business logic validation errors
- `401`: Missing/invalid authentication
- `403`: Insufficient permissions (admin required)
- `404`: Resource not found
- `422`: Request validation errors
- `500`: Server errors

### Performance & Security

**DO:**
- Optimize for performance after ensuring readability
- Validate/sanitize all user input
- Handle sensitive data securely
- Follow Python security best practices
- Document all dependencies in requirements file

**DON'T:**
- Optimize prematurely at expense of maintainability
- Trust user input without validation
- Log sensitive data

### Refactoring & Testing

**DO:**
- Refactor code while preserving functionality
- Write unit tests for new code
- Ensure code meets requirements
- Implement monitoring/logging for debugging

**DON'T:**
- Break existing functionality during refactoring
- Deploy without adequate testing

## 28. Front-end Coding Guidelines

PWA React/TypeScript application guidelines.

### React Principles

**DO:**
- Use functional components with hooks (`useState`, `useEffect`, custom hooks)
- Call hooks at top level only (no loops/conditionals)
- Apply SOLID principles (SRP, OCP, LSP, ISP, DIP)
- Break UI into small, focused components (container vs presentational)
- Organize by features/domains: `pages/`, `components/`, `hooks/`, `services/`
- Use composition over inheritance
- Use PascalCase for components, camelCase for variables/functions
- Use unique keys in lists
- Apply memoization only when needed (`React.memo`, `useMemo`, `useCallback`)
- Use `React.lazy` + `Suspense` for code splitting
- Use TypeScript for all props/state/API responses
- Use `import type` for type-only imports
- Treat props as immutable

**DON'T:**
- Use class components
- Call hooks conditionally
- Create monolithic components
- Organize by file types
- Modify props inside components
- Over-optimize with unnecessary memoization

### Architecture Patterns

**Structure:**
```
src/
├── pages/           ## Route-level components
├── components/      ## Reusable UI with domain folders
├── context/         ## React Context providers
├── hooks/           ## Custom business logic hooks  
├── services/        ## API communication layer
├── types/           ## TypeScript definitions
└── utils/           ## Pure utility functions
```

**State Management:**
- Use backend API calls over local state
- Use localStorage/sessionStorage only for UI state
- Use Context API for auth/global state
- Calculate derived values in components (don't store)

### Implementation Patterns

**Functional Components:**
```tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import type { Plan } from '../types/types';

export const MyComponent: React.FC<{ plan: Plan }> = ({ plan }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  return <div>{/* JSX */}</div>;
};
```

**TypeScript:**
- Strict type safety for all props/state/API
- Types centralized in `src/types/types.ts`
- Use generics for reusable components

**Material-UI + Tailwind:**
```tsx
import { Container, Paper, Typography } from '@mui/material';

<Container maxWidth="lg" className="p-4">
  <Paper className="p-6">
    <Typography variant="h4">Title</Typography>
  </Paper>
</Container>
```

**Authentication:**
```tsx
import { useAuth } from '../context/useAuth';

const MyComponent = () => {
  const { user, session, signOut } = useAuth();
  
  if (!user) return <div>Please log in</div>;
  // Authenticated content
};
```

**API Communication:**
```tsx
import { api } from '../services/api';

const handleApiCall = async () => {
  try {
    setLoading(true);
    const result = await api.createSimulation(data, token);
  } catch (error) {
    console.error('API Error:', error);
  } finally {
    setLoading(false);
  }
};
```

**Custom Hooks:**
```tsx
export const useSimulationActions = () => {
  const { session } = useAuth();
  
  const deleteSimulation = useCallback(async (id: string) => {
    if (!session?.access_token) throw new Error('No session');
    return await api.deleteSimulation(id, session.access_token);
  }, [session?.access_token]);
  
  return { deleteSimulation };
};
```

**Component Composition:**
```tsx
import SimulationTable from '../components/MainPage/SimulationTable';
import SummaryReport from '../components/MainPage/SummaryReport';

export const MainPage = () => (
  <Container>
    <SimulationTable onSelectionChange={handleSelection} />
    <SummaryReport data={summaryData} />
  </Container>
);
```

### PWA & Performance

**Service Worker:**
- PWA via `vite-plugin-pwa`
- NetworkFirst for APIs, StaleWhileRevalidate for assets
- Graceful offline degradation

**Code Splitting:**
```tsx
const AdminPolicyPage = React.lazy(() => import('./pages/AdminPolicyPage'));

<Suspense fallback={<div>Loading...</div>}>
  <AdminPolicyPage />
</Suspense>
```

**State Persistence:**
```tsx
import { getJSON, setJSON } from './utils/persist';

const [page, setPage] = useState<Page>(() => 
  getJSON<Page>('ui.page', 'whitelist')
);

const updatePage = (newPage: Page) => {
  setPage(newPage);
  setJSON('ui.page', newPage);
};
```

### Error Handling & UX

**DO:**
- Implement error boundaries
- Provide actionable error messages
- Show loading indicators for async operations
- Use skeleton loaders
- Handle empty states explicitly
- Design mobile-first
- Use `LandscapeEnforcer.tsx` where needed
- Use MUI responsive breakpoints

**DON'T:**
- Expose technical error details to users
- Leave async operations without feedback

### Security

**DO:**
- Let Supabase handle JWT management
- Use session objects from auth context
- Validate all user inputs before API calls
- Sanitize dynamic content
- Include Authorization headers in API calls
- Handle 401/403 responses properly
- Use HTTPS always
- Use HttpOnly cookies for sensitive tokens
- Enforce auth server-side
- Use short-lived JWTs + refresh tokens
- Set strict CSP headers
- Use React Error Boundaries
- Monitor with Sentry/Datadog

**DON'T:**
- Store tokens in localStorage manually
- Store sensitive data in React state/props/localStorage
- Put secrets in `.env` (frontend exposes them)
- Use `dangerouslySetInnerHTML` without DOMPurify
- Log sensitive info to console
- Use `eval`, `Function()`, or dynamic script execution
- Embed API keys/secrets in frontend code

**XSS Prevention:**
- React escapes JSX by default
- Validate/escape all external input (APIs, query params, localStorage)
- Sanitize with DOMPurify if using `dangerouslySetInnerHTML`

**API Security:**
- Always HTTPS
- Protect against CSRF (tokens or SameSite cookies)
- Validate backend responses before rendering

**Headers:**
```
X-Frame-Options: DENY
Content-Security-Policy: frame-ancestors 'none';
```

### UI/UX Design

**Visual Principles:**
- Material Design 3 (MD3) with MUI for React
- Mobile-first design
- CSS Grid + Container Queries for adaptive layouts

**Interaction:**
- Mobile: Bottom Tab Bar navigation
- Desktop/Tablet: Side Navigation Rail or header
- Use `transform` and `opacity` for GPU-accelerated animations
- Clear offline UI states with banners/toasts
- Custom "Add to Home Screen" prompt after engagement

**Implementation:**
```jsx
import { Box } from '@mui/material';
import MobileNavigation from './MobileNavigation';
import DesktopNavigation from './DesktopNavigation';
import useIsMobile from '../hooks/useIsMobile';

function AppShell({ children }) {
  const isMobile = useIsMobile();

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {isMobile ? <MobileNavigation /> : <DesktopNavigation />}
      
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {children}
      </Box>
    </Box>
  );
}
```

**Libraries:**
- UI: @mui/material
- State: React Context + custom hooks
- PWA: workbox-precaching

## 29. Database Schema and RLS Policies

### admins

#### schema

```sql
create table public.admins (
  user_id uuid not null,
  created_at timestamp with time zone not null default now(),
  constraint admins_pkey primary key (user_id)
) TABLESPACE pg_default;
```

#### RLS policies

```sql
create policy "Enable read access for all users"
on "public"."admins"
for select using (true);

create policy "Stories are live for a day"
on "public"."admins"
for select using (
  created_at > (current_timestamp - interval '1 day')
);

create policy "Enable users to view their own data only"
on "public"."admins"
for select
to authenticated
using (
  (select auth.uid()) = user_id
);
```

### consent_records

#### schema

```sql
create table public.consent_records (
  id uuid not null default gen_random_uuid (),
  consent_type text not null,
  consent_version text not null,
  consent_given_at timestamp with time zone null default now(),
  ip_address text null,
  user_agent text null,
  user_hash text null,
  user_id uuid null,
  constraint consent_records_pkey primary key (id)
) TABLESPACE pg_default;
```

#### RLS policies

Enabled but no policies defined yet.

### notices

#### schema

```sql
create table public.notices (
  title text not null,
  content text not null,
  id uuid not null default gen_random_uuid (),
  pinned boolean null,
  published boolean null,
  created_at timestamp with time zone null default (now() AT TIME ZONE 'Asia/Seoul'::text),
  updated_at timestamp with time zone null default (now() AT TIME ZONE 'Asia/Seoul'::text),
  constraint notices_pkey primary key (id)
) TABLESPACE pg_default;
```

#### RLS policies

```sql
create or replace function get_teams_for_user(user_id uuid)
returns setof bigint as $$
  select team_id from members where user_id = $1
$$ stable language sql security definer;

create policy "Team members can update team members if they belong to the team"
on members
for all using (
  team_id in (select get_teams_for_user(auth.uid()))
);

create policy "Enable read access for all users"
on "public"."notices"
for select using (true);

create policy "Stories are live for a day"
on "public"."notices"
for select using (
  created_at > (current_timestamp - interval '1 day')
);

create policy "Enable users to view their own data only"
on "public"."notices"
for select
to authenticated
using (
  (select auth.uid()) = user_id
);

create policy "Enable read access for all users"
on "public"."notices"
for select using (true);

create policy "Stories are live for a day"
on "public"."notices"
for select using (
  created_at > (current_timestamp - interval '1 day')
);

create policy "Enable users to view their own data only"
on "public"."notices"
for select
to authenticated
using (
  (select auth.uid()) = user_id
);
```

### phone_otps

#### schema

```sql
create table public.phone_otps (
  id uuid not null default gen_random_uuid (),
  phone text not null,
  code_hash text not null,
  created_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null,
  attempts smallint not null default 0,
  used boolean not null default false,
  provider_msg_id text null,
  client_ip inet null,
  user_agent text null,
  constraint phone_otps_pkey primary key (id)
) TABLESPACE pg_default;
```

#### RLS policies

Enabled but no policies defined yet.

### privacy_policies

#### schema

```sql
create table public.privacy_policies (
  id uuid not null default gen_random_uuid (),
  version text not null,
  locale text not null default 'ko-KR'::text,
  content text not null,
  published boolean not null default false,
  effective_date date null,
  last_updated date not null default CURRENT_DATE,
  created_by text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint privacy_policies_pkey primary key (id)
) TABLESPACE pg_default;

create unique INDEX IF not exists privacy_policies_version_locale_uidx on public.privacy_policies using btree (version, locale) TABLESPACE pg_default;

create trigger privacy_policies_set_updated_at BEFORE
update on privacy_policies for EACH row
execute FUNCTION set_updated_at ();
```

#### RLS policies

Enabled but no policies defined yet.

### profiles

#### schema

```sql
create table public.profiles (
  id uuid not null,
  updated_at timestamp with time zone null,
  username text null,
  avatar_url text null,
  website text null,
  constraint profiles_pkey1 primary key (id),
  constraint username_length check ((char_length(username) >= 3))
) TABLESPACE pg_default;
```

#### RLS policies

```sql
create policy "Enable read access for all users"
on "public"."profiles"
for select using (true);

create policy "Stories are live for a day"
on "public"."profiles"
for select using (
  created_at > (current_timestamp - interval '1 day')
);

create policy "Enable users to view their own data only"
on "public"."profiles"
for select
to authenticated
using (
  (select auth.uid()) = user_id
);

create policy "Members can update team details if they belong to the team"
on teams for update using (
  (select auth.uid()) in (
    select user_id from members where team_id = id
  )
);
```

### simulations

#### schema

```sql

create table public.simulations (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  plan_id text not null,
  starting_company_round smallint not null,
  simulation_rounds smallint not null,
  investments jsonb not null,
  simulation_results jsonb null,
  created_at timestamp with time zone null default (now() AT TIME ZONE 'Asia/Seoul'::text),
  updated_at timestamp with time zone null default (now() AT TIME ZONE 'utc'::text),
  memo text null,
  sales_achievement_rates jsonb null,
  current_company_round smallint null,
  constraint profiles_pkey primary key (id)
) TABLESPACE pg_default;

create trigger update_profiles_updated_at BEFORE
update on simulations for EACH row
execute FUNCTION update_updated_at_column ();

```

#### RLS policies

```sql

create policy "Enable delete for users based on user_id"
on "public"."simulations"
for delete using (
  (select auth.uid()) = user_id
);

create policy "Enable insert for authenticated users only"
on "public"."simulations"
for insert to authenticated
with check (true);

create policy "Enable insert for users based on user_id"
on "public"."simulations"
for insert with check (
  (select auth.uid()) = user_id
);

create policy "Enable read access for all users"
on "public"."simulations"
for select using (true);

create policy "Stories are live for a day"
on "public"."simulations"
for select using (
  created_at > (current_timestamp - interval '1 day')
);

create policy "Enable users to view their own data only"
on "public"."simulations"
for select
to authenticated
using (
  (select auth.uid()) = user_id
);

create policy "Members can update team details if they belong to the team"
on teams for update using (
  (select auth.uid()) in (
    select user_id from members where team_id = id
  )
);
```

### whitelist

#### schema

```sql

create table public.whitelist (
  user_hash text not null,
  constraint whitelist_pkey primary key (user_hash)
) TABLESPACE pg_default;

```

#### RLS policies

Enabled but no policies defined yet.