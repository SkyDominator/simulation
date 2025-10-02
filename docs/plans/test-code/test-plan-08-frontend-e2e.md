# Test Plan – Frontend E2E Tests (Concrete v1.0)

This plan guides **re-implementation from scratch** of E2E tests for the frontend application. Tests validate real browser interactions with actual frontend components and pages, focusing on user journeys through the implemented UI.

**Target**: Real frontend codebase in `src/frontend/src/` - pages, components, and actual user flows.

**Note**: Existing E2E test files are invalid (over-mocked, not testing real codebase). This plan focuses on the **actual frontend implementation** to guide proper E2E test creation.

**Testability Note**: As of commit 080669f, frontend supports proper E2E testing with:
- **API Dependency Injection**: Key pages accept `apiService` prop (PlanEditor, ConsentPage, AdminPolicyPage, MainPage, NoticeBoardModal)
- **Data-testid Attributes**: Added to critical components (PlanEditor stepper/steps/buttons, SimulationTable rows/actions)
- **Network-Layer Mocking**: Tests can mock at correct layer (Playwright route interception) instead of component level

--------------------------------------------------------------------------------
## 1. Scope & Principles
--------------------------------------------------------------------------------

**In Scope:**
* **Real Frontend Pages**: Test actual pages in `src/frontend/src/pages/`
  - WhitelistCheckPage, OtpVerificationPage, ConsentPage, LoginPage
  - MainPage (simulation dashboard), PlanEditor, ResultsPage
  - AdminPolicyPage, OfflineResults
* **Actual Components**: Test real components in `src/frontend/src/components/`
  - SimulationTable, NoticeBoardModal, MemoModal, DeleteConfirmModal
  - Shell, LandscapeEnforcer, ContactModal, SummaryReport
* **Real User Flows**: Test AppController orchestration of page transitions
* **State Management**: Verify localStorage persistence (ui.page, ui.editingPlan, etc.)
* **Authentication Flow**: Test useAuth() hook integration with Supabase
* **API Integration**: Test actual API calls via services layer (mock at network boundary)
* **Mobile/PWA**: Test responsive MUI breakpoints and landscape enforcement
* **Browser Compatibility**: Chrome, Firefox, Safari, Edge, Mobile browsers

**Out of Scope:**
* Real backend API calls (mock at network layer using Playwright route interception)
* Real Supabase OAuth (mock authentication state)
* Real SMS sending (mock OTP endpoints)
* Performance/load testing
* Accessibility testing (separate test suite)
* Unit logic testing (covered in unit tests)

**Test Philosophy:**
* **Test Real UI**: Use actual data-testid, Material-UI selectors, real DOM structure
* **Follow User Paths**: Replicate exact user journeys through AppController page states
* **Mock at Boundary**: Intercept network requests, not components or hooks
* **Verify Real State**: Check actual localStorage keys, session state from useAuth()
* **Test Responsive Behavior**: Verify MUI breakpoints (xs, md) and mobile layouts
* **Validate Real Components**: Test actual Material-UI components, not mocked versions
* **Leverage Testability**: Use data-testid attributes and dependency injection for stable tests

--------------------------------------------------------------------------------
## 2. Test Category Matrix
--------------------------------------------------------------------------------

### 2.1 Pre-Auth User Journey (CAT-PREAUTH)
* **Why**: Critical onboarding flow - must work perfectly for new users
* **Frontend Target**: WhitelistCheckPage → OtpVerificationPage → ConsentPage → LoginPage
* **AppController States**: page = "whitelist" | "consent" | "login"
* **Real Components Tested**:
  - WhitelistCheckPage: Name/phone input, validation, OTP send button
  - OtpVerificationPage (embedded in WhitelistCheckPage): 6-digit input, timer, resend, verify button
  - ConsentPage: Policy display, checkbox, accept/decline buttons (uses injected apiService for getPrivacyPolicy/recordConsent)
  - LoginPage: Google/Kakao OAuth buttons, back button
* **API Integration**: ConsentPage uses injected apiService for policy retrieval and consent recording (mockable)
* **State Persistence**: None (userHash in AppController state only, not localStorage)
* **Cases**:
    - E2E-PREAUTH-001: Whitelisted user enters name/phone, gets OTP form
    - E2E-PREAUTH-002: Valid OTP code proceeds to consent page
    - E2E-PREAUTH-003: Invalid OTP shows error, stays on OTP form
    - E2E-PREAUTH-004: OTP timer counts down and displays remaining time
    - E2E-PREAUTH-005: Resend button triggers new OTP send (rate limited)
    - E2E-PREAUTH-006: Non-whitelisted user sees error alert
    - E2E-PREAUTH-007: Consent page shows privacy policy content (verify network call to /api/privacy-policy)
    - E2E-PREAUTH-008: Consent checkbox must be checked to enable accept button
    - E2E-PREAUTH-009: Accept consent proceeds to login page (verify network call to /api/consents)
    - E2E-PREAUTH-010: Decline consent returns to whitelist page
    - E2E-PREAUTH-011: Back button from login returns to whitelist (whitelist remounts)
    - E2E-PREAUTH-012: Phone input auto-formats to 010-XXXX-XXXX pattern

### 2.2 Authentication & Session (CAT-AUTH)
* **Why**: Authentication state drives entire application behavior
* **Frontend Target**: useAuth() hook, Supabase client, localStorage session
* **AppController Integration**: user state determines page visibility
* **Real Implementation**: Context/AuthContext.tsx, supabaseClient.ts
* **Cases**:
    - E2E-AUTH-001: Login button triggers Supabase OAuth (Google)
    - E2E-AUTH-002: Login button triggers Supabase OAuth (Kakao)
    - E2E-AUTH-003: Successful auth sets user state in useAuth()
    - E2E-AUTH-004: Authenticated user sees MainPage
    - E2E-AUTH-005: Page reload preserves auth session (Supabase auto-refresh)
    - E2E-AUTH-006: Logout button clears session and returns to whitelist
    - E2E-AUTH-007: Protected pages redirect to whitelist if not authenticated
    - E2E-AUTH-008: Direct URL navigation to /main requires authentication

### 2.3 Main Dashboard (CAT-MAIN)
* **Why**: Central hub for authenticated users - must show simulations correctly
* **Frontend Target**: MainPage.tsx, SimulationTable component
* **AppController State**: page = "main", editingPlan = null
* **Real Components**: 
  - MainPage: Header actions, table, empty state
  - SimulationTable: Rows (`data-testid="simulation-row-{idx}"`), checkboxes (`data-testid="simulation-checkbox-{id}"`), sort headers, action buttons
  - Action Buttons: Edit (`data-testid="edit-{id}"`), Run (`data-testid="run-{id}"`), Delete (`data-testid="delete-{id}"`)
  - Memo Chip: (`data-testid="memo-chip-{id}"`)
  - NoticeBoardModal: Notice display (accepts apiService for mocking)
  - ContactModal: Help information
* **API Integration**: MainPage and NoticeBoardModal use injected apiService (mockable via dependency injection)
* **Cases**:
    - E2E-MAIN-001: MainPage displays user's simulation list from GET /api/simulations
    - E2E-MAIN-002: Empty state shows welcome message and create button
    - E2E-MAIN-003: Create simulation button navigates to plan-editor page
    - E2E-MAIN-004: Table displays columns: plan, memo, dates, actions
    - E2E-MAIN-005: Click simulation row selects it (verify with data-testid="simulation-checkbox-{id}")
    - E2E-MAIN-006: Multi-select enables batch delete button
    - E2E-MAIN-007: Batch delete shows confirmation modal, deletes selected
    - E2E-MAIN-008: Sort header click changes sort order (ascending/descending)
    - E2E-MAIN-009: Edit icon navigates to plan-editor with simulation data (verify with data-testid="edit-{id}")
    - E2E-MAIN-010: Run icon executes simulation, shows loading indicator (verify with data-testid="run-{id}")
    - E2E-MAIN-011: Results icon navigates to results page
    - E2E-MAIN-012: Memo icon opens MemoModal, allows editing (verify with data-testid="memo-chip-{id}")
    - E2E-MAIN-013: Delete icon shows DeleteConfirmModal, deletes on confirm (verify with data-testid="delete-{id}")
    - E2E-MAIN-014: Notice board icon opens NoticeBoardModal
    - E2E-MAIN-015: Help icon opens ContactModal
    - E2E-MAIN-016: Logout button shows confirmation, logs out on confirm

### 2.4 Plan Editor Wizard (CAT-EDITOR)
* **Why**: Complex multi-step form - must validate and guide user correctly
* **Frontend Target**: PlanEditor/index.tsx, StepComponents, validation modals
* **AppController State**: page = "plan-editor", editingPlan = Plan object
* **Real Components**:
  - PlanEditor: Stepper (`data-testid="plan-stepper"`), step content (`data-testid="step-content-{1-5}"`), navigation buttons
  - StepComponents: PlanTypeStep, StartingRoundStep, CurrentRoundStep, SimulationRoundsStep, InvestmentScheduleStep (each step has `data-testid="step-{1-5}"`)
  - Navigation Buttons: Back (`data-testid="back-button"`), Next (`data-testid="next-button"`), Save (`data-testid="save-button"`)
  - Validation Modals: StartingRoundValidationModal, CurrentRoundValidationModal, SimulationRoundValidationModal, DefaultValueWarningModal
  - ConfirmationModal: Final review before creation
* **API Integration**: Uses injected apiService for createSimulation/updateSimulation (mockable via dependency injection)
* **State Persistence**: editingPlan saved to localStorage as ui.editingPlan
* **Cases**:
    - E2E-EDITOR-001: Step 1 shows plan type selector (A,B,C,D,E,F,G,K,P,R)
    - E2E-EDITOR-002: Select plan type enables Next button
    - E2E-EDITOR-003: Step 2 shows starting round input (1-19)
    - E2E-EDITOR-004: Invalid starting round shows StartingRoundValidationModal
    - E2E-EDITOR-005: Step 3 shows current round input (must be >= starting)
    - E2E-EDITOR-006: Current round < starting round shows CurrentRoundValidationModal
    - E2E-EDITOR-007: Step 4 shows simulation rounds input (plan-specific range)
    - E2E-EDITOR-008: Invalid simulation rounds shows SimulationRoundValidationModal
    - E2E-EDITOR-009: Step 5 shows investment schedule table (round by round)
    - E2E-EDITOR-010: Investment fields accept numeric input only
    - E2E-EDITOR-011: Default investment values show DefaultValueWarningModal
    - E2E-EDITOR-012: Back button navigates to previous step (verify with data-testid="back-button")
    - E2E-EDITOR-013: Cancel button returns to MainPage (shows confirmation if changes)
    - E2E-EDITOR-014: Create button shows ConfirmationModal with summary
    - E2E-EDITOR-015: Confirm creation POSTs to /api/simulation/create (verify network request)
    - E2E-EDITOR-016: Successful creation returns to MainPage, adds to list
    - E2E-EDITOR-017: Edit mode loads existing simulation data into form
    - E2E-EDITOR-018: Edit mode shows Update button instead of Create
    - E2E-EDITOR-019: Browser refresh preserves editingPlan from localStorage
    - E2E-EDITOR-020: Plan type change resets subsequent steps

### 2.5 Results Display (CAT-RESULTS)
* **Why**: Users must see simulation outcomes clearly
* **Frontend Target**: ResultsPage.tsx
* **AppController State**: page = "results", simulationResult = SimulationRunResponse
* **Real Component**: ResultsPage with tables, charts, summary
* **State Persistence**: simulationResult saved to localStorage as ui.simulationResult
* **Cases**:
    - E2E-RESULTS-001: Results page displays round-by-round history table
    - E2E-RESULTS-002: Table columns: round, investor count, payment, revenue, profit
    - E2E-RESULTS-003: Summary section shows final metrics
    - E2E-RESULTS-004: Back button returns to MainPage
    - E2E-RESULTS-005: Export button downloads results as file
    - E2E-RESULTS-006: Browser refresh preserves results from localStorage
    - E2E-RESULTS-007: Results data matches simulation run response format

### 2.6 Error Handling (CAT-ERROR)
* **Why**: Graceful error handling critical for user experience
* **Frontend Target**: All pages, API service layer error handling
* **Real Implementation**: services/api.ts error handling, Alert components
* **Cases**:
    - E2E-ERR-001: Network error on OTP send shows user-friendly alert
    - E2E-ERR-002: Network error preserves form state, allows retry
    - E2E-ERR-003: Validation error shows inline error text (MUI TextField error prop)
    - E2E-ERR-004: API 401 error redirects to login page
    - E2E-ERR-005: API 403 error shows permission denied alert
    - E2E-ERR-006: API 404 error shows resource not found message
    - E2E-ERR-007: API 500 error shows generic error message
    - E2E-ERR-008: Multiple errors don't break UI (error boundary)
    - E2E-ERR-009: Session expiry during operation redirects to login
    - E2E-ERR-010: Browser back button during error state works correctly

### 2.7 Responsive & Mobile (CAT-MOBILE)
* **Why**: 60% of users on mobile, landscape orientation preferred
* **Frontend Target**: MUI breakpoints (xs, md), LandscapeEnforcer component
* **Real Implementation**: theme.tsx breakpoints, responsive MUI props

**Viewport Configuration Note:** Mobile Playwright projects run with landscape viewports (Mobile Chrome: 851×393, Mobile Safari: 844×390) to prevent the orientation overlay from blocking automated flows. Portrait enforcement is exercised separately in `e2e/specs/landscape-enforcer.spec.ts`.
* **Cases**:
    - E2E-MOB-001: Whitelist page renders correctly at mobile width (375px)
    - E2E-MOB-002: OTP page renders correctly at mobile width
    - E2E-MOB-003: MainPage table scrolls horizontally on narrow screens
    - E2E-MOB-004: Plan editor steps render in single column on mobile
    - E2E-MOB-005: Buttons meet minimum touch target size (44px)
    - E2E-MOB-006: Modal dialogs are full-screen on mobile
  - E2E-MOB-007: LandscapeEnforcer shows overlay in portrait mode (coverage: `e2e/specs/landscape-enforcer.spec.ts` – validates portrait enforcement and E2E bypass behaviour while keeping other flows in landscape)
    - E2E-MOB-008: MUI breakpoint transitions work (xs → md)
    - E2E-MOB-009: Header actions collapse to menu on mobile
    - E2E-MOB-010: Table pagination works on mobile

### 2.8 State Persistence (CAT-PERSIST)
* **Why**: Users expect continuity across sessions
* **Frontend Target**: localStorage keys in AppController, persist utility
* **Real Implementation**: utils/persist.ts (getJSON, setJSON)
* **localStorage Keys**: ui.page, ui.editingPlan, ui.noticeOpen, ui.simulationResult
* **Cases**:
    - E2E-PERS-001: Page refresh preserves ui.page state
    - E2E-PERS-002: Plan editor draft persists as ui.editingPlan
    - E2E-PERS-003: Browser close and reopen restores app state
    - E2E-PERS-004: Notice modal state persists as ui.noticeOpen
    - E2E-PERS-005: Simulation results persist as ui.simulationResult
    - E2E-PERS-006: Logout clears ui.* keys from localStorage
    - E2E-PERS-007: Session expiry clears sensitive localStorage data
    - E2E-PERS-008: Invalid localStorage data doesn't break app (graceful fallback)

### 2.9 Admin Features (CAT-ADMIN)
* **Why**: Admin users need policy management interface
* **Frontend Target**: AdminPolicyPage.tsx
* **AppController State**: page = "admin-policy"
* **Real Component**: AdminPolicyPage with policy editor (uses injected apiService for all policy operations)
* **API Integration**: AdminPolicyPage uses injected apiService for createPrivacyPolicy, updatePrivacyPolicy, publishPrivacyPolicy, getPrivacyPolicyAdmin (mockable)
* **Cases**:
    - E2E-ADMIN-001: Admin user can navigate to policy page
    - E2E-ADMIN-002: Non-admin user cannot access policy page
    - E2E-ADMIN-003: Policy list displays all versions
    - E2E-ADMIN-004: Create policy button opens editor
    - E2E-ADMIN-005: Policy editor accepts markdown content
    - E2E-ADMIN-006: Save button POSTs to /api/admin/privacy-policies (verify network request)
    - E2E-ADMIN-007: Publish button makes policy active (verify network request to publish endpoint)
    - E2E-ADMIN-008: Delete button removes draft policy

### 2.10 PWA Features (CAT-PWA)
* **Why**: Application must be installable and work offline-aware
* **Frontend Target**: manifest.webmanifest, service worker, vite-plugin-pwa
* **Cases**:
    - E2E-PWA-001: Web manifest serves with correct content
    - E2E-PWA-002: Manifest includes required icons (192px, 512x512)
    - E2E-PWA-003: Manifest display mode is "standalone"
    - E2E-PWA-004: Manifest orientation preference is "landscape"
    - E2E-PWA-005: Service worker registers successfully
    - E2E-PWA-006: Service worker caches static assets
    - E2E-PWA-007: NetworkFirst strategy for /api/notices
    - E2E-PWA-008: StaleWhileRevalidate for images

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

### 6.4 Test Count Summary (Based on Real Frontend)

| Category | Test Cases | Priority | Source |
|----------|------------|----------|--------|
| Pre-Auth Journey | 12 | Critical | WhitelistCheckPage, OtpVerificationPage, ConsentPage, LoginPage |
| Authentication & Session | 8 | Critical | useAuth hook, Supabase client, AppController |
| Main Dashboard | 16 | Critical | MainPage, SimulationTable, modals |
| Plan Editor Wizard | 20 | Critical | PlanEditor, StepComponents, validation modals |
| Results Display | 7 | High | ResultsPage, result persistence |
| Error Handling | 10 | High | API error handling, UI recovery |
| Responsive & Mobile | 10 | High | MUI breakpoints, LandscapeEnforcer |
| State Persistence | 8 | High | localStorage via persist utils |
| Admin Features | 8 | Medium | AdminPolicyPage |
| PWA Features | 8 | Medium | Manifest, service worker |

**Total E2E Test Cases: 107** (based on actual frontend structure)

**Note**: This is a revision from scratch. Existing E2E test files are invalid (over-mocked).

--------------------------------------------------------------------------------
## 7. Test Summary
--------------------------------------------------------------------------------

### 7.1 Current Implementation Status

**⚠️ IMPORTANT**: Existing E2E tests in `src/frontend/e2e/specs/` are **NOT VALID**:
- Over-mocked: Don't test real frontend components
- Incorrect selectors: Don't match actual data-testid or component structure
- Wrong approach: Mock components instead of mocking at network layer

**This plan guides re-implementation from scratch** based on:
- **Real frontend pages** in `src/frontend/src/pages/`
- **Real components** in `src/frontend/src/components/`
- **Real AppController** orchestration and state management
- **Real API calls** via `services/api.ts` (mocked at network boundary)
- **Real auth flow** via `useAuth()` hook

**To Implement: 107 test cases** across 10 categories

### 7.2 Implementation Approach

**Step 1: Setup Infrastructure**
- Create real selectors based on actual frontend components
- Implement API mocking at Playwright route level
- Create helpers that interact with real MUI components

**Step 2: Implement Critical Paths (Priority Order)**
1. Pre-Auth Journey (12 cases) - test real onboarding flow
2. Authentication & Session (8 cases) - test real useAuth() integration
3. Main Dashboard (16 cases) - test real MainPage and SimulationTable
4. Plan Editor Wizard (20 cases) - test real PlanEditor multi-step form
5. Results Display (7 cases) - test real ResultsPage

**Step 3: Implement Support Features**
6. Error Handling (10 cases) - test real error boundaries and alerts
7. Responsive & Mobile (10 cases) - test real MUI breakpoints
8. State Persistence (8 cases) - test real localStorage keys
9. Admin Features (8 cases) - test real AdminPolicyPage
10. PWA Features (8 cases) - test real manifest and service worker

### 7.3 Key Differences from Invalid Existing Tests

| Aspect | ❌ Invalid Existing Tests | ✅ This Plan (Real Frontend) |
|--------|--------------------------|------------------------------|
| **Target** | Mocked components | Real pages in src/pages/ |
| **Selectors** | Generic text matchers | Actual data-testid from components |
| **State** | Mocked hooks | Real useAuth(), real localStorage |
| **API** | Component-level mocks | Network-layer route interception |
| **Components** | Test helpers | Real Material-UI components |
| **Flow** | Linear test scripts | Real AppController page transitions |

### 7.4 Validation Checklist

Before accepting any E2E test implementation, verify:

- [ ] Uses actual data-testid from frontend components
- [ ] Tests real page transitions via AppController
- [ ] Mocks only at network layer (Playwright route interception)
- [ ] Verifies real localStorage keys (ui.page, ui.editingPlan, etc.)
- [ ] Tests real MUI components (Stepper, TextField, Button, etc.)
- [ ] Validates real API service calls
- [ ] Checks real auth state from useAuth() hook
- [ ] Tests real responsive behavior (MUI breakpoints xs, md)



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

--------------------------------------------------------------------------------

**⚠️ CRITICAL NOTE ON EXISTING E2E TESTS**

The existing E2E test files in `src/frontend/e2e/specs/` should be **discarded and rewritten from scratch**.

**Why they are invalid:**
1. **Over-mocked**: Tests mock components/hooks instead of testing real UI
2. **Wrong selectors**: Don't use actual data-testid from real components
3. **Incorrect state**: Mock useAuth() instead of testing real Supabase integration
4. **Missing real flows**: Don't test AppController page transitions
5. **Component-level mocks**: Mock at wrong layer (should be network only)

**This plan is based on:**
- ✅ Real frontend structure in `src/frontend/src/`
- ✅ Actual pages: WhitelistCheckPage, MainPage, PlanEditor, etc.
- ✅ Actual components: SimulationTable, NoticeBoardModal, MemoModal, etc.
- ✅ Actual state management: AppController, useAuth(), localStorage
- ✅ Actual API calls: services/api.ts (mock at network boundary only)

**Document Version**: 2.0 (Revised for real frontend testing)
**Last Updated**: 2025-01-15
**Status**: Ready for implementation from scratch
**Target**: 107 test cases based on actual frontend codebase
