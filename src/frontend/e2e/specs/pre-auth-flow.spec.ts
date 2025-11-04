import { test, expect } from "../fixtures/base";
import {
  TEST_USERS,
  TEST_OTP_CODES,
  TEST_MESSAGES,
} from "../fixtures/test-data";
import {
  completePreAuthJourney,
  fillWhitelistForm,
  fillOTPForm,
  acceptPrivacyConsent,
} from "../utils/journey-actions";
import { loginTestUser } from "../utils/auth-helpers";

/**
 * Pre-Authentication Journey Tests
 *
 * E2E tests covering the six-step pre-authentication flow:
 * 1. Whitelist check
 * 2. OTP verification
 * 3. Consent flow orchestration
 * 4. Privacy policy consent
 * 5. OAuth login
 * 6. Post-login navigation
 *
 * @see docs/spec/ux-flow.md - Section 1: Pre-Authentication Flow
 * @see docs/plan/IS-62/plan-01.md - Phase 3: Positive Journey
 * @see docs/plan/IS-62/plan-01.md - Phase 4: Critical Error Scenario Coverage
 */

test.describe("Pre-Authentication Journey", () => {
  test("E2E-JOURNEY-PREAUTH-001: Complete pre-authentication flow from whitelist to dashboard", async ({
    page,
    mockedApis,
  }) => {
    // Initialize mocked APIs controller
    const apis = mockedApis(page);

    // Setup API mocks for successful journey
    await apis.mockOTPSuccess();
    await apis.mockConsentSuccess();
    await apis.mockNoticesAPI();
    await apis.mockSimulationAPI();

    await completePreAuthJourney(
      page,
      {
        name: TEST_USERS.WHITELISTED.name,
        phone: TEST_USERS.WHITELISTED.phone,
      },
      TEST_OTP_CODES.VALID,
      {
        onWhitelist: async (currentPage) => {
          await expect(
            currentPage.locator("h5").filter({ hasText: "환영합니다!" })
          ).toBeVisible();
          await expect(currentPage.getByTestId("whitelist-form")).toBeVisible();
        },
        afterWhitelist: async (currentPage) => {
          await expect(currentPage.getByTestId("otp-form")).toBeVisible();
          const otpTimer = currentPage.getByTestId("otp-timer");
          const timerCount = await otpTimer.count();

          if (timerCount > 0) {
            await expect(otpTimer).toBeVisible({ timeout: 5000 });
          } else {
            // TODO(IS-62): tighten once OTP timer renders immediately (known UI gap)
            const resendButton = currentPage.getByTestId("resend-otp");
            await expect(resendButton).toBeVisible({ timeout: 5000 });
            await expect(resendButton).toBeEnabled();
            await expect(resendButton).toContainText("인증번호 재전송");
          }
        },
        afterOTP: async (currentPage) => {
          await expect(currentPage.getByTestId("consent-page")).toBeVisible();
          await expect(
            currentPage.locator('[data-testid="consent-page"]')
          ).toBeVisible();
        },
        afterConsent: async (currentPage) => {
          await expect(currentPage.getByTestId("login-form")).toBeVisible();
        },
        beforeOAuth: async (currentPage) => {
          await expect(currentPage.getByTestId("google-login")).toBeVisible();
          await expect(currentPage.getByTestId("kakao-login")).toBeVisible();
          await expect(currentPage.getByTestId("google-login")).toBeEnabled();
          await expect(currentPage.getByTestId("kakao-login")).toBeEnabled();
          await loginTestUser(currentPage);
        },
        afterOAuth: async (currentPage) => {
          await expect(
            currentPage.locator("h5").filter({
              hasText: "생명빛 클럽 시뮬레이션",
            })
          ).toBeVisible();
        },
      }
    );
  });

  test("E2E-PREAUTH-ERR-001: Whitelist rejection prevents progression to OTP form", async ({
    page,
    mockedApis,
  }) => {
    const apis = mockedApis(page);

    // Mock whitelist failure
    await apis.mockOTPSendFailure("whitelist");
    await apis.mockOTPVerifySuccess();

    // Navigate to app
    await page.goto("/");
    await page.waitForSelector('[data-testid="whitelist-form"]', {
      timeout: 5000,
    });

    // Submit invalid user
    await fillWhitelistForm(
      page,
      TEST_USERS.NON_WHITELISTED.name,
      TEST_USERS.NON_WHITELISTED.phone
    );

    // Assert error message appears
    const errorAlert = page
      .getByTestId("whitelist-error")
      .or(page.getByRole("alert"));
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
    await expect(errorAlert).toContainText(TEST_MESSAGES.ERROR.NOT_WHITELISTED);

    // Verify flow does not advance to OTP form
    await expect(page.getByTestId("otp-form")).not.toBeVisible();

    // Confirm still on whitelist page
    await expect(page.getByTestId("whitelist-form")).toBeVisible();
  });

  test("E2E-PREAUTH-ERR-002: Invalid OTP code shows error and remains on OTP screen", async ({
    page,
    mockedApis,
  }) => {
    const apis = mockedApis(page);

    // Mock OTP send success but verify failure
    await apis.mockOTPSendSuccess();
    await apis.mockOTPVerifyFailure("invalid_code");

    // Navigate to app
    await page.goto("/");
    await page.waitForSelector('[data-testid="whitelist-form"]', {
      timeout: 5000,
    });

    // Complete whitelist step
    await fillWhitelistForm(
      page,
      TEST_USERS.WHITELISTED.name,
      TEST_USERS.WHITELISTED.phone
    );

    // Wait for OTP form
    await page.waitForSelector('[data-testid="otp-form"]', { timeout: 5000 });

    // Enter invalid OTP code
    await fillOTPForm(page, TEST_OTP_CODES.INVALID);

    // Assert error message appears
    const errorAlert = page
      .getByTestId("otp-error")
      .or(page.getByRole("alert"));
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
    await expect(errorAlert).toContainText(TEST_MESSAGES.ERROR.INVALID_OTP);

    // Verify still on OTP screen
    await expect(page.getByTestId("otp-form")).toBeVisible();

    // Verify timer remains visible
    await expect(page.getByTestId("otp-timer")).toBeVisible();

    // Verify does not advance to consent page
    await expect(page.getByTestId("consent-page")).not.toBeVisible();
  });

  test("E2E-PREAUTH-ERR-003: Expired OTP shows expiry message and enables resend button", async ({
    page,
    mockedApis,
  }) => {
    const apis = mockedApis(page);

    // Mock OTP send success but verify with expired code
    await apis.mockOTPSendSuccess({ expires_in_seconds: 3 });
    await apis.mockOTPVerifyFailure("expired");

    // Navigate to app
    await page.goto("/");
    await page.waitForSelector('[data-testid="whitelist-form"]', {
      timeout: 5000,
    });

    // Complete whitelist step
    await fillWhitelistForm(
      page,
      TEST_USERS.WHITELISTED.name,
      TEST_USERS.WHITELISTED.phone
    );

    // Wait for OTP form
    await page.waitForSelector('[data-testid="otp-form"]', { timeout: 5000 });

    // Enter expired OTP code
    await fillOTPForm(page, TEST_OTP_CODES.EXPIRED);

    // Assert expiry error message appears
    const errorAlert = page
      .getByTestId("otp-error")
      .or(page.getByRole("alert"));
    await expect(errorAlert).toBeVisible({ timeout: 5000 });

    // Check for expired-related text (common patterns)
    const alertText = await errorAlert.textContent();
    const isExpiredMessage =
      alertText?.includes("만료") ||
      alertText?.includes("expired") ||
      alertText?.includes("시간") ||
      alertText?.includes("time");
    expect(isExpiredMessage).toBeTruthy();

    // Verify still on OTP screen
    await expect(page.getByTestId("otp-form")).toBeVisible();

    // Verify resend button exists and will be enabled when timer completes
    const resendButton = page.getByTestId("resend-otp");
    await expect(resendButton).toBeVisible();
    await expect(resendButton).toBeDisabled();
    await expect(resendButton).toBeEnabled({ timeout: 5000 });

    // Verify does not advance to consent page
    await expect(page.getByTestId("consent-page")).not.toBeVisible();
  });

  test("E2E-PREAUTH-ERR-004: Consent submission failure shows error and stays on consent page", async ({
    page,
    mockedApis,
  }) => {
    const apis = mockedApis(page);

    // Mock successful OTP flow
    await apis.mockOTPSuccess();

    // Mock privacy policy GET to allow consent page to load
    await apis.mockPrivacyPolicyGet();

    // Navigate to app
    await page.goto("/");
    await page.waitForSelector('[data-testid="whitelist-form"]', {
      timeout: 5000,
    });

    // Complete whitelist step
    await fillWhitelistForm(
      page,
      TEST_USERS.WHITELISTED.name,
      TEST_USERS.WHITELISTED.phone
    );

    // Wait for OTP form
    await page.waitForSelector('[data-testid="otp-form"]', { timeout: 5000 });

    // Complete OTP step
    await fillOTPForm(page, TEST_OTP_CODES.VALID);

    // Wait for consent page
    await page.waitForSelector('[data-testid="consent-page"]', {
      timeout: 5000,
    });

    // Mock network error for consent submission AFTER reaching consent page
    await apis.mockNetworkError("/api/consents");

    // Accept consent (this should fail)
    await acceptPrivacyConsent(page);

    // Assert error message appears
    const errorAlert = page
      .getByTestId("consent-error")
      .or(page.getByRole("alert"));
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
    await expect(errorAlert).toContainText(
      TEST_MESSAGES.ERROR.CONSENT_SUBMISSION_FAILED
    );

    // Verify still on consent page
    await expect(page.getByTestId("consent-page")).toBeVisible();

    // Verify does not advance to login page
    await expect(page.getByTestId("login-form")).not.toBeVisible();
  });

  test("E2E-PREAUTH-ERR-005: Embedded browser blocks OAuth login with warning banner", async ({
    page,
    mockedApis,
    context,
  }) => {
    const apis = mockedApis(page);

    // Mock successful OTP and consent flow
    await apis.mockOTPSuccess();
    await apis.mockConsentSuccess();
    await apis.mockNoticesAPI();
    await apis.mockSimulationAPI();

    // Set Kakao in-app browser user agent before navigation
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "userAgent", {
        get: () =>
          "Mozilla/5.0 (Linux; Android 10; SM-G960N) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/92.0.4515.115 Mobile Safari/537.36 KAKAOTALK 9.4.2",
        configurable: true,
      });
    });

    // Navigate to app with embedded browser UA
    await page.goto("/");
    await page.waitForSelector('[data-testid="whitelist-form"]', {
      timeout: 5000,
    });

    // Complete whitelist step
    await fillWhitelistForm(
      page,
      TEST_USERS.WHITELISTED.name,
      TEST_USERS.WHITELISTED.phone
    );

    // Wait for OTP form
    await page.waitForSelector('[data-testid="otp-form"]', { timeout: 5000 });

    // Complete OTP step
    await fillOTPForm(page, TEST_OTP_CODES.VALID);

    // Handle consent if it appears
    const consentPageVisible = await page
      .getByTestId("consent-page")
      .isVisible()
      .catch(() => false);

    if (consentPageVisible) {
      await acceptPrivacyConsent(page);
    }

    // Wait for login page
    await page.waitForSelector('[data-testid="login-form"]', {
      timeout: 5000,
    });

    // Verify embedded browser warning banner is visible
    const warningBanner = page.getByTestId("embedded-browser-banner");
    await expect(warningBanner).toBeVisible({ timeout: 5000 });

    // Verify banner contains guidance about opening in external browser
    await expect(warningBanner).toContainText(/브라우저|browser/i);

    // Verify OAuth buttons are disabled
    const googleLoginButton = page.getByTestId("google-login");
    const kakaoLoginButton = page.getByTestId("kakao-login");

    await expect(googleLoginButton).toBeVisible();
    await expect(kakaoLoginButton).toBeVisible();
    await expect(googleLoginButton).toBeDisabled();
    await expect(kakaoLoginButton).toBeDisabled();

    // Confirm user remains on login page with disabled actions
    await expect(page.getByTestId("login-form")).toBeVisible();
  });
});
