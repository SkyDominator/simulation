---
date: 2025-10-22T00:00:00+09:00
researcher: GitHub Copilot
git_commit: IS-93
branch: IS-93
repository: simulation
topic: "E2E Testing Best Practices for Small-Scale PWA"
tags: [research, e2e, testing, playwright, pwa, best-practices, architecture]
status: complete
last_updated: 2025-10-22
last_updated_by: GitHub Copilot
---

# Research: E2E Testing Best Practices for Small-Scale PWA

**Date**: 2025-10-22T00:00:00+09:00  
**Researcher**: GitHub Copilot  
**Branch**: IS-93  
**Issue**: [#93](https://github.com/SkyDominator/simulation/issues/93)

## Research Question

What are the most appropriate E2E test architectures and best practices for the Light of Life Club Simulation PWA, considering:
- App scale: 60-100 total users, 30-60 peak concurrent
- Development context: Solo full-stack developer (1 person)
- Technology: React 19 PWA + FastAPI backend
- Current tooling: Playwright with TypeScript

## Executive Summary

Based on 2025 industry best practices from Google, Microsoft (Playwright team), and Martin Fowler's testing pyramid principles, this research identifies three optimal E2E testing architectures for small-scale PWA applications:

1. **Test Pyramid with Selective E2E** (Recommended Primary)
2. **Page Object Model (POM) with Component Composition**
3. **Journey-Based Testing with Fixtures**

All three approaches emphasize:
- Minimizing E2E tests to critical user journeys only
- Maximizing lower-level test coverage (unit/integration)
- Using test helpers and abstractions for maintainability
- Implementing proper isolation and cleanup strategies

## Application Context Analysis

### User Base & Scale

**Total Users**: 60-100 (small scale)
**Peak Concurrent**: 30-60 users
**User Profile**:
- Age: 40+
- Tech proficiency: Non-technical, not machine-friendly
- Primary devices: Android mobile (some iOS), Windows desktop
- Locale: Korean (ko-KR)

**Implication for E2E**: Low concurrency means E2E tests don't need extensive load/performance testing. Focus should be on functional correctness and UX flows.

### Development Environment

**Team Size**: 1 solo full-stack developer
**Tech Stack**:
- Frontend: React 19.1.0 + TypeScript 5.8.4 + Vite 5.4.10
- Backend: FastAPI 0.116.1 + Python 3.11.6
- Database: Supabase (managed PostgreSQL)
- E2E Tool: Playwright 1.x with TypeScript
- CI/CD: GitHub Actions (hybrid runners)

**Implication for E2E**: 
- Must maintain test suite solo (no dedicated QA team)
- Tests must be simple to write and debug
- Fast feedback loops critical
- Minimize maintenance burden

### Core User Flows

From PRD analysis, the application has these critical journeys:

1. **Onboarding Flow** (Pre-auth):
   - Whitelist check → OTP verification → Privacy consent → OAuth login

2. **Simulation Management**:
   - Create simulation → Configure plan parameters → Run simulation → View results → View Offline results → Get back to dashboard

3. **Dashboard Operations**:
   - View simulations list → Multi-select → Get comprehensive results → Manage memos

4. **Admin Functions** (low frequency):
   - Manage notices → Manage privacy policies

**Implication for E2E**: Focus E2E tests on flows 1-3 (core user value). Admin functions can rely more on integration tests.

### Current E2E Test Structure

**Test Organization** (`src/frontend/e2e/`):

```
e2e/
├── auth/
│   └── embedded-browser.spec.ts
├── fixtures/
├── specs/
│   ├── admin-features.spec.ts
│   ├── auth-session.spec.ts
│   ├── error-handling.spec.ts
│   ├── landscape-enforcer.spec.ts
│   ├── main-dashboard.spec.ts
│   ├── mobile.spec.ts
│   ├── onboarding.spec.ts
│   ├── persistence.spec.ts
│   ├── plan-editor.spec.ts
│   ├── pwa.spec.ts
│   ├── results-display.spec.ts
│   └── simulation-flow.spec.ts
└── utils/
    ├── auth-helpers.ts
    └── test-helpers.ts
```

**Current Patterns**:
- Custom `TestHelpers` class for common interactions
- API mocking via `APIHelpers.mockSimulationAPI()`
- Pre-authentication utility (`loginTestUser()`)
- Initialization script for E2E mode (`initE2EMode()`)

**Strengths**:
- Good separation of concerns (auth, utils, specs)
- Helper abstractions for common operations
- E2E mode flag for test-specific behavior

**Areas for Improvement** (identified in this research):
- Some test duplication across layers
- Could benefit from more structured Page Object Model
- Journey-based organization could improve clarity

## Industry Best Practices (2025)

### 1. Playwright Official Best Practices

**Source**: [Playwright Best Practices](https://playwright.dev/docs/best-practices) (Microsoft, 2025)

**Key Principles**:

#### Test Philosophy
- **Test User-Visible Behavior**: Focus on what users see/interact with, not implementation details
- **Isolation**: Each test runs independently with own storage/cookies/data
- **Avoid Third-Party Dependencies**: Mock external services, don't test what you don't control

#### Technical Practices
- **Use Locators**: Prioritize user-facing attributes (role, text, test-id) over CSS/XPath
- **Web-First Assertions**: Use `await expect(locator).toBeVisible()` instead of `isVisible()`
- **Parallelism**: Run tests in parallel by default (Playwright does this automatically)
- **Debugging**: Use trace viewer for CI failures (PWA-based tool)

#### CI/CD Optimization
- **Optimize Browser Downloads**: Only install browsers you test against
- **Use Linux on CI**: Cheaper compute, consistent environment
- **Sharding**: Split test suite across machines for faster feedback

**Relevance to Our App**: All principles directly applicable. Playwright is already our tool of choice.

### 2. Martin Fowler's Test Pyramid

**Source**: [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) (2018, still authoritative in 2025)

**Core Concepts**:

#### Pyramid Structure
```
       /\
      /  \  E2E (few tests)
     /____\
    /      \  Integration (some tests)
   /________\
  /          \  Unit (many tests)
 /____________\
```

**Ratios** (rough guidance):
- Unit tests: 70%
- Integration tests: 20%
- E2E tests: 10%

#### E2E Test Principles
- **Minimize E2E Tests**: Highest cost (maintenance, flakiness, runtime)
- **Focus on Critical Journeys**: Only test core user value paths
- **Avoid Test Duplication**: If lower-level test covers it, don't repeat at E2E
- **Subcutaneous Testing**: Test below UI when possible (REST API tests)

**Key Quote**:
> "End-to-end tests come with their own kind of problems. They are notoriously flaky and often fail for unexpected and unforeseeable reasons."

#### Test Structure (AAA Pattern)
1. **Arrange**: Set up test data
2. **Act**: Call method/action under test
3. **Assert**: Verify expected results

Alternative: **Given-When-Then** (BDD style)

**Relevance to Our App**: Critical guidance for limiting E2E test scope. Our current 12 spec files might be excessive.

### 3. Google Testing Blog Insights

**Source**: [Google Testing Blog](https://testing.googleblog.com/) (2025)

**Relevant Principles**:

#### Functional Core, Imperative Shell
- Separate pure business logic (functional core) from side effects (imperative shell)
- Makes testing easier: core is pure functions, shell handles I/O
- **Application**: Our simulation calculation engine is a good example

#### Code Organization
- Arrange code to communicate data flow
- Group related operations together
- Declare variables close to first use
- **Application**: E2E test helpers should follow data flow of user journeys

#### Test Sizes (Google's approach)
- **Small tests**: Single process, < 1 minute
- **Medium tests**: Single machine, < 5 minutes
- **Large tests**: Multiple machines, < 15 minutes
- **Enormous tests**: Multiple machines, > 15 minutes

**Google's recommendation**: Avoid "enormous" tests entirely, minimize "large" tests

**Relevance to Our App**: Our E2E tests should aim for "medium" size (< 5 min total runtime).

## Recommended E2E Test Architectures

Based on the research, here are three architecture patterns suitable for our small-scale PWA:

### Architecture 1: Test Pyramid with Selective E2E (Primary Recommendation)

**Philosophy**: Minimize E2E tests to critical user journeys, maximize lower-level test coverage.

**Structure**:

```
Testing Strategy Distribution:
- Unit Tests (70%): 
  - Frontend: Component tests, hook tests, utility tests
  - Backend: Service tests, API route tests, simulation engine tests
  
- Integration Tests (20%):
  - Frontend: API client tests with MSW
  - Backend: Database tests, external API tests (with mocks)
  
- E2E Tests (10%):
  - Only critical user journeys
  - Maximum 5-8 test files
  - Focus on happy paths + critical error scenarios
```

**E2E Test Scope** (Recommended):

1. **Onboarding Flow** (`e2e/journeys/onboarding.spec.ts`):
   ```typescript
   test('complete onboarding: whitelist → OTP → consent → login', async ({ page }) => {
     // Full flow including OAuth (mocked)
   });
   
   test('onboarding fails with invalid whitelist', async ({ page }) => {
     // Error handling critical path
   });
   ```

2. **Core Simulation Journey** (`e2e/journeys/simulation-lifecycle.spec.ts`):
   ```typescript
   test('create → configure → run → view results → view offline results → back to view results → back to dashboard', async ({ page }) => {
     // End-to-end simulation workflow
   });
   
   test('update simulation parameters and re-run', async ({ page }) => {
     // Common user scenario
   });
   ```

3. **Dashboard Critical Actions** (`e2e/journeys/dashboard-ops.spec.ts`):
   ```typescript
   test('multi-select → comprehensive results', async ({ page }) => {
     // Core value: comparing multiple simulations
   });
   ```

4. **PWA Installation** (`e2e/pwa/install.spec.ts`):
   ```typescript
   test('app installable with valid manifest', async ({ page }) => {
     // PWA-specific requirement
   });
   ```

5. **Mobile Landscape Enforcer** (`e2e/mobile/landscape.spec.ts`):
   ```typescript
   test('portrait mode shows enforcer overlay', async ({ page }) => {
     // Critical UX requirement for mobile
   });
   ```

**Move to Integration/Unit Tests**:
- ❌ `admin-features.spec.ts` → Integration tests (admin usage is rare)
- ❌ `auth-session.spec.ts` → Unit tests (token refresh logic)
- ❌ `error-handling.spec.ts` → Unit/Integration tests
- ❌ `persistence.spec.ts` → Unit tests (localStorage utils)
- ❌ `plan-editor.spec.ts` → Component tests (detailed step validation)

**Benefits**:
- Fast test suite (< 5 min total)
- Easy to maintain solo
- Clear test boundaries
- Follows industry standard pyramid

**Trade-offs**:
- Requires strong lower-level test coverage
- Some scenarios only covered at unit level
- Must be disciplined about scope

**Implementation Guide**:

1. **Audit Current Tests**: Categorize by pyramid level
2. **Move Tests Down**: Identify E2E tests that can be unit/integration tests
3. **Consolidate Journeys**: Merge related E2E specs into journey-based files
4. **Add Lower-Level Coverage**: Fill gaps in unit/integration tests
5. **Document Rationale**: Add comments explaining why each E2E test exists

### Architecture 2: Page Object Model with Component Composition

**Philosophy**: Encapsulate page interactions in reusable objects, compose them for journeys.

**Structure**:

```
e2e/
├── pages/
│   ├── LoginPage.ts
│   ├── WhitelistPage.ts
│   ├── OTPVerificationPage.ts
│   ├── ConsentPage.ts
│   ├── DashboardPage.ts
│   ├── PlanEditorPage.ts
│   └── SimulationResultsPage.ts
├── components/
│   ├── SimulationTable.ts
│   ├── PlanStepper.ts
│   └── NoticeModal.ts
├── journeys/
│   ├── onboarding.spec.ts
│   ├── simulation-lifecycle.spec.ts
│   └── dashboard-ops.spec.ts
└── fixtures/
    ├── test-data.ts
    └── authenticated.ts
```

**Example Page Object**:

```typescript
// pages/PlanEditorPage.ts
export class PlanEditorPage {
  constructor(private page: Page) {}
  
  async selectPlanType(planId: string) {
    await this.page.click('[role="button"][aria-haspopup="listbox"]');
    await this.page.click(`text="${planId}"`);
    await this.nextStep();
  }
  
  async selectStartingRound(round: number) {
    await this.page.click(`text="${round}회차"`);
    await this.nextStep();
  }
  
  async fillSalesData(rounds: Array<{ round: number; amount: string }>) {
    for (const { round, amount } of rounds) {
      await this.page.locator(`text=${round}회차`)
        .locator('..')
        .locator('input[type="text"]')
        .fill(amount);
    }
    await this.save();
  }
  
  private async nextStep() {
    await this.page.getByRole('button', { name: '다음' }).click();
  }
  
  private async save() {
    await this.page.getByRole('button', { name: '저장' }).click();
  }
}
```

**Example Journey Test**:

```typescript
// journeys/simulation-lifecycle.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { PlanEditorPage } from '../pages/PlanEditorPage';
import { SimulationResultsPage } from '../pages/SimulationResultsPage';

test.describe('Simulation Lifecycle Journey', () => {
  test('create, run, and view simulation results', async ({ page }) => {
    // Arrange: Login
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithGoogle(); // Mocked OAuth
    
    // Act: Create simulation
    const dashboard = new DashboardPage(page);
    await dashboard.clickCreateSimulation();
    
    const editor = new PlanEditorPage(page);
    await editor.selectPlanType('A');
    await editor.selectStartingRound(1);
    await editor.selectCurrentRound(5);
    await editor.setSimulationRounds(10);
    await editor.fillSalesData([
      { round: 1, amount: '1000000' },
      { round: 2, amount: '1200000' },
      // ...
    ]);
    
    // Assert: Results displayed
    const results = new SimulationResultsPage(page);
    await expect(results.resultsTable).toBeVisible();
    await expect(results.getCumulativeRevenue()).toContain('원');
    
    // Navigate to offline results view
    await page.getByRole('button', { name: '수당표 보기' }).click();
    await expect(page.locator('[data-testid="offline-results"]')).toBeVisible();

    // Return to view results
    await page.getByRole('button', { name: '돌아가기' }).click();
    await expect(results.resultsTable).toBeVisible();

    // Return to dashboard
    await page.getByRole('button', { name: '돌아가기' }).click();
    await expect(dashboard.simulationTable).toBeVisible();
  });
});
```

**Benefits**:
- High code reuse across tests
- Changes to UI only require updating page objects
- Clear abstraction layers
- Easy for new developers to understand

**Trade-offs**:
- More upfront code to write
- Can become over-engineered for small apps
- Maintenance burden if pages change frequently

**When to Choose**:
- App has stable, well-defined pages
- Multiple tests interact with same pages
- Team values strong abstractions
- Planning to scale test suite

**Implementation Guide**:

1. **Identify Pages**: Map app routes to page objects
2. **Extract Components**: Identify reusable components (tables, modals)
3. **Create Base Classes**: `BasePage` with common functionality
4. **Refactor Existing Tests**: Convert current E2E tests to use POMs
5. **Document Patterns**: Add README explaining POM structure

### Architecture 3: Journey-Based Testing with Fixtures

**Philosophy**: Organize tests around user journeys, use Playwright fixtures for state management.

**Structure**:

```
e2e/
├── fixtures/
│   ├── auth.ts           # Authenticated user fixture
│   ├── simulation.ts     # Pre-created simulation fixture
│   └── admin.ts          # Admin user fixture
├── journeys/
│   ├── new-user-onboarding.spec.ts
│   ├── returning-user-simulation.spec.ts
│   ├── multi-simulation-comparison.spec.ts
│   └── admin-content-management.spec.ts
└── utils/
    ├── api-helpers.ts
    └── data-factory.ts
```

**Example Fixture**:

```typescript
// fixtures/auth.ts
import { test as base } from '@playwright/test';
import { AuthPage } from '../utils/auth-helpers';

type AuthFixtures = {
  authenticatedPage: Page;
  adminPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Setup: Login as normal user
    await page.goto('/');
    await loginTestUser(page); // Helper function
    await use(page);
    // Teardown: handled by Playwright context cleanup
  },
  
  adminPage: async ({ page }, use) => {
    // Setup: Login as admin
    await page.goto('/');
    await loginAdminUser(page);
    await use(page);
    // Teardown: automatic
  },
});
```

**Example Journey Test**:

```typescript
// journeys/returning-user-simulation.spec.ts
import { test } from '../fixtures/auth';
import { expect } from '@playwright/test';

test.describe('Returning User: Simulation Management', () => {
  test('view existing simulations and create new one', async ({ authenticatedPage: page }) => {
    // User already logged in via fixture
    
    // Given: User has existing simulations
    await expect(page.getByTestId('simulation-table')).toBeVisible();
    const rowCount = await page.locator('[data-testid="simulation-row"]').count();
    
    // When: User creates new simulation
    await page.getByTestId('create-simulation').click();
    // ... complete creation flow ...
    
    // Then: New simulation appears in list
    await expect(page.locator('[data-testid="simulation-row"]')).toHaveCount(rowCount + 1);
  });
  
  test('update and re-run existing simulation', async ({ authenticatedPage: page }) => {
    // Given: User has at least one simulation
    await page.locator('[data-testid="simulation-row"]').first().click();
    
    // When: User edits parameters
    await page.getByTestId('edit-simulation').click();
    await page.getByLabel('시뮬레이션 회차').fill('15');
    await page.getByRole('button', { name: '저장' }).click();
    
    // Then: Simulation re-runs with new parameters
    await page.getByTestId('run-simulation').click();
    await expect(page.locator('text=/15회차/')).toBeVisible();
  });
});
```

**Benefits**:
- Tests organized by user journeys (easy to understand business value)
- Fixtures handle setup/teardown automatically
- Reduced boilerplate code
- Playwright-native approach (good documentation)

**Trade-offs**:
- Fixtures can become complex for nested dependencies
- Less explicit than Page Object Model
- Requires understanding Playwright fixtures API

**When to Choose**:
- Solo developer (you are Playwright expert)
- Want minimal boilerplate
- App has clear user journey segmentation
- Prefer Playwright-native patterns

**Implementation Guide**:

1. **Map User Journeys**: List distinct user workflows
2. **Create Core Fixtures**: Auth, data setup, admin privileges
3. **Reorganize Tests**: Group by journey, not by page/feature
4. **Consolidate Setup**: Move repeated setup to fixtures
5. **Document Journeys**: Add journey diagrams in test files

## Comparison Matrix

| Aspect | Pyramid + Selective E2E | Page Object Model | Journey + Fixtures |
|--------|------------------------|-------------------|-------------------|
| **Maintenance Effort** | Low | Medium | Low |
| **Initial Setup** | Low | High | Medium |
| **Code Reuse** | Medium | High | Medium |
| **Clarity for Solo Dev** | High | Medium | High |
| **Scalability** | Medium | High | Medium |
| **Playwright-Native** | Medium | Low | High |
| **Test Execution Speed** | Fast (< 5 min) | Medium (5-10 min) | Fast (< 5 min) |
| **Learning Curve** | Low | Medium | Medium |
| **Best for Small Team** | ✅ Yes | ⚠️ Maybe | ✅ Yes |

## Recommendations for Our App

### Primary Recommendation: Architecture 1 (Pyramid + Selective E2E)

**Why**:
1. **Solo developer context**: Minimizes maintenance burden
2. **Small scale**: Don't need extensive E2E coverage
3. **Fast feedback**: Critical for 1-person team
4. **Industry standard**: Proven approach from Google, Martin Fowler

**Action Plan**:

1. **Phase 1: Audit & Categorize** (Week 1)
   - Review all 12 current E2E spec files
   - Categorize each test: Keep as E2E, move to integration, move to unit
   - Document rationale for each decision

2. **Phase 2: Move Tests Down** (Week 2-3)
   - Rewrite tests identified for lower levels
   - Run both versions in parallel initially
   - Verify coverage hasn't decreased

3. **Phase 3: Consolidate E2E** (Week 4)
   - Merge remaining E2E tests into 5-8 journey files
   - Remove duplicates
   - Optimize for speed (parallel execution, mocking)

4. **Phase 4: Documentation** (Week 5)
   - Update test strategy docs
   - Add comments explaining E2E test scope
   - Create decision log for future reference

**Expected Outcome**:
- E2E test count: ~20-30 tests (down from current unknown count)
- E2E runtime: < 5 minutes
- Maintenance time: Reduced by 40-50%
- Coverage: Maintained or improved (via lower-level tests)

### Secondary Recommendation: Architecture 3 (Journey + Fixtures)

**Why**:
- Good complement to Architecture 1
- Playwright-native (you're already using Playwright)
- Can adopt incrementally

**Suggested Hybrid Approach**:
- Use Architecture 1 for overall strategy (selective E2E)
- Use Architecture 3 patterns for organizing those selective E2E tests (fixtures, journeys)
- Skip Architecture 2 (POM) unless app grows significantly

**Example Hybrid Structure**:

```
e2e/
├── fixtures/
│   ├── authenticated.ts    # User logged in
│   └── admin.ts           # Admin logged in
├── journeys/
│   ├── onboarding.spec.ts         # 5-8 critical
│   ├── simulation-lifecycle.spec.ts  # journey tests
│   ├── dashboard-ops.spec.ts         # only
│   ├── pwa-install.spec.ts
│   └── mobile-landscape.spec.ts
└── utils/
    ├── api-mocks.ts
    └── test-data.ts
```

## Implementation Guidelines

### 1. Test Writing Best Practices

**Use Playwright's Auto-Waiting**:
```typescript
// ✅ Good: Playwright waits automatically
await expect(page.locator('#results')).toBeVisible();

// ❌ Bad: Manual waiting
await page.waitForTimeout(5000);
```

**Prefer User-Facing Locators**:
```typescript
// ✅ Best: Role-based (accessible)
await page.getByRole('button', { name: '저장' }).click();

// ✅ Good: Text-based
await page.getByText('시뮬레이션 결과').click();

// ⚠️ OK: Test ID (for unique elements)
await page.getByTestId('create-simulation').click();

// ❌ Avoid: CSS selectors
await page.click('.MuiButton-root');
```

**Organize by AAA Pattern**:
```typescript
test('simulation creation flow', async ({ page }) => {
  // Arrange
  await loginTestUser(page);
  await page.goto('/dashboard');
  
  // Act
  await page.getByTestId('create-simulation').click();
  await page.getByLabel('플랜 타입').selectOption('A');
  await page.getByRole('button', { name: '저장' }).click();
  
  // Assert
  await expect(page.locator('text=/시뮬레이션.*생성되었습니다/')).toBeVisible();
  await expect(page.getByTestId('simulation-table')).toContainText('플랜 A');
});
```

### 2. Isolation & Cleanup

**Use Playwright's Built-in Isolation**:
```typescript
// Each test gets fresh browser context automatically
test('test 1', async ({ page }) => {
  // Fresh context, no shared state
});

test('test 2', async ({ page }) => {
  // Different context from test 1
});
```

**Clean Up Test Data**:
```typescript
test.afterEach(async ({ page }) => {
  // Delete test simulations created during test
  await page.request.delete('/api/simulations/test-*');
});
```

### 3. Speed Optimization

**Run Tests in Parallel**:
```typescript
// playwright.config.ts
export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined, // Parallel locally, serial on CI
});
```

**Use API for Setup When Possible**:
```typescript
// ✅ Fast: API-based setup
test('view results', async ({ page, request }) => {
  // Create simulation via API (fast)
  const sim = await request.post('/api/simulation/create', { data: {...} });
  
  // Test UI interaction only
  await page.goto(`/results/${sim.id}`);
  await expect(page.locator('#results-table')).toBeVisible();
});

// ❌ Slow: UI-based setup
test('view results', async ({ page }) => {
  // Navigate through entire creation flow (slow)
  await page.goto('/dashboard');
  await page.click('button:text("새 시뮬레이션")');
  // ... many more UI interactions ...
});
```

**Mock External Services**:
```typescript
// Mock Supabase auth in tests
test.beforeEach(async ({ page }) => {
  await page.route('**/auth/v1/**', (route) => {
    route.fulfill({ json: { /* mocked response */ } });
  });
});
```

### 4. Debugging Support

**Enable Trace on Failure**:
```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    trace: 'on-first-retry', // Capture trace on retry
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

**Add Debug Helpers**:
```typescript
// utils/debug.ts
export async function debugScreenshot(page: Page, name: string) {
  if (process.env.DEBUG) {
    await page.screenshot({ path: `debug-${name}.png` });
  }
}

// In test
await debugScreenshot(page, 'before-submit');
```

### 5. CI/CD Integration

**Optimize for GitHub Actions**:
```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      
      # Only install Chromium (fastest)
      - name: Install Playwright
        run: npx playwright install chromium --with-deps
      
      # Run tests
      - name: Run E2E tests
        run: npm run test:e2e
      
      # Upload trace on failure
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-traces
          path: playwright-report/
```

## Related Code

### Current E2E Test Structure

**Test Files** (12 total):
- `src/frontend/e2e/auth/embedded-browser.spec.ts:3-212`
- `src/frontend/e2e/specs/admin-features.spec.ts:10-199`
- `src/frontend/e2e/specs/auth-session.spec.ts:1-end`
- `src/frontend/e2e/specs/error-handling.spec.ts:1-end`
- `src/frontend/e2e/specs/landscape-enforcer.spec.ts:1-end`
- `src/frontend/e2e/specs/main-dashboard.spec.ts:1-end`
- `src/frontend/e2e/specs/mobile.spec.ts:1-end`
- `src/frontend/e2e/specs/onboarding.spec.ts:1-end`
- `src/frontend/e2e/specs/persistence.spec.ts:1-end`
- `src/frontend/e2e/specs/plan-editor.spec.ts:1-end`
- `src/frontend/e2e/specs/pwa.spec.ts:1-end`
- `src/frontend/e2e/specs/results-display.spec.ts:1-end`
- `src/frontend/e2e/specs/simulation-flow.spec.ts:1-50`

**Helper Utilities**:
- `src/frontend/e2e/utils/test-helpers.ts:1-817` - TestHelpers class, API mocking
- `src/frontend/e2e/utils/auth-helpers.ts:1-end` - Authentication utilities

**Configuration**:
- `src/frontend/playwright.config.ts:1-95` - Playwright config with Mobile Chrome/Safari projects

### Code Execution Flow (Example E2E Test)

```
Test: simulation-flow.spec.ts:20-38
  ↓
beforeEach: initE2EMode(page) [test-helpers.ts:30]
  ↓ (sets window.__E2E_MODE__ flag)
beforeEach: loginTestUser(page) [auth-helpers.ts]
  ↓ (mocks Supabase auth)
beforeEach: APIHelpers.mockSimulationAPI(page) [test-helpers.ts]
  ↓ (intercepts /api/simulations)
Test Body: Navigate → Interact → Assert
  ↓ (uses TestHelpers methods)
page.goto('/') 
  ↓
page.getByTestId('create-simulation').click()
  ↓
helpers.selectPlan('A') [test-helpers.ts:78]
  ↓
helpers.clickNext() [test-helpers.ts:94]
  ↓
expect(page.locator('text=가입한 회차')).toBeVisible()
```

### Data Flow

```
Test Initialization
  ↓
E2E Mode Flag Setup (addInitScript)
  ↓
localStorage.__E2E_MODE__ = true
  ↓
Page Load (app checks __E2E_MODE__)
  ↓
API Mocking Active (route interception)
  ↓
User Interactions (via TestHelpers)
  ↓
Assertions (via Playwright expect)
  ↓
Context Cleanup (automatic)
```

## Conclusion

For the Light of Life Club Simulation PWA, the **Test Pyramid with Selective E2E approach** (Architecture 1) is the most appropriate choice, given:
- Solo developer context (you)
- Small user base (60-100 users)
- Need for fast feedback
- Limited maintenance capacity

**Key Takeaways**:

1. **Minimize E2E Tests**: Target 5-8 critical journeys (~20-30 total E2E tests)
2. **Maximize Lower-Level Coverage**: Move current E2E tests to unit/integration where possible
3. **Use Fixtures for Setup**: Adopt Playwright fixtures for common scenarios
4. **Optimize for Speed**: Parallel execution, API-based setup, minimal UI navigation
5. **Follow Playwright Best Practices**: User-facing locators, auto-waiting, trace on failure

**Next Steps**:

1. **Immediate**: Audit current 12 E2E spec files
2. **Week 1-2**: Categorize and plan test migration
3. **Week 3-5**: Implement test reorganization
4. **Ongoing**: Maintain discipline about E2E scope

This approach will result in a fast (< 5 min), maintainable, and reliable E2E test suite that provides confidence in core user journeys without becoming a maintenance burden for a solo developer.

## References

- **Playwright Best Practices**: https://playwright.dev/docs/best-practices
- **Martin Fowler Test Pyramid**: https://martinfowler.com/articles/practical-test-pyramid.html
- **Google Testing Blog**: https://testing.googleblog.com/
- **Issue #93**: https://github.com/SkyDominator/simulation/issues/93
- **Project PRD**: `docs/spec/prd.md`
- **Project SSD**: `docs/spec/ssd.md`
- **Current Config**: `src/frontend/playwright.config.ts`
- **Current Helpers**: `src/frontend/e2e/utils/test-helpers.ts`
