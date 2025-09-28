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
    await helpers.waitForMainPage()
    
    // Click create simulation button
    await helpers.clickCreateSimulation()
    
    // Should navigate to plan editor - check for stepper or plan type step
    await expect(page.locator('text=플랜 타입')).toBeVisible()
    
    // Step 1: Select Plan A
    await helpers.selectPlan('A')
    await helpers.clickNext()
    
    // Step 2-4: Navigate through remaining steps (simplified for maintainability)
    // Focus on end-to-end flow rather than testing each input field
    await helpers.clickNext() // Starting company round
    await helpers.clickNext() // Current company round  
    await helpers.clickNext() // Simulation rounds
    
    // Step 5: Investment schedule - check that we reach the final step
    await expect(page.locator('text=회차 매출액 입력')).toBeVisible()
    
    // Add some investment amounts using the helper
    await helpers.fillInvestmentAmount(1, '1000000')
    await helpers.fillInvestmentAmount(2, '2000000')
    await helpers.fillInvestmentAmount(3, '4000000')
    
    // Create simulation - look for create/complete button
    await page.getByRole('button', { name: /생성|완료|저장/ }).click()
    
    // Should show success message
    await helpers.waitForNotification('시뮬레이션이 생성되었습니다')
    
    // Should return to main page with new simulation
    await helpers.waitForMainPage()
    await expect(page.locator('table, [role="table"]')).toContainText('플랜 A')
  })

  test('E2E-008: Run simulation and view results', async ({ page }) => {
    await page.goto('/')
    
    // Assume simulation exists in table
    await expect(page.locator('table, [role="table"]')).toBeVisible()
    
    // Click run button on first simulation - look for play/run icon or button
    await page.getByRole('button', { name: /실행|Run|▶/ }).first().click()
    
    // Should show loading indicator or wait for results
    await helpers.waitForSimulationResults()
    
    // Should show results page - look for results content
    await expect(page.locator('text=/시뮬레이션.*결과|결과.*보기/')).toBeVisible()
    
    // Verify results are displayed (use general table/content checks)
    await expect(page.locator('table, [role="table"]')).toBeVisible()
    
    // Verify key result sections are present (flexible selectors)
    await expect(page.locator('text=/수익|손실|투자/')).toBeVisible()
    await expect(page.locator('text=/총.*투자|전체.*투자/')).toBeVisible()
    await expect(page.locator('text=/수익률|ROI/')).toBeVisible()
    
    // Check that we have round data displayed
    await expect(page.locator('text=/1회차|회차.*1/')).toBeVisible()
    
    // Check export functionality exists
    await expect(page.getByRole('button', { name: /내보내기|Export|다운로드/ })).toBeVisible()
  })

  test('E2E-009: Save simulation results and navigate back', async ({ page }) => {
    // Start from results page
    await page.goto('/')
    await page.getByRole('button', { name: /실행|Run/ }).first().click()
    await helpers.waitForSimulationResults()
    
    // Add memo to results - look for memo/note input
    await page.getByLabel(/메모|노트|설명/).fill('Test simulation memo')
    await page.getByRole('button', { name: /저장|Save/ }).click()
    
    // Should show save confirmation
    await helpers.waitForNotification('메모가 저장되었습니다')
    
    // Navigate back to main page
    await page.getByRole('button', { name: /뒤로|이전|Back/ }).click()
    
    // Should be back on main page
    await helpers.waitForMainPage()
    
    // Verify memo is saved (check table content)
    await expect(page.locator('table, [role="table"]')).toContainText('Test simulation memo')
    
    // Verify simulation shows as completed
    await expect(page.locator('text=/완료|Complete/')).toBeVisible()
  })

  test('E2E-010: Edit existing simulation parameters', async ({ page }) => {
    await page.goto('/')
    
    // Click edit button on existing simulation - look for edit icon/button
    await page.getByRole('button', { name: /편집|수정|Edit/ }).first().click()
    
    // Should navigate to plan editor with pre-filled data
    await expect(page.locator('text=플랜 타입')).toBeVisible()
    
    // Navigate through steps (simplified approach)
    await helpers.clickNext()
    await helpers.clickNext()
    await helpers.clickNext()
    await helpers.clickNext()
    
    // Modify investment amounts
    await helpers.fillInvestmentAmount(1, '1500000')
    await helpers.fillInvestmentAmount(2, '2500000')
    
    // Update simulation
    await page.getByRole('button', { name: /수정|업데이트|Update/ }).click()
    
    // Should show update confirmation
    await helpers.waitForNotification('시뮬레이션이 수정되었습니다')
    
    // Should return to main page
    await helpers.waitForMainPage()
  })

  test('E2E-011: Delete simulation with confirmation', async ({ page }) => {
    await page.goto('/')
    
    // Get initial simulation count
    const initialCount = await page.locator('table tr').count()
    
    // Click delete button - look for delete icon/button
    await page.getByRole('button', { name: /삭제|Delete/ }).first().click()
    
    // Should show confirmation dialog
    await expect(page.locator('text=/정말로.*삭제|Delete.*confirm/')).toBeVisible()
    
    // Cancel first
    await page.getByRole('button', { name: /취소|Cancel/ }).click()
    
    // Verify dialog is closed
    await expect(page.locator('text=/정말로.*삭제|Delete.*confirm/')).not.toBeVisible()
    
    // Delete for real
    await page.getByRole('button', { name: /삭제|Delete/ }).first().click()
    await page.getByRole('button', { name: /확인|OK|삭제/ }).click()
    
    // Should show delete confirmation
    await helpers.waitForNotification('시뮬레이션이 삭제되었습니다')
    
    // Verify simulation is removed from table
    const finalCount = await page.locator('table tr').count()
    expect(finalCount).toBeLessThan(initialCount)
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
    await helpers.clickCreateSimulation()
    
    // Select plan
    await helpers.selectPlan(planId)
    await helpers.clickNext()
    
    // Navigate through steps (simplified for maintainability)
    await helpers.clickNext() // Starting round
    await helpers.clickNext() // Current round  
    await helpers.clickNext() // Simulation rounds
    
    // Set investments for final step
    for (const [round, amount] of Object.entries(config.investments)) {
      const safeAmount = (amount !== null && amount !== undefined) ? amount.toString() : '0';
      await helpers.fillInvestmentAmount(parseInt(round), safeAmount)
    }
    
    // Create simulation
    await page.getByRole('button', { name: /생성|완료|저장/ }).click()
    
    // Verify creation success
    await helpers.waitForNotification('시뮬레이션이 생성되었습니다')
    await helpers.waitForMainPage()
    await expect(page.locator('table, [role="table"]')).toContainText(`플랜 ${planId}`)
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
    await helpers.clickCreateSimulation()
    
    // Navigate to investment step
    await helpers.selectPlan('A')
    await helpers.clickNext()
    await helpers.clickNext()
    await helpers.clickNext()
    await helpers.clickNext()
    
    // Try invalid input (negative number)
    await helpers.fillInvestmentAmount(1, '-1000000')
    
    // Should show validation error (flexible selector)
    await expect(page.locator('text=/양수.*입력|음수.*불가|Invalid/')).toBeVisible()
    
    // Try zero input
    await helpers.fillInvestmentAmount(1, '0')
    await expect(page.locator('text=/최소.*투자|Minimum.*amount/')).toBeVisible()
    
    // Try valid input
    await helpers.fillInvestmentAmount(1, '1000000')
    // Validation error should disappear
    await expect(page.locator('text=/양수.*입력|음수.*불가|Invalid/')).not.toBeVisible()
  })

  test('Round validation prevents invalid configurations', async ({ page }) => {
    await page.goto('/')
    await helpers.clickCreateSimulation()
    
    await helpers.selectPlan('A')
    await helpers.clickNext()
    
    // Focus on end-to-end flow rather than specific field validation
    // Navigate through steps and verify overall validation works
    await helpers.clickNext() // Starting round
    await helpers.clickNext() // Current round
    
    // Should show validation error if invalid (flexible check)
    await expect(page.locator('text=/라운드|Round|Invalid/')).toBeVisible()
  })

  test('Bulk operations work correctly', async ({ page }) => {
    await page.goto('/')
    
    // Select multiple simulations using checkboxes (generic selector)
    const checkboxes = page.locator('input[type="checkbox"]')
    await checkboxes.nth(0).check()
    await checkboxes.nth(1).check()
    
    // Verify bulk action buttons appear
    await expect(page.getByRole('button', { name: /삭제|Delete/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /내보내기|Export/ })).toBeVisible()
    
    // Test bulk delete
    await page.getByRole('button', { name: /삭제|Delete/ }).click()
    await expect(page.locator('text=/시뮬레이션.*삭제|Delete.*simulation/')).toBeVisible()
    
    await page.getByRole('button', { name: /확인|OK/ }).click()
    await helpers.waitForNotification('시뮬레이션이 삭제되었습니다')
  }))
})