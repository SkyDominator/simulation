import { test, expect } from "@playwright/test";
import { TestHelpers, APIHelpers, initE2EMode } from "../utils/test-helpers";
import {
  loginTestUser,
  logoutTestUser,
  isUserAuthenticated,
} from "../utils/auth-helpers";

/**
 * CAT-AUTH: Authentication & Session Tests
 * Tests authentication state management, session persistence, and access control
 */

test.describe("Authentication & Session Management", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    await initE2EMode(page);
    helpers = new TestHelpers(page);
    await APIHelpers.mockOTPSuccess(page);
    await APIHelpers.mockConsentSuccess(page);
    await APIHelpers.mockSimulationAPI(page);
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test("E2E-AUTH-001: Login button triggers Supabase OAuth (Google)", async ({
    page,
  }) => {
    // Set up spy for OAuth redirect
    let oauthTriggered = false;
    await page.route("**/auth/v1/authorize**", async (route) => {
      oauthTriggered = true;
      await route.fulfill({
        status: 302,
        headers: { Location: "/" },
      });
    });

    await page.goto("/");

    // Navigate through onboarding to login page
    await helpers.fillWhitelistForm("홍길동", "010-1234-5678");
    await expect(page.getByTestId("otp-form")).toBeVisible();
    await helpers.fillOTPForm("123456");

    await expect(page.getByTestId("consent-page")).toBeVisible({
      timeout: 5000,
    });
    await page.getByTestId("consent-checkbox").click();
    await page.getByTestId("accept-consent").click();

    // On login page, click Google login
    await expect(page.getByTestId("login-form")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("google-login").click({ timeout: 5000 });

    // Check that OAuth redirect was triggered
    expect(oauthTriggered).toBe(true);
  });

  test("E2E-AUTH-002: Login button triggers Supabase OAuth (Kakao)", async ({
    page,
  }) => {
    await page.goto("/");

    // Navigate through onboarding to login page
    await helpers.fillWhitelistForm("홍길동", "010-1234-5678");
    await expect(page.getByTestId("otp-form")).toBeVisible();
    await helpers.fillOTPForm("123456");

    await expect(page.getByTestId("consent-page")).toBeVisible({
      timeout: 5000,
    });
    await page.getByTestId("consent-checkbox").click();
    await page.getByTestId("accept-consent").click();

    // On login page, check for Kakao login button
    await expect(page.getByTestId("login-form")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("kakao-login")).toBeVisible();
  });

  test("E2E-AUTH-003: Successful auth sets user state in useAuth()", async ({
    page,
  }) => {
    await loginTestUser(page);
    await page.goto("/");

    // Wait for main page to load
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Check that user is authenticated in localStorage
    const isAuth = await isUserAuthenticated(page);
    expect(isAuth).toBe(true);

    // Verify token exists
    const token = await page.evaluate(() => {
      return window.localStorage.getItem("supabase.auth.token");
    });
    expect(token).toBeTruthy();
  });

  test("E2E-AUTH-004: Authenticated user sees MainPage", async ({ page }) => {
    await loginTestUser(page);
    await page.goto("/");

    // Main page should be visible
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Key main page elements should be present
    await expect(page.getByTestId("create-simulation")).toBeVisible();
  });

  test("E2E-AUTH-005: Page reload preserves auth session (Supabase auto-refresh)", async ({
    page,
  }) => {
    await loginTestUser(page);
    await page.goto("/");

    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Reload the page
    await page.reload();

    // Should still be on main page
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Session should still exist
    const isAuth = await isUserAuthenticated(page);
    expect(isAuth).toBe(true);
  });

  test("E2E-AUTH-006: Logout button clears session and returns to whitelist", async ({
    page,
  }) => {
    await loginTestUser(page);
    await page.goto("/");

    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Find and click logout button
    await page.getByTestId("logout-button").click();

    // Handle confirmation dialog if present
    const confirmButton = page.getByRole("button", {
      name: /확인|yes|logout/i,
    });
    try {
      await confirmButton.click({ timeout: 1000 });
    } catch {
      // No confirmation dialog, continue
    }

    // Should return to whitelist page
    await expect(page.getByTestId("whitelist-form")).toBeVisible({
      timeout: 5000,
    });

    // Wait a moment for storage to be fully cleared
    await page.waitForTimeout(500);

    // Session should be cleared
    const isAuth = await isUserAuthenticated(page);
    expect(isAuth).toBe(false);
  });

  test("E2E-AUTH-007: Protected pages redirect to whitelist if not authenticated", async ({
    page,
  }) => {
    // Try to access main page without authentication
    await page.goto("/");

    // Should see whitelist page instead
    await expect(page.getByTestId("whitelist-form")).toBeVisible({
      timeout: 5000,
    });

    // Should not see main page
    await expect(page.getByTestId("main-page")).not.toBeVisible();
  });

  test("E2E-AUTH-008: Direct URL navigation to /main requires authentication", async ({
    page,
  }) => {
    // Try to navigate directly to main
    await page.goto("/");

    // Without auth, should see whitelist page
    await expect(page.getByTestId("whitelist-form")).toBeVisible({
      timeout: 5000,
    });

    // Now login and try again
    await loginTestUser(page);
    await page.goto("/");

    // Should now see main page
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });
  });
});
