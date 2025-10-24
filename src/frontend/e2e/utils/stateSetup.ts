/**
 * State setup helpers for E2E tests
 *
 * Functions for preparing test environment state (localStorage, sessionStorage, flags).
 * These handle environment setup without user interactions.
 *
 * @see docs/plan/IS-62/plan-00.md - Phase 2: Helper & Mock Consolidation
 * @see docs/plan/IS-62/appendix.md - Section 8.2: Preserved Abstractions
 */

import { Page, expect } from "@playwright/test";
import type { MockAuthToken } from "../../test/shared/types";

/**
 * Initialize E2E mode for the page
 * Ensures the flag is available before scripts execute on navigation
 */
export async function initE2EMode(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(window, "__E2E_MODE__", {
      value: true,
      writable: false,
      configurable: false,
      enumerable: true,
    });

    try {
      localStorage.setItem("__E2E_MODE__", "true");
    } catch {
      // Ignore if storage is unavailable (e.g., sandboxed contexts)
    }
  });
}

/**
 * Set Supabase auth token in localStorage
 */
export async function setAuthToken(
  page: Page,
  token: MockAuthToken
): Promise<void> {
  await page.addInitScript((tokenData) => {
    window.localStorage.setItem(
      "supabase.auth.token",
      JSON.stringify(tokenData)
    );
    window.localStorage.setItem("ui.page", '"main"');
    window.localStorage.setItem("ui.noticeOpen", "false");
  }, token);

  // Also evaluate after navigation if page is already loaded
  try {
    await page.evaluate((tokenData) => {
      window.localStorage.setItem(
        "supabase.auth.token",
        JSON.stringify(tokenData)
      );
      window.localStorage.setItem("ui.page", '"main"');
      window.localStorage.setItem("ui.noticeOpen", "false");
    }, token);
  } catch {
    // Ignored: page might not be navigated yet
  }
}

/**
 * Set admin session storage flags
 */
export async function setAdminFlags(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("user.isAdmin", "true");
  });

  try {
    await page.evaluate(() => {
      window.sessionStorage.setItem("user.isAdmin", "true");
    });
  } catch {
    // Ignored: page might not be navigated yet
  }
}

/**
 * Clear all authentication state
 */
export async function clearAuthState(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.localStorage.removeItem("supabase.auth.token");
    window.sessionStorage.clear();
  });
}

/**
 * Check if user is authenticated
 */
export async function isUserAuthenticated(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const token = window.localStorage.getItem("supabase.auth.token");
    return !!token;
  });
}

/**
 * Get current user info from localStorage
 */
export async function getCurrentUser(page: Page): Promise<unknown> {
  return await page.evaluate(() => {
    const tokenStr = window.localStorage.getItem("supabase.auth.token");
    if (!tokenStr) return null;

    try {
      const tokenData = JSON.parse(tokenStr);
      return tokenData.user;
    } catch {
      return null;
    }
  });
}

/**
 * Wait for page to load completely
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
}

/**
 * Wait for main dashboard page to load
 */
export async function waitForMainPage(page: Page): Promise<void> {
  await expect(page.locator("text=내 시뮬레이션")).toBeVisible({
    timeout: 10000,
  });
}

/**
 * Wait for simulation results to appear
 */
export async function waitForSimulationResults(page: Page): Promise<void> {
  await page.waitForSelector("text=/시뮬레이션.*결과/", {
    timeout: 10000,
  });
  await expect(page.locator('table, [role="table"]')).toBeVisible();
}

/**
 * Wait for notification message
 */
export async function waitForNotification(
  page: Page,
  message: string
): Promise<void> {
  await expect(
    page.locator('[role="alert"], .MuiAlert-root').filter({ hasText: message })
  ).toBeVisible();
}

/**
 * Check if element is visible with timeout
 */
export async function isElementVisible(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    return await page.isVisible(selector);
  } catch {
    return false;
  }
}

/**
 * Set simulation draft in localStorage
 */
export async function setSimulationDraft(
  page: Page,
  draft: {
    plan_id: string;
    starting_company_round: number;
    current_company_round: number;
    simulation_rounds: number;
    investments?: Record<number, number>;
  }
): Promise<void> {
  await page.addInitScript((draftData) => {
    window.localStorage.setItem("simulation.draft", JSON.stringify(draftData));
  }, draft);

  try {
    await page.evaluate((draftData) => {
      window.localStorage.setItem(
        "simulation.draft",
        JSON.stringify(draftData)
      );
    }, draft);
  } catch {
    // Ignored: page might not be navigated yet
  }
}

/**
 * Clear simulation draft from localStorage
 */
export async function clearSimulationDraft(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.localStorage.removeItem("simulation.draft");
  });
}

/**
 * Get simulation draft from localStorage
 */
export async function getSimulationDraft(page: Page): Promise<unknown> {
  return await page.evaluate(() => {
    const draftStr = window.localStorage.getItem("simulation.draft");
    if (!draftStr) return null;

    try {
      return JSON.parse(draftStr);
    } catch {
      return null;
    }
  });
}
