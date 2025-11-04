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
  mockOTPSendSuccess,
  mockOTPSendFailure,
  mockOTPVerifySuccess,
  mockOTPVerifyFailure,
  mockOTPSuccess,
  mockOTPFailure,
  mockSimulationAPI,
  mockConsentSuccess,
  mockPrivacyPolicyGet,
  mockConsentPost,
  mockConsentGet,
  mockNoticesAPI,
  mockAdminAPI,
  mockNetworkError,
} from "../utils/apiMocks/playwright";
import type {
  OTPSuccessOptions,
  OTPFailureOptions,
} from "../utils/apiMocks/playwright";
import type {
  OTPSendResponse,
  OTPVerifyResponse,
} from "../../test/shared/types";

const pageLabels = new WeakMap<Page, string>();
let pageLabelCounter = 0;
let markCounter = 0;

const getPageLabel = (page: Page): string => {
  const existing = pageLabels.get(page);
  if (existing) {
    return existing;
  }

  pageLabelCounter += 1;
  const label = `page-${pageLabelCounter}`;
  pageLabels.set(page, label);
  return label;
};

const formatArg = (arg: unknown): string => {
  if (arg === null || arg === undefined) {
    return String(arg);
  }

  if (typeof arg === "string") {
    return arg;
  }

  if (typeof arg === "number" || typeof arg === "boolean") {
    return String(arg);
  }

  if (Array.isArray(arg)) {
    return `Array(${arg.length})`;
  }

  if (typeof arg === "object") {
    const ctor = Object.getPrototypeOf(arg)?.constructor?.name;
    return ctor ? `Object(${ctor})` : "Object";
  }

  return typeof arg;
};

const describeArgs = (args: unknown[]): string => {
  if (args.length === 0) {
    return "";
  }

  const rendered = args.map(formatArg).join(", ");
  return ` (${rendered})`;
};

const instrument = <Args extends unknown[], Result>(
  page: Page,
  action: string,
  impl: (page: Page, ...args: Args) => Promise<Result>
) => {
  return async (...args: Args): Promise<Result> => {
    const pageLabel = getPageLabel(page);
    const suffix = describeArgs(args);
    const baseLabel = `[mockedApis][${pageLabel}] ${action}${suffix}`;
    const timerLabel = `${baseLabel} #${++markCounter}`;

    console.info(`${baseLabel} :: start`);
    console.time(timerLabel);

    try {
      return await impl(page, ...args);
    } finally {
      console.timeEnd(timerLabel);
      console.info(`${baseLabel} :: end`);
    }
  };
};

/**
 * MockedApisController
 * Provides typed methods for setting up API mocks
 */
export interface MockedApisController {
  /**
   * Mock successful OTP send request
   */
  mockOTPSendSuccess(overrides?: Partial<OTPSendResponse>): Promise<void>;

  /**
   * Mock failed OTP send request
   */
  mockOTPSendFailure(
    scenario?: "whitelist",
    overrides?: Partial<OTPSendResponse>
  ): Promise<void>;

  /**
   * Mock successful OTP verify request
   */
  mockOTPVerifySuccess(overrides?: Partial<OTPVerifyResponse>): Promise<void>;

  /**
   * Mock failed OTP verify request
   */
  mockOTPVerifyFailure(
    scenario: "invalid_code" | "expired",
    overrides?: Partial<OTPVerifyResponse>
  ): Promise<void>;

  /**
   * Mock successful OTP flow (send + verify)
   */
  mockOTPSuccess(options?: OTPSuccessOptions): Promise<void>;

  /**
   * Mock OTP failure scenarios
   */
  mockOTPFailure(
    scenario: "whitelist" | "invalid_code" | "expired",
    options?: OTPFailureOptions
  ): Promise<void>;

  /**
   * Mock simulation CRUD endpoints
   */
  mockSimulationAPI(): Promise<void>;

  /**
   * Mock privacy policy and consent endpoints (convenience method)
   */
  mockConsentSuccess(): Promise<void>;

  /**
   * Mock GET /api/privacy-policy endpoint
   */
  mockPrivacyPolicyGet(): Promise<void>;

  /**
   * Mock POST /api/consents endpoint
   */
  mockConsentPost(): Promise<void>;

  /**
   * Mock GET /api/consents/{user_hash} endpoint
   */
  mockConsentGet(): Promise<void>;

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
      mockOTPSendSuccess: instrument(
        page,
        "mockOTPSendSuccess",
        mockOTPSendSuccess
      ),
      mockOTPSendFailure: instrument(
        page,
        "mockOTPSendFailure",
        mockOTPSendFailure
      ),
      mockOTPVerifySuccess: instrument(
        page,
        "mockOTPVerifySuccess",
        mockOTPVerifySuccess
      ),
      mockOTPVerifyFailure: instrument(
        page,
        "mockOTPVerifyFailure",
        mockOTPVerifyFailure
      ),
      mockOTPSuccess: instrument(page, "mockOTPSuccess", mockOTPSuccess),
      mockOTPFailure: instrument(page, "mockOTPFailure", mockOTPFailure),
      mockSimulationAPI: instrument(
        page,
        "mockSimulationAPI",
        mockSimulationAPI
      ),
      mockConsentSuccess: instrument(
        page,
        "mockConsentSuccess",
        mockConsentSuccess
      ),
      mockPrivacyPolicyGet: instrument(
        page,
        "mockPrivacyPolicyGet",
        mockPrivacyPolicyGet
      ),
      mockConsentPost: instrument(page, "mockConsentPost", mockConsentPost),
      mockConsentGet: instrument(page, "mockConsentGet", mockConsentGet),
      mockNoticesAPI: instrument(page, "mockNoticesAPI", mockNoticesAPI),
      mockAdminAPI: instrument(page, "mockAdminAPI", mockAdminAPI),
      mockNetworkError: instrument(page, "mockNetworkError", mockNetworkError),
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
