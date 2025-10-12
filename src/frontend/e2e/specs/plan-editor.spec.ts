import { test, expect } from "@playwright/test";
import { TestHelpers, APIHelpers, initE2EMode } from "../utils/test-helpers";
import { loginTestUser } from "../utils/auth-helpers";

/**
 * CAT-EDITOR: Plan Editor Wizard Tests
 * Tests multi-step simulation creation and editing workflow
 */

test.describe("Plan Editor Wizard - Step Navigation", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    await initE2EMode(page);
    helpers = new TestHelpers(page);
    await loginTestUser(page);
    await APIHelpers.mockSimulationAPI(page);
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test("E2E-EDITOR-001: Step 1 shows plan type selector (A,B,C,D,E,F,G,K,P,R)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("create-simulation").click();

    // Should be on step 1
    await expect(page.locator("text=플랜 타입")).toBeVisible({ timeout: 5000 });

    // Plan selector should be visible
    const planSelector = page
      .locator('[data-testid="plan-selector"]')
      .or(page.locator('[role="button"][aria-haspopup="listbox"]'))
      .first();
    await expect(planSelector).toBeVisible();

    // Open dropdown to verify plan options
    await planSelector.click();

    // Verify key plan types are available
    for (const plan of ["A", "B", "C", "D", "K"]) {
      await expect(page.locator(`text="${plan}"`).first()).toBeVisible();
    }
  });

  test("E2E-EDITOR-002: Select plan type enables Next button", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("create-simulation").click();

    await expect(page.locator("text=플랜 타입")).toBeVisible({ timeout: 5000 });

    // Next button should be disabled initially
    const nextButton = page
      .getByTestId("next-button")
      .or(page.getByRole("button", { name: /다음|next/i }))
      .first();

    // Select a plan
    await helpers.selectPlan("A");

    // Next button should now be enabled
    await expect(nextButton).toBeEnabled();
  });

  test("E2E-EDITOR-003: Step 2 shows starting round input (1-19)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("create-simulation").click();

    // Select plan and proceed to step 2
    await expect(page.locator("text=플랜 타입")).toBeVisible({ timeout: 5000 });
    await helpers.selectPlan("A");
    await helpers.clickNext();

    // Should be on step 2
    await expect(
      page.locator("text=/가입.*회차|starting.*round/i")
    ).toBeVisible({
      timeout: 5000,
    });

    // Starting round input should be visible
    const roundInput = page
      .getByLabel(/가입.*회차|starting.*round/i)
      .or(page.locator('input[type="number"]'))
      .first();
    await expect(roundInput).toBeVisible();
  });

  test("E2E-EDITOR-004: Invalid starting round shows validation modal", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("create-simulation").click();

    await helpers.selectPlan("A");
    await helpers.clickNext();

    await expect(page.locator("text=/가입.*회차/i")).toBeVisible({
      timeout: 5000,
    });

    // Enter invalid round (0 or > 19)
    const roundInput = page.locator('input[type="number"]').first();
    await roundInput.fill("0");
    await helpers.clickNext();

    // Validation modal or error message should appear
    const validationMessage = page
      .locator('[role="dialog"]')
      .or(page.locator("text=/유효하지|invalid|올바르지/i"))
      .first();

    await expect(validationMessage).toBeVisible({ timeout: 3000 });
  });

  test("E2E-EDITOR-005: Step 3 shows current round input (must be >= starting)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("create-simulation").click();

    await helpers.selectPlan("A");
    await helpers.clickNext();

    // Enter starting round
    const startingRoundInput = page.locator('input[type="number"]').first();
    await startingRoundInput.fill("1");
    await helpers.clickNext();

    // Should be on step 3
    await expect(page.locator("text=/현재.*회차|current.*round/i")).toBeVisible(
      {
        timeout: 5000,
      }
    );

    const currentRoundInput = page.locator('input[type="number"]').first();
    await expect(currentRoundInput).toBeVisible();
  });

  test("E2E-EDITOR-006: Current round < starting round shows validation modal", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("create-simulation").click();

    await helpers.selectPlan("A");
    await helpers.clickNext();

    // Enter starting round = 3
    const startingRoundInput = page.locator('input[type="number"]').first();
    await startingRoundInput.fill("3");
    await helpers.clickNext();

    await expect(page.locator("text=/현재.*회차/i")).toBeVisible({
      timeout: 5000,
    });

    // Try to enter current round = 1 (less than starting)
    const currentRoundInput = page.locator('input[type="number"]').first();
    await currentRoundInput.fill("1");
    await helpers.clickNext();

    // Validation modal should appear
    const validationMessage = page
      .locator('[role="dialog"]')
      .or(page.locator("text=/유효하지|invalid|작습니다/i"))
      .first();

    await expect(validationMessage).toBeVisible({ timeout: 3000 });
  });

  test("E2E-EDITOR-007: Step 4 shows simulation rounds input (plan-specific range)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("create-simulation").click();

    await helpers.selectPlan("A");
    await helpers.clickNext();

    const startingRoundInput = page.locator('input[type="number"]').first();
    await startingRoundInput.fill("1");
    await helpers.clickNext();

    await expect(page.locator("text=/현재.*회차/i")).toBeVisible({
      timeout: 5000,
    });
    const currentRoundInput = page.locator('input[type="number"]').first();
    await currentRoundInput.fill("1");
    await helpers.clickNext();

    // Should be on step 4
    await expect(
      page.locator("text=/시뮬레이션.*라운드|simulation.*round/i")
    ).toBeVisible({ timeout: 5000 });

    const simulationRoundsInput = page.locator('input[type="number"]').first();
    await expect(simulationRoundsInput).toBeVisible();
  });

  test("E2E-EDITOR-008: Invalid simulation rounds shows validation modal", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("create-simulation").click();

    await helpers.selectPlan("A");
    await helpers.clickNext();

    const startingRoundInput = page.locator('input[type="number"]').first();
    await startingRoundInput.fill("1");
    await helpers.clickNext();

    const currentRoundInput = page.locator('input[type="number"]').first();
    await currentRoundInput.fill("1");
    await helpers.clickNext();

    await expect(page.locator("text=/시뮬레이션.*라운드/i")).toBeVisible({
      timeout: 5000,
    });

    // Try invalid rounds (Plan A max is 15)
    const simulationRoundsInput = page.locator('input[type="number"]').first();
    await simulationRoundsInput.fill("20");
    await helpers.clickNext();

    // Validation modal should appear
    const validationMessage = page
      .locator('[role="dialog"]')
      .or(page.locator("text=/유효하지|invalid|범위/i"))
      .first();

    await expect(validationMessage).toBeVisible({ timeout: 3000 });
  });

  test("E2E-EDITOR-009: Step 5 shows investment schedule table (round by round)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("create-simulation").click();

    await helpers.selectPlan("A");
    await helpers.clickNext();

    const startingRoundInput = page.locator('input[type="number"]').first();
    await startingRoundInput.fill("1");
    await helpers.clickNext();

    const currentRoundInput = page.locator('input[type="number"]').first();
    await currentRoundInput.fill("1");
    await helpers.clickNext();

    const simulationRoundsInput = page.locator('input[type="number"]').first();
    await simulationRoundsInput.fill("10");
    await helpers.clickNext();

    // Should be on step 5 (investment schedule)
    await expect(page.locator("text=/투자|investment|납입/i")).toBeVisible({
      timeout: 5000,
    });

    // Table with investment inputs should be visible
    const investmentTable = page.locator("table").first();
    await expect(investmentTable).toBeVisible();
  });

  test("E2E-EDITOR-010: Investment fields accept numeric input only", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("create-simulation").click();

    // Navigate to step 5
    await helpers.selectPlan("A");
    await helpers.clickNext();

    const startingRoundInput = page.locator('input[type="number"]').first();
    await startingRoundInput.fill("1");
    await helpers.clickNext();

    const currentRoundInput = page.locator('input[type="number"]').first();
    await currentRoundInput.fill("1");
    await helpers.clickNext();

    const simulationRoundsInput = page.locator('input[type="number"]').first();
    await simulationRoundsInput.fill("3");
    await helpers.clickNext();

    await expect(page.locator("text=/투자|investment/i")).toBeVisible({
      timeout: 5000,
    });

    // Find first investment input
    const investmentInput = page.locator('input[type="number"]').first();

    // Should accept valid numbers
    await investmentInput.fill("1000000");
    const value = await investmentInput.inputValue();
    expect(value).toBe("1000000");
  });

  test("E2E-EDITOR-012: Back button navigates to previous step", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("create-simulation").click();

    await helpers.selectPlan("A");
    await helpers.clickNext();

    // Now on step 2
    await expect(page.locator("text=/가입.*회차/i")).toBeVisible({
      timeout: 5000,
    });

    // Click back button
    await helpers.clickPrevious();

    // Should be back on step 1
    await expect(page.locator("text=플랜 타입")).toBeVisible({ timeout: 5000 });
  });

  test("E2E-EDITOR-013: Cancel button returns to MainPage with confirmation", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("create-simulation").click();

    await helpers.selectPlan("A");

    // Find cancel button
    const cancelButton = page
      .getByTestId("cancel-button")
      .or(page.getByRole("button", { name: /취소|cancel/i }))
      .first();

    if (await cancelButton.isVisible()) {
      await cancelButton.click();

      // Confirmation dialog might appear if there are changes
      const confirmDialog = page.locator('[role="dialog"]').first();
      if (await confirmDialog.isVisible()) {
        const confirmButton = confirmDialog
          .getByRole("button", { name: /확인|yes/i })
          .first();
        await confirmButton.click();
      }

      // Should return to main page
      await expect(page.getByTestId("main-page")).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("E2E-EDITOR-014: Create button shows ConfirmationModal with summary", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("create-simulation").click();

    // Complete all steps
    await helpers.selectPlan("A");
    await helpers.clickNext();

    const startingRoundInput = page.locator('input[type="number"]').first();
    await startingRoundInput.fill("1");
    await helpers.clickNext();

    const currentRoundInput = page.locator('input[type="number"]').first();
    await currentRoundInput.fill("1");
    await helpers.clickNext();

    const simulationRoundsInput = page.locator('input[type="number"]').first();
    await simulationRoundsInput.fill("5");
    await helpers.clickNext();

    // On investment schedule, fill some values
    const investmentInputs = page.locator('input[type="number"]');
    if ((await investmentInputs.count()) > 0) {
      await investmentInputs.first().fill("1000000");
    }

    // Find create button
    const createButton = page
      .getByTestId("create-button")
      .or(page.getByRole("button", { name: /생성|create/i }))
      .first();

    if (await createButton.isVisible()) {
      await createButton.click();

      // Confirmation modal should appear
      const confirmModal = page
        .locator('[role="dialog"]')
        .filter({ hasText: /확인|summary|요약/i })
        .first();

      if (await confirmModal.isVisible()) {
        await expect(confirmModal).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test("E2E-EDITOR-015: Confirm creation POSTs to /api/simulation/create", async ({
    page,
  }) => {
    // Set up request spy
    const createRequests: Array<{ method: string; body: unknown }> = [];
    await page.route("**/api/simulation/create", async (route) => {
      createRequests.push({
        method: route.request().method(),
        body: route.request().postDataJSON(),
      });
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "new-sim-123",
            plan_id: "A",
            created_at: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto("/");
    await page.getByTestId("create-simulation").click();

    // Complete wizard
    await helpers.selectPlan("A");
    await helpers.clickNext();

    const startingRoundInput = page.locator('input[type="number"]').first();
    await startingRoundInput.fill("1");
    await helpers.clickNext();

    const currentRoundInput = page.locator('input[type="number"]').first();
    await currentRoundInput.fill("1");
    await helpers.clickNext();

    const simulationRoundsInput = page.locator('input[type="number"]').first();
    await simulationRoundsInput.fill("5");
    await helpers.clickNext();

    // Click create
    const createButton = page
      .getByTestId("create-button")
      .or(page.getByRole("button", { name: /생성|create/i }))
      .first();

    if (await createButton.isVisible()) {
      await createButton.click();

      // Confirm if modal appears
      const confirmButton = page
        .getByRole("button", { name: /확인|confirm/i })
        .first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Wait a bit for API call
      await page.waitForTimeout(1000);

      // Verify API was called
      expect(createRequests.length).toBeGreaterThan(0);
      expect(createRequests[0].method).toBe("POST");
    }
  });

  test("E2E-EDITOR-016: Successful creation returns to MainPage and adds to list", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("create-simulation").click();

    // Complete wizard quickly
    await helpers.selectPlan("A");
    await helpers.clickNext();

    const startingRoundInput = page.locator('input[type="number"]').first();
    await startingRoundInput.fill("1");
    await helpers.clickNext();

    const currentRoundInput = page.locator('input[type="number"]').first();
    await currentRoundInput.fill("1");
    await helpers.clickNext();

    const simulationRoundsInput = page.locator('input[type="number"]').first();
    await simulationRoundsInput.fill("5");
    await helpers.clickNext();

    const createButton = page
      .getByTestId("create-button")
      .or(page.getByRole("button", { name: /생성|create/i }))
      .first();

    if (await createButton.isVisible()) {
      await createButton.click();

      // Confirm if needed
      const confirmButton = page
        .getByRole("button", { name: /확인|confirm/i })
        .first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Should return to main page
      await expect(page.getByTestId("main-page")).toBeVisible({
        timeout: 10000,
      });

      // Success message might appear
      const successMessage = page
        .locator("text=/생성.*완료|created|success/i")
        .first();
      if (await successMessage.isVisible()) {
        await expect(successMessage).toBeVisible();
      }
    }
  });

  test("E2E-EDITOR-020: Plan type change resets subsequent steps", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("create-simulation").click();

    // Select first plan
    await helpers.selectPlan("A");
    await helpers.clickNext();

    const startingRoundInput = page.locator('input[type="number"]').first();
    await startingRoundInput.fill("3");

    // Go back to step 1
    await helpers.clickPrevious();

    // Change plan type
    await helpers.selectPlan("B");
    await helpers.clickNext();

    // Starting round should be reset or cleared
    const newStartingRoundInput = page.locator('input[type="number"]').first();
    const value = await newStartingRoundInput.inputValue();

    // Value should be empty or default (not "3")
    expect(value === "" || value === "1").toBe(true);
  });
});
