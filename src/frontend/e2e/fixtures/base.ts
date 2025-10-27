/// <reference types="node" />

/**
 * Playwright Fixture Architecture
 *
 * Provides reusable, typed fixtures for delivering whitelist, authenticated member,
 * admin, and seeded simulation states for Playwright E2E tests.
 *
 * @see docs/plan/IS-62/plan-00.md - Phase 1: Playwright Fixture Architecture
 * @see https://playwright.dev/docs/test-fixtures
 */

/* eslint-disable react-hooks/rules-of-hooks */
// ^ Playwright fixtures use 'use' callback parameter, not React hooks

import path from "path";
import { test as base, Page } from "@playwright/test";
import { initE2EMode, setSimulationDraft } from "../utils/stateSetup";
import {
  mockOTPSuccess,
  mockOTPFailure,
  mockSimulationAPI,
  mockConsentSuccess,
  mockNoticesAPI,
  mockAdminAPI,
  mockNetworkError,
} from "../utils/apiMocks/playwright";

/**
 * MockedApisController
 * Provides typed methods for setting up API mocks
 */
export interface MockedApisController {
  /**
   * Mock successful OTP flow (send + verify)
   */
  mockOTPSuccess(): Promise<void>;

  /**
   * Mock OTP failure scenarios
   */
  mockOTPFailure(
    scenario: "whitelist" | "invalid_code" | "expired"
  ): Promise<void>;

  /**
   * Mock simulation CRUD endpoints
   */
  mockSimulationAPI(): Promise<void>;

  /**
   * Mock privacy policy and consent endpoints
   */
  mockConsentSuccess(): Promise<void>;

  /**
   * Mock public notices endpoints
   */
  mockNoticesAPI(): Promise<void>;

  /**
   * Mock admin-specific endpoints
   */
  mockAdminAPI(): Promise<void>;

  /**
   * Mock network error for specific endpoint
   */
  mockNetworkError(endpoint: string): Promise<void>;
}

/**
 * Custom test fixtures
 */
type CustomFixtures = {
  /**
   * Authenticated member session
   * - Initializes E2E mode
   * - Loads member storageState (member.json) with member auth token
   * - Provides authenticated member context
   */
  memberSession: Page;

  /**
   * Authenticated admin session
   * - Creates separate browser context with admin storageState (admin.json)
   * - Contains admin claims and sessionStorage flags
   * - Layers admin API mocks on top
   */
  adminSession: Page;

  /**
   * Seeded simulation state
   * - Composes memberSession
   * - Injects deterministic simulation API responses
   * - Sets localStorage draft for simulation
   */
  simulationSeed: Page;

  /**
   * Centralized API mocking controller factory
   * - Returns a function that creates a controller for a given page
   * - Provides typed methods for API interception
   * - Uses shared payload factories
   */
  mockedApis: (page: Page) => MockedApisController;
};

/**
 * Extended test with custom fixtures
 *
 * Note: The `use` parameter in Playwright fixtures is NOT a React hook.
 * It's Playwright's fixture API. ESLint incorrectly flags it due to name similarity.
 */
export const test = base.extend<CustomFixtures>({
  /**
   * memberSession fixture
   * Provides authenticated member context
   * Loads storageState derived from Supabase stub
   */
  memberSession: async ({ browser }, use, testInfo) => {
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

  /**
   * adminSession fixture
   * Provides authenticated admin context
   * Loads admin storageState with admin claims and layers admin API mocks
   */
  adminSession: async ({ browser }, use, testInfo) => {
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

  /**
   * simulationSeed fixture
   * Provides member session with simulation data seeded
   * Composes memberSession and injects simulation mocks on top
   */
  simulationSeed: async ({ memberSession }, use) => {
    // Mock simulation API
    await mockSimulationAPI(memberSession);

    // Set simulation draft in localStorage
    await setSimulationDraft(memberSession, {
      plan_id: "A",
      starting_company_round: 1,
      current_company_round: 1,
      simulation_rounds: 12,
      investments: {
        1: 1000000,
        2: 2000000,
        3: 3000000,
      },
    });

    // Provide composed page to test
    await use(memberSession);

    // Cleanup handled by memberSession fixture
  },

  /**
   * mockedApis fixture
   * Provides factory for creating API mocking controller for any page
   */
  mockedApis: async (_fixtures, use) => {
    // Return a factory function that creates a controller for a given page
    const factory = (page: Page): MockedApisController => ({
      mockOTPSuccess: () => mockOTPSuccess(page),
      mockOTPFailure: (scenario) => mockOTPFailure(page, scenario),
      mockSimulationAPI: () => mockSimulationAPI(page),
      mockConsentSuccess: () => mockConsentSuccess(page),
      mockNoticesAPI: () => mockNoticesAPI(page),
      mockAdminAPI: () => mockAdminAPI(page),
      mockNetworkError: (endpoint) => mockNetworkError(page, endpoint),
    });

    await use(factory);

    // Cleanup (routes are automatically cleaned up when page closes)
  },
});

export { expect } from "@playwright/test";
