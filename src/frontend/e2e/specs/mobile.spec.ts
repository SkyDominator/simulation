import { test, expect } from '@playwright/test'
import { TestHelpers, APIHelpers } from '../utils/test-helpers'
import { loginTestUser, completeOnboardingFlow } from '../utils/auth-helpers'
import { TEST_USERS, VIEWPORT_SIZES } from '../fixtures/test-data'

/**
 * CAT-MOBILE: Mobile & Responsive Behavior Tests
 * Tests mobile-first PWA requirements and responsive design
 */

test.describe('Mobile & Responsive Behavior', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    // Set mobile viewport for all tests
    await page.setViewportSize(VIEWPORT_SIZES.MOBILE)
    await APIHelpers.mockOTPSuccess(page)
    await APIHelpers.mockSimulationAPI(page)
  })

  test('E2E-021: Complete onboarding flow on mobile', async ({ page }) => {
    await page.goto('/')
    
    // Verify mobile layout is applied
    await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible()
    await expect(page.locator('[data-testid="desktop-sidebar"]')).not.toBeVisible()
    
    // Step 1: Whitelist form should be mobile-optimized
    await expect(page.locator('h1')).toContainText('가입 허용 확인')
    
    // Verify form elements are properly sized for mobile
    const nameInput = page.locator('[data-testid="name-input"]')
    const phoneInput = page.locator('[data-testid="phone-input"]')
    const submitButton = page.locator('[data-testid="submit-whitelist"]')
    
    // Check minimum touch target size (44px)
    const nameBox = await nameInput.boundingBox()
    const phoneBox = await phoneInput.boundingBox()
    const buttonBox = await submitButton.boundingBox()
    
    expect(nameBox?.height).toBeGreaterThan(44)
    expect(phoneBox?.height).toBeGreaterThan(44)
    expect(buttonBox?.height).toBeGreaterThan(44)
    
    // Verify input width uses full container
    expect(nameBox?.width).toBeGreaterThan(300)
    expect(phoneBox?.width).toBeGreaterThan(300)
    
    // Fill form
    await helpers.fillWhitelistForm(TEST_USERS.WHITELISTED.name, TEST_USERS.WHITELISTED.phone)
    
    // Step 2: OTP input should be mobile-friendly
    await expect(page.locator('h1')).toContainText('인증번호 입력')
    
    // OTP input should have numeric keyboard on mobile
    const otpInput = page.locator('[data-testid="otp-input"]')
    await expect(otpInput).toHaveAttribute('inputmode', 'numeric')
    await expect(otpInput).toHaveAttribute('pattern', '[0-9]*')
    
    // Large, centered OTP input
    const otpBox = await otpInput.boundingBox()
    expect(otpBox?.height).toBeGreaterThan(60)
    expect(otpBox?.width).toBeGreaterThan(200)
    
    await helpers.fillOTPForm('123456')
    
    // Step 3: Privacy consent should be scrollable on mobile
    await expect(page.locator('h1')).toContainText('개인정보 처리방침')
    
    // Verify scrollable policy content
    const policyContent = page.locator('[data-testid="policy-content"]')
    await expect(policyContent).toBeVisible()
    
    // Scroll to bottom of policy
    await policyContent.evaluate(element => {
      element.scrollTop = element.scrollHeight
    })
    
    // Consent checkbox should be visible and touch-friendly
    const consentCheckbox = page.locator('[data-testid="consent-checkbox"]')
    const checkboxBox = await consentCheckbox.boundingBox()
    expect(checkboxBox?.width).toBeGreaterThan(20)
    expect(checkboxBox?.height).toBeGreaterThan(20)
    
    await page.check('[data-testid="consent-checkbox"]')
    await page.click('[data-testid="accept-consent"]')
    
    // Step 4: Login buttons should be stacked on mobile
    await expect(page.locator('h1')).toContainText('로그인')
    
    // Verify OAuth buttons are stacked vertically
    const googleButton = page.locator('[data-testid="google-login"]')
    const kakaoButton = page.locator('[data-testid="kakao-login"]')
    
    const googleBox = await googleButton.boundingBox()
    const kakaoBox = await kakaoButton.boundingBox()
    
    // Buttons should be stacked (kakao below google)
    expect(kakaoBox?.y).toBeGreaterThan(googleBox!.y + googleBox!.height)
    
    // Complete login
    await loginTestUser(page)
    await page.click('[data-testid="google-login"]')
    
    // Should reach mobile main page
    await expect(page.locator('[data-testid="mobile-main-layout"]')).toBeVisible()
  })

  test('E2E-022: Simulation creation on mobile viewport', async ({ page }) => {
    await loginTestUser(page)
    await page.goto('/')
    
    // Main page should show mobile layout
    await expect(page.locator('[data-testid="mobile-main-layout"]')).toBeVisible()
    
    // FAB (Floating Action Button) should be visible for creating simulation
    await expect(page.locator('[data-testid="create-simulation-fab"]')).toBeVisible()
    
    // Click FAB to create simulation
    await page.click('[data-testid="create-simulation-fab"]')
    
    // Plan editor should use mobile stepper
    await expect(page.locator('[data-testid="mobile-stepper"]')).toBeVisible()
    
    // Step indicators should be compact
    const stepIndicators = page.locator('[data-testid="step-indicator"]')
    const indicatorCount = await stepIndicators.count()
    expect(indicatorCount).toBe(5) // 5 steps in plan editor
    
    // Navigate through steps on mobile
    await helpers.selectPlan('A')
    
    // Verify plan selection uses full-width dropdown
    const planSelector = page.locator('[data-testid="plan-selector"]')
    const planBox = await planSelector.boundingBox()
    expect(planBox?.width).toBeGreaterThan(300)
    
    // Next button should be prominent
    const nextButton = page.locator('[data-testid="next-button"]')
    const nextBox = await nextButton.boundingBox()
    expect(nextBox?.height).toBeGreaterThan(48)
    expect(nextBox?.width).toBeGreaterThan(120)
    
    await helpers.clickNext()
    
    // Round inputs should be mobile-optimized
    await page.fill('input[aria-label*="시작"], input[placeholder*="시작"]', '1')
    await helpers.clickNext()
    
    await page.fill('input[aria-label*="현재"], input[placeholder*="현재"]', '1')
    await helpers.clickNext()
    
    await page.fill('input[aria-label*="회차"], input[placeholder*="회차"]', '10')
    await helpers.clickNext()
    
    // Investment inputs should be stacked on mobile
    const investmentInputs = page.locator('[data-testid^="investment-round-"]')
    const firstInput = investmentInputs.first()
    const secondInput = investmentInputs.nth(1)
    
    const firstBox = await firstInput.boundingBox()
    const secondBox = await secondInput.boundingBox()
    
    // Should be vertically stacked
    if (firstBox && secondBox) {
      expect(secondBox.y).toBeGreaterThan(firstBox.y + firstBox.height)
    }
    
    // Fill investment amounts
    await helpers.fillInvestmentAmount(1, '1000000')
    await helpers.fillInvestmentAmount(2, '2000000')
    
    // Create button should be full-width on mobile
    const createButton = page.locator('[data-testid="create-simulation"]')
    const createBox = await createButton.boundingBox()
    expect(createBox?.width).toBeGreaterThan(300)
    
    await page.click('[data-testid="create-simulation"]')
    
    // Should return to mobile main layout
    await helpers.waitForNotification('시뮬레이션이 생성되었습니다')
    await expect(page.locator('[data-testid="mobile-main-layout"]')).toBeVisible()
  })

  test('E2E-023: Navigation works on touch devices', async ({ page }) => {
    await loginTestUser(page)
    await page.goto('/')
    
    // Verify bottom navigation bar on mobile
    await expect(page.locator('[data-testid="bottom-nav"]')).toBeVisible()
    
    // Test navigation items
    const navItems = ['simulations', 'notices', 'help', 'profile']
    
    for (const item of navItems) {
      const navButton = page.locator(`[data-testid="nav-${item}"]`)
      await expect(navButton).toBeVisible()
      
      // Verify touch target size
      const buttonBox = await navButton.boundingBox()
      expect(buttonBox?.width).toBeGreaterThan(44)
      expect(buttonBox?.height).toBeGreaterThan(44)
      
      // Test navigation
      await navButton.click()
      
      // Wait for navigation to complete
      await page.waitForLoadState('networkidle')
      
      // Verify appropriate page is shown
      if (item === 'simulations') {
        await expect(page.locator('[data-testid="mobile-main-layout"]')).toBeVisible()
      } else if (item === 'notices') {
        await expect(page.locator('[data-testid="notices-page"]')).toBeVisible()
      }
    }
    
    // Test swipe gestures (simulate with touch events)
    await page.touchscreen.tap(200, 300)
    await page.touchscreen.tap(150, 300)
    
    // Test pull-to-refresh gesture
    const mainContent = page.locator('[data-testid="main-content"]')
    await mainContent.evaluate(element => {
      element.scrollTop = 0
    })
    
    // Simulate pull down gesture
    await page.mouse.move(200, 100)
    await page.mouse.down()
    await page.mouse.move(200, 200)
    await page.mouse.up()
    
    // Should show refresh indicator
    await expect(page.locator('[data-testid="refresh-indicator"]')).toBeVisible()
  })

  test('E2E-024: Forms remain usable on small screens', async ({ page }) => {
    await loginTestUser(page)
    await page.goto('/')
    
    // Test very small screen (iPhone SE size)
    await page.setViewportSize({ width: 320, height: 568 })
    
    // Create simulation on very small screen
    await page.click('[data-testid="create-simulation-fab"]')
    
    // All form elements should remain accessible
    await expect(page.locator('[data-testid="mobile-stepper"]')).toBeVisible()
    
    // Plan selector should not overflow
    const planSelector = page.locator('[data-testid="plan-selector"]')
    const planBox = await planSelector.boundingBox()
    expect(planBox?.width).toBeLessThan(320) // Should fit within viewport
    
    await helpers.selectPlan('A')
    await helpers.clickNext()
    
    // Input fields should use appropriate input types
    const startingRoundInput = page.locator('input[aria-label*="시작"], input[placeholder*="시작"]')
    await expect(startingRoundInput).toHaveAttribute('type', 'number')
    await expect(startingRoundInput).toHaveAttribute('inputmode', 'numeric')
    
    await page.fill('input[aria-label*="시작"], input[placeholder*="시작"]', '1')
    await helpers.clickNext()
    await page.fill('input[aria-label*="현재"], input[placeholder*="현재"]', '1')
    await helpers.clickNext()
    await page.fill('input[aria-label*="회차"], input[placeholder*="회차"]', '10')
    await helpers.clickNext()
    
    // Investment inputs should scroll if needed
    const investmentContainer = page.locator('[data-testid="investment-container"]')
    await expect(investmentContainer).toBeVisible()
    
    // Should be able to scroll through investment rounds
    await investmentContainer.evaluate(element => {
      element.scrollTop = element.scrollHeight
    })
    
    // Fill some investments
    await helpers.fillInvestmentAmount(1, '1000000')
    
    // Keyboard should not cover input fields (viewport adjustment)
    const activeInput = page.locator('[data-testid="investment-round-1"]:focus')
    if (await activeInput.isVisible()) {
      const inputBox = await activeInput.boundingBox()
      expect(inputBox?.y).toBeLessThan(400) // Should be visible above keyboard
    }
    
    // Navigation buttons should remain accessible
    const nextButton = page.locator('[data-testid="create-simulation"]')
    await expect(nextButton).toBeVisible()
    
    const buttonBox = await nextButton.boundingBox()
    expect(buttonBox?.y + buttonBox!.height).toBeLessThan(568) // Within viewport
  })
})

test.describe('Responsive Design Cross-Viewport Tests', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    await loginTestUser(page)
    await APIHelpers.mockSimulationAPI(page)
  })

  test('Layout adapts correctly across viewport sizes', async ({ page }) => {
    const viewports = [
      { name: 'Mobile', size: VIEWPORT_SIZES.MOBILE },
      { name: 'Tablet', size: VIEWPORT_SIZES.TABLET },
      { name: 'Desktop', size: VIEWPORT_SIZES.DESKTOP },
      { name: 'Large Desktop', size: VIEWPORT_SIZES.LARGE_DESKTOP }
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport.size)
      await page.goto('/')
      
      // Test layout adaptation
      if (viewport.size.width < 768) {
        // Mobile layout
        await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible()
        await expect(page.locator('[data-testid="bottom-nav"]')).toBeVisible()
        await expect(page.locator('[data-testid="desktop-sidebar"]')).not.toBeVisible()
      } else {
        // Desktop/tablet layout
        await expect(page.locator('[data-testid="desktop-header"]')).toBeVisible()
        await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeVisible()
        await expect(page.locator('[data-testid="bottom-nav"]')).not.toBeVisible()
      }
      
      // Test simulation table responsiveness
      const simulationTable = page.locator('table, [role="table"]')
      await expect(simulationTable).toBeVisible()
      
      if (viewport.size.width < 768) {
        // Should use card layout on mobile
        await expect(page.locator('[data-testid="simulation-card"]')).toBeVisible()
      } else {
        // Should use table layout on larger screens
        await expect(page.locator('[data-testid="simulation-table-header"]')).toBeVisible()
      }
    }
  })

  test('Touch interactions work across devices', async ({ page }) => {
    // Test on tablet viewport
    await page.setViewportSize(VIEWPORT_SIZES.TABLET)
    await page.goto('/')
    
    // Test touch interactions on simulation cards
    const simulationCard = page.locator('[data-testid="simulation-card"]').first()
    await expect(simulationCard).toBeVisible()
    
    // Test tap to select
    await simulationCard.tap()
    await expect(simulationCard).toHaveClass(/selected/)
    
    // Test long press for context menu
    const box = await simulationCard.boundingBox()
    if (box) {
      const x = box.x + box.width / 2
      const y = box.y + box.height / 2
      await page.touchscreen.down(x, y)
      await page.waitForTimeout(1000)
      await page.touchscreen.up()
    }
    
    // Should show context menu on tablets
    await expect(page.locator('[data-testid="context-menu"]')).toBeVisible()
    
    // Test swipe gestures for navigation
    await page.touchscreen.tap(400, 300)
    
    // Simulate horizontal swipe
    await page.mouse.move(400, 300)
    await page.mouse.down()
    await page.mouse.move(200, 300)
    await page.mouse.up()
    
    // Should trigger appropriate action (e.g., show actions panel)
    await expect(page.locator('[data-testid="actions-panel"]')).toBeVisible()
  })

  test('Landscape orientation optimization', async ({ page }) => {
    // Test landscape mobile (common when keyboard is open)
    await page.setViewportSize({ width: 667, height: 375 })
    await page.goto('/')
    
    // Verify landscape layout adaptations
    await expect(page.locator('[data-testid="landscape-layout"]')).toBeVisible()
    
    // Header should be more compact in landscape
    const header = page.locator('[data-testid="mobile-header"]')
    const headerBox = await header.boundingBox()
    expect(headerBox?.height).toBeLessThan(60) // More compact than portrait
    
    // Test form interactions in landscape
    await page.click('[data-testid="create-simulation-fab"]')
    
    // Form should adapt to landscape
    await expect(page.locator('[data-testid="landscape-form"]')).toBeVisible()
    
    // Stepper should be more compact
    const stepper = page.locator('[data-testid="mobile-stepper"]')
    const stepperBox = await stepper.boundingBox()
    expect(stepperBox?.height).toBeLessThan(80)
  })

  test('Accessibility features work on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_SIZES.MOBILE)
    await page.goto('/')
    
    // Test screen reader navigation
    await page.keyboard.press('Tab')
    
    // Focus should be visible and properly ordered
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
    
    // Test skip links
    await page.keyboard.press('Tab')
    const skipLink = page.locator('[data-testid="skip-to-main"]')
    if (await skipLink.isVisible()) {
      await skipLink.click()
      
      // Should jump to main content
      await expect(page.locator('[data-testid="main-content"]')).toBeFocused()
    }
    
    // Test voice control labels
    const createButton = page.locator('[data-testid="create-simulation-fab"]')
    await expect(createButton).toHaveAttribute('aria-label', '새 시뮬레이션 만들기')
    
    // Test high contrast mode compatibility
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.addStyleTag({
      content: `
        @media (prefers-contrast: high) {
          * { 
            border: 1px solid black !important;
            background: white !important;
            color: black !important;
          }
        }
      `
    })
    
    // Elements should still be visible in high contrast
    await expect(createButton).toBeVisible()
    await expect(page.locator('table, [role="table"]')).toBeVisible()
  })
})