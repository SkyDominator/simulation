import { Page, expect } from '@playwright/test'

/**
 * Test helpers for common page interactions
 */
export class TestHelpers {
  constructor(private page: Page) {}
  
  /**
   * Fill the whitelist verification form
   */
  async fillWhitelistForm(name: string, phone: string) {
    // Use both Material-UI label-based selectors and data-testid as fallback
    const nameInput = this.page.locator('[data-testid="name-input"], input[name="name"], [aria-label="이름"]').first()
    const phoneInput = this.page.locator('[data-testid="phone-input"], input[name="phone"], [aria-label="휴대폰 번호"]').first()
    const submitButton = this.page.locator('[data-testid="submit-whitelist"], button:has-text("인증번호 받기")').first()
    
    await nameInput.fill(name)
    await phoneInput.fill(phone)  
    await submitButton.click()
  }
  
  /**
   * Fill the OTP verification form
   */
  async fillOTPForm(code: string) {
    const otpInput = this.page.locator('[data-testid="otp-input"], input[maxlength="6"], [aria-label="인증번호"]').first()
    const verifyButton = this.page.locator('[data-testid="verify-otp"], button:has-text("인증하기")').first()
    
    await otpInput.fill(code)
    await verifyButton.click()
  }
  
  /**
   * Select a plan in the plan editor
   */
  async selectPlan(planId: string) {
    // Look for Material-UI Select component
    await this.page.click('[role="button"][aria-haspopup="listbox"]')
    await this.page.click(`text="${planId}"`)
  }
  
  /**
   * Fill investment amount for specific round
   */
  async fillInvestmentAmount(round: number, amount: string) {
    // Find the input field associated with the round by locating the text, then its parent, then the input
    await this.page.locator(`text=${round}회차`).locator('..').locator('input[type="text"]').fill(amount)
  }
  
  /**
   * Wait for simulation results to appear
   */
  async waitForSimulationResults() {
    // Look for results content or table
    await this.page.waitForSelector('text=/시뮬레이션.*결과/', { timeout: 10000 })
    await expect(this.page.locator('table, [role="table"]')).toBeVisible()
  }
  
  /**
   * Wait for notification message
   */
  async waitForNotification(message: string) {
    // Look for Material-UI Alert or Snackbar
    await expect(this.page.locator('[role="alert"], .MuiAlert-root').filter({ hasText: message })).toBeVisible()
  }
  
  /**
   * Navigate through multi-step forms
   */
  async clickNext() {
    await this.page.getByRole('button', { name: /다음|Next|계속/i }).click()
  }

  async clickPrevious() {
    await this.page.getByRole('button', { name: /이전|Previous|뒤로/i }).click()
  }
  
  /**
   * Wait for page to load completely
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle')
  }
  
  /**
   * Check if element is visible with timeout
   */
  async isElementVisible(selector: string, timeout: number = 5000): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout })
      return await this.page.isVisible(selector)
    } catch {
      return false
    }
  }

  /**
   * Wait for main page to load
   */
  async waitForMainPage() {
    await expect(this.page.locator('text=내 시뮬레이션')).toBeVisible({ timeout: 10000 })
  }

  /**
   * Click create simulation button
   */
  async clickCreateSimulation() {
    const createButton = this.page.locator('[data-testid="create-simulation"], button:has-text("새 시뮬레이션")').first()
    await createButton.click()
  }
}

/**
 * API mocking helpers for external dependencies
 */
export class APIHelpers {
  /**
   * Mock successful OTP flow
   */
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
  
  /**
   * Mock OTP failure scenarios
   */
  static async mockOTPFailure(page: Page, scenario: 'whitelist' | 'invalid_code' | 'expired') {
    if (scenario === 'whitelist') {
      await page.route('**/api/otp/send', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: '가입 허용 명단에 없는 사용자입니다.'
          })
        })
      })
    } else if (scenario === 'invalid_code') {
      await page.route('**/api/otp/verify', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: '인증번호가 올바르지 않습니다.',
            remaining_attempts: 2
          })
        })
      })
    }
  }
  
  /**
   * Mock simulation API endpoints
   */
  static async mockSimulationAPI(page: Page) {
    await page.route('**/api/simulation/create', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { 
            id: 'sim-123',
            plan_id: 'A',
            created_at: new Date().toISOString()
          }
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
              { 
                company_round: 1, 
                investor_count: 1, 
                total_payment: 1000000, 
                total_revenue_after_tax: 970000, 
                cumulative_net_profit: -30000 
              },
              { 
                company_round: 2, 
                investor_count: 2, 
                total_payment: 2000000, 
                total_revenue_after_tax: 1940000, 
                cumulative_net_profit: -60000 
              }
            ],
            summary: { 
              total_rounds: 2, 
              final_profit: -60000,
              total_investment: 3000000,
              total_revenue: 2910000
            }
          }
        })
      })
    })
    
    await page.route('**/api/simulations', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: 'sim-123',
                plan_id: 'A',
                memo: 'Test simulation',
                created_at: '2024-01-01T00:00:00Z',
                starting_company_round: 1,
                current_company_round: 1,
                simulation_rounds: 12
              }
            ]
          })
        })
      }
    })
  }
  
  /**
   * Mock network error scenarios
   */
  static async mockNetworkError(page: Page, endpoint: string) {
    await page.route(`**${endpoint}`, async route => {
      await route.abort('failed')
    })
  }
  
  /**
   * Mock authentication success
   */
  static async mockAuthSuccess(page: Page) {
    await page.addInitScript(() => {
      // Mock Supabase authentication
      window.localStorage.setItem('sb-test-auth-token', JSON.stringify({
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
}