import { test, expect } from '@playwright/test'
import { TestHelpers, APIHelpers } from '../utils/test-helpers'
import { loginTestUser, completeOnboardingFlow } from '../utils/auth-helpers'
import { TEST_USERS, TEST_MESSAGES } from '../fixtures/test-data'

/**
 * CAT-ONBOARD: User Onboarding Flow Tests
 * Tests the complete user authentication flow from whitelist check through OAuth login
 */

test.describe('User Onboarding Flow', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    // Set up API mocks for each test
    await APIHelpers.mockOTPSuccess(page)
    await APIHelpers.mockAuthSuccess(page)
  })

  test('E2E-001: Complete user onboarding for whitelisted user', async ({ page }) => {
    // Navigate to app
    await page.goto('/')
    
    // Step 1: Should show whitelist check page
    await expect(page.locator('h1')).toContainText('가입 허용 확인')
    
    // Fill whitelist form with valid user
    await helpers.fillWhitelistForm(TEST_USERS.WHITELISTED.name, TEST_USERS.WHITELISTED.phone)
    
    // Step 2: Should redirect to OTP verification
    await expect(page.locator('h1')).toContainText('인증번호 입력')
    
    // Verify OTP input is visible and properly formatted
    const otpInput = page.locator('[data-testid="otp-input"]')
    await expect(otpInput).toBeVisible()
    await expect(otpInput).toHaveAttribute('maxlength', '6')
    
    // Fill OTP form
    await helpers.fillOTPForm('123456')
    
    // Step 3: Should redirect to privacy consent page
    await expect(page.locator('h1')).toContainText('개인정보 처리방침')
    
    // Accept privacy policy
    await page.check('[data-testid="consent-checkbox"]')
    await page.click('[data-testid="accept-consent"]')
    
    // Step 4: Should redirect to login page
    await expect(page.locator('h1')).toContainText('로그인')
    
    // Verify OAuth login buttons are present
    await expect(page.locator('[data-testid="google-login"]')).toBeVisible()
    await expect(page.locator('[data-testid="kakao-login"]')).toBeVisible()
    
    // Complete OAuth login (mocked)
    await page.click('[data-testid="google-login"]')
    
    // Step 5: Should reach main application page
    await expect(page.locator('[data-testid="main-page"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('h1')).toContainText('투자 시뮬레이션')
    
    // Verify user is properly authenticated
    const isAuthenticated = await page.evaluate(() => {
      return !!window.localStorage.getItem('supabase.auth.token')
    })
    expect(isAuthenticated).toBe(true)
  })

  test('E2E-002: Whitelist check blocks non-whitelisted users', async ({ page }) => {
    // Mock whitelist failure
    await APIHelpers.mockOTPFailure(page, 'whitelist')
    
    await page.goto('/')
    
    // Fill form with non-whitelisted user
    await helpers.fillWhitelistForm(TEST_USERS.NON_WHITELISTED.name, TEST_USERS.NON_WHITELISTED.phone)
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText(TEST_MESSAGES.ERROR.NOT_WHITELISTED)
    
    // Should remain on whitelist page
    await expect(page.locator('h1')).toContainText('가입 허용 확인')
    
    // Verify form is still accessible for retry
    await expect(page.locator('[data-testid="name-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="phone-input"]')).toBeVisible()
  })

  test('E2E-003: OTP verification with valid code succeeds', async ({ page }) => {
    await page.goto('/')
    
    // Complete whitelist step
    await helpers.fillWhitelistForm(TEST_USERS.WHITELISTED.name, TEST_USERS.WHITELISTED.phone)
    
    // Wait for OTP page
    await expect(page.locator('h1')).toContainText('인증번호 입력')
    
    // Verify timer is shown
    await expect(page.locator('[data-testid="otp-timer"]')).toBeVisible()
    
    // Fill valid OTP
    await helpers.fillOTPForm('123456')
    
    // Should proceed to next step
    await expect(page.locator('h1')).toContainText('개인정보 처리방침')
    
    // Verify success state
    await helpers.waitForNotification(TEST_MESSAGES.SUCCESS.OTP_VERIFIED)
  })

  test('E2E-004: OTP verification with invalid code shows error', async ({ page }) => {
    // Mock invalid OTP response
    await APIHelpers.mockOTPFailure(page, 'invalid_code')
    
    await page.goto('/')
    
    // Complete whitelist step
    await helpers.fillWhitelistForm(TEST_USERS.WHITELISTED.name, TEST_USERS.WHITELISTED.phone)
    
    // Wait for OTP page
    await expect(page.locator('h1')).toContainText('인증번호 입력')
    
    // Fill invalid OTP
    await helpers.fillOTPForm('000000')
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText(TEST_MESSAGES.ERROR.INVALID_OTP)
    
    // Should show remaining attempts
    await expect(page.locator('[data-testid="remaining-attempts"]')).toContainText('2')
    
    // Should remain on OTP page for retry
    await expect(page.locator('h1')).toContainText('인증번호 입력')
    await expect(page.locator('[data-testid="otp-input"]')).toBeVisible()
  })

  test('E2E-005: OAuth login completes successfully', async ({ page }) => {
    await page.goto('/')
    
    // Skip to login page (assuming previous steps completed)
    await completeOnboardingFlow(page)
    
    // Should be on main page after OAuth
    await expect(page.locator('[data-testid="main-page"]')).toBeVisible()
    
    // Verify user info is displayed
    await expect(page.locator('[data-testid="user-info"]')).toContainText('Test User')
    
    // Verify navigation menu is available
    await expect(page.locator('[data-testid="nav-menu"]')).toBeVisible()
    
    // Verify logout option is present
    await expect(page.locator('[data-testid="logout-button"]')).toBeVisible()
  })

  test('E2E-006: Return user bypasses whitelist/OTP steps', async ({ page }) => {
    // Pre-authenticate user
    await loginTestUser(page)
    
    // Navigate to app
    await page.goto('/')
    
    // Should skip directly to main page
    await expect(page.locator('[data-testid="main-page"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('h1')).toContainText('투자 시뮬레이션')
    
    // Should not show onboarding steps
    await expect(page.locator('[data-testid="whitelist-form"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="otp-form"]')).not.toBeVisible()
  })
})

test.describe('Onboarding Flow Error Scenarios', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
  })

  test('Network error during OTP send shows retry option', async ({ page }) => {
    // Mock network error
    await APIHelpers.mockNetworkError(page, '/api/otp/send')
    
    await page.goto('/')
    
    // Attempt to submit whitelist form
    await helpers.fillWhitelistForm(TEST_USERS.WHITELISTED.name, TEST_USERS.WHITELISTED.phone)
    
    // Should show network error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText(TEST_MESSAGES.ERROR.NETWORK_ERROR)
    
    // Should show retry button
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
    
    // Mock success for retry
    await APIHelpers.mockOTPSuccess(page)
    
    // Click retry
    await page.click('[data-testid="retry-button"]')
    
    // Should proceed normally
    await expect(page.locator('h1')).toContainText('인증번호 입력')
  })

  test('Form validation prevents empty submissions', async ({ page }) => {
    await page.goto('/')
    
    // Try to submit empty form
    await page.click('[data-testid="submit-whitelist"]')
    
    // Should show validation errors
    await expect(page.locator('[data-testid="name-error"]')).toContainText('이름을 입력해주세요')
    await expect(page.locator('[data-testid="phone-error"]')).toContainText('전화번호를 입력해주세요')
    
    // Should remain on same page
    await expect(page.locator('h1')).toContainText('가입 허용 확인')
  })

  test('Invalid phone number format shows validation error', async ({ page }) => {
    await page.goto('/')
    
    // Fill with invalid phone format
    await page.fill('[data-testid="name-input"]', '홍길동')
    await page.fill('[data-testid="phone-input"]', '123-456-7890')
    await page.click('[data-testid="submit-whitelist"]')
    
    // Should show format validation error
    await expect(page.locator('[data-testid="phone-error"]')).toContainText('올바른 전화번호 형식으로 입력해주세요')
    
    // Test correct format
    await page.fill('[data-testid="phone-input"]', '010-1234-5678')
    
    // Error should disappear
    await expect(page.locator('[data-testid="phone-error"]')).not.toBeVisible()
  })
})