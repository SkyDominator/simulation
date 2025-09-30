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

    // Wait for the main page to load and check authentication
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 10000 });

    // Reload the page
    await page.reload();
    
    // Should still be authenticated after reload
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 10000 });
    
    // Verify auth token still exists in localStorage
    const tokenExists = await page.evaluate(() => {
      const token = window.localStorage.getItem("supabase.auth.token");
      return !!token;
    });
    expect(tokenExists).toBe(true);
  });

  test("clears sensitive storage on logout", async ({ page }) => {
    await loginTestUser(page);
    await page.goto("/");
    await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 10000 });

    // Logout
    await page.getByTestId("logout-button").click();
    
    // Should redirect to whitelist page
    await expect(page.getByTestId("whitelist-form")).toBeVisible({ timeout: 10000 });

    // Debug: Check navigator.webdriver and localStorage state
    const webdriverFlag = await page.evaluate(() => navigator.webdriver);
    console.log("navigator.webdriver:", webdriverFlag);

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
    console.log("localStorage after logout:", storageSnapshot);

    // Verify auth token is cleared (should be null in E2E mode as it clears all storage)
    const tokenExists = await page.evaluate(() => {
      return window.localStorage.getItem("supabase.auth.token");
    });
    expect(tokenExists).toBeNull();
  });
});

test.describe.skip("Advanced persistence cases", () => {
  // Draft management, multi-tab coordination, etc.
  // Skipped for now until basic persistence works
});
