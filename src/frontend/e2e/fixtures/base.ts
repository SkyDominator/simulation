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
   * - Sets member auth token in localStorage
   * - Provides authenticated member context
   */
  memberSession: Page;

  /**
   * Authenticated admin session
   * - Composes memberSession
   * - Sets admin claims and flags
   * - Mocks admin API endpoints
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
   * Centralized API mocking controller
   * - Provides typed methods for API interception
   * - Uses shared payload factories
   */
  mockedApis: MockedApisController;
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
  memberSession: async ({ browser }, use) => {
    // Path to member storageState JSON
    const storageStatePath = path.join(
      __dirname,
      "..",
      "..",
      "playwright",
      ".auth",
      "member.json"
    );

    // Create context with member storageState
    const context = await browser.newContext({
      storageState: storageStatePath,
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
   * Loads storageState derived from admin Supabase stub
   */
  adminSession: async ({ browser }, use) => {
    // Path to admin storageState JSON
    const storageStatePath = path.join(
      __dirname,
      "..",
      "..",
      "playwright",
      ".auth",
      "admin.json"
    );

    // Create context with admin storageState
    const context = await browser.newContext({
      storageState: storageStatePath,
    });

    // Create page from context
    const page = await context.newPage();

    // Initialize E2E mode
    await initE2EMode(page);

    // Mock admin API endpoints
    await mockAdminAPI(page);

    // Provide page to test
    await use(page);

    // Cleanup
    await context.close();
  },

  /**
   * simulationSeed fixture
   * Provides member session with simulation data seeded
   * Loads member storageState and injects simulation mocks on top
   */
  simulationSeed: async ({ browser }, use) => {
    // Path to member storageState JSON
    const storageStatePath = path.join(
      __dirname,
      "..",
      "..",
      "playwright",
      ".auth",
      "member.json"
    );

    // Create context with member storageState
    const context = await browser.newContext({
      storageState: storageStatePath,
    });

    // Create page from context
    const page = await context.newPage();

    // Initialize E2E mode
    await initE2EMode(page);

    // Mock simulation API
    await mockSimulationAPI(page);

    // Set simulation draft in localStorage
    await setSimulationDraft(page, {
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

    // Provide page to test
    await use(page);

    // Cleanup
    await context.close();
  },

  /**
   * mockedApis fixture
   * Provides controller for API mocking
   */
  mockedApis: async ({ page }, use) => {
    const controller: MockedApisController = {
      mockOTPSuccess: () => mockOTPSuccess(page),
      mockOTPFailure: (scenario) => mockOTPFailure(page, scenario),
      mockSimulationAPI: () => mockSimulationAPI(page),
      mockConsentSuccess: () => mockConsentSuccess(page),
      mockNoticesAPI: () => mockNoticesAPI(page),
      mockAdminAPI: () => mockAdminAPI(page),
      mockNetworkError: (endpoint) => mockNetworkError(page, endpoint),
    };

    await use(controller);

    // Cleanup (routes are automatically cleaned up when page closes)
  },
});

export { expect } from "@playwright/test";
