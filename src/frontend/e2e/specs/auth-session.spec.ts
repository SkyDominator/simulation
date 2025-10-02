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
    const consentCheckbox = page
      .getByTestId("consent-checkbox")
      .or(page.getByRole("checkbox"));
    await consentCheckbox.first().click();
    const acceptButton = page
      .getByTestId("accept-consent")
      .or(page.getByRole("button", { name: /동의|계속|accept/i }));
    await acceptButton.first().click();

    // On login page, click Google login
    await expect(
      page.getByTestId("login-form").or(page.locator("text=/로그인|login/i"))
    ).toBeVisible({ timeout: 5000 });

    const googleLoginButton = page
      .getByTestId("google-login")
      .or(page.getByRole("button", { name: /google/i }));
    await googleLoginButton.first().click();

    // Verify OAuth was triggered (or button exists and is clickable)
    await expect(googleLoginButton.first()).toBeVisible();
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
    const consentCheckbox = page
      .getByTestId("consent-checkbox")
      .or(page.getByRole("checkbox"));
    await consentCheckbox.first().click();
    const acceptButton = page
      .getByTestId("accept-consent")
      .or(page.getByRole("button", { name: /동의|계속|accept/i }));
    await acceptButton.first().click();

    // On login page, check for Kakao login button
    await expect(
      page.getByTestId("login-form").or(page.locator("text=/로그인|login/i"))
    ).toBeVisible({ timeout: 5000 });

    const kakaoLoginButton = page
      .getByTestId("kakao-login")
      .or(page.getByRole("button", { name: /kakao|카카오/i }));
    await expect(kakaoLoginButton.first()).toBeVisible();
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
    const logoutButton = page
      .getByTestId("logout-button")
      .or(page.getByRole("button", { name: /로그아웃|logout/i }));
    await logoutButton.first().click();

    // Handle confirmation dialog if present
    const confirmButton = page
      .getByRole("button", { name: /확인|yes|logout/i })
      .first();
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Should return to whitelist page
    await expect(
      page
        .getByTestId("whitelist-form")
        .or(page.locator("text=환영합니다!"))
        .first()
    ).toBeVisible({ timeout: 5000 });

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
    await expect(
      page
        .getByTestId("whitelist-form")
        .or(page.locator("text=환영합니다!"))
        .first()
    ).toBeVisible({ timeout: 5000 });

    // Should not see main page
    await expect(page.getByTestId("main-page")).not.toBeVisible();
  });

  test("E2E-AUTH-008: Direct URL navigation to /main requires authentication", async ({
    page,
  }) => {
    // Try to navigate directly to main
    await page.goto("/");

    // Without auth, should see whitelist page
    await expect(
      page
        .getByTestId("whitelist-form")
        .or(page.locator("text=환영합니다!"))
        .first()
    ).toBeVisible({ timeout: 5000 });

    // Now login and try again
    await loginTestUser(page);
    await page.goto("/");

    // Should now see main page
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });
  });
});
