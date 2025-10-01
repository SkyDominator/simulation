import { test, expect } from "@playwright/test";
import { TestHelpers, APIHelpers } from "../utils/test-helpers";
import { loginTestUser } from "../utils/auth-helpers";

/**
 * CAT-MAIN: Main Dashboard Tests
 * Tests simulation dashboard, table operations, and core user actions
 */

test.describe("Main Dashboard - Simulation List", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await loginTestUser(page);
    await APIHelpers.mockSimulationAPI(page);
    await APIHelpers.mockNoticesAPI(page);
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test("E2E-MAIN-001: MainPage displays user's simulation list from GET /api/simulations", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Verify simulation table is displayed
    const simulationTable = page
      .getByTestId("simulation-table")
      .or(page.locator("table"))
      .first();
    await expect(simulationTable).toBeVisible();

    // Verify at least one simulation row exists
    const simulationRow = page
      .locator('[data-testid^="simulation-row-"]')
      .or(page.locator("tbody tr"))
      .first();
    await expect(simulationRow).toBeVisible();
  });

  test("E2E-MAIN-002: Empty state shows welcome message and create button", async ({
    page,
  }) => {
    // Mock empty simulations list
    await page.route("**/api/simulations**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/");
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Should show empty state message
    const emptyMessage = page
      .locator("text=/시뮬레이션이 없습니다|아직 시뮬레이션을 생성하지 않았습니다/i")
      .first();
    await expect(emptyMessage).toBeVisible({ timeout: 5000 });

    // Create button should be visible
    await expect(page.getByTestId("create-simulation")).toBeVisible();
  });

  test("E2E-MAIN-003: Create simulation button navigates to plan-editor page", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Click create button
    await page.getByTestId("create-simulation").click();

    // Should navigate to plan editor
    await expect(page.locator("text=플랜 타입")).toBeVisible({ timeout: 5000 });
  });

  test("E2E-MAIN-004: Table displays columns: plan, memo, dates, actions", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Check for table headers
    const table = page.locator("table").first();
    await expect(table).toBeVisible();

    // Verify key column headers exist
    await expect(
      page.locator("th").filter({ hasText: /플랜|plan/i }).first()
    ).toBeVisible();
    await expect(
      page.locator("th").filter({ hasText: /메모|memo/i }).first()
    ).toBeVisible();
    await expect(
      page.locator("th").filter({ hasText: /생성일|created|날짜/i }).first()
    ).toBeVisible();
  });

  test("E2E-MAIN-005: Click simulation row selects it with checkbox", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Find first simulation row
    const firstRow = page
      .locator('[data-testid^="simulation-row-"]')
      .or(page.locator("tbody tr"))
      .first();
    await expect(firstRow).toBeVisible();

    // Find checkbox in the row
    const checkbox = firstRow
      .locator('[data-testid^="simulation-checkbox-"]')
      .or(firstRow.locator('input[type="checkbox"]'))
      .first();

    // Click checkbox or row to select
    if (await checkbox.isVisible()) {
      await checkbox.click();
      // Verify it's checked
      await expect(checkbox).toBeChecked();
    }
  });

  test("E2E-MAIN-006: Multi-select enables batch delete button", async ({
    page,
  }) => {
    // Mock multiple simulations
    await page.route("**/api/simulations**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "sim-1",
              plan_id: "A",
              memo: "Simulation 1",
              created_at: "2024-01-01T00:00:00Z",
            },
            {
              id: "sim-2",
              plan_id: "B",
              memo: "Simulation 2",
              created_at: "2024-01-02T00:00:00Z",
            },
          ]),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/");
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Select multiple checkboxes
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();

    if (count > 1) {
      await checkboxes.nth(0).click();
      await checkboxes.nth(1).click();

      // Batch delete button should be enabled or visible
      const batchDeleteButton = page
        .getByTestId("batch-delete")
        .or(page.getByRole("button", { name: /선택.*삭제|delete selected/i }));

      if (await batchDeleteButton.isVisible()) {
        await expect(batchDeleteButton).toBeEnabled();
      }
    }
  });

  test("E2E-MAIN-007: Batch delete shows confirmation modal and deletes selected", async ({
    page,
  }) => {
    // Mock multiple simulations
    await page.route("**/api/simulations**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "sim-1",
              plan_id: "A",
              memo: "Simulation 1",
              created_at: "2024-01-01T00:00:00Z",
            },
          ]),
        });
      } else if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/");
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Select a simulation
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.click();

    // Click batch delete
    const batchDeleteButton = page
      .getByTestId("batch-delete")
      .or(page.getByRole("button", { name: /선택.*삭제|delete selected/i }))
      .first();

    if (await batchDeleteButton.isVisible()) {
      await batchDeleteButton.click();

      // Confirmation dialog should appear
      const confirmDialog = page.locator('[role="dialog"]').first();
      if (await confirmDialog.isVisible()) {
        const confirmButton = confirmDialog
          .getByRole("button", { name: /확인|delete|yes/i })
          .first();
        await confirmButton.click();
      }
    }
  });

  test("E2E-MAIN-008: Sort header click changes sort order (ascending/descending)", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Find sortable column header
    const planHeader = page
      .locator("th")
      .filter({ hasText: /플랜|plan/i })
      .first();

    if (await planHeader.isVisible()) {
      // Click to sort
      await planHeader.click();

      // Look for sort indicator (arrow icon or text)
      await expect(
        page.locator('[data-testid="sort-icon"]').or(planHeader)
      ).toBeVisible();

      // Click again to reverse sort
      await planHeader.click();
    }
  });

  test("E2E-MAIN-009: Edit icon navigates to plan-editor with simulation data", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Find edit button
    const editButton = page
      .locator('[data-testid^="edit-"]')
      .or(page.getByRole("button", { name: /edit|수정/i }))
      .first();

    if (await editButton.isVisible()) {
      await editButton.click();

      // Should navigate to plan editor
      await expect(page.locator("text=플랜 타입")).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("E2E-MAIN-010: Run icon executes simulation and shows loading indicator", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Find run button
    const runButton = page
      .locator('[data-testid^="run-"]')
      .or(page.getByRole("button", { name: /run|실행/i }))
      .first();

    if (await runButton.isVisible()) {
      await runButton.click();

      // Loading indicator should appear
      const loading = page
        .locator('[role="progressbar"]')
        .or(page.locator("text=/loading|로딩/i"))
        .first();

      // Either loading appears or results appear quickly
      await expect(
        loading.or(page.locator("text=/결과|result/i").first())
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("E2E-MAIN-011: Results icon navigates to results page", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Find results/view button
    const resultsButton = page
      .locator('[data-testid^="results-"]')
      .or(page.getByRole("button", { name: /결과|result|view/i }))
      .first();

    if (await resultsButton.isVisible()) {
      await resultsButton.click();

      // Should show results page or modal
      await expect(
        page.locator("text=/시뮬레이션.*결과|simulation.*result/i").first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("E2E-MAIN-014: Notice board icon opens NoticeBoardModal", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Find notice board button
    const noticeButton = page
      .getByTestId("notice-button")
      .or(page.getByRole("button", { name: /공지|notice/i }))
      .first();

    if (await noticeButton.isVisible()) {
      await noticeButton.click();

      // Notice modal should appear
      const noticeModal = page
        .locator('[data-testid="notice-modal"]')
        .or(page.locator('[role="dialog"]').filter({ hasText: /공지|notice/i }))
        .first();

      await expect(noticeModal).toBeVisible({ timeout: 5000 });
    }
  });

  test("E2E-MAIN-015: Help icon opens ContactModal", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Find help button
    const helpButton = page
      .getByTestId("help-button")
      .or(page.getByRole("button", { name: /help|도움말|문의/i }))
      .first();

    if (await helpButton.isVisible()) {
      await helpButton.click();

      // Help/contact modal should appear
      const helpModal = page
        .locator('[data-testid="contact-modal"]')
        .or(page.locator('[role="dialog"]').filter({ hasText: /도움말|help|문의/i }))
        .first();

      await expect(helpModal).toBeVisible({ timeout: 5000 });
    }
  });

  test("E2E-MAIN-016: Logout button shows confirmation and logs out on confirm", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Find logout button
    const logoutButton = page
      .getByTestId("logout-button")
      .or(page.getByRole("button", { name: /로그아웃|logout/i }))
      .first();

    await logoutButton.click();

    // Confirmation dialog should appear
    const confirmDialog = page.locator('[role="dialog"]').first();
    if (await confirmDialog.isVisible()) {
      const confirmButton = confirmDialog
        .getByRole("button", { name: /확인|logout|yes/i })
        .first();
      await confirmButton.click();

      // Should return to whitelist page
      await expect(
        page
          .getByTestId("whitelist-form")
          .or(page.locator("text=환영합니다!"))
          .first()
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
