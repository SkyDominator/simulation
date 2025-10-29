/**
 * Mocked APIs Fixture
 *
 * Centralizes request interception with typed payload factories
 * for OTP, simulation, notices, and policy endpoints.
 *
 * Provides a factory function that creates a MockedApisController
 * for any given page, allowing tests to easily mock API endpoints.
 *
 * @see docs/plan/IS-62/plan-00.md - Phase 1: Playwright Fixture Architecture
 * @see https://playwright.dev/docs/test-fixtures
 */

/* eslint-disable react-hooks/rules-of-hooks */
// ^ Playwright fixtures use 'use' callback parameter, not React hooks

import { test as base, Page } from "@playwright/test";
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
 * Mocked APIs fixture type
 */
export type MockedApisFixtures = {
  /**
   * Centralized API mocking controller factory
   * - Returns a function that creates a controller for a given page
   * - Provides typed methods for API interception
   * - Uses shared payload factories
   */
  mockedApis: (page: Page) => MockedApisController;
};

/**
 * mockedApis fixture object
 * Exported for composition in base.ts
 */
export const mockedApisFixtures = {
  /**
   * mockedApis fixture
   * Provides factory for creating API mocking controller for any page
   */
  mockedApis: async (
    // Playwright requires object destructuring, but this fixture has no dependencies
    // eslint-disable-next-line no-empty-pattern
    {},
    use: (r: (page: Page) => MockedApisController) => Promise<void>
  ) => {
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
};

/**
 * Extended test with mocked APIs fixture
 */
export const test = base.extend<MockedApisFixtures>(mockedApisFixtures);

export { expect } from "@playwright/test";
