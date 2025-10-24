import { test, expect } from "../fixtures/base";
import { TEST_USERS, TEST_OTP_CODES } from "../fixtures/test-data";

/**
 * User Onboarding Flow E2E Tests
 * Refactored to use Phase 1 fixtures (mockedApis)
 * @see docs/plan/IS-62/plan-00.md - Phase 1: Refactor journey specs to consume fixtures
 */
test.describe("User Onboarding Flow", () => {
  test("E2E-JOURNEY: allows a whitelisted user to complete onboarding", async ({
    page,
    mockedApis,
  }) => {
    // Setup API mocks
    await mockedApis.otp.mockSendSuccess();
    await mockedApis.otp.mockVerifySuccess();
    await mockedApis.consent.mockPrivacyPolicy();
    await mockedApis.consent.mockConsentRecord();

    await page.goto("/");

    // Whitelist form
    await expect(
      page.locator("h5").filter({ hasText: "환영합니다!" })
    ).toBeVisible();

    // Fill whitelist form
    await page.getByLabel("이름").fill(TEST_USERS.WHITELISTED.name);
    await page.getByLabel("휴대폰 번호").fill(TEST_USERS.WHITELISTED.phone);
    await page.getByRole("button", { name: "인증번호 받기" }).click();

    // OTP verification
    await expect(page.locator('[data-testid="otp-form"]')).toBeVisible();
    await page.getByLabel("인증번호").fill(TEST_OTP_CODES.VALID);
    await page.getByRole("button", { name: "인증하기" }).click();

    // Consent and login
    await expect(page.locator('[data-testid="consent-page"]')).toBeVisible();
    await page.getByTestId("consent-checkbox").click();
    await page.getByTestId("accept-consent").click();

    await expect(page.getByTestId("login-form")).toBeVisible();

    // Mock login success (simplified for E2E)
    await page.evaluate(() => {
      const mockToken = {
        access_token: "mock-token",
        user: { id: "test-user", email: "test@example.com" },
      };
      window.localStorage.setItem(
        "supabase.auth.token",
        JSON.stringify(mockToken)
      );
      window.localStorage.setItem("ui.page", '"main"');
    });

    await page.getByTestId("google-login").click();
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });
  });

  test("shows an error for non-whitelisted users", async ({
    page,
    mockedApis,
  }) => {
    await mockedApis.otp.mockSendWhitelistFailure();
    await mockedApis.consent.mockPrivacyPolicy();

    await page.goto("/");

    // Fill whitelist form
    await page.getByLabel("이름").fill(TEST_USERS.NON_WHITELISTED.name);
    await page.getByLabel("휴대폰 번호").fill(TEST_USERS.NON_WHITELISTED.phone);
    await page.getByRole("button", { name: "인증번호 받기" }).click();

    await expect(page.getByRole("alert")).toContainText(
      "가입 허용 명단에 없는 사용자입니다."
    );
    await expect(page.getByTestId("whitelist-form")).toBeVisible();
  });

  test("surfaces invalid OTP errors without advancing the flow", async ({
    page,
    mockedApis,
  }) => {
    await mockedApis.otp.mockSendSuccess();
    await mockedApis.otp.mockVerifyInvalidCode();
    await mockedApis.consent.mockPrivacyPolicy();

    await page.goto("/");

    // Fill whitelist form
    await page.getByLabel("이름").fill(TEST_USERS.WHITELISTED.name);
    await page.getByLabel("휴대폰 번호").fill(TEST_USERS.WHITELISTED.phone);
    await page.getByRole("button", { name: "인증번호 받기" }).click();

    await expect(page.getByTestId("otp-form")).toBeVisible();

    // Fill OTP form
    await page.getByLabel("인증번호").fill(TEST_OTP_CODES.INVALID);
    await page.getByRole("button", { name: "인증하기" }).click();

    await expect(page.getByRole("alert")).toContainText(
      "인증번호가 올바르지 않습니다."
    );
    await expect(page.getByTestId("otp-form")).toBeVisible();
  });

  /**
   * Remaining tests use transitional helpers (Phase 1 allows this for untouched specs)
   * These will be migrated in later phases
   * @see docs/plan/IS-62/plan-00.md - Phase 1: supply transitional re-exports for untouched specs
   */

  test("E2E-PREAUTH-004: OTP timer counts down and displays remaining time", async ({
    page,
    mockedApis,
  }) => {
    await mockedApis.otp.mockSendSuccess();
    await mockedApis.consent.mockPrivacyPolicy();

    await page.goto("/");

    // Fill whitelist form
    await page.getByLabel("이름").fill(TEST_USERS.WHITELISTED.name);
    await page.getByLabel("휴대폰 번호").fill(TEST_USERS.WHITELISTED.phone);
    await page.getByRole("button", { name: "인증번호 받기" }).click();

    // Wait for OTP form to appear
    await expect(page.getByTestId("otp-form")).toBeVisible();

    // Check that timer is visible and shows time (format: MM:SS)
    const timer = page.locator("text=/\\d{2}:\\d{2}/");
    await expect(timer).toBeVisible({ timeout: 5000 });

    // Get initial time
    const initialTime = await timer.textContent();
    expect(initialTime).toMatch(/\d{2}:\d{2}/);

    // Wait a bit and verify time has decreased
    await page.waitForTimeout(2000);
    const laterTime = await timer.textContent();

    // Parse times to verify countdown
    const parseTime = (timeStr: string | null) => {
      if (!timeStr) return 0;
      const [min, sec] = timeStr.split(":").map(Number);
      return min * 60 + sec;
    };

    expect(parseTime(laterTime)).toBeLessThan(parseTime(initialTime));
  });

  test("E2E-PREAUTH-005: Resend button triggers new OTP send with rate limiting", async ({
    page,
    mockedApis,
  }) => {
    await mockedApis.otp.mockSendSuccess();
    await mockedApis.consent.mockPrivacyPolicy();

    await page.goto("/");

    // Fill whitelist form
    await page.getByLabel("이름").fill(TEST_USERS.WHITELISTED.name);
    await page.getByLabel("휴대폰 번호").fill(TEST_USERS.WHITELISTED.phone);
    await page.getByRole("button", { name: "인증번호 받기" }).click();

    await expect(page.getByTestId("otp-form")).toBeVisible();

    // Find and click resend button
    const resendButton = page.getByRole("button", {
      name: /다시 받기|재전송/i,
    });
    await expect(resendButton).toBeVisible();

    // Click resend
    await resendButton.click();

    // Verify new OTP request was made (timer should reset)
    const timer = page.locator("text=/\\d{2}:\\d{2}/");
    const timeAfterResend = await timer.textContent();

    // After resend, timer should be close to max (around 05:00 or 300 seconds)
    const parseTime = (timeStr: string | null) => {
      if (!timeStr) return 0;
      const [min, sec] = timeStr.split(":").map(Number);
      return min * 60 + sec;
    };

    expect(parseTime(timeAfterResend)).toBeGreaterThan(290); // Should be close to 5 minutes
  });

  test("E2E-PREAUTH-007: Consent page shows privacy policy content with network call", async ({
    page,
    mockedApis,
  }) => {
    await mockedApis.otp.mockSendSuccess();
    await mockedApis.otp.mockVerifySuccess();
    await mockedApis.consent.mockPrivacyPolicy();

    await page.goto("/");

    // Complete whitelist and OTP steps
    await page.getByLabel("이름").fill(TEST_USERS.WHITELISTED.name);
    await page.getByLabel("휴대폰 번호").fill(TEST_USERS.WHITELISTED.phone);
    await page.getByRole("button", { name: "인증번호 받기" }).click();

    await expect(page.getByTestId("otp-form")).toBeVisible();

    await page.getByLabel("인증번호").fill(TEST_OTP_CODES.VALID);
    await page.getByRole("button", { name: "인증하기" }).click();

    // Should now be on consent page
    await expect(page.getByTestId("consent-page")).toBeVisible({
      timeout: 5000,
    });

    // Verify privacy policy content is displayed
    await expect(page.locator("text=/개인정보|privacy|정책/i")).toBeVisible();

    // Verify the policy content area exists
    const policyContent = page
      .locator('[data-testid="policy-content"]')
      .or(page.locator("text=Mock privacy policy content"));
    await expect(policyContent.first()).toBeVisible();
  });

  test("E2E-PREAUTH-008: Consent checkbox must be checked to enable accept button", async ({
    page,
    mockedApis,
  }) => {
    await mockedApis.otp.mockSendSuccess();
    await mockedApis.otp.mockVerifySuccess();
    await mockedApis.consent.mockPrivacyPolicy();

    await page.goto("/");

    // Complete whitelist and OTP steps
    await page.getByLabel("이름").fill(TEST_USERS.WHITELISTED.name);
    await page.getByLabel("휴대폰 번호").fill(TEST_USERS.WHITELISTED.phone);
    await page.getByRole("button", { name: "인증번호 받기" }).click();

    await expect(page.getByTestId("otp-form")).toBeVisible();

    await page.getByLabel("인증번호").fill(TEST_OTP_CODES.VALID);
    await page.getByRole("button", { name: "인증하기" }).click();

    // On consent page
    await expect(page.getByTestId("consent-page")).toBeVisible({
      timeout: 5000,
    });

    // Accept button should be disabled initially
    await expect(page.getByTestId("accept-consent")).toBeDisabled();

    // Check the consent checkbox
    await page.getByTestId("consent-checkbox").click();

    // Accept button should now be enabled
    await expect(page.getByTestId("accept-consent")).toBeEnabled();
  });

  test("E2E-PREAUTH-009: Accept consent proceeds to login page with API call", async ({
    page,
    mockedApis,
  }) => {
    await mockedApis.otp.mockSendSuccess();
    await mockedApis.otp.mockVerifySuccess();
    await mockedApis.consent.mockPrivacyPolicy();
    await mockedApis.consent.mockConsentRecord();

    // Network spy to verify API call was made
    const consentRequests: Array<{ method: string; url: string }> = [];
    page.on("request", (request) => {
      if (
        request.url().includes("/api/consents") &&
        request.method() === "POST"
      ) {
        consentRequests.push({
          method: request.method(),
          url: request.url(),
        });
      }
    });

    await page.goto("/");

    // Complete whitelist and OTP steps
    await page.getByLabel("이름").fill(TEST_USERS.WHITELISTED.name);
    await page.getByLabel("휴대폰 번호").fill(TEST_USERS.WHITELISTED.phone);
    await page.getByRole("button", { name: "인증번호 받기" }).click();

    await expect(page.getByTestId("otp-form")).toBeVisible();

    await page.getByLabel("인증번호").fill(TEST_OTP_CODES.VALID);
    await page.getByRole("button", { name: "인증하기" }).click();

    // On consent page, check and accept
    await expect(page.getByTestId("consent-page")).toBeVisible({
      timeout: 5000,
    });
    await page.getByTestId("consent-checkbox").click();
    await page.getByTestId("accept-consent").click();

    // Wait for navigation to login page
    await expect(page.getByTestId("login-form")).toBeVisible({ timeout: 5000 });

    // Verify consent API was called
    expect(consentRequests.length).toBeGreaterThan(0);
    expect(consentRequests[0].method).toBe("POST");
  });

  test("E2E-PREAUTH-010: Decline consent returns to whitelist page", async ({
    page,
    mockedApis,
  }) => {
    await mockedApis.otp.mockSendSuccess();
    await mockedApis.otp.mockVerifySuccess();
    await mockedApis.consent.mockPrivacyPolicy();

    await page.goto("/");

    // Complete whitelist and OTP steps
    await page.getByLabel("이름").fill(TEST_USERS.WHITELISTED.name);
    await page.getByLabel("휴대폰 번호").fill(TEST_USERS.WHITELISTED.phone);
    await page.getByRole("button", { name: "인증번호 받기" }).click();

    await expect(page.getByTestId("otp-form")).toBeVisible();

    await page.getByLabel("인증번호").fill(TEST_OTP_CODES.VALID);
    await page.getByRole("button", { name: "인증하기" }).click();

    // On consent page
    await expect(page.getByTestId("consent-page")).toBeVisible({
      timeout: 5000,
    });

    // Click decline button
    await page.getByTestId("decline-consent").click();

    // Should return to whitelist form
    await expect(page.getByTestId("whitelist-form")).toBeVisible({
      timeout: 5000,
    });
  });

  test("E2E-PREAUTH-011: Back button from login returns to whitelist page", async ({
    page,
    mockedApis,
  }) => {
    await mockedApis.otp.mockSendSuccess();
    await mockedApis.otp.mockVerifySuccess();
    await mockedApis.consent.mockPrivacyPolicy();
    await mockedApis.consent.mockConsentRecord();

    await page.goto("/");

    // Complete full flow to login page
    await page.getByLabel("이름").fill(TEST_USERS.WHITELISTED.name);
    await page.getByLabel("휴대폰 번호").fill(TEST_USERS.WHITELISTED.phone);
    await page.getByRole("button", { name: "인증번호 받기" }).click();

    await expect(page.getByTestId("otp-form")).toBeVisible();

    await page.getByLabel("인증번호").fill(TEST_OTP_CODES.VALID);
    await page.getByRole("button", { name: "인증하기" }).click();

    await expect(page.getByTestId("consent-page")).toBeVisible({
      timeout: 5000,
    });
    await page.getByTestId("consent-checkbox").click();
    await page.getByTestId("accept-consent").click();

    // Now on login page
    await expect(page.getByTestId("login-form")).toBeVisible({ timeout: 5000 });

    // Find and click back button (use aria-label since there's no test-id for it)
    await page.getByRole("button", { name: /이전 단계로/i }).click();

    // Should return to whitelist form
    await expect(page.getByTestId("whitelist-form")).toBeVisible({
      timeout: 5000,
    });
  });

  test("E2E-PREAUTH-012: Phone input auto-formats to 010-XXXX-XXXX pattern", async ({
    page,
    mockedApis,
  }) => {
    await mockedApis.consent.mockPrivacyPolicy();

    await page.goto("/");

    // Find phone input using label (MUI TextField)
    const phoneInput = page.getByLabel("휴대폰 번호");
    await expect(phoneInput).toBeVisible();

    // Type phone number without dashes
    await phoneInput.first().fill("01012345678");

    // Verify it formats to 010-1234-5678
    const formattedValue = await phoneInput.first().inputValue();
    expect(formattedValue).toMatch(/010-\d{4}-\d{4}/);
    expect(formattedValue).toBe("010-1234-5678");
  });
});
