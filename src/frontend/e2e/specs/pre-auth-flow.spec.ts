import { test, expect } from "../fixtures/base";
import { TEST_USERS, TEST_OTP_CODES } from "../fixtures/test-data";
import { fillWhitelistForm, fillOTPForm } from "../utils/journey-actions";
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

    // Navigate to application start
    await page.goto("/");

    // Step 1: Whitelist Check
    // User should see welcome message and whitelist form
    await expect(
      page.locator("h5").filter({ hasText: "환영합니다!" })
    ).toBeVisible();
    await expect(page.getByTestId("whitelist-form")).toBeVisible();

    // Fill and submit whitelist form
    await fillWhitelistForm(
      page,
      TEST_USERS.WHITELISTED.name,
      TEST_USERS.WHITELISTED.phone
    );

    // Step 2: OTP Verification
    // User should see OTP form after successful whitelist check
    await expect(page.getByTestId("otp-form")).toBeVisible();

    // Verify countdown timer appears (format: MM:SS)
    const timer = page.locator("text=/\\d{2}:\\d{2}/");
    await expect(timer).toBeVisible({ timeout: 5000 });

    // Fill and submit OTP code
    await fillOTPForm(page, TEST_OTP_CODES.VALID);

    // Step 3 & 4: Consent Flow Orchestration and Privacy Policy Consent
    // After successful OTP verification, user proceeds to consent page
    // (If no prior consent exists, consent page appears; otherwise goes to login)
    await expect(page.getByTestId("consent-page")).toBeVisible();

    // Verify policy content is loaded and visible
    const policyContent = page.locator('[data-testid="consent-page"]');
    await expect(policyContent).toBeVisible();

    // User accepts privacy policy
    await page.getByTestId("consent-checkbox").click();
    await page.getByTestId("accept-consent").click();

    // Step 5: OAuth Login
    // User should see login page with OAuth provider buttons
    await expect(page.getByTestId("login-form")).toBeVisible();

    // Verify OAuth buttons are visible
    await expect(page.getByTestId("google-login")).toBeVisible();
    await expect(page.getByTestId("kakao-login")).toBeVisible();

    // Check that login buttons are not disabled (no embedded browser detected)
    await expect(page.getByTestId("google-login")).toBeEnabled();
    await expect(page.getByTestId("kakao-login")).toBeEnabled();

    // Inject auth token before OAuth click (simulates successful authentication)
    await loginTestUser(page);

    // Click Google OAuth button
    await page.getByTestId("google-login").click();

    // Step 6: Post-Login Navigation
    // User should land on the main dashboard
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Verify dashboard elements are present
    await expect(
      page.locator("h5").filter({ hasText: "생명빛 클럽 시뮬레이션" })
    ).toBeVisible();
  });
});
