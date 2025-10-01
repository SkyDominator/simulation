import { test, expect } from "@playwright/test";
import { APIHelpers } from "../utils/test-helpers";
import { loginTestUser } from "../utils/auth-helpers";

/**
 * CAT-PERSIST: Data Persistence & State Management Tests
 * Tests user experience and data integrity across navigation and browser sessions
 */

test.describe("Session and state persistence", () => {
  test.beforeEach(async ({ page }) => {
    await APIHelpers.mockSimulationAPI(page);
  });

  test("keeps the user signed in after a reload", async ({ page }) => {
    await loginTestUser(page);
    await page.goto("/");

    await expect(page.getByTestId("main-page")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("main-page")).toBeVisible();
  });

  test("clears sensitive storage on logout", async ({ page }) => {
    await loginTestUser(page);
    await page.goto("/");
    await expect(page.getByTestId("main-page")).toBeVisible();

    await page.getByTestId("logout-button").click();
    await expect(page.getByTestId("whitelist-form")).toBeVisible();

    const webdriverFlag = await page.evaluate(() => navigator.webdriver);
    console.log("navigator.webdriver", webdriverFlag);

    const storageSnapshot = await page.evaluate(() => {
      const entries: Record<string, string | null> = {};
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (key) {
          entries[key] = window.localStorage.getItem(key);
        }
      }
      return entries;
    });
    console.log("localStorage after logout", storageSnapshot);

    const tokenExists = await page.evaluate(() => {
      return window.localStorage.getItem("supabase.auth.token");
    });
    expect(tokenExists).toBeNull();
  });
});

test.describe.skip("Advanced persistence cases", () => {
  // Draft management, multi-tab coordination, etc.
});
