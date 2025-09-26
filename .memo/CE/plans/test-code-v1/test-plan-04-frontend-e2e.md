# Test Plan – Frontend E2E Tests (Concrete v1.0)

**⚠️ STATUS: NOT YET IMPLEMENTED - E2E infrastructure not yet set up**

This covers end-to-end testing for main user flows and core business features using Playwright. Tests the complete user journey from authentication through simulation management.

**Current State**: Playwright is not installed and no E2E test infrastructure exists. This plan serves as a roadmap for future E2E implementation.

Target: Critical user paths through the entire application stack, testing frontend + backend integration with real browser automation.

--------------------------------------------------------------------------------
1. Scope & Principles
--------------------------------------------------------------------------------

**In Scope:**
* Complete user authentication flow (whitelist → OTP → login)
* Core simulation management (create, run, view, delete)
* Critical user journeys across multiple pages
* PWA installation and basic offline functionality
* Mobile responsive behavior on real viewports
* Error handling in realistic scenarios

**Out of Scope:**
* Performance testing (load times measured manually)
* Cross-browser testing (manual checklist covers this)
* Visual regression testing
* API endpoint testing (covered in API smoke tests)
* Detailed business logic validation (unit tests)

**Test Philosophy:**
* Test real user workflows end-to-end
* Use realistic test data and scenarios
* Focus on happy paths with key error scenarios
* Minimize test maintenance with stable selectors
* Run against local development environment

--------------------------------------------------------------------------------
2. Test Category Matrix
--------------------------------------------------------------------------------

2.1 User Onboarding Flow (CAT-ONBOARD)
* Why: Critical entry point, complex multi-step flow
* Journey: Whitelist check → OTP verification → OAuth login
* Cases:
  * E2E-001: Complete user onboarding for whitelisted user
  * E2E-002: Whitelist check blocks non-whitelisted users
  * E2E-003: OTP verification with valid code succeeds
  * E2E-004: OTP verification with invalid code shows error
  * E2E-005: OAuth login completes successfully
  * E2E-006: Return user bypasses whitelist/OTP steps

2.2 Simulation Management Flow (CAT-SIMFLOW)
* Why: Core business functionality
* Journey: Plan creation → Parameter setup → Execution → Results review
* Cases:
  * E2E-007: Create new simulation with Plan A
  * E2E-008: Run simulation and view results
  * E2E-009: Save simulation results and navigate back
  * E2E-010: Edit existing simulation parameters
  * E2E-011: Delete simulation with confirmation
  * E2E-012: Handle simulation with different plans (B, C, D)

2.3 Data Persistence & State Management (CAT-PERSIST)
* Why: User experience and data integrity
* Journey: Create data → Navigate away → Return and verify
* Cases:
  * E2E-013: Simulation drafts persist in localStorage
  * E2E-014: User session persists across browser refresh
  * E2E-015: Form data recovers after navigation
  * E2E-016: Results remain accessible after page reload

2.4 Error Handling & Edge Cases (CAT-ERROR)
* Why: Graceful degradation and user guidance
* Journey: Trigger errors → Verify user-friendly handling
* Cases:
  * E2E-017: Network error during simulation shows retry option
  * E2E-018: Invalid form data shows validation errors
  * E2E-019: Session expiry redirects to login
  * E2E-020: API timeout handled gracefully

2.5 Mobile & Responsive Behavior (CAT-MOBILE)
* Why: Mobile-first PWA requirements
* Journey: Same flows but on mobile viewport
* Cases:
  * E2E-021: Complete onboarding flow on mobile
  * E2E-022: Simulation creation on mobile viewport
  * E2E-023: Navigation works on touch devices
  * E2E-024: Forms remain usable on small screens

2.6 PWA Features (CAT-PWA)
* Why: Progressive Web App functionality
* Journey: Install → Use offline → Verify caching
* Cases:
  * E2E-025: PWA installation prompt appears
  * E2E-026: PWA installs successfully
  * E2E-027: Basic offline functionality works
  * E2E-028: Service worker caches static resources

--------------------------------------------------------------------------------
3. Test Infrastructure & Configuration  
--------------------------------------------------------------------------------

**⚠️ INFRASTRUCTURE STATUS: NOT IMPLEMENTED**

The following configuration and setup is provided as a reference for when E2E testing infrastructure is implemented.

3.1 Required Dependencies (package.json additions)
```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0"
  },
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

3.2 Playwright Configuration (playwright.config.ts)
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173', // Vite preview server
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  
  projects: [
    // Desktop Chrome
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    // Mobile Chrome
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    // Desktop Edge (for PWA testing)
    {
      name: 'edge',
      use: { ...devices['Desktop Edge'] },
    },
  ],
  
  webServer: {
    command: 'npm run preview',
    port: 4173,
    cwd: './src/frontend',
    reuseExistingServer: !process.env.CI,
  },
})
```

3.2 Test Utilities (e2e/utils/test-helpers.ts)
```typescript
import { Page, expect } from '@playwright/test'

export class TestHelpers {
  constructor(private page: Page) {}
  
  async fillWhitelistForm(name: string, phone: string) {
    await this.page.fill('[data-testid="name-input"]', name)
    await this.page.fill('[data-testid="phone-input"]', phone)
    await this.page.click('[data-testid="submit-whitelist"]')
  }
  
  async fillOTPForm(code: string) {
    await this.page.fill('[data-testid="otp-input"]', code)
    await this.page.click('[data-testid="verify-otp"]')
  }
  
  async selectPlan(planId: string) {
    await this.page.selectOption('[data-testid="plan-selector"]', planId)
  }
  
  async fillInvestmentAmount(round: number, amount: string) {
    await this.page.fill(`[data-testid="investment-round-${round}"]`, amount)
  }
  
  async waitForSimulationResults() {
    await this.page.waitForSelector('[data-testid="simulation-results"]')
    await expect(this.page.locator('[data-testid="results-table"]')).toBeVisible()
  }
  
  async waitForNotification(message: string) {
    await expect(this.page.locator('[data-testid="notification"]')).toContainText(message)
  }
}

export class APIHelpers {
  static async mockOTPSuccess(page: Page) {
    await page.route('**/api/otp/send', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OTP sent successfully',
          user_hash: 'test-hash-123',
          expires_in_seconds: 300
        })
      })
    })
    
    await page.route('**/api/otp/verify', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OTP verified successfully'
        })
      })
    })
  }
  
  static async mockSimulationAPI(page: Page) {
    await page.route('**/api/simulation/create', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'sim-123', title: 'Test Simulation' }
        })
      })
    })
    
    await page.route('**/api/simulation/run', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            history: [
              { company_round: 1, investor_count: 1, total_payment: 1000000, total_revenue_after_tax: 970000, cumulative_net_profit: -30000 },
              { company_round: 2, investor_count: 2, total_payment: 2000000, total_revenue_after_tax: 1940000, cumulative_net_profit: -60000 }
            ],
            summary: { total_rounds: 2, final_profit: -60000 }
          }
        })
      })
    })
  }
}
```

3.3 Authentication Helpers (e2e/utils/auth-helpers.ts)
```typescript
import { Page } from '@playwright/test'

export async function loginTestUser(page: Page) {
  // Mock Supabase auth for testing
  await page.addInitScript(() => {
    // Mock successful authentication
    window.localStorage.setItem('supabase.auth.token', JSON.stringify({
      access_token: 'mock-jwt-token',
      refresh_token: 'mock-refresh-token',
      expires_at: Date.now() + 3600000, // 1 hour from now
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' }
      }
    }))
  })
}

export async function logoutTestUser(page: Page) {
  await page.evaluate(() => {
    window.localStorage.removeItem('supabase.auth.token')
  })
}
```

--------------------------------------------------------------------------------
4. Representative Test Cases
--------------------------------------------------------------------------------

4.1 Complete User Onboarding (E2E-001)
```typescript
// e2e/onboarding.spec.ts
import { test, expect } from '@playwright/test'
import { TestHelpers, APIHelpers } from './utils/test-helpers'

test('complete user onboarding flow', async ({ page }) => {
  const helpers = new TestHelpers(page)
  
  // Mock API responses
  await APIHelpers.mockOTPSuccess(page)
  
  // Step 1: Navigate to app
  await page.goto('/')
  
  // Step 2: Fill whitelist form
  await expect(page.locator('h1')).toContainText('가입 허용 확인')
  await helpers.fillWhitelistForm('홍길동', '010-1234-5678')
  
  // Step 3: OTP verification page should appear
  await expect(page.locator('h1')).toContainText('인증번호 입력')
  await helpers.fillOTPForm('123456')
  
  // Step 4: Should redirect to login page
  await expect(page.locator('h1')).toContainText('로그인')
  
  // Step 5: Mock OAuth success and click login
  await page.evaluate(() => {
    // Mock Supabase OAuth success
    window.localStorage.setItem('sb-test-auth-token', JSON.stringify({
      access_token: 'mock-token',
      user: { id: 'user-123', email: 'test@example.com' }
    }))
  })
  
  await page.click('[data-testid="google-login"]')
  
  // Step 6: Should reach main page
  await expect(page.locator('h1')).toContainText('투자 시뮬레이션')
})
```

4.2 Simulation Creation Flow (E2E-007)
```typescript
test('create and run simulation', async ({ page }) => {
  const helpers = new TestHelpers(page)
  
  // Setup authenticated user
  await loginTestUser(page)
  await APIHelpers.mockSimulationAPI(page)
  
  await page.goto('/')
  
  // Navigate to plan editor
  await page.click('[data-testid="create-simulation"]')
  await expect(page.locator('h1')).toContainText('플랜 설정')
  
  // Select plan and fill parameters
  await helpers.selectPlan('A')
  await helpers.fillInvestmentAmount(1, '1000000')
  await helpers.fillInvestmentAmount(2, '2000000')
  
  // Set total rounds
  await page.fill('[data-testid="total-rounds"]', '10')
  
  // Create simulation
  await page.click('[data-testid="create-simulation"]')
  
  // Should redirect to results page
  await helpers.waitForSimulationResults()
  
  // Verify results display
  await expect(page.locator('[data-testid="results-table"]')).toBeVisible()
  await expect(page.locator('[data-testid="profit-summary"]')).toBeVisible()
})
```

4.3 Mobile Responsiveness (E2E-021)
```typescript
test('mobile onboarding flow', async ({ page }) => {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 })
  
  const helpers = new TestHelpers(page)
  await APIHelpers.mockOTPSuccess(page)
  
  await page.goto('/')
  
  // Verify mobile layout
  await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible()
  
  // Complete onboarding on mobile
  await helpers.fillWhitelistForm('홍길동', '010-1234-5678')
  
  // Verify form elements are properly sized for mobile
  const nameInput = page.locator('[data-testid="name-input"]')
  const phoneInput = page.locator('[data-testid="phone-input"]')
  
  const nameBox = await nameInput.boundingBox()
  const phoneBox = await phoneInput.boundingBox()
  
  expect(nameBox?.width).toBeGreaterThan(300) // Should be wide enough on mobile
  expect(phoneBox?.width).toBeGreaterThan(300)
})
```

4.4 PWA Installation (E2E-025)
```typescript
test('PWA installation flow', async ({ page, context }) => {
  // Enable PWA features in browser context
  await context.grantPermissions(['notifications'])
  
  await page.goto('/')
  
  // Wait for service worker registration
  await page.waitForFunction(() => 'serviceWorker' in navigator)
  
  // Check for install prompt elements
  await expect(page.locator('[data-testid="install-prompt"]')).toBeVisible()
  
  // Simulate beforeinstallprompt event
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt')
    ;(event as any).prompt = () => Promise.resolve({ outcome: 'accepted' })
    window.dispatchEvent(event)
  })
  
  // Click install button
  await page.click('[data-testid="install-pwa"]')
  
  // Verify installation success message
  await expect(page.locator('[data-testid="install-success"]')).toBeVisible()
})
```

4.5 Offline Functionality (E2E-027)
```typescript
test('basic offline functionality', async ({ page, context }) => {
  await page.goto('/')
  
  // Wait for service worker and initial cache
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000) // Allow caching to complete
  
  // Go offline
  await context.setOffline(true)
  
  // Reload page - should still work from cache
  await page.reload()
  
  // Basic elements should still be visible
  await expect(page.locator('[data-testid="app-shell"]')).toBeVisible()
  
  // Offline indicator should appear
  await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()
  
  // Go back online
  await context.setOffline(false)
  
  // Offline indicator should disappear
  await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible()
})
```

4.6 Error Handling (E2E-017)
```typescript
test('network error handling', async ({ page }) => {
  await loginTestUser(page)
  
  // Mock API failure
  await page.route('**/api/simulation/create', async route => {
    await route.abort('failed')
  })
  
  await page.goto('/')
  await page.click('[data-testid="create-simulation"]')
  
  // Fill form
  await page.selectOption('[data-testid="plan-selector"]', 'A')
  await page.fill('[data-testid="investment-round-1"]', '1000000')
  
  // Attempt to create simulation
  await page.click('[data-testid="create-simulation"]')
  
  // Should show error message with retry option
  await expect(page.locator('[data-testid="error-message"]')).toContainText('네트워크 오류')
  await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
  
  // Mock success for retry
  await page.route('**/api/simulation/create', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { id: 'sim-123' } })
    })
  })
  
  // Click retry
  await page.click('[data-testid="retry-button"]')
  
  // Should succeed
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
})
```

--------------------------------------------------------------------------------
5. Test Data Management
--------------------------------------------------------------------------------

5.1 Test Data Setup (e2e/fixtures/test-data.ts)
```typescript
export const TEST_USERS = {
  WHITELISTED: {
    name: '홍길동',
    phone: '010-1234-5678',
    hash: 'valid-hash-123'
  },
  NON_WHITELISTED: {
    name: '김철수',
    phone: '010-9876-5432',
    hash: 'invalid-hash-456'
  }
}

export const TEST_SIMULATIONS = {
  PLAN_A: {
    plan_id: 'A',
    investments: { 1: 1000000, 2: 2000000, 3: 3000000 },
    total_rounds: 10
  },
  PLAN_B: {
    plan_id: 'B',
    investments: { 1: 500000, 2: 1000000 },
    total_rounds: 15
  }
}

export const MOCK_RESULTS = {
  SIMPLE: {
    history: [
      { company_round: 1, investor_count: 1, total_payment: 1000000, cumulative_net_profit: -30000 },
      { company_round: 2, investor_count: 2, total_payment: 2000000, cumulative_net_profit: -60000 }
    ],
    summary: { total_rounds: 2, final_profit: -60000 }
  }
}
```

5.2 Database State Management
```typescript
// e2e/utils/db-helpers.ts
export async function setupTestWhitelist(page: Page) {
  // Mock whitelist API to return success for test user
  await page.route('**/api/otp/send', async route => {
    const request = await route.request().postDataJSON()
    const isTestUser = request.name === TEST_USERS.WHITELISTED.name
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: isTestUser,
        message: isTestUser ? 'OTP sent' : '가입 허용 명단에 없는 사용자입니다.',
        user_hash: isTestUser ? TEST_USERS.WHITELISTED.hash : undefined
      })
    })
  })
}
```

--------------------------------------------------------------------------------
6. Test Execution & CI Integration
--------------------------------------------------------------------------------

6.1 Local Development
```bash
# Install dependencies
npm install @playwright/test

# Install browsers
npx playwright install

# Run all tests
npm run test:e2e

# Run specific test file
npx playwright test onboarding.spec.ts

# Run with UI mode
npx playwright test --ui

# Generate report
npx playwright show-report
```

6.2 Package.json Scripts
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  }
}
```

6.3 CI Configuration (GitHub Actions)
```yaml
- name: Run E2E tests
  run: |
    npm run preview &
    npx wait-on http://localhost:4173
    npm run test:e2e
  env:
    CI: true
```

--------------------------------------------------------------------------------
7. Test Structure & Organization
--------------------------------------------------------------------------------

File organization:
```
e2e/
├── playwright.config.ts        # Playwright configuration
├── utils/
│   ├── test-helpers.ts         # Page interaction helpers
│   ├── auth-helpers.ts         # Authentication utilities
│   └── db-helpers.ts           # Database mocking
├── fixtures/
│   └── test-data.ts            # Test data constants
├── specs/
│   ├── onboarding.spec.ts      # CAT-ONBOARD
│   ├── simulation-flow.spec.ts # CAT-SIMFLOW  
│   ├── persistence.spec.ts     # CAT-PERSIST
│   ├── error-handling.spec.ts  # CAT-ERROR
│   ├── mobile.spec.ts          # CAT-MOBILE
│   └── pwa.spec.ts             # CAT-PWA
└── reports/                    # Generated test reports
```

Test naming: `{feature}.spec.ts`
Test descriptions: `{user action} should {expected outcome}`

--------------------------------------------------------------------------------
8. Coverage & Success Criteria
--------------------------------------------------------------------------------

**Success Criteria:**
* All critical user journeys complete successfully
* Error scenarios display appropriate user feedback
* Mobile viewport works for key flows
* PWA installation and offline basics function
* Tests complete reliably in under 5 minutes
* No console errors during normal flows

**Coverage Goals:**
* 100% of user-facing workflows tested
* All major error conditions covered
* Mobile and desktop viewports validated
* PWA features verified

**Quality Gates:**
* Tests must be deterministic (no flaky failures)
* All async operations properly awaited
* Proper cleanup between tests
* Screenshots captured on failures

--------------------------------------------------------------------------------
9. Implementation Checklist
--------------------------------------------------------------------------------

| Category | Cases Count | Priority | Dependencies |
|----------|-------------|----------|--------------|
| ONBOARD | 6 | High | OTP mocking, Auth setup |
| SIMFLOW | 6 | High | API mocking, Test data |
| PERSIST | 4 | Medium | LocalStorage, Session |
| ERROR | 4 | Medium | Network mocking |
| MOBILE | 4 | Medium | Viewport configuration |
| PWA | 4 | Low | Service worker setup |

**Total: 28 test cases**

--------------------------------------------------------------------------------
10. Implementation Prerequisites (REQUIRED SETUP)
--------------------------------------------------------------------------------

**⚠️ Before implementing this plan, the following setup is required:**

1. **Install Playwright**: `npm install --save-dev @playwright/test`
2. **Initialize Playwright**: `npx playwright install`
3. **Create E2E directory structure**:
   ```
   e2e/
   ├── playwright.config.ts
   ├── utils/
   ├── fixtures/
   └── specs/
   ```
4. **Set up test environment configuration**
5. **Create base test utilities and page objects**

**Current Status**: ❌ None of the above prerequisites are met

**Estimated Setup Time**: 2-3 days for initial infrastructure

**Next Steps After Setup**:
1. Implement user onboarding flow tests
2. Add simulation management flow tests  
3. Create mobile responsiveness tests
4. Implement PWA feature tests
5. Add error handling and edge case tests
6. Set up CI/CD integration

--------------------------------------------------------------------------------
11. Risks & Mitigations
--------------------------------------------------------------------------------

| Risk | Mitigation |
|------|------------|
| Flaky tests due to timing | Use proper wait strategies, avoid fixed timeouts |
| Test environment setup complexity | Docker compose for consistent environment |
| API mocking drift | Regular integration with real backend |
| Mobile testing limitations | Use real device testing for final validation |
| CI/CD resource usage | Optimize test parallelization and caching |

End of Plan.