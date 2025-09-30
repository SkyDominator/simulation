import { test, expect } from "@playwright/test";
import { TestHelpers, APIHelpers } from "../utils/test-helpers";
import { TEST_USERS } from "../fixtures/test-data";

test.describe("Basic error handling", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test("shows a friendly message when OTP send fails", async ({ page }) => {
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
});

test.describe.skip("Advanced error scenarios", () => {
  // Placeholder for future coverage (offline mode, background sync, etc.)
});
