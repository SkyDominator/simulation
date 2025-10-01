import { test, expect } from "@playwright/test";
import { TestHelpers, APIHelpers } from "../utils/test-helpers";
import { TEST_USERS } from "../fixtures/test-data";
import { loginTestUser } from "../utils/auth-helpers";

/**
 * CAT-ERROR: Error Handling Tests
 * Tests error recovery, user feedback, and graceful degradation
 */

test.describe("Error Handling and Recovery", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test("E2E-ERR-001: Network error on OTP send shows user-friendly alert", async ({
    page,
  }) => {
    await APIHelpers.mockNetworkError(page, "/api/otp/send");

    await page.goto("/");
    await helpers.fillWhitelistForm(
      TEST_USERS.WHITELISTED.name,
      TEST_USERS.WHITELISTED.phone
    );

    await expect(page.getByRole("alert")).toContainText(
      "서비스에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
    );
    await expect(page.getByTestId("submit-whitelist")).toBeEnabled();
  });

  test("E2E-ERR-002: Network error preserves form state and allows retry", async ({
    page,
  }) => {
    await APIHelpers.mockNetworkError(page, "/api/otp/send");

    await page.goto("/");

    const name = TEST_USERS.WHITELISTED.name;
    const phone = TEST_USERS.WHITELISTED.phone;

    await helpers.fillWhitelistForm(name, phone);

    // Wait for error
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 5000 });

    // Form state should be preserved
    const nameInput = page.getByLabel("이름");
    const phoneInput = page.getByLabel("휴대폰 번호");

    expect(await nameInput.inputValue()).toBe(name);
    expect(await phoneInput.inputValue()).toBe(phone);

    // Submit button should be enabled for retry
    await expect(page.getByTestId("submit-whitelist")).toBeEnabled();
  });

  test("E2E-ERR-003: Validation error shows inline error text", async ({
    page,
  }) => {
    await APIHelpers.mockOTPSuccess(page);
    await page.goto("/");

    // Try to submit with empty name
    const phoneInput = page.getByLabel("휴대폰 번호");
    await phoneInput.fill("010-1234-5678");

    const submitButton = page.getByRole("button", { name: "인증번호 받기" });
    await submitButton.click();

    // Should show validation error
    const errorText = page.locator("text=/필수|required|입력/i").first();
    await expect(errorText).toBeVisible({ timeout: 3000 });
  });

  test("E2E-ERR-004: API 401 error redirects to login page", async ({
    page,
  }) => {
    await loginTestUser(page);
    await page.goto("/");

    // Mock 401 response
    await page.route("**/api/simulations", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Unauthorized" }),
      });
    });

    // Try to access protected resource
    await page.reload();

    // Should redirect to whitelist/login
    await expect(
      page
        .getByTestId("whitelist-form")
        .or(page.locator("text=환영합니다!"))
        .first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("E2E-ERR-005: API 403 error shows permission denied alert", async ({
    page,
  }) => {
    await loginTestUser(page);
    await APIHelpers.mockSimulationAPI(page);
    await page.goto("/");

    // Mock 403 response for admin endpoint
    await page.route("**/api/admin/**", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Admin privileges required" }),
      });
    });

    // Try to access admin feature (if available in UI)
    const adminButton = page
      .getByTestId("admin-button")
      .or(page.getByRole("button", { name: /admin|관리자/i }))
      .first();

    if (await adminButton.isVisible()) {
      await adminButton.click();

      // Should show permission error
      await expect(
        page.locator("text=/권한|permission|denied/i").first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("E2E-ERR-006: API 404 error shows resource not found message", async ({
    page,
  }) => {
    await loginTestUser(page);
    await page.goto("/");

    // Mock 404 for specific simulation
    await page.route("**/api/simulations/nonexistent-id", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Simulation not found" }),
      });
    });

    // Try to access non-existent simulation (manually navigate)
    await page.evaluate(() => {
      window.location.href = "/?sim=nonexistent-id";
    });

    // Should show not found message
    await expect(
      page.locator("text=/찾을 수 없습니다|not found/i").first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("E2E-ERR-007: API 500 error shows generic error message", async ({
    page,
  }) => {
    await loginTestUser(page);
    await page.goto("/");

    // Mock 500 response
    await page.route("**/api/simulations", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Internal server error" }),
      });
    });

    await page.reload();

    // Should show generic error
    await expect(
      page.locator("text=/오류가 발생|error occurred|server error/i").first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("E2E-ERR-008: Multiple errors don't break UI (error boundary)", async ({
    page,
  }) => {
    await loginTestUser(page);
    await APIHelpers.mockSimulationAPI(page);
    await page.goto("/");

    // Cause multiple errors in succession
    await page.route("**/api/otp/send", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Error 1" }),
      });
    });

    await page.route("**/api/simulations", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Error 2" }),
      });
    });

    // Navigate around
    await page.reload();

    // UI should still be responsive
    await expect(page.locator("body")).toBeVisible();
    const buttons = page.getByRole("button");
    expect(await buttons.count()).toBeGreaterThan(0);
  });

  test("E2E-ERR-009: Session expiry during operation redirects to login", async ({
    page,
  }) => {
    await loginTestUser(page);
    await APIHelpers.mockSimulationAPI(page);
    await page.goto("/");

    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Simulate session expiry
    await page.evaluate(() => {
      window.localStorage.removeItem("supabase.auth.token");
    });

    // Try to perform an action
    const createButton = page.getByTestId("create-simulation");
    await createButton.click();

    // Should redirect to login (or whitelist)
    await expect(
      page
        .getByTestId("whitelist-form")
        .or(page.locator("text=환영합니다!"))
        .first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("E2E-ERR-010: Browser back button during error state works correctly", async ({
    page,
  }) => {
    await APIHelpers.mockOTPSuccess(page);
    await APIHelpers.mockConsentSuccess(page);
    await page.goto("/");

    // Go through onboarding
    await helpers.fillWhitelistForm(
      TEST_USERS.WHITELISTED.name,
      TEST_USERS.WHITELISTED.phone
    );

    await expect(page.getByTestId("otp-form")).toBeVisible();

    // Cause an error
    await APIHelpers.mockOTPFailure(page, "invalid_code");
    await helpers.fillOTPForm("000000");

    // Error should appear
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 3000 });

    // Press back button
    await page.goBack();

    // Should go back to previous state (whitelist form)
    await expect(
      page
        .getByTestId("whitelist-form")
        .or(page.locator("text=환영합니다!"))
        .first()
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe.skip("Advanced error scenarios", () => {
  // Placeholder for future coverage (offline mode, background sync, etc.)
});

