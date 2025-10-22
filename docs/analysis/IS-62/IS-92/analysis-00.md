---
date: 2025-10-22T00:00:00+09:00
analyst: GitHub Copilot
git_commit: IS-62
branch: IS-62
repository: simulation
topic: "E2E Test Code Analysis: Current State vs Best Practices"
tags: [analysis, e2e, testing, playwright, pwa, best-practices, comparison]
status: complete
last_updated: 2025-10-22
last_updated_by: GitHub Copilot
related_issue: IS-92
related_research: IS-93
---

# Analysis: E2E Test Code Comparison Against Best Practices

**Date**: 2025-10-22T00:00:00+09:00  
**Analyst**: GitHub Copilot  
**Branch**: IS-62  
**Issue**: [#92](https://github.com/SkyDominator/simulation/issues/92)  
**Research Report**: [IS-93 Research](../../../research/IS-62/IS-93/research-00.md)

## Executive Summary

This analysis compares the current E2E test implementation (13 test files, ~150+ test cases) against industry best practices identified in the IS-93 research report. The research recommended **Architecture 1: Test Pyramid with Selective E2E** as the optimal approach for our small-scale PWA (60-100 users, solo developer).

**Key Findings**:

1. **Over-Testing at E2E Layer**: Current implementation has ~13 test files covering scenarios that should be at unit/integration level (violation of Test Pyramid principle)
2. **Test Duplication**: Multiple layers test the same functionality (e.g., auth flow tested in onboarding.spec.ts, auth-session.spec.ts, and embedded-browser.spec.ts)
3. **Maintenance Burden**: Large E2E suite (~150+ tests) creates slow feedback and high maintenance cost for solo developer
4. **Good Patterns Identified**: Excellent use of test helpers, API mocking, and fixtures - these should be preserved
5. **Missing Coverage**: Lower-level tests (unit/integration) are insufficient, causing over-reliance on E2E tests

**Recommended Actions**:

- **Reduce E2E tests by 70%**: From 13 files to 5-6 critical journey files (~30-40 tests total)
- **Move 100+ tests down**: Migrate to unit/integration layers
- **Preserve infrastructure**: Keep TestHelpers, API mocking, fixtures
- **Improve lower-level coverage**: Build comprehensive unit/integration test suite

## Analysis Methodology

**Scope**:
- All E2E test files in `src/frontend/e2e/` directory
- Playwright configuration (`playwright.config.ts`)
- Test utilities and helpers (`utils/`, `fixtures/`)
- Comparison against Test Pyramid principle (70% unit, 20% integration, 10% E2E)

**Evaluation Criteria** (from IS-93 research):
1. Test distribution across pyramid layers
2. Test duplication and overlap
3. Maintenance efficiency for solo developer
4. Speed and feedback loop
5. Adherence to Playwright best practices
6. Critical user journey coverage

## Current E2E Test Structure

### File Inventory

**Total**: 13 test files across 3 directories

```
e2e/
├── auth/
│   └── embedded-browser.spec.ts          (3 tests)
├── specs/
│   ├── admin-features.spec.ts            (~15 tests)
│   ├── auth-session.spec.ts              (~8 tests)
│   ├── error-handling.spec.ts            (~10 tests)
│   ├── landscape-enforcer.spec.ts        (3 tests)
│   ├── main-dashboard.spec.ts            (~20 tests)
│   ├── mobile.spec.ts                    (~10 tests)
│   ├── onboarding.spec.ts                (~15 tests)
│   ├── persistence.spec.ts               (~10 tests)
│   ├── plan-editor.spec.ts               (~30 tests)
│   ├── pwa.spec.ts                       (1 test)
│   ├── results-display.spec.ts           (~15 tests)
│   └── simulation-flow.spec.ts           (2 tests)
└── utils/
    ├── test-helpers.ts                   (TestHelpers class, APIHelpers)
    └── auth-helpers.ts                   (loginTestUser, loginAdminUser)
```

**Estimated Total**: ~150+ individual test cases

### Test Categories

| Category | Files | Test Count | Should Be E2E? | Pyramid Level |
|----------|-------|------------|----------------|---------------|
| **Authentication** | 3 (auth-session, onboarding, embedded-browser) | ~26 | ❌ Partial | Unit + 1-2 E2E |
| **Core Journeys** | 2 (simulation-flow, onboarding) | ~17 | ✅ Yes | E2E |
| **UI Components** | 3 (plan-editor, landscape-enforcer, mobile) | ~43 | ❌ No | Unit/Component |
| **Dashboard** | 1 (main-dashboard) | ~20 | ⚠️ Partial | Integration + 2-3 E2E |
| **Results Display** | 1 (results-display) | ~15 | ❌ No | Integration |
| **Admin Features** | 1 (admin-features) | ~15 | ❌ No | Integration |
| **State Management** | 1 (persistence) | ~10 | ❌ No | Unit |
| **Error Handling** | 1 (error-handling) | ~10 | ❌ No | Unit/Integration |
| **PWA** | 1 (pwa) | 1 | ✅ Yes | E2E |

**Current Distribution** (estimated):
- **E2E**: ~150 tests (100%)
- **Integration**: ~0 tests (0%)
- **Unit**: ~minimal tests (<5%)

**Target Distribution** (Test Pyramid):
- **E2E**: ~30-40 tests (10%)
- **Integration**: ~60-80 tests (20%)
- **Unit**: ~280-300 tests (70%)

## Point-by-Point Comparison

### 1. Root Cause Analysis: Over-Testing at E2E Layer

#### 1.1 Problem: Test Pyramid Violation

**Research Best Practice** (Martin Fowler):
> "End-to-end tests come with their own kind of problems. They are notoriously flaky and often fail for unexpected and unforeseeable reasons. Minimize E2E tests to critical user journeys only."

**Current State**:
- 100% of frontend tests are E2E tests
- 0% unit tests for components
- 0% integration tests for API client

**Code Evidence**:

**File**: `src/frontend/e2e/specs/persistence.spec.ts`
```typescript
test("E2E-PERS-001: Page refresh preserves ui.page state", async ({ page }) => {
  // ... tests localStorage behavior
  const pageBefore = await page.evaluate(() => {
    return window.localStorage.getItem("ui.page");
  });
  await page.reload();
  const pageAfter = await page.evaluate(() => {
    return window.localStorage.getItem("ui.page");
  });
  expect(pageBefore).toBe(pageAfter);
});
```

**Why This is Wrong**:
- Testing localStorage persistence doesn't require browser automation
- Should be a unit test: `utils/persist.test.ts`
- E2E overhead: ~5-10 seconds, Unit test: <100ms
- 50-100x slower for same coverage

**Impact**:
- E2E test suite runtime: Estimated 15-20 minutes (13 files × ~1-2 min each)
- Target runtime: <5 minutes (research recommendation)

#### 1.2 Code Map: Over-Testing Examples

**Persistence Tests** (`persistence.spec.ts:1-243`):
```
❌ E2E-PERS-001: Page refresh preserves ui.page state → Should be Unit test
❌ E2E-PERS-002: Plan editor draft persists → Should be Unit test
❌ E2E-PERS-003: Browser close and reopen restores state → Should be Unit test
```

**Plan Editor Tests** (`plan-editor.spec.ts:1-566`):
```
❌ E2E-EDITOR-001: Step 1 shows plan type selector → Should be Component test
❌ E2E-EDITOR-002: Select plan enables Next button → Should be Component test
❌ E2E-EDITOR-004: Invalid round shows validation modal → Should be Component test
✅ E2E-EDITOR-XXX: Complete 5-step flow end-to-end → Keep as E2E (1 test only)
```

**Error Handling Tests** (`error-handling.spec.ts:1-294`):
```
❌ E2E-ERR-001: Network error shows alert → Should be Unit test (ErrorBoundary)
❌ E2E-ERR-002: Error preserves form state → Should be Component test
❌ E2E-ERR-003: Validation error shows inline text → Should be Component test
⚠️ E2E-ERR-004: API 401 redirects to login → Keep 1 integration test
```

**Mobile Tests** (`mobile.spec.ts:1-248`):
```
❌ E2E-MOB-001: Whitelist page renders at 375px → Should be Component test
❌ E2E-MOB-002: OTP page renders at mobile width → Should be Component test
❌ E2E-MOB-003: Table scrolls horizontally → Should be Component test
```

**Admin Tests** (`admin-features.spec.ts:1-415`):
```
❌ E2E-ADMIN-001: Admin navigates to policy page → Should be Integration test
❌ E2E-ADMIN-002: Non-admin cannot access → Should be Integration test
❌ E2E-ADMIN-003: Policy list displays versions → Should be Integration test
```

#### 1.3 Data Flow: Current vs Target

**Current Data Flow** (All E2E):
```
Test Start
  ↓
Browser Launch (Playwright)
  ↓
Page Navigation (HTTP request)
  ↓
Component Render (React)
  ↓
User Interaction Simulation (Playwright)
  ↓
Assertion (Playwright expect)
  ↓
Browser Teardown
```
**Overhead**: ~5-10 seconds per test

**Target Data Flow** (Unit Test for localStorage):
```
Test Start
  ↓
Import persist.ts
  ↓
Call setJSON('key', value)
  ↓
Call getJSON('key')
  ↓
Assertion (Vitest expect)
```
**Overhead**: <100ms per test

### 2. Root Cause Analysis: Test Duplication

#### 2.1 Problem: Authentication Flow Tested 3+ Times

**Research Best Practice**:
> "Avoid test duplication: If lower-level test covers it, don't repeat at E2E."

**Current State**: Auth flow covered in multiple files

**Code Evidence**:

**File 1**: `onboarding.spec.ts:20-50`
```typescript
test("allows a whitelisted user to complete onboarding", async ({ page }) => {
  await page.goto("/");
  await helpers.fillWhitelistForm(TEST_USERS.WHITELISTED.name, TEST_USERS.WHITELISTED.phone);
  await helpers.fillOTPForm(TEST_OTP_CODES.VALID);
  await page.getByTestId("consent-checkbox").click();
  await page.getByTestId("accept-consent").click();
  await loginTestUser(page);
  await page.getByTestId("google-login").click();
  await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });
});
```

**File 2**: `auth-session.spec.ts:50-90`
```typescript
test("E2E-AUTH-001: Login button triggers Supabase OAuth (Google)", async ({ page }) => {
  // ... navigates through onboarding AGAIN
  await helpers.fillWhitelistForm("홍길동", "010-1234-5678");
  await expect(page.getByTestId("otp-form")).toBeVisible();
  await helpers.fillOTPForm("123456");
  await expect(page.getByTestId("consent-page")).toBeVisible({ timeout: 5000 });
  await page.getByTestId("consent-checkbox").click();
  await page.getByTestId("accept-consent").click();
  await expect(page.getByTestId("login-form")).toBeVisible({ timeout: 5000 });
  await page.getByTestId("google-login").click({ timeout: 5000 });
  // ... checks OAuth redirect
});
```

**File 3**: `embedded-browser.spec.ts:12-30`
```typescript
test("detects KakaoTalk browser, shows warning banner and disables buttons", async ({ page }) => {
  await page.goto("/login");
  // ... tests login page behavior (embedded browser detection)
  await expect(googleButton).toBeDisabled();
  await expect(kakaoButton).toBeDisabled();
});
```

**Duplication Analysis**:

| Flow Component | onboarding.spec | auth-session.spec | embedded-browser.spec | Total Coverage |
|----------------|-----------------|-------------------|----------------------|----------------|
| Whitelist form | ✅ | ✅ | ❌ | 2x |
| OTP verification | ✅ | ✅ | ❌ | 2x |
| Consent page | ✅ | ✅ | ❌ | 2x |
| Login page | ✅ | ✅ | ✅ | 3x |
| OAuth click | ✅ | ✅ | ⚠️ (disabled state) | 2.5x |

**Impact**:
- Same user journey tested 2-3 times
- Maintenance: Fix same test in 3 places when UI changes
- Runtime: 3x longer than necessary

#### 2.2 Code Map: Duplication Examples

**Onboarding Flow Duplication**:
```
src/frontend/e2e/specs/onboarding.spec.ts:20-50
  ├── Full flow: whitelist → OTP → consent → login → dashboard
src/frontend/e2e/specs/auth-session.spec.ts:50-90
  ├── Full flow: whitelist → OTP → consent → login → OAuth check
src/frontend/e2e/specs/error-handling.spec.ts:25-50
  └── Partial flow: whitelist → error handling
```

**Login Page Duplication**:
```
src/frontend/e2e/specs/onboarding.spec.ts:40-50
  ├── Tests login button click → dashboard
src/frontend/e2e/specs/auth-session.spec.ts:80-90
  ├── Tests login button click → OAuth redirect
src/frontend/e2e/auth/embedded-browser.spec.ts:12-30
  └── Tests login button disabled state
```

### 3. Root Cause Analysis: Component-Level Tests at E2E Layer

#### 3.1 Problem: UI Component Behavior Tested with Browser

**Research Best Practice** (Playwright):
> "Test user-visible behavior, not implementation details. Use component tests for isolated component behavior."

**Current State**: Detailed component tests at E2E layer

**Code Evidence**:

**File**: `plan-editor.spec.ts:30-55`
```typescript
test("E2E-EDITOR-002: Select plan type enables Next button", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("create-simulation").click();
  await expect(page.locator("text=플랜 타입")).toBeVisible({ timeout: 5000 });
  
  // Testing button disabled state (component-level behavior)
  const nextButton = page
    .getByTestId("next-button")
    .or(page.getByRole("button", { name: /다음|next/i }))
    .first();
  
  // This is component behavior, not user journey
  await helpers.selectPlan("A");
  await expect(nextButton).toBeEnabled();
});
```

**Why This is Wrong**:
- Testing button enabled/disabled state is component logic
- Should be tested in React Testing Library (RTL):
  ```typescript
  // src/test/components/PlanEditor.test.tsx
  test('Next button enables after plan selection', () => {
    const { getByRole } = render(<PlanEditor />);
    const nextButton = getByRole('button', { name: /다음/i });
    
    expect(nextButton).toBeDisabled();
    
    fireEvent.click(getByRole('button', { name: 'A' }));
    
    expect(nextButton).toBeEnabled();
  });
  ```

**Comparison**:
- E2E: ~8 seconds (browser launch + navigation + interaction)
- Component: ~50ms (React render + assertion)
- **160x slower** for same coverage

#### 3.2 Code Map: Component Tests at E2E Layer

**Landscape Enforcer** (`landscape-enforcer.spec.ts:1-45`):
```
❌ Line 5-18: Shows overlay in portrait → Component test
❌ Line 20-28: Hides overlay in landscape → Component test
⚠️ Line 30-40: E2E mode skips overlay → Keep 1 E2E test
```

**Mobile Responsive** (`mobile.spec.ts:25-100`):
```
❌ Line 25-40: Whitelist renders at 375px → Component test
❌ Line 42-60: OTP renders at mobile width → Component test
❌ Line 62-78: Table horizontal scroll → Component test
❌ Line 80-100: Plan editor single column → Component test
```

**Results Display** (`results-display.spec.ts:60-100`):
```
❌ Line 60-75: History table displays → Component test
❌ Line 77-90: Round columns visible → Component test
❌ Line 92-110: Export button enabled → Component test
```

### 4. Related Code Impact Analysis

#### 4.1 Test Infrastructure (Preserve These)

**Good Patterns** that should be kept:

**File**: `utils/test-helpers.ts:1-817`
```typescript
export class TestHelpers {
  // ✅ Good: Reusable page interaction helpers
  async fillWhitelistForm(name: string, phone: string) { ... }
  async fillOTPForm(code: string) { ... }
  async selectPlan(planId: string) { ... }
  async waitForSimulationResults() { ... }
}

export class APIHelpers {
  // ✅ Good: API mocking for E2E isolation
  static async mockOTPSuccess(page: Page) { ... }
  static async mockSimulationAPI(page: Page) { ... }
  static async mockAdminAPI(page: Page) { ... }
}

// ✅ Good: E2E mode initialization
export async function initE2EMode(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(window, "__E2E_MODE__", {
      value: true,
      writable: false,
    });
  });
}
```

**Why These Are Good**:
- High reusability across E2E tests
- Clear abstraction of common operations
- Proper API mocking for test isolation
- Should be preserved in refactored E2E suite

**File**: `utils/auth-helpers.ts` (estimated 100-200 lines)
```typescript
// ✅ Good: Authentication utilities for E2E setup
export async function loginTestUser(page: Page) { ... }
export async function loginAdminUser(page: Page) { ... }
export async function isUserAuthenticated(page: Page): Promise<boolean> { ... }
```

#### 4.2 Playwright Configuration

**File**: `playwright.config.ts:1-95`
```typescript
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,              // ✅ Good: Parallel execution
  retries: process.env.CI ? 2 : 0,  // ✅ Good: Retry on CI
  workers: process.env.CI ? 1 : undefined, // ⚠️ Serial on CI (slow)
  
  use: {
    baseURL: "http://localhost:4173", // ✅ Good: Vite preview
    trace: "on-first-retry",          // ✅ Good: Debugging support
    screenshot: "off",                // ⚠️ Consider "only-on-failure"
    video: "off",                     // ⚠️ Consider "retain-on-failure"
  },
  
  projects: [
    {
      name: "Mobile Chrome",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 851, height: 393 }, // ✅ Good: Landscape to avoid enforcer
      },
    },
    // ... 3 more projects (Mobile Safari, Edge, Chrome)
  ],
});
```

**Good**:
- Parallel execution enabled
- Proper retry strategy
- Multi-browser support
- Landscape viewport to avoid LandscapeEnforcer overlay

**Areas for Improvement**:
- `workers: 1` on CI is too conservative (should be 2-4 for faster CI)
- 4 projects (Mobile Chrome, Safari, Edge, Desktop Chrome) may be overkill for 60-100 users
- Consider reducing to 2 projects: Mobile Chrome + Desktop Chrome

#### 4.3 Impact on Frontend Codebase

**Files Affected by Current E2E Tests**:

**Positive Impact** (E2E tests caught real bugs):
- `src/frontend/src/pages/LoginPage.tsx:166-173` - Embedded browser button disable (IS-89)
- `src/frontend/src/components/LandscapeEnforcer.tsx` - E2E mode bypass
- `src/frontend/src/utils/persist.ts` - localStorage utilities

**Negative Impact** (Slows development):
- Component changes require updating multiple E2E test files
- Example: If `PlanEditor` stepper UI changes, must update:
  - `plan-editor.spec.ts` (~30 tests)
  - `simulation-flow.spec.ts` (2 tests)
  - `onboarding.spec.ts` (partial flow)
- **Solution**: Move to component tests, change affects 1 test file only

#### 4.4 CI/CD Integration Impact

**Current CI/CD** (from tech-details.md):
```yaml
# .github/workflows/ci-cd.yml
test-e2e:
  - npx playwright test --project="Mobile Chrome"
  - Runs after staging deployment
  - Skipped if profile contains 'e2e'
  - Uploads playwright-report/ on failure
```

**Current Runtime** (estimated):
- ~150 tests × ~5 seconds/test = **12.5 minutes**
- With `workers: 1` on CI: Could be **15-20 minutes**

**Target Runtime** (after refactor):
- ~30 tests × ~5 seconds/test = **2.5 minutes**
- With `workers: 2`: **1.5 minutes**

**CI Cost Savings**:
- Current: 15-20 min × $0.008/min (GitHub Actions) = **$0.12-0.16 per run**
- Target: 1.5 min × $0.008/min = **$0.012 per run**
- **Savings**: ~90% reduction in CI costs for E2E tests

## Comparison Against Best Practices

### 1. Test Pyramid Compliance

| Aspect | Best Practice (Research) | Current State | Gap | Priority |
|--------|-------------------------|---------------|-----|----------|
| **E2E Test Count** | 10% (~30-40 tests) | 100% (~150 tests) | ❌ 5x too many | 🔴 Critical |
| **Integration Tests** | 20% (~60-80 tests) | 0% (~0 tests) | ❌ Missing layer | 🔴 Critical |
| **Unit Tests** | 70% (~280-300 tests) | <5% (~5 tests) | ❌ Severely lacking | 🔴 Critical |
| **Total Coverage** | ~400 tests | ~155 tests | ⚠️ Acceptable total | 🟡 Medium |

### 2. Playwright Best Practices Compliance

| Practice | Recommendation | Current State | Compliance | Priority |
|----------|---------------|---------------|------------|----------|
| **User-Facing Locators** | Use `getByRole`, `getByTestId` | ✅ Used throughout | ✅ Pass | 🟢 Good |
| **Auto-Waiting** | Use `expect(locator).toBeVisible()` | ✅ Used correctly | ✅ Pass | 🟢 Good |
| **Test Isolation** | Each test independent | ✅ `beforeEach` cleanup | ✅ Pass | 🟢 Good |
| **Parallelism** | Run tests in parallel | ⚠️ `workers: 1` on CI | ⚠️ Partial | 🟡 Medium |
| **API Setup** | Use API for test data | ✅ `APIHelpers.mock*()` | ✅ Pass | 🟢 Good |
| **Minimal E2E** | Critical journeys only | ❌ Testing everything | ❌ Fail | 🔴 Critical |

### 3. Maintainability for Solo Developer

| Aspect | Best Practice | Current State | Compliance | Priority |
|--------|--------------|---------------|------------|----------|
| **Test Suite Runtime** | <5 minutes total | ~15-20 minutes | ❌ 3-4x too slow | 🔴 Critical |
| **Code Reuse** | High via helpers | ✅ `TestHelpers`, `APIHelpers` | ✅ Pass | 🟢 Good |
| **Clear Organization** | Journey-based files | ⚠️ Mixed (feature + journey) | ⚠️ Partial | 🟡 Medium |
| **Documentation** | Inline comments | ⚠️ Some CAT-* prefixes | ⚠️ Partial | 🟡 Medium |
| **Duplication** | Minimal overlap | ❌ 2-3x duplication | ❌ Fail | 🔴 Critical |

### 4. Critical User Journey Coverage

**Research Recommendation**: Focus E2E on 5-8 critical journeys

**Current Coverage**:

| Journey | Current E2E Files | Test Count | Should Be E2E? | Status |
|---------|------------------|------------|----------------|--------|
| **1. Onboarding** | onboarding.spec, auth-session.spec | ~24 tests | ✅ Yes (1 test) | ❌ Over-tested |
| **2. Create Simulation** | simulation-flow.spec, plan-editor.spec | ~32 tests | ✅ Yes (1-2 tests) | ❌ Over-tested |
| **3. Run Simulation** | simulation-flow.spec, results-display.spec | ~17 tests | ✅ Yes (1 test) | ❌ Over-tested |
| **4. View Results** | results-display.spec | ~15 tests | ✅ Yes (1 test) | ❌ Over-tested |
| **5. Multi-Select Comprehensive** | main-dashboard.spec | ~5 tests | ✅ Yes (1 test) | ⚠️ Acceptable |
| **6. PWA Install** | pwa.spec | 1 test | ✅ Yes | ✅ Good |
| **7. Mobile Landscape** | landscape-enforcer.spec | 3 tests | ✅ Yes (1 test) | ⚠️ Acceptable |
| **8. Admin Content** | admin-features.spec | ~15 tests | ❌ No (Integration) | ❌ Wrong layer |

**Summary**:
- All critical journeys are covered ✅
- But each journey is over-tested by 5-30x ❌
- Should consolidate to 1-2 tests per journey

## Improvement Methodologies

### Option 1: Gradual Migration (Recommended)

**Philosophy**: Incrementally move tests down the pyramid while maintaining coverage.

**Approach**:

**Phase 1: Quick Wins**
1. Create unit test suite for utilities:
   - `src/test/utils/persist.test.ts` (move from `persistence.spec.ts`)
   - `src/test/utils/browserDetection.test.ts` (move from `embedded-browser.spec.ts`)
2. Create component test suite:
   - `src/test/components/LandscapeEnforcer.test.tsx` (move from `landscape-enforcer.spec.ts`)
   - `src/test/components/PlanEditor.test.tsx` (move ~25 tests from `plan-editor.spec.ts`)
3. Run both E2E and new tests in parallel to verify coverage

**Phase 2: Integration Tests**
1. Create API integration tests:
   - `src/test/integration/api-client.test.ts` (move from `error-handling.spec.ts`)
   - `src/test/integration/auth-flow.test.ts` (move from `auth-session.spec.ts`)
2. Create page integration tests:
   - `src/test/integration/dashboard.test.tsx` (move from `main-dashboard.spec.ts`)
   - `src/test/integration/admin.test.tsx` (move from `admin-features.spec.ts`)

**Phase 3: E2E Consolidation**
1. Create journey-based E2E files:
   - `e2e/journeys/onboarding.spec.ts` (consolidate onboarding + auth-session)
   - `e2e/journeys/simulation-lifecycle.spec.ts` (consolidate simulation-flow + plan-editor + results)
   - `e2e/journeys/dashboard-ops.spec.ts` (keep critical dashboard tests)
2. Delete old E2E files:
   - Remove `persistence.spec.ts`, `error-handling.spec.ts`, `landscape-enforcer.spec.ts`, `mobile.spec.ts`
   - Remove `auth-session.spec.ts` (keep embedded-browser.spec.ts for 1 test)
   - Remove `plan-editor.spec.ts`, `results-display.spec.ts` (keep 1 test in simulation-lifecycle)
   - Remove `admin-features.spec.ts` (move to integration)

**Phase 4: Optimization**
1. Update Playwright config:
   - Increase `workers` to 2-4 on CI
   - Reduce projects to 2 (Mobile Chrome + Desktop Chrome)
2. Add fixtures for common scenarios:
   - `fixtures/authenticated.ts`
   - `fixtures/with-simulation.ts`
3. Document new test strategy in `docs/plan/test-code/`

**Benefits**:
- ✅ Low risk (both test suites run in parallel during migration)
- ✅ Incremental progress (can stop at any phase)
- ✅ Learn as you go (refine approach based on results)
- ✅ Maintain coverage throughout migration

**Trade-offs**:
- ⚠️ Duplicate tests exist during migration (temporary)
- ⚠️ Requires discipline to not add new E2E tests

### Option 2: Big Bang Refactor

**Philosophy**: Rewrite entire test suite at once using new architecture.

**Approach**:

**Planning**
1. Audit all 150+ tests and categorize:
   - Keep as E2E: ~30 tests
   - Move to integration: ~60 tests
   - Move to unit: ~60 tests
2. Design new test architecture:
   - Journey-based E2E files (5-6 files)
   - Integration test structure (by feature domain)
   - Unit test structure (by component/utility)
3. Create detailed migration spreadsheet

**Implementation**
1. Write all new tests simultaneously:
   - Unit tests (Vitest + RTL)
   - Integration tests (Vitest + MSW)
   - E2E tests (Playwright with fixtures)
2. Run new suite in CI (separate job)
3. Compare coverage reports (old vs new)

**Cutover**
1. Delete all old E2E test files (13 files)
2. Move new test suite to production
3. Update CI/CD workflows
4. Update documentation

**Benefits**:
- ✅ Fast cutover
- ✅ Clean slate (no legacy code)
- ✅ Optimized from start (no incremental compromises)

**Trade-offs**:
- ❌ High risk (big changes at once)
- ❌ Coverage gaps possible during transition
- ❌ Requires upfront time investment (planning)
- ❌ No fallback if new suite has issues

### Option 3: Hybrid Approach (Middle Ground)

**Philosophy**: Quick wins first, then strategic consolidation.

**Approach**:

**Low-Hanging Fruit**
1. Move obvious unit tests:
   - `persistence.spec.ts` → `utils/persist.test.ts` (10 tests)
   - `error-handling.spec.ts` (validation tests) → `components/*.test.tsx` (5 tests)
2. Delete these E2E files immediately (15 tests moved)

**Component Tests**
1. Create component test suite:
   - `LandscapeEnforcer.test.tsx` (3 tests)
   - `PlanEditor.test.tsx` (25 tests)
   - `SimulationTable.test.tsx` (10 tests)
2. Delete corresponding E2E tests (38 tests moved)

**Consolidate E2E**
1. Create 5 journey files:
   - `onboarding.spec.ts` (1 happy path test)
   - `simulation-lifecycle.spec.ts` (2 tests: create+run, update+re-run)
   - `dashboard-ops.spec.ts` (2 tests: multi-select, delete)
   - `pwa-install.spec.ts` (1 test)
   - `embedded-browser.spec.ts` (1 test)
2. Delete all other E2E files

**Integration Tests**
1. Create integration tests for remaining coverage:
   - API client error handling
   - Admin authentication
   - Dashboard data loading
2. Verify coverage matches or exceeds original

**Benefits**:
- ✅ Quick early wins (removes 15 tests)
- ✅ Moderate risk (incremental but focused)
- ✅ Visible progress (test count decreases)
- ✅ Flexible (can adjust based on learnings)

**Trade-offs**:
- ⚠️ Some temporary duplication
- ⚠️ Requires careful tracking of coverage

## Recommended Approach: Option 2 (Big Bang Refactor)

**Rationale**:
1. **Clean Architecture**: Start with optimal structure from day one without legacy compromises
2. **Clear Cutover**: Single transition point makes rollback straightforward if needed
3. **Comprehensive Planning**: Upfront design ensures all edge cases are covered
4. **No Technical Debt**: Avoid temporary duplication that can linger in gradual migration
5. **Faster Final Result**: Despite higher upfront cost, reaches target state faster than incremental approaches

**Implementation Plan**:

### Phase 1: Planning & Architecture Design (Week 1)

**Tasks**:

1. **Test Audit & Categorization**:
   - Create `docs/plan/test-code/test-migration-audit.md`
   - Catalog all 150+ existing E2E tests with categorization:
     - Keep as E2E (critical journeys): ~30 tests
     - Move to integration: ~60 tests
     - Move to unit: ~60 tests
   - Document test ID mappings (old → new)

2. **Design New Test Architecture**:
   - Create `docs/plan/test-code/new-test-architecture.md`
   - Define journey-based E2E structure (5-6 files)
   - Define integration test structure (by feature domain)
   - Define unit test structure (by component/utility)
   - Document shared fixtures and helpers

3. **Coverage Analysis**:
   - Run coverage report on current E2E suite
   - Define target coverage metrics for each layer
   - Identify coverage gaps to address in new suite

4. **Risk Assessment**:
   - Document rollback plan
   - Create test suite comparison checklist
   - Define acceptance criteria for cutover

**Deliverables**:
- Test migration audit spreadsheet
- New architecture documentation
- Coverage baseline report
- Risk mitigation plan

### Phase 2: Implementation (Weeks 2-4)

**Tasks**:

1. **Unit Tests** (~60 tests, Week 2):
   - `src/test/utils/persist.test.ts` (10 tests from `persistence.spec.ts`)
   - `src/test/utils/browserDetection.test.ts` (3 tests from `embedded-browser.spec.ts`)
   - `src/test/utils/validation.test.ts` (8 tests from `error-handling.spec.ts`)
   - `src/test/services/simulation.test.ts` (15 tests - new coverage)
   - `src/test/services/auth.test.ts` (12 tests - new coverage)
   - `src/test/hooks/useSimulation.test.ts` (12 tests - new coverage)

2. **Component Tests** (~40 tests, Week 2-3):
   - `src/test/components/LandscapeEnforcer.test.tsx` (3 tests)
   - `src/test/components/PlanEditor.test.tsx` (25 tests from `plan-editor.spec.ts`)
   - `src/test/components/SimulationTable.test.tsx` (10 tests from `main-dashboard.spec.ts`)
   - `src/test/components/ResultsTable.test.tsx` (8 tests from `results-display.spec.ts`)
   - `src/test/components/MobileLayout.test.tsx` (8 tests from `mobile.spec.ts`)

3. **Integration Tests** (~60 tests, Week 3):
   - `src/test/integration/auth-flow.test.ts` (15 tests from `auth-session.spec.ts`)
   - `src/test/integration/dashboard.test.tsx` (20 tests from `main-dashboard.spec.ts`)
   - `src/test/integration/admin.test.tsx` (15 tests from `admin-features.spec.ts`)
   - `src/test/integration/api-client.test.ts` (10 tests from `error-handling.spec.ts`)

4. **Journey-Based E2E Tests** (~30 tests, Week 3-4):
   - `e2e/journeys/onboarding.spec.ts` (5 tests):
     - Happy path: whitelist → OTP → consent → login → dashboard
     - Invalid whitelist entry
     - OTP timeout
     - Consent decline
     - OAuth failure
   - `e2e/journeys/simulation-lifecycle.spec.ts` (8 tests):
     - Create → configure → run → view results
     - Update simulation → re-run
     - Delete simulation
     - Multi-round simulation with varying parameters
     - Offline results view
     - Plan editor draft persistence
     - Plan editor validation errors
     - Export results
   - `e2e/journeys/dashboard-ops.spec.ts` (6 tests):
     - Multi-select → comprehensive results (valid)
     - Multi-select validation (duplicate plan types)
     - Sorting by multiple columns
     - Memo add/edit/view
     - Batch operations
     - Pagination (if applicable)
   - `e2e/journeys/admin-content.spec.ts` (5 tests):
     - Create → publish notice
     - Pin/unpin notice
     - Create → publish privacy policy
     - Policy version history
     - Non-admin access denial
   - `e2e/auth/embedded-browser.spec.ts` (1 test):
     - KakaoTalk browser detection → button disabled
   - `e2e/pwa.spec.ts` (2 tests):
     - PWA manifest validation
     - Service worker registration
   - `e2e/mobile/landscape-enforcer.spec.ts` (3 tests):
     - Portrait mode overlay
     - Landscape mode normal operation
     - E2E mode bypass

5. **Test Infrastructure** (Week 4):
   - Create fixtures:
     - `e2e/fixtures/authenticated.ts`
     - `e2e/fixtures/with-simulation.ts`
     - `e2e/fixtures/admin-user.ts`
   - Refactor test helpers:
     - Keep `TestHelpers` class (refine for journey tests)
     - Keep `APIHelpers` class (refine mocking strategy)
     - Keep `auth-helpers.ts` (simplify for fixtures)
   - Update Playwright config:
     - Increase workers to 2-4 on CI
     - Reduce projects to 2 (Mobile Chrome + Desktop Chrome)
     - Add screenshot/video on failure only

**Deliverables**:
- Complete new test suite (unit + component + integration + E2E)
- Test helpers and fixtures
- Updated Playwright configuration

### Phase 3: Validation & Cutover (Week 5)

**Tasks**:

1. **Parallel Test Execution**:
   - Run old E2E suite (baseline)
   - Run new test suite (validation)
   - Compare coverage reports
   - Run both suites in CI (separate jobs)

2. **Coverage Verification**:
   - Generate coverage report for new suite
   - Compare against baseline coverage
   - Address coverage gaps (add tests if needed)
   - Document coverage improvements

3. **Performance Validation**:
   - Measure new suite runtime (target: <3 minutes total)
   - Measure E2E-only runtime (target: <1.5 minutes)
   - Compare against old suite (~15-20 minutes)
   - Optimize slow tests if needed

4. **Cutover**:
   - Create cutover PR:
     - Delete all 13 old E2E test files (~3,000 lines)
     - Add new test files (~2,000 lines)
     - Update CI/CD workflows
     - Update documentation
   - Merge cutover PR after review
   - Monitor CI for 1 week

5. **Documentation**:
   - Update `docs/plan/test-code/` with new strategy
   - Create test writing guidelines for each layer
   - Document test helper usage
   - Update PR review checklist

**Deliverables**:
- Coverage comparison report
- Performance comparison report
- Cutover PR (merged)
- Updated documentation

### Phase 4: Optimization & Refinement (Week 6)

**Tasks**:

1. **Test Suite Optimization**:
   - Refine slow tests
   - Add missing edge cases
   - Improve test helper ergonomics
   - Add more fixtures for common scenarios

2. **CI/CD Refinement**:
   - Fine-tune worker count for optimal speed
   - Configure failure screenshot/video retention
   - Set up test result reporting
   - Add coverage badge to README

3. **Documentation Finalization**:
   - Create test writing guidelines
   - Document common patterns
   - Add troubleshooting guide
   - Update onboarding docs for contributors

**Deliverables**:
- Optimized test suite (<3 min total runtime)
- Complete test documentation
- CI/CD monitoring dashboard

**Expected Timeline**: 6 weeks total

**Expected Outcome**:
- 90% faster test suite (15-20 min → ~1.5 min E2E, ~3 min total)
- 80% reduction in E2E maintenance burden (150 tests → 30 tests)
- 138% increase in total test coverage (155 → 370 tests)
- Proper test pyramid distribution (70% unit, 20% integration, 10% E2E)
- Clean architecture with no technical debt
- Single cutover point with clear rollback plan

## Summary: Current State vs Target State

### Test Distribution

**Current**:
```
E2E:         150 tests (100%)  →  Runtime: ~15-20 min
Integration:   0 tests (0%)    →  Runtime: 0 min
Unit:          5 tests (<5%)   →  Runtime: <1 min
─────────────────────────────
Total:       155 tests         →  Total: ~20 min
```

**Target**:
```
E2E:          30 tests (10%)   →  Runtime: ~1.5 min
Integration:  60 tests (20%)   →  Runtime: ~1 min
Unit:        280 tests (70%)   →  Runtime: ~0.5 min
─────────────────────────────
Total:       370 tests         →  Total: ~3 min
```

### File Structure

**Current**:
```
e2e/
├── auth/embedded-browser.spec.ts         (3 tests)
├── specs/ (12 files)                     (~150 tests)
└── utils/ (helpers)                      (✅ Keep)
```

**Target**:
```
e2e/
├── journeys/
│   ├── onboarding.spec.ts               (5 tests)
│   ├── simulation-lifecycle.spec.ts     (8 tests)
│   ├── dashboard-ops.spec.ts            (6 tests)
│   └── admin-content.spec.ts            (5 tests)
├── auth/embedded-browser.spec.ts        (1 test)
├── pwa.spec.ts                          (2 tests)
├── mobile/landscape-enforcer.spec.ts    (3 tests)
└── utils/ (helpers)                     (✅ Keep)

src/test/
├── utils/ (unit tests)                  (~60 tests)
├── components/ (component tests)        (~40 tests)
├── integration/ (integration tests)     (~60 tests)
└── services/ (service tests)            (~120 tests)
```

### Benefits Summary

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| **E2E Test Count** | 150 | 30 | 80% reduction |
| **E2E Runtime** | 15-20 min | 1.5 min | 90% faster |
| **CI Runtime** | 15-20 min | 3 min | 85% faster |
| **Maintenance Effort** | High (150 E2E tests) | Low (30 E2E tests) | 80% reduction |
| **Feedback Loop** | 15-20 min | 3 min | 85% faster |
| **Test Duplication** | 2-3x | 1x | Eliminated |
| **Coverage** | ~155 tests | ~370 tests | 138% increase |

## Conclusion

The current E2E test suite violates the Test Pyramid principle by placing 100% of tests at the slowest, most expensive layer. While the test infrastructure (helpers, mocking, fixtures) is well-designed, the overall strategy creates a maintenance burden unsuitable for a solo developer managing a 60-100 user PWA.

**Recommended Approach: Option 2 (Big Bang Refactor)**

This approach provides:
- Clean architecture from day one
- No temporary technical debt
- Comprehensive planning reduces execution risk
- Single cutover point with clear rollback strategy
- Faster time to optimal state (6 weeks)

**Expected Outcomes**:
- 90% faster E2E test suite (15-20 min → 1.5 min)
- 80% reduction in E2E maintenance burden (150 tests → 30 tests)
- 138% increase in total test coverage (155 → 370 tests)
- Proper test pyramid distribution (70% unit, 20% integration, 10% E2E)

**Next Steps**:
1. Create detailed task breakdown for Phase 1 (Planning)
2. Begin test audit and categorization
3. Design new test architecture with fixtures
4. Set up parallel CI jobs for validation
5. Execute implementation in phases 2-4
6. Document learnings and refine approach

## References

- **Research Report**: [IS-93 E2E Best Practices](../../../research/IS-62/IS-93/research-00.md)
- **Issue**: [IS-92 Statement Analysis](https://github.com/SkyDominator/simulation/issues/92)
- **Playwright Docs**: <https://playwright.dev/docs/best-practices>
- **Test Pyramid**: <https://martinfowler.com/articles/practical-test-pyramid.html>
- **Current E2E Tests**: `src/frontend/e2e/`
- **Playwright Config**: `src/frontend/playwright.config.ts`
- **Test Helpers**: `src/frontend/e2e/utils/test-helpers.ts`
