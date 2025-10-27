/// <reference types="node" />

/**
 * Admin User Session Fixture
 *
 * Provides authenticated admin context with admin privileges.
 * Layers the existing `playwright/.auth/admin.json` storage state
 * plus admin API doubles on top of memberSession.
 *
 * @see docs/plan/IS-62/plan-00.md - Phase 1: Playwright Fixture Architecture
 * @see https://playwright.dev/docs/test-fixtures
 */

/* eslint-disable react-hooks/rules-of-hooks */
// ^ Playwright fixtures use 'use' callback parameter, not React hooks

import path from "path";
import {
  test as base,
  Page,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
  TestInfo,
} from "@playwright/test";
import { initE2EMode } from "../utils/stateSetup";
import { mockAdminAPI } from "../utils/apiMocks/playwright";

/**
 * Admin user fixture type
 */
export type AdminUserFixtures = {
  /**
   * Authenticated admin session
   * - Creates separate browser context with admin storageState (admin.json)
   * - Contains admin claims and sessionStorage flags
   * - Layers admin API mocks on top
   */
  adminSession: Page;
};

/**
 * adminSession fixture object
 * Exported for composition in base.ts
 */
export const adminSessionFixtures = {
  /**
   * adminSession fixture
   * Provides authenticated admin context
   * Loads admin storageState with admin claims and layers admin API mocks
   */
  adminSession: async (
    {
      browser,
    }: PlaywrightTestArgs &
      PlaywrightTestOptions &
      PlaywrightWorkerArgs &
      PlaywrightWorkerOptions,
    use: (r: Page) => Promise<void>,
    testInfo: TestInfo
  ) => {
    // Path to admin storageState JSON
    const storageStatePath = path.join(
      __dirname,
      "..",
      "..",
      "playwright",
      ".auth",
      "admin.json"
    );

    // Create context with admin storageState and baseURL
    const context = await browser.newContext({
      storageState: storageStatePath,
      baseURL: testInfo.project.use.baseURL,
    });

    // Create page from context
    const page = await context.newPage();

    // Initialize E2E mode (adds __E2E_MODE__ flag)
    await initE2EMode(page);

    // Layer admin API mocks on top
    await mockAdminAPI(page);

    // Provide page to test
    await use(page);

    // Cleanup
    await context.close();
  },
};

/**
 * Extended test with admin user fixture
 */
export const test = base.extend<AdminUserFixtures>(adminSessionFixtures);

export { expect } from "@playwright/test";
