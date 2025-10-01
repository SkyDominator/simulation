import { test, expect } from "@playwright/test";
import { TestHelpers, APIHelpers } from "../utils/test-helpers";
import { loginTestUser } from "../utils/auth-helpers";
import { TEST_USERS, TEST_OTP_CODES } from "../fixtures/test-data";

test.describe("User Onboarding Flow", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await APIHelpers.mockOTPSuccess(page);
    await APIHelpers.mockConsentSuccess(page);
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test("allows a whitelisted user to complete onboarding", async ({ page }) => {
    await page.goto("/");

    // Whitelist form
    await expect(
      page.locator("h5").filter({ hasText: "환영합니다!" })
    ).toBeVisible();
    await helpers.fillWhitelistForm(
      TEST_USERS.WHITELISTED.name,
      TEST_USERS.WHITELISTED.phone
    );

    // OTP verification
    await expect(page.locator('[data-testid="otp-form"]')).toBeVisible();
    await helpers.fillOTPForm(TEST_OTP_CODES.VALID);

    // Consent and login
    await expect(page.locator('[data-testid="consent-page"]')).toBeVisible();
    await page.getByTestId("consent-checkbox").click();
    await page.getByTestId("accept-consent").click();

    await expect(page.getByTestId("login-form")).toBeVisible();
    await loginTestUser(page);
    await page.getByTestId("google-login").click();

    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });
  });

  test("shows an error for non-whitelisted users", async ({ page }) => {
    await APIHelpers.mockOTPFailure(page, "whitelist");
    await page.goto("/");

    await helpers.fillWhitelistForm(
      TEST_USERS.NON_WHITELISTED.name,
      TEST_USERS.NON_WHITELISTED.phone
    );

    await expect(page.getByRole("alert")).toContainText(
      "가입 허용 명단에 없는 사용자입니다."
    );
    await expect(page.getByTestId("whitelist-form")).toBeVisible();
  });

  test("surfaces invalid OTP errors without advancing the flow", async ({
    page,
  }) => {
    await APIHelpers.mockOTPFailure(page, "invalid_code");
    await page.goto("/");

    await helpers.fillWhitelistForm(
      TEST_USERS.WHITELISTED.name,
      TEST_USERS.WHITELISTED.phone
    );
    await expect(page.getByTestId("otp-form")).toBeVisible();

    await helpers.fillOTPForm(TEST_OTP_CODES.INVALID);
    await expect(page.getByRole("alert")).toContainText(
      "인증번호가 올바르지 않습니다."
    );
    await expect(page.getByTestId("otp-form")).toBeVisible();
  });
});
