# LOLClub Simulation – Software Specification Document (SSD)

Version: 0.2.0 (Streamlined for Internal Use)  
Date: 2025-09-09  
Status: Draft (streamlined from enterprise version)  
Owners: Product, Engineering (Backend/Frontend)

> **Note**: For enterprise-scale features (10,000+ users), see [`enterprise-scale/`](enterprise-scale/) documentation.

---

## 1. Introduction

LOLClub Simulation is a PWA that allows whitelisted users to sign in via Supabase OAuth, manage investment plan simulations, and review results. The app enforces a pre-auth onboarding flow (whitelist + OTP + privacy consent) and provides an admin UI for managing privacy policies and notices. The backend is a FastAPI service integrated with Supabase (Auth, Postgres, Storage), and the frontend is a React/Vite app.

The Goals of this Project:

- Provide an authenticated experience for running configurable financial simulations and storing results per user.
- Enforce onboarding: whitelist check, OTP verification, and privacy policy consent.
- Allow admins to manage privacy policies (versioned, publishable) and end-user notices.

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

### 3.1 Stakeholders

- **End user**: 60–100 whitelisted users (internal testing phase). Concurrent active users: 30–60 peak.
- **Admin**: 1–3 internal admin users.
- **Owner**: Maintains backend services, data schema, and frontend app. Also an admin user.

### 3.2 User Roles

- **Pre-auth user**: Unauthenticated; can access OTP, privacy policy, and consent endpoints.
- **Authenticated user**: Completed onboarding, runs simulations, reads notices and privacy policies.
- **Admin user**: Authenticated user with admin privileges; can manage notices and privacy policies.

---

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

### 4.2 Test Environment

Target devices for functional / UX validation:

- Desktop: Windows 11 + Google Chrome (latest stable).
- Mobile: iPhone 11 Pro (iOS 18.1.1) + Google Chrome.

### 4.3 Production Environment Targets

Supported / validated device & browser matrix:

- Desktop: Windows 11+ (latest two Chrome versions).
- Mobile (iOS): iPhone 11+ on iOS 18.1.1+ using Google Chrome.
- Mobile (Android): Samsung Galaxy S21+ (Android 12+) using Google Chrome (latest two versions).

### 4.4 Expected User Load

| Metric | Estimate (Internal Phase) |
|--------|---------------------------|
| Total registered/whitelisted users | 60–100 |
| Simultaneous active users (peak) | 30–60 |

Implications:

- Scaling requirements modest; single-region Supabase + minimal horizontal scaling acceptable.
- Basic rate limiting enforced early to prevent misuse of OTP or simulation endpoints.

---

## 5. System Architecture

- **Frontend**: React 19 + TypeScript + Vite (vite-plugin-pwa, MUI for UI). Auth via @supabase/supabase-js. State persisted selectively to localStorage/sessionStorage.
- **Backend**: FastAPI (Python 3.12), Pydantic v2 schemas, Supabase client (REST/RPC). JWT verification uses Supabase JWKS.
- **Data**: Supabase Postgres (tables below). Auth via Supabase; JWT audience "authenticated". Optional static fallback for policy content.
- **Infra**: Dockerized services; Cloudflare Tunnel for public frontend domain; CORS configured for local dev and tunnel domain.

High-level flow:

1. Pre-auth: OTP Authentication (includes WhitelistCheck) → ConsentPage → Login (Supabase OAuth).  
2. Auth: Backend validates JWT via Supabase JWKS; issues user-specific data access.  
3. App: Users manage simulations; admins manage notices/policies.  

---

## 6. Data & Models (Supabase)

Core tables (field types reflect usage in code):

- **whitelist** (external/seeded)
  - user_hash text (sha256 of "{name}-{normalized_phone}")

- **admins**
  - user_id uuid (Supabase auth.users.id)

- **notices**
  - id uuid (pk), title text, content text, pinned boolean, published boolean
  - created_at timestamptz, updated_at timestamptz

- **privacy_policies**
  - id uuid (pk), version text, locale text, content text, published boolean
  - effective_date date, created_at timestamptz, updated_at timestamptz
  - unique(version, locale)

- **phone_otps**
  - id uuid (pk), phone text, code_hash text, attempts smallint, used boolean
  - created_at timestamptz, expires_at timestamptz
  - indexes: phone, created_at; composite (phone, used, expires_at)

- **user_onboarding**
  - user_id uuid (pk), user_hash text, whitelist_passed boolean, otp_verified boolean
  - consent_version text, created_at timestamptz, updated_at timestamptz

- **simulations**
  - id uuid (pk), user_id uuid, plan_id text, starting_company_round int, current_company_round int
  - simulation_rounds int, investments jsonb, sales_achievement_rates jsonb
  - simulation_results jsonb, memo text, created_at timestamptz, updated_at timestamptz

- **consent_records**
  - id uuid (pk), user_hash text, user_id uuid, consent_type text
  - consent_version text, consent_given_at timestamptz, ip_address text, user_agent text

---

## 7. Security & Authentication

- **Frontend**: Authenticates via Supabase OAuth (Google, Kakao). Sessions persisted with autoRefresh.
- **Backend**: Validates Authorization header using Supabase JWKS with audience "authenticated"; extracts sub as user_id.
- **CORS**: Allow list includes Cloudflare Tunnel domain and local dev hosts/ports.
- **Secrets**: SUPABASE_SECRET_KEY used server-side. Publishable key only in frontend. SMS provider keys (Solapi) loaded from env.
- **PII handling**: Consent recorded against user_hash pre-auth; onboarding links the consent version post-auth via user_id and user_hash.

### 7.1 Core Security Controls

| Control | Status | Notes |
|---------|--------|-------|
| JWT validation via JWKS | ✅ Implemented | Cache keys (TTL 5–15m) |
| Admin server-side check | ✅ Implemented | Table lookup each request |
| OTP rate limiting | ✅ Basic | 3 sends per 15 min, 6 verify attempts |
| RLS on user tables | ✅ Basic |  |
| OTP hashing | ✅ Basic |  |

---

## 8. Functional Requirements

### 8.1 Pre-auth Whitelist & OTP

- **Verify User**: POST /api/verify-user with name, phone_number → checks whitelist by sha256(name-phone)
- **Send OTP**: POST /api/otp/send with name, phone_number → checks whitelist; creates phone_otps; sends via Solapi
- **Verify OTP**: POST /api/otp/verify with phone_number, otp_code → validates against latest unused, unexpired record

### 8.2 Privacy Policy & Consent

- **Get Policy**: GET /api/privacy-policy?version&locale → returns current or specific version
- **Record Consent**: POST /api/consents with user_hash, consent_type, consent_version
- **Get User Consents**: GET /api/consents/{user_hash} → list of consent records (pre-auth)

### 8.3 Authentication & Onboarding Link

- **Login**: Supabase OAuth redirects back to app
- **Link Onboarding**: POST /api/onboarding/link (auth) with whitelist_passed, otp_verified, consent_version
- **Onboarding Status**: GET /api/onboarding/status (auth) → returns flags and consent_version for gating

### 8.4 Simulations

- **List**: GET /api/simulations (auth) → user-specific list
- **Detail**: GET /api/simulations/{simulation_id} (auth) → single row (owner only)
- **Create**: POST /api/simulation/create (auth) with plan parameters
- **Run**: POST /api/simulation/run (auth) with simulation_id → executes simulation; persists results
- **Update**: PATCH /api/simulations/{id} (auth) → updates inputs; clears results
- **Update Memo**: PATCH /api/simulations/{id}/memo (auth) → set memo
- **Delete**: DELETE /api/simulations/{id} (auth) → delete row if owner

### 8.5 Notices & Admin

- **Public**: GET /api/notices, GET /api/notices/{id} (published only)
- **Admin**: GET /api/admin/me, POST/PATCH/DELETE /api/admin/notices/{id}
- **Privacy Policies (Admin)**: CREATE, UPDATE, PUBLISH via /api/admin/privacy-policies

### 8.6 Health

- **GET /api/health** → supabase probe and latency

---

## 9. API Contracts (Key Examples)

All JSON. Auth header required where noted: `Authorization: Bearer {token}`.

```javascript
// POST /api/verify-user
{
  req: { name: string, phone_number: string },
  res: { is_whitelisted: boolean, user_hash?: string, detail?: string }
}

// POST /api/otp/send  
{
  req: { name: string, phone_number: string },
  res: { success: boolean, message: string, expires_in_seconds?: number, user_hash?: string }
}

// POST /api/otp/verify
{
  req: { phone_number: string, otp_code: string },
  res: { success: boolean, message: string, remaining_attempts?: number }
}

// POST /api/simulation/create (auth)
{
  req: { plan_id: string, starting_company_round: number, current_company_round: number, 
         simulation_rounds: number, scheduled_payment: Record<string, number> },
  res: { simulation_id: string, plan_id: string, message: string, success: boolean }
}

// POST /api/simulation/run (auth)
{
  req: { simulation_id: string },
  res: { simulation_id, plan_id, history: Array<...>, message, success }
}
```

---

## 10. Simulation Engine (Business Logic)

- **Plans**: A, B, C, D, K, P, R, F, E with defined parameters
- **Core concepts**:
  - max_investor_count controls growth vs stable phase
  - Tax 3.3% applied to total revenue; net profit and cumulative tracked each round
- **Service**: FinancialSimulationService(plan_id, scheduled_payment?, sales_achievement_rates?) → run_simulation(rounds) → results.history
- **Persistence**: results stored in simulations.simulation_results; recalculated on demand if missing or when inputs change

---

## 11. Non-Functional Requirements

- **Performance**: API endpoints < 500ms for typical operations; simulation run < 2s for common inputs
- **Availability**: Health endpoint surfaces dependency issues; tolerate transient Supabase failures gracefully
- **Security**: JWT validation via JWKS; admin checks via admins table. No secrets in frontend code
- **Rate limiting**: OTP send limited (3 per 15-min); attempts per code limited (6 attempts)
- **PWA**: Installable manifest and icons; service worker via vite-plugin-pwa (basic)

---

## 12. PWA Requirements

- **Manifest**: name, icons (192–512 maskable). Start URL index.html; theme/background colors per UI theme
- **Service Worker**: Provided via vite-plugin-pwa defaults
- **UX**: Mobile-first, responsive layout using MUI theme
- **Installability**: HTTPS required; Cloudflare Tunnel domain supported

---

## 13. UI/UX Flows

### 13.1 Pre-auth Flow

1. **OTPPage**: user enters name/phone; on success receives user_hash
2. **ConsentPage**: user accepts privacy policy; consent recorded with user_hash  
3. **LoginPage**: Supabase OAuth (Google/Kakao). User can navigate back if needed

### 13.2 Post-auth Flow

- **Onboarding link**: App links prior context (whitelist_passed=true, otp_verified=true, consent_version) to user_id
- **Main App**: Users manage simulations; admins manage notices/policies
- **AdminPolicyPage**: admin-only CRUD for policies; publish management

---

## 14. Constraints & Assumptions

- **Environment variables**:
  - Backend: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SOLAPI_*` for SMS, `OTP_*` limits
  - Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_BASE_URL`
- **Supabase RLS** should be configured on user-owned tables; admin APIs rely on server checks
- **Whitelist table** exists with user_hash; seeding/management handled out-of-band
- **Docker/Cloudflare Tunnel** used for deployment; ports: frontend 5173 (dev), 4173 (preview), backend 8000

---

## 15. Error Handling (Simplified)

### 15.1 Core Error Codes

| Scenario | HTTP | Code | Message |
|----------|------|------|---------|
| Not whitelisted | 404 | USER_NOT_WHITELISTED | User not found |
| OTP rate limit | 429 | OTP_SEND_RATE_LIMIT | Too many requests. Try again later. |
| Wrong OTP code | 400 | OTP_INVALID | Incorrect code. |
| OTP expired | 400 | OTP_EXPIRED | Code expired. Request a new one. |
| Unauthorized | 401 | UNAUTHORIZED | Authentication required. |
| Forbidden | 403 | FORBIDDEN | Access denied. |
| Not found | 404 | NOT_FOUND | Resource not found. |
| Validation error | 400 | VALIDATION_ERROR | Invalid request payload. |
| Rate limited | 429 | RATE_LIMITED | Too many requests. |
| Internal error | 500 | INTERNAL_ERROR | Unexpected error occurred. |

### 15.2 Error Response Format

```json
{
  "error": {
    "code": "OTP_INVALID",
    "message": "The code you entered is incorrect.",
    "details": { "remaining_attempts": 2 }
  }
}
```

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

- Given a whitelisted name+phone, when POST /api/verify-user, then is_whitelisted=true and user_hash returned
- Given OTP attempts exceed max, when another attempt is made, then success=false and remaining_attempts=0

### 17.2 Consent & Policy

- Given a published policy, when GET /api/privacy-policy, then latest published content returned
- Given user_hash and version, when POST /api/consents, then record exists and GET /api/consents/{user_hash} includes it

### 17.3 Auth & Onboarding

- Given a valid Supabase session token, when calling /api/onboarding/status, then user flags returned
- If consent_version != current, app navigates to consent

### 17.4 Simulations

- Given valid inputs, when POST /api/simulation/create, then a simulation row is created with id
- Given an updated simulation, when PATCH /api/simulations/{id}, then results are invalidated and re-generated on next run

### 17.5 Admin

- Given an admin user, when GET /api/admin/me, then is_admin=true
- Given an admin user, when publishing a policy, then other policies become unpublished

---

## 18. Future Considerations

When scaling beyond 100 users, refer to [`enterprise-scale/`](enterprise-scale/) documentation for:

- **Comprehensive Security**: STRIDE threat modeling, detailed rate limiting, audit logging
- **Advanced Error Handling**: 40+ specific error codes, accessibility compliance, OpenAPI contract enforcement  
- **Enterprise Operations**: 7-layer testing, comprehensive monitoring, incident response procedures
- **Performance at Scale**: SLOs, performance testing, operational runbooks

---

## 19. User Experience Flows

### 19.1 Pre-auth User Journey

**Onboarding Flow (First-time Users)**:

1. **WhitelistCheckPage**: User enters name + phone → system validates against SHA256 hash in whitelist table
   - **Success**: Redirects to OTP verification with `user_hash` stored in sessionStorage
   - **Failure**: Shows error message with retry option
   - **UX Considerations**: Clear error messaging, input validation, mobile-optimized form layout

2. **OTPVerificationPage**: User receives and enters 6-digit code
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

1. **Onboarding Linking**: Automatic backend call to link pre-auth context to authenticated user_id
2. **MainPage Navigation**:
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
- **Simulation Schema Updates**: Preserve historical simulation data while supporting new plan parameters
- **Whitelist Management**: Support bulk import/export for whitelist hash updates

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

## 23. Glossary

- **Supabase**: Backend-as-a-Service providing Postgres, Auth, Storage, and APIs
- **JWKS**: JSON Web Key Set for verifying JWT signatures
- **OTP**: One-time password sent via SMS
- **PWA**: Progressive Web App supporting installability and service worker caching
- **RLS**: Row Level Security (Postgres policy-based row access control)
- **P95/P99**: 95th and 99th percentile performance metrics
- **LCP/FID/CLS**: Core Web Vitals performance metrics
- **RTT**: Round-trip time for network requests

---

*For enterprise-scale features and detailed operational procedures, see the [enterprise-scale documentation](enterprise-scale/).*
