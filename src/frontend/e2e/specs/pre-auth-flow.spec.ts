import { test, expect } from "../fixtures/base";
import { TEST_USERS, TEST_OTP_CODES } from "../fixtures/test-data";
import { completePreAuthJourney } from "../utils/journey-actions";
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
        afterWhitelist: async (currentPage) => {
          await expect(
            currentPage.locator("h5").filter({ hasText: "환영합니다!" })
          ).toBeVisible();
          await expect(currentPage.getByTestId("whitelist-form")).toBeVisible();
          await expect(currentPage.getByTestId("otp-form")).toBeVisible();
          await expect(currentPage.locator("text=/\\d{2}:\\d{2}/")).toBeVisible(
            {
              timeout: 5000,
            }
          );
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
});
