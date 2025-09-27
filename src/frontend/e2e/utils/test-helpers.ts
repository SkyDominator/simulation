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
    await this.page.fill('[data-testid="name-input"]', name)
    await this.page.fill('[data-testid="phone-input"]', phone)
    await this.page.click('[data-testid="submit-whitelist"]')
  }
  
  /**
   * Fill the OTP verification form
   */
  async fillOTPForm(code: string) {
    await this.page.fill('[data-testid="otp-input"]', code)
    await this.page.click('[data-testid="verify-otp"]')
  }
  
  /**
   * Select a plan in the plan editor
   */
  async selectPlan(planId: string) {
    await this.page.selectOption('[data-testid="plan-selector"]', planId)
  }
  
  /**
   * Fill investment amount for specific round
   */
  async fillInvestmentAmount(round: number, amount: string) {
    await this.page.fill(`[data-testid="investment-round-${round}"]`, amount)
  }
  
  /**
   * Wait for simulation results to appear
   */
  async waitForSimulationResults() {
    await this.page.waitForSelector('[data-testid="simulation-results"]', { timeout: 10000 })
    await expect(this.page.locator('[data-testid="results-table"]')).toBeVisible()
  }
  
  /**
   * Wait for notification message
   */
  async waitForNotification(message: string) {
    await expect(this.page.locator('[data-testid="notification"]')).toContainText(message)
  }
  
  /**
   * Navigate through multi-step forms
   */
  async clickNext() {
    await this.page.click('[data-testid="next-button"]')
  }
  
  async clickPrevious() {
    await this.page.click('[data-testid="previous-button"]')
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