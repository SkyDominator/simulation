import { test, expect } from '@playwright/test'
import { TestHelpers, APIHelpers } from '../utils/test-helpers'
import { loginTestUser, mockSessionExpiry } from '../utils/auth-helpers'
import { TEST_MESSAGES } from '../fixtures/test-data'

/**
 * CAT-ERROR: Error Handling & Edge Cases Tests
 * Tests graceful degradation and user guidance in error scenarios
 */

test.describe('Error Handling & Edge Cases', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    await loginTestUser(page)
  })

  test('E2E-017: Network error during simulation shows retry option', async ({ page }) => {
    // Mock network error for simulation creation
    await APIHelpers.mockNetworkError(page, '/api/simulation/create')
    
    await page.goto('/')
    
    // Create a simulation
    await helpers.clickCreateSimulation()
    await helpers.selectPlan('A')
    await helpers.clickNext()
    // Skip through form steps (simplified)
    await helpers.clickNext()
    await helpers.clickNext()
    await helpers.clickNext()
    
    await helpers.fillInvestmentAmount(1, '1000000')
    
    // Attempt to create simulation
    await page.getByRole('button', { name: /생성|완료|저장/ }).click()
    
    // Should show network error message
    await expect(page.locator('[role="alert"], .MuiAlert-root')).toContainText(TEST_MESSAGES.ERROR.NETWORK_ERROR)
    
    // Should show retry button
    await expect(page.getByRole('button', { name: /다시.*시도|재시도|Retry/ })).toBeVisible()
    
    // Verify error details are shown
    await expect(page.locator('text=/연결.*확인|네트워크.*오류/')).toBeVisible()
    
    // Mock successful response for retry
    await APIHelpers.mockSimulationAPI(page)
    
    // Click retry button
    await page.getByRole('button', { name: /다시.*시도|재시도|Retry/ }).click()
    
    // Should succeed on retry
    await helpers.waitForNotification('시뮬레이션이 생성되었습니다')
    await helpers.waitForMainPage()
  })

  test('E2E-018: Invalid form data shows validation errors', async ({ page }) => {
    await page.goto('/')
    await helpers.clickCreateSimulation()
    
    // Try to proceed without selecting plan
    await helpers.clickNext()
    
    // Should show validation error for plan selection
    await expect(page.locator('text=/플랜.*선택|Select.*plan/')).toContainText('플랜을 선택해주세요')
    
    // Select plan and continue
    await helpers.selectPlan('A')
    await helpers.clickNext()
    
    // Try invalid starting round (zero)
    await page.fill('input[aria-label*="시작"], input[placeholder*="시작"]', '0')
    await helpers.clickNext()
    
    await expect(page.locator('text=/라운드|Round|Invalid/')).toContainText('1 이상의 라운드를 입력해주세요')
    
    // Fix and continue
    await page.fill('input[aria-label*="시작"], input[placeholder*="시작"]', '1')
    await helpers.clickNext()
    
    // Try current round less than starting round
    await page.fill('input[aria-label*="현재"], input[placeholder*="현재"]', '0')
    await helpers.clickNext()
    
    await expect(page.locator('text=/라운드|Round|Invalid/')).toContainText('현재 라운드는 시작 라운드 이상이어야 합니다')
    
    // Fix and continue to investment step
    await page.fill('input[aria-label*="현재"], input[placeholder*="현재"]', '2')
    await helpers.clickNext()
    await page.fill('input[aria-label*="회차"], input[placeholder*="회차"]', '10')
    await helpers.clickNext()
    
    // Try invalid investment amount (negative)
    await helpers.fillInvestmentAmount(1, '-1000000')
    
    await expect(page.locator('text=/투자|양수|음수|Investment|Invalid/')).toContainText('양수를 입력해주세요')
    
    // Try amount below minimum
    await helpers.fillInvestmentAmount(1, '1000')
    
    await expect(page.locator('text=/투자|양수|음수|Investment|Invalid/')).toContainText('최소 투자금액은')
    
    // Verify form cannot be submitted with validation errors
    await helpers.clickCreateSimulation()
    
    await expect(page.locator('text=/입력.*오류|Validation.*error/')).toContainText('입력 오류가 있습니다')
    
    // Fix all errors
    await helpers.fillInvestmentAmount(1, '1000000')
    
    // Should allow submission now
    await helpers.clickCreateSimulation()
    
    // Assuming mocked success
    await APIHelpers.mockSimulationAPI(page)
    await helpers.waitForNotification('시뮬레이션이 생성되었습니다')
  })

  test('E2E-019: Session expiry redirects to login', async ({ page }) => {
    await page.goto('/')
    
    // Verify user is authenticated initially
    await helpers.waitForMainPage()
    
    // Simulate session expiry
    await mockSessionExpiry(page)
    
    // Try to perform authenticated action
    await helpers.clickCreateSimulation()
    
    // Should detect expired session and redirect
    await expect(page.locator('[data-testid="session-expired-modal"]')).toBeVisible()
    await expect(page.locator('[data-testid="session-expired-message"]')).toContainText(TEST_MESSAGES.ERROR.SESSION_EXPIRED)
    
    // Should offer options
    await expect(page.locator('[data-testid="relogin-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="save-work-button"]')).toBeVisible()
    
    // Save current work before re-login
    await page.click('[data-testid="save-work-button"]')
    
    // Should redirect to login process
    await page.click('[data-testid="relogin-button"]')
    
    // Should go through authentication flow
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
  })

  test('E2E-020: API timeout handled gracefully', async ({ page }) => {
    // Mock slow API response (timeout scenario)
    await page.route('**/api/simulation/run', async route => {
      // Simulate timeout by delaying response beyond expected timeout
      await new Promise(resolve => setTimeout(resolve, 5000))
      await route.fulfill({
        status: 408,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Request timeout',
          message: '요청 시간이 초과되었습니다.'
        })
      })
    })
    
    await page.goto('/')
    
    // Run a simulation
    await page.click('[data-testid="run-simulation-btn"]')
    
    // Should show loading indicator initially
    await expect(page.locator('[data-testid="simulation-loading"]')).toBeVisible()
    
    // Should show timeout error after timeout period
    await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible({ timeout: 25000 })
    await expect(page.locator('[role="alert"], .MuiAlert-root')).toContainText('요청 시간이 초과되었습니다')
    
    // Should offer retry and cancel options
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="cancel-button"]')).toBeVisible()
    
    // Test cancel
    await page.click('[data-testid="cancel-button"]')
    await helpers.waitForMainPage()
    
    // Test retry with successful mock
    await page.click('[data-testid="run-simulation-btn"]')
    await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible({ timeout: 25000 })
    
    // Mock success for retry
    await APIHelpers.mockSimulationAPI(page)
    await page.click('[data-testid="retry-button"]')
    
    // Should succeed on retry
    await helpers.waitForSimulationResults()
  })
})

test.describe('Advanced Error Scenarios', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    await loginTestUser(page)
  })

  test('Corrupted localStorage data recovery', async ({ page }) => {
    // Inject corrupted data into localStorage
    await page.evaluate(() => {
      window.localStorage.setItem('simulation.draft', 'invalid-json-data{')
      window.localStorage.setItem('user.preferences', '{"theme":"dark"')
    })
    
    await page.goto('/')
    
    // App should handle corrupted data gracefully
    await helpers.waitForMainPage()
    
    // Should show data recovery notification
    await expect(page.locator('[data-testid="recovery-notification"]')).toContainText('일부 저장된 데이터가 손상되어 초기화되었습니다')
    
    // Should fall back to defaults
    await helpers.clickCreateSimulation()
    
    // Form should be empty (not corrupted)
    await expect(page.locator('[data-testid="plan-selector"]')).toHaveValue('')
  })

  test('Concurrent user sessions conflict', async ({ page, context }) => {
    await page.goto('/')
    
    // Start editing simulation in first tab
    await page.click('[data-testid="edit-simulation-btn"]')
    
    // Open second tab with same user
    const secondTab = await context.newPage()
    await loginTestUser(secondTab)
    await secondTab.goto('/')
    
    // Try to edit same simulation in second tab
    await secondTab.click('[data-testid="edit-simulation-btn"]')
    
    // Should detect conflict
    await expect(secondTab.locator('[data-testid="edit-conflict-modal"]')).toBeVisible()
    await expect(secondTab.locator('[data-testid="conflict-message"]')).toContainText('다른 탭에서 편집 중인 시뮬레이션입니다')
    
    // Offer options: View Only or Force Edit
    await expect(secondTab.locator('[data-testid="view-only-btn"]')).toBeVisible()
    await expect(secondTab.locator('[data-testid="force-edit-btn"]')).toBeVisible()
    
    // Test force edit
    await secondTab.click('[data-testid="force-edit-btn"]')
    
    // First tab should get notification
    await expect(page.locator('[data-testid="edit-taken-notification"]')).toContainText('다른 위치에서 편집을 시작했습니다')
  })

  test('Invalid API response structure handling', async ({ page }) => {
    // Mock API with invalid response structure
    await page.route('**/api/simulations', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json response'
      })
    })
    
    await page.goto('/')
    
    // Should handle parsing error gracefully
    await expect(page.locator('[data-testid="parsing-error"]')).toBeVisible()
    await expect(page.locator('[role="alert"], .MuiAlert-root')).toContainText('데이터 형식 오류가 발생했습니다')
    
    // Should offer refresh option
    await expect(page.locator('[data-testid="refresh-button"]')).toBeVisible()
  })

  test('Browser compatibility issues', async ({ page }) => {
    // Simulate older browser by removing modern APIs
    await page.addInitScript(() => {
      // Remove modern fetch API
      delete (window as any).fetch
      
      // Remove modern localStorage features
      const originalSetItem = window.localStorage.setItem
      window.localStorage.setItem = function(key: string, value: string) {
        if (value.length > 1000) {
          throw new Error('Storage quota exceeded')
        }
        originalSetItem.call(this, key, value)
      }
    })
    
    await page.goto('/')
    
    // Should detect compatibility issues
    await expect(page.locator('[data-testid="compatibility-warning"]')).toBeVisible()
    await expect(page.locator('[data-testid="upgrade-browser-message"]')).toContainText('브라우저를 최신 버전으로 업데이트해주세요')
    
    // Should still provide basic functionality
    await helpers.waitForMainPage()
    
    // Test storage quota handling
    await helpers.clickCreateSimulation()
    
    // Fill large amount of data to trigger quota error
    const longText = 'a'.repeat(2000)
    await page.fill('[data-testid="memo-input"]', longText)
    
    // Should show storage error
    await expect(page.locator('[data-testid="storage-error"]')).toContainText('저장 공간이 부족합니다')
  })

  test('Network connectivity recovery', async ({ page, context }) => {
    await page.goto('/')
    
    // Simulate going offline
    await context.setOffline(true)
    
    // Try to perform action that requires network
    await page.click('[data-testid="run-simulation-btn"]')
    
    // Should detect offline status
    await expect(page.locator('text=/오프라인|Offline/')).toBeVisible()
    await expect(page.locator('[data-testid="offline-message"]')).toContainText('인터넷 연결을 확인해주세요')
    
    // Should queue action for when online
    await expect(page.locator('[data-testid="queued-actions"]')).toContainText('1개의 작업이 대기 중입니다')
    
    // Come back online
    await context.setOffline(false)
    
    // Should detect online status and retry queued actions
    await expect(page.locator('[data-testid="online-indicator"]')).toBeVisible()
    await expect(page.locator('[data-testid="sync-notification"]')).toContainText('연결이 복구되어 대기 중인 작업을 실행합니다')
    
    // Mock success for the queued simulation
    await APIHelpers.mockSimulationAPI(page)
    
    // Should automatically retry the simulation
    await helpers.waitForSimulationResults()
  })
})