import { test, expect } from '@playwright/test'
import { TestHelpers, APIHelpers } from '../utils/test-helpers'
import { loginTestUser } from '../utils/auth-helpers'
import { TEST_SIMULATIONS, MOCK_RESULTS } from '../fixtures/test-data'

/**
 * CAT-SIMFLOW: Simulation Management Flow Tests
 * Tests core business functionality including simulation creation, execution, and management
 */

test.describe('Simulation Management Flow', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    // Pre-authenticate user for all simulation tests
    await loginTestUser(page)
    await APIHelpers.mockSimulationAPI(page)
  })

  test('E2E-007: Create new simulation with Plan A', async ({ page }) => {
    await page.goto('/')
    
    // Should be on main page
    await expect(page.locator('[data-testid="main-page"]')).toBeVisible()
    
    // Click create simulation button
    await page.click('[data-testid="create-simulation"]')
    
    // Should navigate to plan editor
    await expect(page.locator('h1')).toContainText('플랜 설정')
    
    // Step 1: Select Plan A
    await helpers.selectPlan('A')
    await helpers.clickNext()
    
    // Step 2: Set starting company round
    await page.fill('[data-testid="starting-round"]', '1')
    await helpers.clickNext()
    
    // Step 3: Set current company round
    await page.fill('[data-testid="current-round"]', '1')
    await helpers.clickNext()
    
    // Step 4: Set simulation rounds
    await page.fill('[data-testid="simulation-rounds"]', '10')
    await helpers.clickNext()
    
    // Step 5: Investment schedule
    await helpers.fillInvestmentAmount(1, '1000000')
    await helpers.fillInvestmentAmount(2, '2000000')
    await helpers.fillInvestmentAmount(3, '4000000')
    
    // Create simulation
    await page.click('[data-testid="create-simulation"]')
    
    // Should show success message
    await helpers.waitForNotification('시뮬레이션이 생성되었습니다')
    
    // Should return to main page with new simulation
    await expect(page.locator('[data-testid="main-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="simulation-table"]')).toContainText('플랜 A')
  })

  test('E2E-008: Run simulation and view results', async ({ page }) => {
    await page.goto('/')
    
    // Assume simulation exists in table
    await expect(page.locator('[data-testid="simulation-table"]')).toBeVisible()
    
    // Click run button on first simulation
    await page.click('[data-testid="run-simulation-btn"]')
    
    // Should show loading indicator
    await expect(page.locator('[data-testid="simulation-loading"]')).toBeVisible()
    
    // Wait for results
    await helpers.waitForSimulationResults()
    
    // Should show results page
    await expect(page.locator('h1')).toContainText('시뮬레이션 결과')
    
    // Verify results table is populated
    await expect(page.locator('[data-testid="results-table"]')).toBeVisible()
    
    // Verify key result metrics
    await expect(page.locator('[data-testid="final-profit"]')).toBeVisible()
    await expect(page.locator('[data-testid="total-investment"]')).toBeVisible()
    await expect(page.locator('[data-testid="roi-percentage"]')).toBeVisible()
    
    // Verify round-by-round data
    await expect(page.locator('[data-testid="round-1-data"]')).toBeVisible()
    await expect(page.locator('[data-testid="round-2-data"]')).toBeVisible()
    
    // Check export functionality
    await expect(page.locator('[data-testid="export-results"]')).toBeVisible()
  })

  test('E2E-009: Save simulation results and navigate back', async ({ page }) => {
    // Start from results page
    await page.goto('/')
    await page.click('[data-testid="run-simulation-btn"]')
    await helpers.waitForSimulationResults()
    
    // Add memo to results
    await page.fill('[data-testid="memo-input"]', 'Test simulation memo')
    await page.click('[data-testid="save-memo"]')
    
    // Should show save confirmation
    await helpers.waitForNotification('메모가 저장되었습니다')
    
    // Navigate back to main page
    await page.click('[data-testid="back-to-main"]')
    
    // Should be back on main page
    await expect(page.locator('[data-testid="main-page"]')).toBeVisible()
    
    // Verify memo is saved in simulation table
    await expect(page.locator('[data-testid="simulation-memo"]')).toContainText('Test simulation memo')
    
    // Verify simulation shows as completed
    await expect(page.locator('[data-testid="simulation-status"]')).toContainText('완료')
  })

  test('E2E-010: Edit existing simulation parameters', async ({ page }) => {
    await page.goto('/')
    
    // Click edit button on existing simulation
    await page.click('[data-testid="edit-simulation-btn"]')
    
    // Should navigate to plan editor with pre-filled data
    await expect(page.locator('h1')).toContainText('플랜 설정')
    
    // Verify current values are loaded
    await expect(page.locator('[data-testid="plan-selector"]')).toHaveValue('A')
    await expect(page.locator('[data-testid="starting-round"]')).toHaveValue('1')
    
    // Navigate to investment step
    await helpers.clickNext()
    await helpers.clickNext()
    await helpers.clickNext()
    await helpers.clickNext()
    
    // Modify investment amounts
    await helpers.fillInvestmentAmount(1, '1500000')
    await helpers.fillInvestmentAmount(2, '2500000')
    
    // Update simulation
    await page.click('[data-testid="update-simulation"]')
    
    // Should show update confirmation
    await helpers.waitForNotification('시뮬레이션이 수정되었습니다')
    
    // Should invalidate previous results
    await expect(page.locator('[data-testid="simulation-status"]')).toContainText('수정됨')
  })

  test('E2E-011: Delete simulation with confirmation', async ({ page }) => {
    await page.goto('/')
    
    // Get initial simulation count
    const initialCount = await page.locator('[data-testid="simulation-row"]').count()
    
    // Click delete button
    await page.click('[data-testid="delete-simulation-btn"]')
    
    // Should show confirmation dialog
    await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible()
    await expect(page.locator('[data-testid="confirm-message"]')).toContainText('정말로 삭제하시겠습니까?')
    
    // Cancel first
    await page.click('[data-testid="cancel-delete"]')
    await expect(page.locator('[data-testid="delete-confirmation"]')).not.toBeVisible()
    
    // Verify simulation still exists
    const countAfterCancel = await page.locator('[data-testid="simulation-row"]').count()
    expect(countAfterCancel).toBe(initialCount)
    
    // Delete for real
    await page.click('[data-testid="delete-simulation-btn"]')
    await page.click('[data-testid="confirm-delete"]')
    
    // Should show delete confirmation
    await helpers.waitForNotification('시뮬레이션이 삭제되었습니다')
    
    // Verify simulation is removed from table
    const finalCount = await page.locator('[data-testid="simulation-row"]').count()
    expect(finalCount).toBe(initialCount - 1)
  })

  test('E2E-012: Handle simulation with different plans (B, C, D)', async ({ page }) => {
    // Test Plan B
    await testPlanCreation(page, 'B', {
      starting_round: 1,
      current_round: 1,
      simulation_rounds: 15,
      investments: { 1: 500000, 2: 1000000 }
    })
    
    // Test Plan C  
    await testPlanCreation(page, 'C', {
      starting_round: 1,
      current_round: 2,
      simulation_rounds: 12,
      investments: { 1: 110000, 2: 220000, 3: 440000 }
    })
    
    // Test Plan D
    await testPlanCreation(page, 'D', {
      starting_round: 1,
      current_round: 3,
      simulation_rounds: 18,
      investments: { 1: 110000, 2: 220000, 3: 440000, 4: 880000 }
    })
  })

  /**
   * Helper function to test simulation creation with different plans
   */
  async function testPlanCreation(page: any, planId: string, config: any) {
    await page.goto('/')
    await page.click('[data-testid="create-simulation"]')
    
    // Select plan
    await helpers.selectPlan(planId)
    await helpers.clickNext()
    
    // Set rounds
    await page.fill('[data-testid="starting-round"]', config.starting_round.toString())
    await helpers.clickNext()
    
    await page.fill('[data-testid="current-round"]', config.current_round.toString())
    await helpers.clickNext()
    
    await page.fill('[data-testid="simulation-rounds"]', config.simulation_rounds.toString())
    await helpers.clickNext()
    
    // Set investments
    for (const [round, amount] of Object.entries(config.investments)) {
      await helpers.fillInvestmentAmount(parseInt(round), amount.toString())
    }
    
    // Create simulation
    await page.click('[data-testid="create-simulation"]')
    
    // Verify creation success
    await helpers.waitForNotification('시뮬레이션이 생성되었습니다')
    await expect(page.locator('[data-testid="main-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="simulation-table"]')).toContainText(`플랜 ${planId}`)
  }
})

test.describe('Simulation Validation and Edge Cases', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    await loginTestUser(page)
    await APIHelpers.mockSimulationAPI(page)
  })

  test('Investment amount validation prevents invalid inputs', async ({ page }) => {
    await page.goto('/')
    await page.click('[data-testid="create-simulation"]')
    
    // Navigate to investment step
    await helpers.selectPlan('A')
    await helpers.clickNext()
    await helpers.clickNext()
    await helpers.clickNext()
    await helpers.clickNext()
    
    // Try invalid input (negative number)
    await page.fill('[data-testid="investment-round-1"]', '-1000000')
    
    // Should show validation error
    await expect(page.locator('[data-testid="investment-error"]')).toContainText('양수를 입력해주세요')
    
    // Try zero input
    await page.fill('[data-testid="investment-round-1"]', '0')
    await expect(page.locator('[data-testid="investment-error"]')).toContainText('최소 투자금액은')
    
    // Try valid input
    await page.fill('[data-testid="investment-round-1"]', '1000000')
    await expect(page.locator('[data-testid="investment-error"]')).not.toBeVisible()
  })

  test('Round validation prevents invalid configurations', async ({ page }) => {
    await page.goto('/')
    await page.click('[data-testid="create-simulation"]')
    
    await helpers.selectPlan('A')
    await helpers.clickNext()
    
    // Try current round less than starting round
    await page.fill('[data-testid="starting-round"]', '3')
    await helpers.clickNext()
    
    await page.fill('[data-testid="current-round"]', '2')
    await helpers.clickNext()
    
    // Should show validation error
    await expect(page.locator('[data-testid="round-error"]')).toContainText('현재 라운드는 시작 라운드보다 크거나 같아야 합니다')
  })

  test('Bulk operations work correctly', async ({ page }) => {
    await page.goto('/')
    
    // Select multiple simulations
    await page.check('[data-testid="select-simulation-1"]')
    await page.check('[data-testid="select-simulation-2"]')
    
    // Verify bulk action buttons appear
    await expect(page.locator('[data-testid="bulk-delete-btn"]')).toBeVisible()
    await expect(page.locator('[data-testid="bulk-export-btn"]')).toBeVisible()
    
    // Test bulk delete
    await page.click('[data-testid="bulk-delete-btn"]')
    await expect(page.locator('[data-testid="bulk-delete-confirmation"]')).toContainText('2개의 시뮬레이션을 삭제하시겠습니까?')
    
    await page.click('[data-testid="confirm-bulk-delete"]')
    await helpers.waitForNotification('2개의 시뮬레이션이 삭제되었습니다')
  })
})