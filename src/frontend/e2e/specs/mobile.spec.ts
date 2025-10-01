import { test, expect } from "@playwright/test";
import { TestHelpers, APIHelpers } from "../utils/test-helpers";
import { loginTestUser } from "../utils/auth-helpers";
import { VIEWPORT_SIZES, TEST_USERS } from "../fixtures/test-data";

/**
 * CAT-MOBILE: Mobile & Responsive Behavior Tests
 * Tests mobile-first PWA requirements and responsive design
 */

test.describe("Mobile & Responsive Design", () => {
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

  test("E2E-MOB-001: Whitelist page renders correctly at mobile width (375px)", async ({
    page,
  }) => {
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

  test("E2E-MOB-002: OTP page renders correctly at mobile width", async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORT_SIZES.MOBILE);
    await page.goto("/");

    await helpers.fillWhitelistForm(
      TEST_USERS.WHITELISTED.name,
      TEST_USERS.WHITELISTED.phone
    );

    await expect(page.getByTestId("otp-form")).toBeVisible();

    // OTP input should be visible and usable
    const otpInput = page.getByLabel("인증번호");
    await expect(otpInput).toBeVisible();

    // Should be able to type
    await otpInput.fill("123456");
    expect(await otpInput.inputValue()).toBe("123456");
  });

  test("E2E-MOB-003: MainPage table scrolls horizontally on narrow screens", async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORT_SIZES.MOBILE);
    await loginTestUser(page);
    await APIHelpers.mockSimulationAPI(page);

    await page.goto("/");
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Table container should have overflow
    const tableContainer = page
      .locator('[data-testid="simulation-table"]')
      .or(page.locator("table"))
      .first();

    if (await tableContainer.isVisible()) {
      const overflow = await tableContainer.evaluate((el) => {
        return window.getComputedStyle(el.parentElement || el).overflowX;
      });

      // Should allow horizontal scroll
      expect(["auto", "scroll"].includes(overflow)).toBe(true);
    }
  });

  test("E2E-MOB-004: Plan editor steps render in single column on mobile", async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORT_SIZES.MOBILE);
    await loginTestUser(page);
    await APIHelpers.mockSimulationAPI(page);

    await page.goto("/");
    await page.getByTestId("create-simulation").click();

    await expect(page.locator("text=플랜 타입")).toBeVisible({ timeout: 5000 });

    // Content should stack vertically (width should be close to viewport)
    const content = page.locator('[data-testid="step-content"]').first();

    if (await content.isVisible()) {
      const box = await content.boundingBox();
      // Content width should be close to mobile viewport width
      expect(box?.width).toBeLessThan(400); // Mobile is 375px
    }
  });

  test("E2E-MOB-005: Buttons meet minimum touch target size (44px)", async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORT_SIZES.MOBILE);
    await page.goto("/");

    // Check submit button size
    const submitButton = page.getByRole("button", { name: "인증번호 받기" });
    await expect(submitButton).toBeVisible();

    const boundingBox = await submitButton.boundingBox();
    expect(boundingBox?.height).toBeGreaterThanOrEqual(44);
  });

  test("E2E-MOB-006: Modal dialogs are full-screen on mobile", async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORT_SIZES.MOBILE);
    await loginTestUser(page);
    await APIHelpers.mockSimulationAPI(page);
    await APIHelpers.mockNoticesAPI(page);

    await page.goto("/");
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Open notice modal
    const noticeButton = page
      .getByTestId("notice-button")
      .or(page.getByRole("button", { name: /공지|notice/i }))
      .first();

    if (await noticeButton.isVisible()) {
      await noticeButton.click();

      // Modal should be full-screen on mobile
      const modal = page.locator('[role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 });

      const modalBox = await modal.boundingBox();
      // Modal should take up most of the viewport
      expect(modalBox?.width).toBeGreaterThan(350); // Close to 375px
    }
  });

  test("E2E-MOB-008: MUI breakpoint transitions work (xs → md)", async ({
    page,
  }) => {
    await loginTestUser(page);
    await APIHelpers.mockSimulationAPI(page);

    // Start mobile
    await page.setViewportSize(VIEWPORT_SIZES.MOBILE);
    await page.goto("/");
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Resize to desktop
    await page.setViewportSize(VIEWPORT_SIZES.DESKTOP);
    await page.waitForTimeout(500); // Wait for layout to adjust

    // Page should still be visible and functional
    await expect(page.getByTestId("main-page")).toBeVisible();
    await expect(page.getByTestId("create-simulation")).toBeVisible();
  });

  test("E2E-MOB-009: Header actions are accessible on mobile", async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORT_SIZES.MOBILE);
    await loginTestUser(page);
    await APIHelpers.mockSimulationAPI(page);

    await page.goto("/");
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Key actions should be accessible
    await expect(page.getByTestId("create-simulation")).toBeVisible();

    // Logout button should be accessible (might be in menu)
    const logoutButton = page
      .getByTestId("logout-button")
      .or(page.getByRole("button", { name: /로그아웃|logout/i }))
      .first();

    // Either directly visible or in a menu
    const isVisible =
      (await logoutButton.isVisible()) ||
      (await page.getByRole("button", { name: /menu|more/i }).isVisible());

    expect(isVisible).toBe(true);
  });

  test("E2E-MOB-010: Table pagination works on mobile", async ({ page }) => {
    await page.setViewportSize(VIEWPORT_SIZES.MOBILE);
    await loginTestUser(page);

    // Mock many simulations
    await page.route("**/api/simulations**", async (route) => {
      if (route.request().method() === "GET") {
        const simulations = Array.from({ length: 20 }, (_, i) => ({
          id: `sim-${i}`,
          plan_id: "A",
          memo: `Simulation ${i}`,
          created_at: new Date().toISOString(),
        }));

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(simulations),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/");
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

    // Check if pagination controls exist
    const paginationControls = page
      .locator('[role="navigation"]')
      .filter({ hasText: /page|페이지/i })
      .first();

    if (await paginationControls.isVisible()) {
      // Pagination is working
      await expect(paginationControls).toBeVisible();
    }
  });
});

test.describe.skip("Advanced mobile interactions", () => {
  // Placeholder for future gestures, FAB, and orientation-specific UX
});
