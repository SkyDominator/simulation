/// <reference types="node" />

/**
 * Authenticated Member Session Fixture
 *
 * Provides authenticated member context with E2E mode initialization.
 * Reuses the existing `playwright/.auth/member.json` storage state
 * generated with Supabase stub tokens.
 *
 * @see docs/plan/IS-62/plan-00.md - Phase 1: Playwright Fixture Architecture
 * @see https://playwright.dev/docs/test-fixtures
 */

/* eslint-disable react-hooks/rules-of-hooks */
// ^ Playwright fixtures use 'use' callback parameter, not React hooks

import path from "path";
import { fileURLToPath } from "url";
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

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Authenticated member fixture type
 */
export type AuthenticatedFixtures = {
  /**
   * Authenticated member session
   * - Initializes E2E mode
   * - Loads member storageState (member.json) with member auth token
   * - Provides authenticated member context
   */
  memberSession: Page;
};

/**
 * memberSession fixture object
 * Exported for composition in base.ts
 */
export const memberSessionFixtures = {
  /**
   * memberSession fixture
   * Provides authenticated member context
   * Loads storageState derived from Supabase stub
   */
  memberSession: async (
    {
      browser,
    }: PlaywrightTestArgs &
      PlaywrightTestOptions &
      PlaywrightWorkerArgs &
      PlaywrightWorkerOptions,
    use: (r: Page) => Promise<void>,
    testInfo: TestInfo
  ) => {
    // Path to member storageState JSON
    const storageStatePath = path.join(
      __dirname,
      "..",
      "..",
      "playwright",
      ".auth",
      "member.json"
    );

    // Create context with member storageState and baseURL
    const context = await browser.newContext({
      storageState: storageStatePath,
      baseURL: testInfo.project.use.baseURL,
    });

    // Create page from context
    const page = await context.newPage();

    // Initialize E2E mode (adds __E2E_MODE__ flag)
    await initE2EMode(page);

    // Provide page to test
    await use(page);

    // Cleanup
    await context.close();
  },
};

/**
 * Extended test with authenticated member fixture
 */
export const test = base.extend<AuthenticatedFixtures>(memberSessionFixtures);

export { expect } from "@playwright/test";
