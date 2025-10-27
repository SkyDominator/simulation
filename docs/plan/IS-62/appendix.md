# IS-62 Test Infrastructure Baseline Inventory

## Overview

This document captures the baseline state of the frontend test infrastructure before implementing the modernization plan. It serves as a reference point to ensure backward compatibility during the transition and to measure improvement metrics.

**Date of Snapshot**: 2025-10-23  
**Branch**: IS-62  
**Purpose**: Phase 0 baseline documentation per `docs/plan/IS-62/plan-00.md`

---

## 1. Helper Modules Inventory

### 1.1 TestHelpers Class

**Location**: `src/frontend/e2e/utils/test-helpers.ts`

**Public Methods**:

- `constructor(page: Page)` - Initializes helper with Playwright page instance
- `fillWhitelistForm(name: string, phone: string)` - Fills whitelist verification form and submits
- `fillOTPForm(code: string)` - Fills OTP verification form and submits
- `selectPlan(planId: string)` - Opens plan selector dropdown and selects plan by ID
- `fillInvestmentAmount(round: number, amount: string)` - Fills investment amount for specific round
- `waitForSimulationResults()` - Waits for simulation results table to appear
- `waitForNotification(message: string)` - Waits for Material-UI Alert/Snackbar with specific message
- `clickNext()` - Clicks next/continue button in multi-step forms
- `clickPrevious()` - Clicks previous/back button in multi-step forms
- `waitForPageLoad()` - Waits for page network idle state
- `isElementVisible(selector: string, timeout?: number): Promise<boolean>` - Checks element visibility with timeout
- `waitForMainPage()` - Waits for main dashboard page to load
- `clickCreateSimulation()` - Clicks "새 시뮬레이션" button

**Design Pattern**: Helper class with instance methods tied to page context. Mixes UI interaction with assertion patterns.

**Usage Sites**: 10 spec files

- `e2e/specs/simulation-flow.spec.ts`
- `e2e/specs/results-display.spec.ts`
- `e2e/specs/plan-editor.spec.ts`
- `e2e/specs/onboarding.spec.ts`
- `e2e/specs/mobile.spec.ts`
- `e2e/specs/error-handling.spec.ts`
- `e2e/specs/auth-session.spec.ts`

### 1.2 APIHelpers Class

**Location**: `src/frontend/e2e/utils/test-helpers.ts`

**Static Methods**:

- `mockOTPSuccess(page: Page)` - Mocks successful OTP send and verify endpoints
- `mockOTPFailure(page: Page, scenario: "whitelist" | "invalid_code" | "expired")` - Mocks OTP failure scenarios
- `mockSimulationAPI(page: Page)` - Mocks simulation CRUD endpoints (create, run, list, get, update, delete)
- `mockConsentSuccess(page: Page)` - Mocks privacy policy and consent recording endpoints with stateful tracking
- `mockNetworkError(page: Page, endpoint: string)` - Aborts requests to specific endpoint
- `mockAuthSuccess(page: Page)` - Adds init script to mock Supabase auth session in localStorage
- `mockNoticesAPI(page: Page)` - Mocks public notices endpoints (GET list, GET by ID)
- `mockAdminAPI(page: Page)` - Mocks admin-specific endpoints (verification, notices CRUD, privacy policies CRUD)
- `getConsentMockState(page: Page): ConsentMockSnapshot | null` - Returns internal consent mock state for diagnostics

**Design Pattern**: Static utility class. Each method sets up page route handlers. Uses `WeakMap` for consent state tracking per page.

**Usage Sites**: 10 spec files (same as TestHelpers)

**Internal State Management**:

- `consentMockStates: WeakMap<Page, ConsentMockInternalState>` - Tracks consent POST/GET counts and consent records per user hash

### 1.3 Auth Helpers Module

**Location**: `src/frontend/e2e/utils/auth-helpers.ts`

**Exported Functions**:

- `loginTestUser(page: Page)` - Mocks member authentication via init script and page evaluation, sets localStorage tokens and UI state
- `logoutTestUser(page: Page)` - Clears authentication tokens from localStorage and sessionStorage
- `loginAdminUser(page: Page)` - Mocks admin authentication with admin role and privileges
- `isUserAuthenticated(page: Page): Promise<boolean>` - Checks if auth token exists in localStorage
- `getCurrentUser(page: Page)` - Retrieves parsed user object from localStorage token
- `mockSessionExpiry(page: Page)` - Sets expired token in localStorage to test session timeout scenarios
- `completeOnboardingFlow(page: Page, userData?: {name: string, phone: string})` - Executes full onboarding flow (whitelist → OTP → consent → OAuth)

**Design Pattern**: Standalone exported functions. Each function operates on a page instance. Uses both `addInitScript` and `page.evaluate` for localStorage manipulation to ensure state before and after navigation.

**Usage Sites**: 10 spec files

- Same as TestHelpers usage sites
- `e2e/specs/admin-features.spec.ts` (uses `loginAdminUser`)

### 1.4 Utility Functions

**Location**: `src/frontend/e2e/utils/test-helpers.ts`

**Exported Functions**:

- `initE2EMode(page: Page)` - Sets `__E2E_MODE__` window property and localStorage flag via init script to indicate test environment

**Usage Sites**: All 10+ spec files in `beforeEach` hooks

---

## 2. Test Data Fixtures

**Location**: `src/frontend/e2e/fixtures/test-data.ts`

**Exported Constants**:

- `TEST_USERS: { WHITELISTED: {name: string, phone: string}, NOT_WHITELISTED: {...}, ADMIN: {...} }`
- `TEST_OTP_CODES: { VALID: string, INVALID: string, EXPIRED: string }`

**Usage Sites**:

- `e2e/specs/onboarding.spec.ts`
- Other spec files referencing test user credentials

---

## 3. Playwright Configuration

**Location**: `src/frontend/playwright.config.ts`

**Key Settings**:

- **testDir**: `"./e2e"`
- **fullyParallel**: `true`
- **forbidOnly**: `!!process.env.CI`
- **retries**: `process.env.CI ? 2 : 0`
- **workers**: `process.env.CI ? 1 : undefined` ⚠️ CI parallelism disabled
- **baseURL**: `"http://localhost:4173"` (Vite preview server)
- **trace**: `"on-first-retry"`
- **screenshot**: `"off"`
- **video**: `"off"`
- **reporter**: `["list", "json", "html"]`

**Projects** (4 total):

1. **Mobile Chrome**: Pixel 5 device, viewport `{ width: 851, height: 393 }` (landscape)
2. **Mobile Safari**: iPhone 12 device, viewport `{ width: 844, height: 390 }` (landscape)
3. **Microsoft Edge**: Desktop Edge, channel "msedge"
4. **Google Chrome**: Desktop Chrome, channel "chrome"

**webServer**:

- **command**: `"npm run preview"`
- **port**: `4173`
- **reuseExistingServer**: `true`

**Issues Identified**:

- 4 projects with `workers=1` in CI causes sequential execution → 15-20 min runtime
- Trace/video/screenshot are disabled or limited, reducing failure diagnostic capability

---

## 4. Package.json Test Scripts

**Location**: `src/frontend/package.json`

**E2E Scripts**:

- `"test:e2e": "playwright test"` - Runs all E2E tests
- `"test:e2e:ui": "playwright test --ui"` - Opens Playwright UI
- `"test:e2e:debug": "playwright test --debug"` - Debug mode
- `"test:e2e:report": "playwright show-report"` - Shows HTML report
- `"test:e2e:mobile": "playwright test --max-failures=5 --project=\"Mobile Chrome\""` - Mobile Chrome only
- `"test:e2e:mobile:auth": "playwright test e2e/specs/auth-session.spec.ts --max-failures=5 --project=\"Mobile Chrome\""` - Specific spec, mobile
- `"test:e2e:desktop": "playwright test --max-failures=5 --project=\"Google Chrome\""` - Desktop Chrome only
- `"test:e2e:save:mobile": "playwright test --max-failures=5 --project=\"Mobile Chrome\" --reporter=list 2>&1 | node -e \"...\" > test-results/e2e-output-mobile.log"` - Saves output to log
- `"test:e2e:save:desktop": "playwright test --max-failures=5 --project=\"Google Chrome\" --reporter=list 2>&1 | node -e \"...\" > test-results/e2e-output-desktop.log"` - Saves output to log

**Unit/Integration Scripts**:

- `"test": "vitest"` - Runs Vitest in watch mode
- `"test:ui": "vitest --ui"` - Opens Vitest UI
- `"test:coverage": "vitest --coverage"` - Generates coverage report
- `"test:run": "vitest run"` - Runs tests once
- `"test:run:save": "vitest run > test-results/unit-test-output.log 2>&1"` - Saves output to log

---

## 5. Test Specs Inventory

**E2E Specs** (14 spec files identified):

1. `e2e/specs/onboarding.spec.ts` - User onboarding flow (whitelist, OTP, consent, login)
2. `e2e/specs/simulation-flow.spec.ts` - Simulation creation and management basics
3. `e2e/specs/plan-editor.spec.ts` - Plan editor functionality
4. `e2e/specs/results-display.spec.ts` - Results display and visualization
5. `e2e/specs/main-dashboard.spec.ts` - Dashboard functionality
6. `e2e/specs/persistence.spec.ts` - Data persistence and offline scenarios
7. `e2e/specs/mobile.spec.ts` - Mobile-specific behaviors
8. `e2e/specs/landscape-enforcer.spec.ts` - Landscape orientation enforcement
9. `e2e/specs/pwa.spec.ts` - PWA capabilities
10. `e2e/specs/auth-session.spec.ts` - Authentication and session management
11. `e2e/specs/admin-features.spec.ts` - Admin-specific features
12. `e2e/specs/error-handling.spec.ts` - Error scenarios
13. `e2e/auth/embedded-browser.spec.ts` - Embedded browser detection

**Common Patterns**:

- All specs use `initE2EMode(page)` in `beforeEach`
- Most specs pre-authenticate with `loginTestUser(page)` or `loginAdminUser(page)`
- Most specs mock relevant APIs with `APIHelpers` static methods
- Specs create `TestHelpers` instance in `beforeEach`

---

## 6. Baseline Metrics

### Current State Observations

**Test Execution (from plan analysis reference)**:

- **Total Runtime (CI)**: ~15-20 minutes (estimated based on sequential execution with 4 projects)
- **Worker Count**: 1 (CI), unlimited (local)
- **Project Count**: 4 (Mobile Chrome, Mobile Safari, Microsoft Edge, Google Chrome)
- **Retry Frequency**: 2 retries on CI
- **Parallelism**: Disabled on CI (`workers=1`)

**Artifact Configuration**:

- **Trace**: On first retry only
- **Screenshot**: Disabled
- **Video**: Disabled
- **HTML Report**: Generated in `playwright-report/`
- **JSON Report**: Generated in `test-results/results.json`

**Artifact Sizes (Latest Baseline Run)**:

- **Trace**: 0 MB (feature disabled, no trace files produced)
- **Screenshot**: 0 MB (feature disabled)
- **Video**: 0 MB (feature disabled)
- **HTML Report**: Not generated in baseline run (requires manual `playwright show-report`)
- **JSON Report**: Not generated in baseline run (command not executed)

**Issues from Analysis** (`docs/analysis/IS-62/IS-92/analysis-00.md` §4.2):

- Long CI runtime due to sequential execution
- Inconsistent debug artifacts slow flake triage
- Workers=1 prevents parallelism benefits
- Multiple device projects (4x) amplify runtime issues

**Journey Test Count (E2E-JOURNEY tag)**:

- 3 critical journey tests tagged for smoke testing
- Tests cover: onboarding flow, simulation dashboard, plan editor navigation
- Smoke script: `pnpm test:e2e:journeys` (runs tagged tests only)

### Success Benchmark Targets (Post-Implementation)

Based on Google SRE guidance and plan goals:

1. **Runtime Reduction**: Target <10 minutes for full E2E suite on CI
   - Enable workers=3 on CI
   - Reduce to 2 projects (mobile-chromium, desktop-chromium)
   
2. **Artifact Consistency**: Capture actionable failure data
   - `screenshot: "only-on-failure"`
   - `video: "retain-on-failure"`
   - `trace: "retain-on-failure"`
   
3. **Fixture Adoption**: Replace all `beforeEach` setup blocks with typed fixtures
   - Zero direct API mock calls in spec files
   - Zero direct `loginTestUser`/`loginAdminUser` calls in spec files
   - All state setup via fixture dependency injection

4. **Mock Consolidation**: Single source of truth for test doubles
   - Shared factories in `src/frontend/test/shared/fixtures.ts`
   - Playwright and Vitest use identical payload structures
   
5. **Guardrails**: Prevent regressions
   - ESLint rule preventing direct Supabase client import in tests
   - Smoke script passing before/after infra changes

---

## 7. Dependency Inventory

### Helper Dependencies

**TestHelpers depends on**:

- `@playwright/test` (Page, expect)
- Material-UI component selectors (implicit via `getByLabel`, `getByRole`)
- data-testid attributes
- Korean locale text patterns

**APIHelpers depends on**:

- `@playwright/test` (Page)
- Specific API endpoint paths (e.g., `/api/otp/send`, `/api/simulations`)
- Backend response schema contracts (implicit)

**Auth Helpers depends on**:

- `@playwright/test` (Page)
- localStorage schema for Supabase auth tokens
- data-testid attributes for onboarding flow

### Cross-Module Coupling

- `auth-helpers.ts` imports nothing from `test-helpers.ts`
- `test-helpers.ts` does not import `auth-helpers.ts`
- Spec files import both independently
- No shared type definitions between helpers and specs
- No centralized factory for mock payloads

**Implication**: Each helper is self-contained but leads to duplication when specs need combined functionality (e.g., pre-authenticated + simulation mocking).

---

## 8. Migration Considerations

### Preserved Abstractions (from analysis §4.1)

The following patterns are working well and should be preserved in the new fixture architecture:

1. **E2E Mode Flag**: `initE2EMode(page)` approach is clean and effective
    - Should become a base fixture or auto-fixture in Phase 1

2. **Init Script Pattern**: `addInitScript` for pre-navigation state (auth tokens, flags)
    - `memberSession` fixture uses this via storageState loading (member.json)
    - `adminSession` fixture creates separate context with admin storageState (admin.json) containing admin claims

3. **Stateful Mocking**: `consentMockStates` WeakMap pattern for tracking request counts
    - Useful for complex interaction scenarios, should be ported to `mockedApis` fixture

4. **Korean Locale Text Matching**: `getByRole`, `getByLabel` with Korean text
    - Preserved in journey action helpers after split

### Patterns To Refine

1. **Mixed Responsibilities Inside `TestHelpers`**
    - Funnel side-effect-heavy methods through internal modules (for example `journey-actions.ts`) while keeping the class API stable for specs consuming it.

2. **`APIHelpers` Route Duplication**
    - Centralize request templates inside `api-mocks/playwright.ts` and re-use them from the existing static methods to avoid divergence from Vitest mocks.

3. **Manual Mock Lifecycle**
    - Replace explicit `unroute()` try-catch blocks with fixture teardown handlers so cleanup executes even when tests fail.

4. **Data Factory Fragmentation**
    - Consolidate payload construction into `test/shared/fixtures.ts` so both browser and node environments read from the same source of truth.

---

## 9. Test Infrastructure File Structure

### Current Structure

```text
src/frontend/
├── e2e/
│   ├── auth/
│   │   └── embedded-browser.spec.ts
│   ├── fixtures/
│   │   └── test-data.ts
│   ├── specs/
│   │   ├── admin-features.spec.ts
│   │   ├── auth-session.spec.ts
│   │   ├── error-handling.spec.ts
│   │   ├── landscape-enforcer.spec.ts
│   │   ├── main-dashboard.spec.ts
│   │   ├── mobile.spec.ts
│   │   ├── onboarding.spec.ts
│   │   ├── persistence.spec.ts
│   │   ├── plan-editor.spec.ts
│   │   ├── pwa.spec.ts
│   │   ├── results-display.spec.ts
│   │   └── simulation-flow.spec.ts
│   └── utils/
│       ├── auth-helpers.ts
│       └── test-helpers.ts
├── playwright.config.ts
└── package.json
```

### Issues

- No clear separation between fixtures, helpers, and mocks
- `e2e/fixtures/` only contains static test data, not Playwright fixtures
- Helper functions are utility modules, not fixture modules
- No shared types or factories for mock payloads

---

## 10. Next Steps

**Phase 1** will introduce:

- `e2e/fixtures/base.ts` with Playwright fixture extensions
- `e2e/fixtures/authenticated.ts`, `e2e/fixtures/admin-user.ts`, and `e2e/fixtures/with-simulation.ts` building on the existing `playwright/.auth/member.json` and `playwright/.auth/admin.json` storageState snapshots
- `e2e/fixtures/mocked-apis.ts` for reusable request interception hooks shared across suites
- `e2e/utils/journey-actions.ts` supporting the existing `TestHelpers` class
- `test/shared/types.ts` and `test/shared/fixtures.ts` for cross-test payload factories

**Transition Strategy**:

- Provide re-exports from the new fixture modules so specs transition incrementally
- Update one spec at a time to the new fixtures while verifying against the smoke suite
- Keep current helper contracts in place; deprecate legacy code only after all specs migrate successfully

---

**Document Status**: ✅ Complete  
**Next Review**: After Phase 1 fixture implementation
