import { test, expect } from "../fixtures/base";
import { selectPlan, clickNext } from "../utils/journeyActions";

/**
 * CAT-SIMFLOW: Simulation Management Flow Tests (Journey Tests)
 * Tests core business functionality including simulation creation, execution, and management
 *
 * Uses new fixture architecture for journey tests.
 */

test.describe("Simulation management basics", () => {
  test("E2E-JOURNEY: shows the simulation dashboard", async ({
    memberSession,
    mockedApis,
  }) => {
    // Mock simulation API to prevent real requests to /api/simulations
    await mockedApis.mockSimulationAPI();
    await mockedApis.mockNoticesAPI();

    await memberSession.goto("/");

    await expect(memberSession.getByTestId("main-page")).toBeVisible();
    await expect(memberSession.getByTestId("create-simulation")).toBeVisible();
  });

  test("E2E-JOURNEY: allows navigating to the plan editor", async ({
    memberSession,
    mockedApis,
  }) => {
    // Mock simulation API to prevent real requests to /api/simulations
    await mockedApis.mockSimulationAPI();
    await mockedApis.mockNoticesAPI();

    await memberSession.goto("/");
    await memberSession.getByTestId("create-simulation").click();

    await expect(memberSession.locator("text=플랜 타입")).toBeVisible();
    await selectPlan(memberSession, "A");
    await clickNext(memberSession);
    await expect(memberSession.locator("text=가입한 회차")).toBeVisible();
  });
});

test.describe.skip("Advanced simulation scenarios", () => {
  // Batch operations, memo workflows, and multi-plan comparisons
});
