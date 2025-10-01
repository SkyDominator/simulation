# Test Plan – Frontend E2E Tests (Concrete v1.0)

This covers end-to-end browser tests for complete user journeys across the entire frontend application. Tests validate real browser interactions, multi-page flows, and integration with mocked backend services.

Target: E2E tests in `src/frontend/e2e/specs/` using Playwright for cross-browser testing of critical user paths.

--------------------------------------------------------------------------------
## 1. Scope & Principles
--------------------------------------------------------------------------------

**In Scope:**
* Complete user onboarding journey (whitelist → OTP → consent → OAuth login)
* Authenticated simulation workflows (create, edit, run, view, delete)
* Cross-page navigation and state management
* Mobile-responsive behavior and touch interactions
* PWA functionality (manifest, offline awareness, session persistence)
* Error handling and recovery across page boundaries
* Browser compatibility (Chrome, Firefox, Safari, Edge)
* Device compatibility (Desktop, Mobile Chrome, Mobile Safari)

**Out of Scope:**
* Real backend API calls (mocked at network layer)
* Real authentication (mocked Supabase OAuth)
* Real SMS sending (OTP mocked)
* Performance/load testing
* Accessibility testing (covered separately)
* Detailed unit logic validation (covered in unit/integration tests)

**Test Philosophy:**
* Test real user interactions through actual browser automation
* Mock external dependencies (API, Auth) at network boundary
* Validate complete flows from user action to final state
* Test on multiple browsers and device configurations
* Verify responsive design behavior at different viewport sizes
* Ensure state persistence across navigation and page reloads

--------------------------------------------------------------------------------
## 2. Test Category Matrix
--------------------------------------------------------------------------------

### 2.1 User Onboarding Flow (CAT-ONBOARD)
* **Why**: Critical first-time user experience, must work perfectly
* **Targets**: Whitelist verification, OTP flow, privacy consent, OAuth login
* **Test Files**: `onboarding.spec.ts`
* **Cases**:
    - E2E-ONBOARD-001: Complete happy path - whitelisted user completes full onboarding
    - E2E-ONBOARD-002: Non-whitelisted user sees error and cannot proceed
    - E2E-ONBOARD-003: Invalid OTP code shows error without advancing
    - E2E-ONBOARD-004: OTP resend button works and respects rate limits
    - E2E-ONBOARD-005: Privacy consent checkbox required before proceeding
    - E2E-ONBOARD-006: Decline consent returns to whitelist page
    - E2E-ONBOARD-007: Google OAuth button triggers login flow
    - E2E-ONBOARD-008: Kakao OAuth button triggers login flow
    - E2E-ONBOARD-009: Back navigation preserves form state
    - E2E-ONBOARD-010: OTP timer countdown displays correctly

### 2.2 Simulation Management Flow (CAT-SIMFLOW)
* **Why**: Core business functionality for authenticated users
* **Targets**: Simulation dashboard, plan editor, results viewing
* **Test Files**: `simulation-flow.spec.ts`
* **Cases**:
    - E2E-SIM-001: Dashboard displays list of user simulations
    - E2E-SIM-002: Create new simulation button navigates to plan editor
    - E2E-SIM-003: Plan editor multi-step wizard completes successfully
    - E2E-SIM-004: Plan type selection updates validation rules
    - E2E-SIM-005: Investment schedule editor accepts valid amounts
    - E2E-SIM-006: Simulation creation saves and returns to dashboard
    - E2E-SIM-007: Run simulation executes and displays results
    - E2E-SIM-008: Edit simulation reopens plan editor with saved data
    - E2E-SIM-009: Delete simulation removes from list with confirmation
    - E2E-SIM-010: Batch delete multiple simulations works
    - E2E-SIM-011: Simulation memo field updates correctly
    - E2E-SIM-012: Results page shows detailed round-by-round data
    - E2E-SIM-013: Export simulation results downloads file
    - E2E-SIM-014: Table sorting works for all columns
    - E2E-SIM-015: Multi-select checkboxes enable bulk actions

### 2.3 Error Handling & Recovery (CAT-ERROR)
* **Why**: Users must see clear errors and have recovery paths
* **Targets**: Network failures, validation errors, session issues
* **Test Files**: `error-handling.spec.ts`
* **Cases**:
    - E2E-ERR-001: Network error on OTP send shows friendly message
    - E2E-ERR-002: Network error on simulation run allows retry
    - E2E-ERR-003: Validation errors display inline with field context
    - E2E-ERR-004: Session expiry redirects to login with context preserved
    - E2E-ERR-005: Browser back button during error state works correctly
    - E2E-ERR-006: Multiple consecutive errors don't break UI
    - E2E-ERR-007: Error alert dismissal restores interactive state

### 2.4 Mobile & Responsive Behavior (CAT-MOBILE)
* **Why**: PWA must work on mobile devices (60% of target users)
* **Targets**: Mobile layouts, touch interactions, responsive design
* **Test Files**: `mobile.spec.ts`
* **Cases**:
    - E2E-MOB-001: Onboarding pages render correctly at mobile width
    - E2E-MOB-002: Dashboard table scrolls horizontally on narrow screens
    - E2E-MOB-003: Touch interactions work for all interactive elements
    - E2E-MOB-004: Mobile navigation menu accessible
    - E2E-MOB-005: Modal dialogs are full-screen on mobile
    - E2E-MOB-006: Form inputs trigger appropriate mobile keyboards
    - E2E-MOB-007: Landscape enforcer shows when in portrait mode
    - E2E-MOB-008: Mobile viewport maintains usability at 375px width

### 2.5 PWA Features (CAT-PWA)
* **Why**: Application installability and offline awareness required
* **Targets**: Manifest, service worker, installation prompts
* **Test Files**: `pwa.spec.ts`
* **Cases**:
    - E2E-PWA-001: Web manifest serves with correct content
    - E2E-PWA-002: Manifest includes required icons (192px, 512px)
    - E2E-PWA-003: Service worker registers successfully
    - E2E-PWA-004: Cached resources load on repeat visit
    - E2E-PWA-005: Offline indicator appears when network unavailable
    - E2E-PWA-006: PWA installation prompt can be triggered

### 2.6 Session & State Persistence (CAT-PERSIST)
* **Why**: Users expect continuity across sessions and navigation
* **Targets**: Authentication state, localStorage, sessionStorage
* **Test Files**: `persistence.spec.ts`
* **Cases**:
    - E2E-PERS-001: User remains logged in after page reload
    - E2E-PERS-002: Logout clears authentication tokens from storage
    - E2E-PERS-003: Draft simulation data persists across browser refresh
    - E2E-PERS-004: Page navigation preserves application state
    - E2E-PERS-005: Tab closure and reopening restores session
    - E2E-PERS-006: Storage cleanup on logout removes sensitive data

### 2.7 Cross-Browser Compatibility (CAT-BROWSER)
* **Why**: Application must work across all supported browsers
* **Targets**: Chrome, Firefox, Safari, Edge, Mobile browsers
* **Test Files**: All specs run on all configured browsers
* **Cases**:
    - E2E-BROW-001: All core flows work in Chromium
    - E2E-BROW-002: All core flows work in Firefox
    - E2E-BROW-003: All core flows work in WebKit (Safari)
    - E2E-BROW-004: All core flows work in Edge
    - E2E-BROW-005: Mobile Chrome viewport behavior correct
    - E2E-BROW-006: Mobile Safari viewport behavior correct
    - E2E-BROW-007: Browser-specific quirks handled (localStorage, fetch)

### 2.8 Navigation & Routing (CAT-NAV)
* **Why**: Single-page app routing must be reliable
* **Targets**: URL changes, browser history, deep linking
* **Test Files**: Covered across all spec files
* **Cases**:
    - E2E-NAV-001: Browser back button navigates correctly
    - E2E-NAV-002: Browser forward button navigates correctly
    - E2E-NAV-003: Direct URL navigation to protected routes requires auth
    - E2E-NAV-004: Direct URL navigation to public routes works
    - E2E-NAV-005: Page refresh preserves current route
    - E2E-NAV-006: URL parameters preserved across navigation

--------------------------------------------------------------------------------
## 3. Fixtures & Infrastructure
--------------------------------------------------------------------------------

### 3.1 Playwright Configuration
**File**: `playwright.config.ts`


```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
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
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],
  webServer: {
    command: 'npm run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
})
```

### 3.2 Test Data Fixtures
**File**: `e2e/fixtures/test-data.ts`

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
  },
  ADMIN: {
    name: '관리자',
    phone: '010-0000-0001',
    email: 'admin@example.com',
    hash: 'admin-hash-789'
  }
}

export const TEST_SIMULATIONS = {
  PLAN_A: {
    plan_id: 'A',
    starting_company_round: 1,
    current_company_round: 1,
    simulation_rounds: 10,
    investments: { 1: 1000000, 2: 2000000, 3: 3000000 }
  }
}

export const VIEWPORT_SIZES = {
  MOBILE: { width: 375, height: 667 },
  TABLET: { width: 768, height: 1024 },
  DESKTOP: { width: 1200, height: 800 }
}
```

### 3.3 Authentication Helpers
**File**: `e2e/utils/auth-helpers.ts`

```typescript
export async function loginTestUser(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('supabase.auth.token', JSON.stringify({
      access_token: 'mock-jwt-token',
      refresh_token: 'mock-refresh-token',
      expires_at: Date.now() + 3600000,
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User', phone: '010-1234-5678' }
      }
    }))
    window.localStorage.setItem('ui.page', '"main"')
  })
}

export async function completeOnboardingFlow(page: Page, userData = {
  name: '홍길동',
  phone: '010-1234-5678'
}) {
  await page.goto('/')
  await page.fill('[data-testid="name-input"]', userData.name)
  await page.fill('[data-testid="phone-input"]', userData.phone)
  await page.click('[data-testid="submit-whitelist"]')
  await page.waitForSelector('[data-testid="otp-input"]')
  await page.fill('[data-testid="otp-input"]', '123456')
  await page.click('[data-testid="verify-otp"]')
  // Continue through consent and OAuth...
}
```

### 3.4 API Mocking Helpers
**File**: `e2e/utils/test-helpers.ts`

```typescript
export class APIHelpers {
  static async mockOTPSuccess(page: Page) {
    await page.route('**/api/otp/send', async (route) => {
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
  }

  static async mockSimulationAPI(page: Page) {
    await page.route('**/api/simulations', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([{
            id: 'sim-123',
            plan_id: 'A',
            memo: 'Test simulation',
            created_at: '2024-01-01T00:00:00Z'
          }])
        })
      }
    })
  }

  static async mockNetworkError(page: Page, endpoint: string) {
    await page.route(`**${endpoint}`, async (route) => {
      await route.abort('failed')
    })
  }
}
```

### 3.5 Page Interaction Helpers
**File**: `e2e/utils/test-helpers.ts`

```typescript
export class TestHelpers {
  constructor(private page: Page) {}

  async fillWhitelistForm(name: string, phone: string) {
    await this.page.getByLabel('이름').fill(name)
    await this.page.getByLabel('휴대폰 번호').fill(phone)
    await this.page.getByRole('button', { name: '인증번호 받기' }).click()
  }

  async fillOTPForm(code: string) {
    await this.page.getByLabel('인증번호').fill(code)
    await this.page.getByRole('button', { name: '인증하기' }).click()
  }

  async selectPlan(planId: string) {
    await this.page.click('[role="button"][aria-haspopup="listbox"]')
    await this.page.click(`text="${planId}"`)
  }

  async waitForSimulationResults() {
    await this.page.waitForSelector('text=/시뮬레이션.*결과/', { timeout: 10000 })
    await expect(this.page.locator('table, [role="table"]')).toBeVisible()
  }
}
```

--------------------------------------------------------------------------------
## 4. Representative Test Snippets
--------------------------------------------------------------------------------

### 4.1 E2E-ONBOARD-001: Complete Onboarding Happy Path

```typescript
test('allows a whitelisted user to complete onboarding', async ({ page }) => {
  const helpers = new TestHelpers(page)
  await APIHelpers.mockOTPSuccess(page)
  await APIHelpers.mockConsentSuccess(page)
  
  // Start at root
  await page.goto('/')
  
  // Step 1: Whitelist verification
  await expect(page.locator('h5').filter({ hasText: '환영합니다!' })).toBeVisible()
  await helpers.fillWhitelistForm(
    TEST_USERS.WHITELISTED.name,
    TEST_USERS.WHITELISTED.phone
  )
  
  // Step 2: OTP verification
  await expect(page.locator('[data-testid="otp-form"]')).toBeVisible()
  await helpers.fillOTPForm(TEST_OTP_CODES.VALID)
  
  // Step 3: Privacy consent
  await expect(page.locator('[data-testid="consent-page"]')).toBeVisible()
  await page.getByTestId('consent-checkbox').click()
  await page.getByTestId('accept-consent').click()
  
  // Step 4: OAuth login
  await expect(page.getByTestId('login-form')).toBeVisible()
  await loginTestUser(page)
  await page.getByTestId('google-login').click()
  
  // Step 5: Verify main page loaded
  await expect(page.getByTestId('main-page')).toBeVisible({ timeout: 5000 })
  await expect(page.getByTestId('create-simulation')).toBeVisible()
})
```

### 4.2 E2E-SIM-003: Complete Simulation Creation Flow

```typescript
test('creates a simulation through multi-step wizard', async ({ page }) => {
  const helpers = new TestHelpers(page)
  await loginTestUser(page)
  await APIHelpers.mockSimulationAPI(page)
  
  await page.goto('/')
  
  // Navigate to plan editor
  await page.getByTestId('create-simulation').click()
  await expect(page.locator('text=플랜 타입')).toBeVisible()
  
  // Step 1: Select plan type
  await helpers.selectPlan('A')
  await helpers.clickNext()
  
  // Step 2: Enter starting round
  await expect(page.locator('text=가입한 회차')).toBeVisible()
  await page.getByLabel('회차').fill('1')
  await helpers.clickNext()
  
  // Step 3: Enter current round
  await page.getByLabel('현재 회차').fill('1')
  await helpers.clickNext()
  
  // Step 4: Enter simulation rounds
  await page.getByLabel('시뮬레이션 라운드').fill('10')
  await helpers.clickNext()
  
  // Step 5: Enter investments
  await helpers.fillInvestmentAmount(1, '1000000')
  await helpers.fillInvestmentAmount(2, '2000000')
  await page.getByRole('button', { name: '생성' }).click()
  
  // Verify return to dashboard
  await expect(page.getByTestId('main-page')).toBeVisible()
  await expect(page.locator('text=시뮬레이션이 생성되었습니다')).toBeVisible()
})
```

### 4.3 E2E-ERR-001: Network Error Recovery

```typescript
test('shows a friendly message when OTP send fails', async ({ page }) => {
  const helpers = new TestHelpers(page)
  await APIHelpers.mockNetworkError(page, '/api/otp/send')
  
  await page.goto('/')
  await helpers.fillWhitelistForm(
    TEST_USERS.WHITELISTED.name,
    TEST_USERS.WHITELISTED.phone
  )
  
  // Verify error message appears
  await expect(page.getByRole('alert')).toContainText(
    '서비스에 일시적인 오류가 발생했습니다'
  )
  
  // Verify submit button remains enabled for retry
  await expect(page.getByTestId('submit-whitelist')).toBeEnabled()
  
  // Verify form state preserved
  await expect(page.getByLabel('이름')).toHaveValue(TEST_USERS.WHITELISTED.name)
})
```

### 4.4 E2E-MOB-001: Mobile Responsive Layout

```typescript
test('onboarding pages render at mobile width', async ({ page }) => {
  const helpers = new TestHelpers(page)
  await page.setViewportSize(VIEWPORT_SIZES.MOBILE)
  await APIHelpers.mockOTPSuccess(page)
  
  await page.goto('/')
  
  // Verify mobile layout elements visible
  await expect(page.locator('h5').filter({ hasText: '환영합니다!' })).toBeVisible()
  
  // Fill form on mobile
  await helpers.fillWhitelistForm(
    TEST_USERS.WHITELISTED.name,
    TEST_USERS.WHITELISTED.phone
  )
  
  // Verify OTP page renders correctly
  await expect(page.getByTestId('otp-form')).toBeVisible()
  
  // Verify touch targets are appropriately sized (minimum 44px)
  const submitButton = page.getByRole('button', { name: '인증하기' })
  const boundingBox = await submitButton.boundingBox()
  expect(boundingBox?.height).toBeGreaterThanOrEqual(44)
})
```

### 4.5 E2E-PERS-001: Session Persistence Across Reload

```typescript
test('keeps the user signed in after a reload', async ({ page }) => {
  await loginTestUser(page)
  await APIHelpers.mockSimulationAPI(page)
  
  await page.goto('/')
  await expect(page.getByTestId('main-page')).toBeVisible()
  
  // Reload the page
  await page.reload()
  
  // Verify still on main page (not redirected to login)
  await expect(page.getByTestId('main-page')).toBeVisible()
  await expect(page.getByTestId('create-simulation')).toBeVisible()
  
  // Verify session token still in storage
  const token = await page.evaluate(() => {
    return window.localStorage.getItem('supabase.auth.token')
  })
  expect(token).toBeTruthy()
})
```

### 4.6 E2E-PWA-001: Web Manifest Availability

```typescript
test('serves the web manifest', async ({ page, baseURL }) => {
  const response = await page.request.get(`${baseURL}/manifest.webmanifest`)
  expect(response.ok()).toBeTruthy()
  
  const manifest = await response.json()
  
  // Verify required manifest fields
  expect(manifest.name).toBe('Light of Life Club Simulation')
  expect(manifest.short_name).toBeDefined()
  expect(manifest.start_url).toBeDefined()
  expect(manifest.display).toBe('standalone')
  
  // Verify icons include required sizes
  expect(manifest.icons).toBeDefined()
  const iconSizes = manifest.icons.map((icon: any) => icon.sizes)
  expect(iconSizes).toContain('192x192')
  expect(iconSizes).toContain('512x512')
  
  // Verify theme color
  expect(manifest.theme_color).toBe('#1976d2')
})
```

--------------------------------------------------------------------------------
## 5. Test Execution
--------------------------------------------------------------------------------

### 5.1 Local Development

```bash
# Install Playwright browsers (first time only)
cd src/frontend
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run with UI for debugging
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Run specific browser
npx playwright test --project=chromium

# Run specific test file
npx playwright test e2e/specs/onboarding.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed
```

### 5.2 CI/CD Environment

```bash
# CI mode (retries enabled, parallel disabled)
CI=1 npm run test:e2e

# Generate HTML report
npm run test:e2e:report
```

### 5.3 Test Server Requirements

E2E tests require the frontend build to be served:

```bash
# Build and preview (required before E2E tests)
npm run build
npm run preview  # Starts server on port 4173
```

The `playwright.config.ts` automatically starts the preview server via `webServer` configuration, but manual start is useful for debugging.

--------------------------------------------------------------------------------
## 6. Coverage Requirements
--------------------------------------------------------------------------------

### 6.1 Critical Path Coverage (Must Pass)

**Onboarding (100%)**:
- ✅ Whitelist verification (happy + error paths)
- ✅ OTP flow (send, verify, resend, rate limiting)
- ✅ Privacy consent acceptance
- ✅ OAuth login (Google, Kakao)

**Simulation Core (100%)**:
- ✅ Create simulation through wizard
- ✅ Run simulation and view results
- ✅ Edit existing simulation
- ✅ Delete simulation

**Session Management (100%)**:
- ✅ Login persistence across reload
- ✅ Logout clears tokens
- ✅ Protected route access control

### 6.2 Browser Coverage Matrix

| Feature | Chrome | Firefox | Safari | Edge | Mobile Chrome | Mobile Safari |
|---------|--------|---------|--------|------|---------------|---------------|
| Onboarding | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Simulation CRUD | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PWA Install | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Persistence | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Error Handling | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### 6.3 Viewport Coverage

- **Mobile**: 375x667 (iPhone SE)
- **Tablet**: 768x1024 (iPad)
- **Desktop**: 1200x800 (Standard laptop)
- **Large Desktop**: 1920x1080 (Full HD)

### 6.4 Test Count Summary

| Category | Test Count | Priority |
|----------|------------|----------|
| Onboarding | 10 | Critical |
| Simulation Management | 15 | Critical |
| Error Handling | 7 | High |
| Mobile/Responsive | 8 | High |
| PWA Features | 6 | Medium |
| Session Persistence | 6 | High |
| Browser Compatibility | 7 | High |
| Navigation/Routing | 6 | Medium |

**Total E2E Test Cases: 65**

--------------------------------------------------------------------------------
## 7. Test Summary
--------------------------------------------------------------------------------

### 7.1 Current Implementation Status

**Implemented (as of current commit):**
- ✅ Onboarding flow tests (3 cases in `onboarding.spec.ts`)
- ✅ Basic simulation tests (2 cases in `simulation-flow.spec.ts`)
- ✅ Error handling basics (1 case in `error-handling.spec.ts`)
- ✅ Mobile responsive tests (2 cases in `mobile.spec.ts`)
- ✅ PWA manifest test (1 case in `pwa.spec.ts`)
- ✅ Session persistence tests (2 cases in `persistence.spec.ts`)

**Total Implemented: ~11 test cases**

**Remaining to Implement:**
- ⏸️ Additional simulation CRUD scenarios (13 cases)
- ⏸️ Comprehensive error recovery paths (6 cases)
- ⏸️ Extended mobile interactions (6 cases)
- ⏸️ PWA service worker and offline behavior (5 cases)
- ⏸️ State persistence edge cases (4 cases)
- ⏸️ Cross-browser specific tests (7 cases)
- ⏸️ Navigation and routing scenarios (6 cases)

**Total Remaining: ~54 test cases**

### 7.2 Test Execution Time

**Current benchmarks (local development, single browser):**
- Onboarding suite: ~15 seconds
- Simulation suite: ~10 seconds
- Error handling: ~5 seconds
- Mobile tests: ~8 seconds
- PWA tests: ~3 seconds
- Persistence tests: ~7 seconds

**Total: ~48 seconds for current test suite**

**Projected full suite time:**
- Single browser: ~3-4 minutes
- All browsers (6 projects): ~15-20 minutes
- CI with retries: ~25-30 minutes

### 7.3 Known Limitations

1. **Authentication Mocking**: E2E tests mock Supabase OAuth instead of testing real OAuth flow
2. **API Mocking**: Backend API calls are mocked at network layer, not testing real backend
3. **SMS Verification**: OTP SMS sending is mocked, not testing actual SMS provider
4. **Offline Mode**: Full offline functionality not yet implemented in tests
5. **Performance**: E2E tests don't measure performance metrics (LCP, FID, CLS)
6. **Accessibility**: A11y testing not included in E2E suite (covered separately)

--------------------------------------------------------------------------------
## 8. E2E Testing Principles
--------------------------------------------------------------------------------

1. **Real Browser Automation**: Test through actual browser, not jsdom or mocks
2. **User-Centric**: Focus on user interactions, not implementation details
3. **External Service Mocking**: Mock at network boundary (API, Auth) for reliability
4. **Cross-Browser Testing**: Validate on all target browsers and devices
5. **Responsive Design**: Test multiple viewport sizes and orientations
6. **State Management**: Verify persistence across navigation and reloads
7. **Error Recovery**: Test error paths and user recovery mechanisms
8. **Retry Strategy**: Use retries in CI for flaky network/timing issues
9. **Visual Regression**: Capture screenshots/videos on failure for debugging
10. **Isolation**: Each test should be independent and not rely on others

### 8.1 Best Practices

**DO:**
- Use data-testid attributes for stable selectors
- Mock external dependencies at network layer
- Test complete user journeys end-to-end
- Use proper wait strategies (waitForSelector, expect with timeout)
- Clean up state between tests (localStorage, cookies)
- Take screenshots/videos on failure
- Test on multiple browsers and devices

**DON'T:**
- Rely on implementation details (CSS classes, internal IDs)
- Test unit logic in E2E tests
- Make real external API calls
- Use fixed waits (sleep) instead of smart waiting
- Share state between tests
- Test every edge case (covered in unit tests)
- Ignore mobile/responsive behavior

--------------------------------------------------------------------------------
## 9. Maintenance Notes
--------------------------------------------------------------------------------

* **Update test data** when API contracts change
* **Review selectors** if UI component library changes
* **Adjust timeouts** based on CI environment performance
* **Expand browser matrix** if new target browsers added
* **Document workarounds** for browser-specific issues
* **Monitor flaky tests** and add retry/stabilization logic
* **Keep mocks synchronized** with actual API responses
* **Update viewport sizes** as new device targets emerge
* **Maintain test isolation** to prevent cascading failures
* **Review quarterly** for completeness against new features

### 9.1 Common Issues & Solutions

**Issue**: Flaky tests due to timing
**Solution**: Use proper Playwright wait strategies (waitForSelector, waitForLoadState)

**Issue**: Tests fail in CI but pass locally
**Solution**: Check CI timeout values, enable retries, review CI-specific mocking

**Issue**: Mobile tests fail unexpectedly
**Solution**: Verify viewport size is set before navigation, check touch event handlers

**Issue**: Storage not clearing between tests
**Solution**: Use `beforeEach` hooks to clear localStorage/sessionStorage explicitly

**Issue**: Mock routes not intercepting requests
**Solution**: Set up routes before navigation, use `await page.route()` properly

--------------------------------------------------------------------------------
## 10. Future Enhancements
--------------------------------------------------------------------------------

### 10.1 Planned Additions

1. **Admin Flow Testing**: Test admin notice/policy management workflows
2. **Offline Scenario Testing**: Comprehensive offline mode and queue management
3. **Performance Testing**: Integrate Lighthouse for Core Web Vitals
4. **Accessibility Testing**: Integrate axe-core for automated a11y checks
5. **Visual Regression**: Add Percy or similar for visual diff testing
6. **Load Testing**: Add basic load/stress testing scenarios
7. **Multi-Tab Testing**: Test behavior across multiple browser tabs
8. **Internationalization**: Test Korean locale and future i18n scenarios

### 10.2 Tooling Improvements

1. **Custom Fixtures**: Create reusable test fixtures for common scenarios
2. **Test Data Builders**: Implement builder pattern for complex test data
3. **Page Object Model**: Consider POM pattern for better maintainability
4. **CI Optimization**: Implement test sharding for faster CI runs
5. **Failure Analysis**: Automated categorization of test failures
6. **Coverage Reports**: Integrate E2E coverage with overall coverage metrics

--------------------------------------------------------------------------------

**Document Version**: 1.0  
**Last Updated**: 2025-01-15  
**Test Implementation Status**: ~17% complete (11/65 test cases)  
**Target Coverage**: 65+ E2E test cases across 8 categories  
**Browser Support**: Chrome, Firefox, Safari, Edge + Mobile variants
