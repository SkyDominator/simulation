import { test, expect } from "@playwright/test";
import { TestHelpers, APIHelpers } from "../utils/test-helpers";
import { loginTestUser } from "../utils/auth-helpers";
import { VIEWPORT_SIZES, TEST_USERS } from "../fixtures/test-data";

/**
 * CAT-MOBILE: Mobile & Responsive Behavior Tests
 * Tests mobile-first PWA requirements and responsive design
 */

test.describe("Responsive basics", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await APIHelpers.mockOTPSuccess(page);
  });

  test("onboarding pages render at mobile width", async ({ page }) => {
    await page.setViewportSize(VIEWPORT_SIZES.MOBILE);
    await page.goto("/");

    await expect(
      page.locator("h5").filter({ hasText: "환영합니다!" })
    ).toBeVisible();
    await helpers.fillWhitelistForm(
      TEST_USERS.WHITELISTED.name,
      TEST_USERS.WHITELISTED.phone
    );
    await expect(page.getByTestId("otp-form")).toBeVisible();
  });

  test("authenticated users can reach the main page on small screens", async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORT_SIZES.MOBILE);
    await loginTestUser(page);
    await APIHelpers.mockSimulationAPI(page);

    await page.goto("/");
    await expect(page.getByTestId("main-page")).toBeVisible();
    await expect(page.getByTestId("create-simulation")).toBeVisible();
  });
});

test.describe.skip("Advanced mobile interactions", () => {
  // Placeholder for future gestures, FAB, and orientation-specific UX
});
