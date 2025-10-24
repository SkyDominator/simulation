import { test, expect } from "../fixtures/base";
import { selectPlan, clickNext } from "../utils/journeyActions";

/**
 * CAT-SIMFLOW: Simulation Management Flow Tests
 * Tests core business functionality including simulation creation, execution, and management
 */

test.describe("Simulation management basics", () => {
  test("E2E-JOURNEY: shows the simulation dashboard", async ({
    page,
    memberSession: _memberSession,
    mockedApis,
  }) => {
    // Set up API mocks
    await mockedApis.mockSimulations();

    await page.goto("/");

    await expect(page.getByTestId("main-page")).toBeVisible();
    await expect(page.getByTestId("create-simulation")).toBeVisible();
  });

  test("E2E-JOURNEY: allows navigating to the plan editor", async ({
    page,
    memberSession: _memberSession,
    mockedApis,
  }) => {
    // Set up API mocks
    await mockedApis.mockSimulations();

    await page.goto("/");
    await page.getByTestId("create-simulation").click();

    await expect(page.locator("text=플랜 타입")).toBeVisible();
    await selectPlan(page, "A");
    await clickNext(page);
    await expect(page.locator("text=가입한 회차")).toBeVisible();
  });
});

test.describe.skip("Advanced simulation scenarios", () => {
  // Batch operations, memo workflows, and multi-plan comparisons
});
