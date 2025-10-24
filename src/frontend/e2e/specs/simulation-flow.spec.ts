import { test, expect } from "@playwright/test";
import { TestHelpers, APIHelpers, initE2EMode } from "../utils/test-helpers";
import { loginTestUser } from "../utils/auth-helpers";

/**
 * CAT-SIMFLOW: Simulation Management Flow Tests
 * Tests core business functionality including simulation creation, execution, and management
 */

test.describe("Simulation management basics", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    await initE2EMode(page);
    helpers = new TestHelpers(page);
    // Pre-authenticate user for all simulation tests
    await loginTestUser(page);
    await APIHelpers.mockSimulationAPI(page);
  });

  test("E2E-JOURNEY: shows the simulation dashboard", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("main-page")).toBeVisible();
    await expect(page.getByTestId("create-simulation")).toBeVisible();
  });

  test("E2E-JOURNEY: allows navigating to the plan editor", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("create-simulation").click();

    await expect(page.locator("text=플랜 타입")).toBeVisible();
    await helpers.selectPlan("A");
    await helpers.clickNext();
    await expect(page.locator("text=가입한 회차")).toBeVisible();
  });
});

test.describe.skip("Advanced simulation scenarios", () => {
  // Batch operations, memo workflows, and multi-plan comparisons
});
