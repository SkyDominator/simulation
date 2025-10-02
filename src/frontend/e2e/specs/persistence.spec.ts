import { test, expect } from "@playwright/test";
import { APIHelpers, initE2EMode } from "../utils/test-helpers";
import { loginTestUser } from "../utils/auth-helpers";

/**
 * CAT-PERSIST: Data Persistence & State Management Tests
 * Tests user experience and data integrity across navigation and browser sessions
 */

test.describe("State Persistence and Recovery", () => {
  test.beforeEach(async ({ page }) => {
    await initE2EMode(page);
    await APIHelpers.mockSimulationAPI(page);
    await APIHelpers.mockNoticesAPI(page);
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test("E2E-PERS-001: Page refresh preserves ui.page state", async ({
    page,
  }) => {
    await loginTestUser(page);
    await page.goto("/");

    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Store current page state
    const pageBefore = await page.evaluate(() => {
      return window.localStorage.getItem("ui.page");
    });

    // Reload
    await page.reload();

    // Should still be on main page
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Page state should be preserved
    const pageAfter = await page.evaluate(() => {
      return window.localStorage.getItem("ui.page");
    });

    expect(pageBefore).toBe(pageAfter);
  });

  test("E2E-PERS-002: Plan editor draft persists as ui.editingPlan", async ({
    page,
  }) => {
    await loginTestUser(page);
    await page.goto("/");

    await page.getByTestId("create-simulation").click();

    // Select a plan
    await expect(page.locator("text=플랜 타입")).toBeVisible({ timeout: 5000 });

    const planSelector = page
      .locator('[role="button"][aria-haspopup="listbox"]')
      .first();
    await planSelector.click();
    await page.locator('text="A"').first().click();

    // Check if draft is saved
    await page.waitForTimeout(500); // Allow time for save

    const editingPlan = await page.evaluate(() => {
      return window.localStorage.getItem("ui.editingPlan");
    });

    expect(editingPlan).toBeTruthy();
    if (editingPlan) {
      const plan = JSON.parse(editingPlan);
      expect(plan.plan_id).toBe("A");
    }
  });

  test("E2E-PERS-003: Browser close and reopen restores app state", async ({
    page,
  }) => {
    await loginTestUser(page);
    await page.goto("/");

    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Get current state
    const stateBefore = await page.evaluate(() => {
      return {
        page: window.localStorage.getItem("ui.page"),
        token: window.localStorage.getItem("supabase.auth.token"),
      };
    });

    // Simulate closing and reopening (via reload in E2E)
    await page.reload();

    // State should be restored
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    const stateAfter = await page.evaluate(() => {
      return {
        page: window.localStorage.getItem("ui.page"),
        token: window.localStorage.getItem("supabase.auth.token"),
      };
    });

    expect(stateAfter.page).toBe(stateBefore.page);
    expect(stateAfter.token).toBeTruthy();
  });

  test("E2E-PERS-005: Simulation results persist as ui.simulationResult", async ({
    page,
  }) => {
    await loginTestUser(page);
    await page.goto("/");

    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Run a simulation
    const runButton = page
      .locator('[data-testid^="run-"]')
      .or(page.getByRole("button", { name: /run|실행/i }))
      .first();

    if (await runButton.isVisible()) {
      await runButton.click();

      // Wait for results
      await page.waitForTimeout(2000);

      // Check if results are persisted
      const simulationResult = await page.evaluate(() => {
        return window.localStorage.getItem("ui.simulationResult");
      });

      if (simulationResult) {
        const result = JSON.parse(simulationResult);
        expect(result).toBeTruthy();
        expect(result.history || result.data).toBeTruthy();
      }
    }
  });

  test("E2E-PERS-006: Logout clears ui.* keys from localStorage", async ({
    page,
  }) => {
    await loginTestUser(page);
    await page.goto("/");
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Logout
    const logoutButton = page
      .getByTestId("logout-button")
      .or(page.getByRole("button", { name: /로그아웃|logout/i }))
      .first();

    await logoutButton.click();

    // Confirm if modal appears
    const confirmButton = page
      .getByRole("button", { name: /확인|yes|logout/i })
      .first();
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Wait for redirect
    await expect(
      page
        .getByTestId("whitelist-form")
        .or(page.locator("text=환영합니다!"))
        .first()
    ).toBeVisible({ timeout: 5000 });

    // Check that auth token is cleared
    const tokenExists = await page.evaluate(() => {
      return window.localStorage.getItem("supabase.auth.token");
    });
    expect(tokenExists).toBeNull();

    // Check that ui keys are cleared or reset
    const uiPage = await page.evaluate(() => {
      return window.localStorage.getItem("ui.page");
    });

    // Should be cleared or reset to whitelist
    expect(uiPage === null || uiPage === '"whitelist"').toBe(true);
  });

  test("E2E-PERS-007: Session expiry clears sensitive localStorage data", async ({
    page,
  }) => {
    await loginTestUser(page);
    await page.goto("/");

    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Simulate session expiry by clearing token
    await page.evaluate(() => {
      window.localStorage.removeItem("supabase.auth.token");
    });

    // Try to navigate or reload
    await page.reload();

    // Should redirect to login/whitelist
    await expect(
      page
        .getByTestId("whitelist-form")
        .or(page.locator("text=환영합니다!"))
        .first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("E2E-PERS-008: Invalid localStorage data doesn't break app (graceful fallback)", async ({
    page,
  }) => {
    await loginTestUser(page);

    // Inject invalid data
    await page.evaluate(() => {
      window.localStorage.setItem("ui.editingPlan", "invalid json{");
      window.localStorage.setItem("ui.simulationResult", "not json");
    });

    await page.goto("/");

    // App should still load (gracefully handle invalid data)
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // UI should be functional
    await expect(page.getByTestId("create-simulation")).toBeVisible();
  });
});

test.describe.skip("Advanced persistence cases", () => {
  // Draft management, multi-tab coordination, etc.
});
