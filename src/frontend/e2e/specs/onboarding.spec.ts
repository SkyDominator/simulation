import { test, expect } from '@playwright/test'
import { TestHelpers, APIHelpers } from '../utils/test-helpers'
import { loginTestUser, completeOnboardingFlow } from '../utils/auth-helpers'
import { TEST_USERS, TEST_MESSAGES, TEST_OTP_CODES, TEST_CONSTANTS } from '../fixtures/test-data'

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

  test.afterEach(async ({ page }) => {
    // Cleanup: Clear any test data from localStorage
    await page.evaluate(() => {
      window.localStorage.clear()
      window.sessionStorage.clear()
    })
  })

  test('E2E-001: Complete user onboarding for whitelisted user', async ({ page }) => {
    // Navigate to app
    await page.goto('/')
    
    // Step 1: Should show whitelist check page
    await expect(page.locator('h1, h5').filter({ hasText: '환영합니다!' })).toBeVisible()
    
    // Fill whitelist form with valid user
    await helpers.fillWhitelistForm(TEST_USERS.WHITELISTED.name, TEST_USERS.WHITELISTED.phone)
    
    // Step 2: Should redirect to OTP verification
    await expect(page.locator('h1, h5').filter({ hasText: '휴대폰 인증' })).toBeVisible()
    
    // Verify OTP input is visible and properly formatted
    const otpInput = page.getByLabel('인증번호')
    await expect(otpInput).toBeVisible({ timeout: TEST_CONSTANTS.DEFAULT_TIMEOUT_MS })
    await expect(otpInput).toHaveAttribute('maxlength', TEST_CONSTANTS.OTP_LENGTH.toString())
    
    // Fill OTP form with test constant
    await helpers.fillOTPForm(TEST_OTP_CODES.VALID)
    
    // Step 3: Should redirect to privacy consent page
    await expect(page.locator('h1, h5').filter({ hasText: '데이터 수집 동의' })).toBeVisible()
    
    // Accept privacy policy
    await page.getByLabel('개인정보 수집 및 이용에 동의합니다.').check()
    await page.getByRole('button', { name: '계속하기' }).click()
    
    // Step 4: Should redirect to login page
    await expect(page.locator('h1, h5').filter({ hasText: '로그인' })).toBeVisible()
    
    // Verify OAuth login buttons are present
    await expect(page.getByRole('button', { name: /Google.*로그인/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Kakao.*로그인/ })).toBeVisible()
    
    // Complete OAuth login (mocked)
    await page.getByRole('button', { name: /Google.*로그인/ }).click()
    
    // Step 5: Should reach main application page (after successful auth mock)
    await expect(page.locator('text=/투자.*시뮬레이션|시뮬레이션.*관리/')).toBeVisible({ timeout: TEST_CONSTANTS.LONG_TIMEOUT_MS })
    
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
    await helpers.fillOTPForm(TEST_OTP_CODES.VALID)
    
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
    
    // Fill invalid OTP using test constant
    await helpers.fillOTPForm(TEST_OTP_CODES.INVALID)
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText(TEST_MESSAGES.ERROR.INVALID_OTP)
    
    // Should show remaining attempts
    await expect(page.locator('[data-testid="remaining-attempts"]')).toContainText('2')
    
    // Should remain on OTP page for retry
    await expect(page.locator('h1')).toContainText('인증번호 입력')
    await expect(page.locator('[data-testid="otp-input"]')).toBeVisible()
  })

  test('E2E-005: OAuth login completes successfully', async ({ page }) => {
    // Setup: Complete onboarding flow up to login page independently
    await APIHelpers.mockOTPSuccess(page)
    await page.goto('/')
    
    // Navigate through onboarding steps
    await helpers.fillWhitelistForm(TEST_USERS.WHITELISTED.name, TEST_USERS.WHITELISTED.phone)
    await expect(page.locator('h1')).toContainText('인증번호 입력')
    
    await helpers.fillOTPForm(TEST_OTP_CODES.VALID)
    await expect(page.locator('h1')).toContainText('개인정보 처리방침')
    
    await page.check('[data-testid="consent-checkbox"]')
    await page.click('[data-testid="accept-consent"]')
    
    // Now test OAuth login specifically
    await expect(page.locator('h1')).toContainText('로그인')
    
    // Complete OAuth login (mocked)
    await loginTestUser(page)
    await page.click('[data-testid="google-login"]')
    
    // Assertions with meaningful messages
    await expect(page.locator('[data-testid="main-page"]')).toBeVisible({ 
      timeout: TEST_CONSTANTS.LONG_TIMEOUT_MS 
    })
    
    // Verify user info is displayed
    const userInfo = page.locator('[data-testid="user-info"]')
    await expect(userInfo, 'User information should be visible after successful login').toContainText('Test User')
    
    // Verify navigation menu is available
    const navMenu = page.locator('[data-testid="nav-menu"]')
    await expect(navMenu, 'Navigation menu should be accessible after login').toBeVisible()
    
    // Verify logout option is present
    const logoutButton = page.locator('[data-testid="logout-button"]')
    await expect(logoutButton, 'Logout button should be available for authenticated user').toBeVisible()
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

  test.afterEach(async ({ page }) => {
    // Cleanup: Clear any test data
    await page.evaluate(() => {
      window.localStorage.clear()
      window.sessionStorage.clear()
    })
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
    
    // Test correct format using test constant
    await page.fill('[data-testid="phone-input"]', TEST_USERS.WHITELISTED.phone)
    
    // Error should disappear
    await expect(page.locator('[data-testid="phone-error"]')).not.toBeVisible()
  })
})