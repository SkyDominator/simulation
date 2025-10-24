/**
 * Playwright Fixture Architecture for E2E Tests
 *
 * This module provides reusable, typed fixtures for common test scenarios:
 * - memberSession: authenticated regular member
 * - adminSession: authenticated admin user
 * - simulationSeed: pre-seeded simulation data
 * - mockedApis: centralized API mocking controller
 *
 * @see docs/plan/IS-62/plan-00.md - Phase 1: Playwright Fixture Architecture
 */

/* eslint-disable react-hooks/rules-of-hooks */
// Note: Playwright fixtures use a `use` function parameter which ESLint's react-hooks plugin
// incorrectly flags as a React hook. This is a false positive.

import { test as base, type Page } from "@playwright/test";
import {
  createMemberAuthToken,
  createAdminAuthToken,
  createOTPSendSuccessResponse,
  createOTPVerifySuccessResponse,
  createSimulationCreateResponse,
  createSimulationRunResponse,
  createSimulationListResponse,
  createPrivacyPolicyResponse,
  createConsentResponse,
  createNoticeListResponse,
  createAdminVerifyResponse,
} from "../../test/shared/fixtures";
import type {
  MockAuthToken,
  OTPSendResponse,
  OTPVerifyResponse,
  SimulationCreateResponse,
  SimulationRunResponse,
  SimulationListResponse,
  PrivacyPolicyResponse,
  ConsentResponse,
  NoticeListResponse,
  AdminVerifyResponse,
  SimulationData,
} from "../../test/shared/types";

/**
 * Type definitions for fixtures
 */
type MemberSessionFixture = {
  token: MockAuthToken;
};

type AdminSessionFixture = {
  token: MockAuthToken;
  isAdmin: boolean;
};

type SimulationSeedFixture = {
  simulations: SimulationData[];
};

/**
 * API Mock Controller for centralized request interception
 */
type MockedApisController = {
  /**
   * Mock OTP endpoints with success scenario
   */
  mockOTPSuccess: () => Promise<void>;

  /**
   * Mock OTP send endpoint with custom response
   */
  mockOTPSend: (response: OTPSendResponse) => Promise<void>;

  /**
   * Mock OTP verify endpoint with custom response
   */
  mockOTPVerify: (response: OTPVerifyResponse) => Promise<void>;

  /**
   * Mock simulation CRUD endpoints
   */
  mockSimulations: (options?: {
    list?: SimulationListResponse;
    create?: SimulationCreateResponse;
    run?: SimulationRunResponse;
    get?: (id: string) => SimulationData | null;
    update?: (id: string) => boolean;
    delete?: (id: string) => boolean;
  }) => Promise<void>;

  /**
   * Mock privacy policy endpoint
   */
  mockPrivacyPolicy: (response?: PrivacyPolicyResponse) => Promise<void>;

  /**
   * Mock consent endpoints
   */
  mockConsent: (options?: {
    record?: ConsentResponse;
    check?: ConsentResponse;
  }) => Promise<void>;

  /**
   * Mock public notices endpoint
   */
  mockNotices: (response?: NoticeListResponse) => Promise<void>;

  /**
   * Mock admin verification endpoint
   */
  mockAdminVerify: (response?: AdminVerifyResponse) => Promise<void>;

  /**
   * Mock admin notices CRUD endpoints
   */
  mockAdminNotices: () => Promise<void>;

  /**
   * Mock admin privacy policies CRUD endpoints
   */
  mockAdminPolicies: () => Promise<void>;

  /**
   * Clear all mocked routes
   */
  clearAll: () => Promise<void>;
};

/**
 * Extended test fixtures
 */
type TestFixtures = {
  /**
   * Authenticated member session fixture
   * Sets up localStorage with member auth token and E2E mode
   */
  memberSession: MemberSessionFixture;

  /**
   * Authenticated admin session fixture
   * Composes memberSession with admin claims and privileges
   */
  adminSession: AdminSessionFixture;

  /**
   * Simulation seed fixture
   * Injects deterministic simulation API responses and localStorage drafts
   * Requires memberSession
   */
  simulationSeed: SimulationSeedFixture;

  /**
   * API mocking controller fixture
   * Centralizes request interception with typed payloads
   */
  mockedApis: MockedApisController;
};

/**
 * Helper to initialize E2E mode for a page
 */
async function initE2EMode(page: Page): Promise<void> {
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
      // Ignore if storage is unavailable
    }
  });
}

/**
 * Helper to set auth token in localStorage
 */
async function setAuthToken(page: Page, token: MockAuthToken): Promise<void> {
  await page.addInitScript((tokenData) => {
    window.localStorage.setItem(
      "supabase.auth.token",
      JSON.stringify(tokenData)
    );
    window.localStorage.setItem("ui.page", '"main"');
    window.localStorage.setItem("ui.noticeOpen", "false");
  }, token);

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
    // Page might not be navigated yet; init script will handle it
  }
}

/**
 * Helper to set admin flags
 */
async function setAdminFlags(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("user.isAdmin", "true");
  });

  try {
    await page.evaluate(() => {
      window.sessionStorage.setItem("user.isAdmin", "true");
    });
  } catch {
    // Page might not be navigated yet
  }
}

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<TestFixtures>({
  /**
   * Member session fixture
   * Automatically sets up E2E mode and member authentication
   */
  memberSession: async ({ page }, use) => {
    // Initialize E2E mode
    await initE2EMode(page);

    // Create and set member auth token
    const token = createMemberAuthToken();
    await setAuthToken(page, token);

    // Provide fixture value
    await use({ token });

    // Teardown: clear auth state
    try {
      await page.evaluate(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
      });
    } catch {
      // Ignore if page is closed
    }
  },

  /**
   * Admin session fixture
   * Composes memberSession with admin privileges
   */
  adminSession: async ({ page }, use) => {
    // Initialize E2E mode
    await initE2EMode(page);

    // Create and set admin auth token
    const token = createAdminAuthToken();
    await setAuthToken(page, token);

    // Set admin flags
    await setAdminFlags(page);

    // Provide fixture value
    await use({ token, isAdmin: true });

    // Teardown: clear auth state
    try {
      await page.evaluate(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
      });
    } catch {
      // Ignore if page is closed
    }
  },

  /**
   * Simulation seed fixture
   * Injects deterministic simulation data
   * Requires memberSession to be active
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  simulationSeed: async ({ page, memberSession }, use) => {
    // memberSession dependency ensures auth is set up

    // Create seed simulations
    const seedSimulations: SimulationData[] = [
      {
        id: "seed-sim-1",
        plan_id: "A",
        memo: "Seed simulation 1",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        starting_company_round: 1,
        current_company_round: 1,
        simulation_rounds: 12,
        investments: { 1: 110000, 2: 220000 },
        simulation_results: null,
      },
      {
        id: "seed-sim-2",
        plan_id: "B",
        memo: "Seed simulation 2",
        created_at: "2024-01-02T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
        starting_company_round: 1,
        current_company_round: 1,
        simulation_rounds: 15,
        investments: { 1: 500000, 2: 1000000 },
        simulation_results: null,
      },
    ];

    // Inject seed data into localStorage
    await page.addInitScript((simulations) => {
      try {
        localStorage.setItem("simulations.seed", JSON.stringify(simulations));
      } catch {
        // Ignore if storage is unavailable
      }
    }, seedSimulations);

    try {
      await page.evaluate((simulations) => {
        localStorage.setItem("simulations.seed", JSON.stringify(simulations));
      }, seedSimulations);
    } catch {
      // Page might not be navigated yet
    }

    // Provide fixture value
    await use({ simulations: seedSimulations });

    // Teardown: clear seed data
    try {
      await page.evaluate(() => {
        localStorage.removeItem("simulations.seed");
      });
    } catch {
      // Ignore if page is closed
    }
  },

  /**
   * Mocked APIs controller fixture
   * Provides centralized API mocking with typed payloads
   */
  mockedApis: async ({ page }, use) => {
    const controller: MockedApisController = {
      async mockOTPSuccess() {
        await page.route("**/api/otp/send", async (route) => {
          const response = createOTPSendSuccessResponse();
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(response),
          });
        });

        await page.route("**/api/otp/verify", async (route) => {
          const response = createOTPVerifySuccessResponse();
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(response),
          });
        });

        // Log for debugging
        console.log("[Mock] OTP success routes registered");
      },

      async mockOTPSend(response: OTPSendResponse) {
        await page.route("**/api/otp/send", async (route) => {
          await route.fulfill({
            status: response.success ? 200 : 400,
            contentType: "application/json",
            body: JSON.stringify(response),
          });
        });

        console.log("[Mock] OTP send route registered");
      },

      async mockOTPVerify(response: OTPVerifyResponse) {
        await page.route("**/api/otp/verify", async (route) => {
          await route.fulfill({
            status: response.success ? 200 : 400,
            contentType: "application/json",
            body: JSON.stringify(response),
          });
        });

        console.log("[Mock] OTP verify route registered");
      },

      async mockSimulations(options = {}) {
        const listResponse = options.list || createSimulationListResponse();
        const createResponse =
          options.create || createSimulationCreateResponse();
        const runResponse = options.run || createSimulationRunResponse();

        // Mock simulation list GET
        await page.route("**/api/simulations", async (route) => {
          if (route.request().method() === "GET") {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(listResponse.data || []),
            });
          } else {
            await route.continue();
          }
        });

        // Mock specific simulation GET by ID
        await page.route("**/api/simulations/*", async (route) => {
          const method = route.request().method();
          const url = route.request().url();
          const idMatch = url.match(/\/simulations\/([^/?]+)/);

          if (method === "GET" && idMatch) {
            const id = idMatch[1];
            const simulation = options.get ? options.get(id) : null;

            if (simulation) {
              await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ success: true, data: simulation }),
              });
            } else {
              await route.fulfill({
                status: 404,
                contentType: "application/json",
                body: JSON.stringify({ success: false, message: "Not found" }),
              });
            }
          } else if (method === "PATCH" && idMatch) {
            const id = idMatch[1];
            const success = options.update ? options.update(id) : true;

            await route.fulfill({
              status: success ? 200 : 400,
              contentType: "application/json",
              body: JSON.stringify({
                success,
                data: success
                  ? { id, updated_at: new Date().toISOString() }
                  : undefined,
              }),
            });
          } else if (method === "DELETE" && idMatch) {
            const id = idMatch[1];
            const success = options.delete ? options.delete(id) : true;

            await route.fulfill({
              status: success ? 200 : 400,
              contentType: "application/json",
              body: JSON.stringify({ success }),
            });
          } else {
            await route.continue();
          }
        });

        // Mock simulation create
        await page.route("**/api/simulation/create", async (route) => {
          await route.fulfill({
            status: createResponse.success ? 201 : 400,
            contentType: "application/json",
            body: JSON.stringify(createResponse),
          });
        });

        // Mock simulation run
        await page.route("**/api/simulation/run", async (route) => {
          await route.fulfill({
            status: runResponse.success ? 200 : 400,
            contentType: "application/json",
            body: JSON.stringify(runResponse),
          });
        });

        console.log("[Mock] Simulation routes registered");
      },

      async mockPrivacyPolicy(response) {
        const policyResponse = response || createPrivacyPolicyResponse();

        await page.route("**/api/privacy-policy", async (route) => {
          await route.fulfill({
            status: policyResponse.success ? 200 : 400,
            contentType: "application/json",
            body: JSON.stringify(policyResponse),
          });
        });

        console.log("[Mock] Privacy policy route registered");
      },

      async mockConsent(options = {}) {
        const recordResponse = options.record || createConsentResponse();
        const checkResponse = options.check || createConsentResponse();

        await page.route("**/api/consent", async (route) => {
          const method = route.request().method();

          if (method === "POST") {
            await route.fulfill({
              status: recordResponse.success ? 200 : 400,
              contentType: "application/json",
              body: JSON.stringify(recordResponse),
            });
          } else if (method === "GET") {
            await route.fulfill({
              status: checkResponse.success ? 200 : 400,
              contentType: "application/json",
              body: JSON.stringify(checkResponse),
            });
          } else {
            await route.continue();
          }
        });

        console.log("[Mock] Consent routes registered");
      },

      async mockNotices(response) {
        const noticesResponse = response || createNoticeListResponse();

        await page.route("**/api/notices", async (route) => {
          if (route.request().method() === "GET") {
            await route.fulfill({
              status: noticesResponse.success ? 200 : 400,
              contentType: "application/json",
              body: JSON.stringify(noticesResponse),
            });
          } else {
            await route.continue();
          }
        });

        console.log("[Mock] Notices route registered");
      },

      async mockAdminVerify(response) {
        const verifyResponse = response || createAdminVerifyResponse(true);

        await page.route("**/api/admin/verify", async (route) => {
          await route.fulfill({
            status: verifyResponse.success ? 200 : 403,
            contentType: "application/json",
            body: JSON.stringify(verifyResponse),
          });
        });

        console.log("[Mock] Admin verify route registered");
      },

      async mockAdminNotices() {
        // Mock admin notices CRUD endpoints
        await page.route("**/api/admin/notices**", async (route) => {
          const method = route.request().method();

          if (method === "POST") {
            await route.fulfill({
              status: 201,
              contentType: "application/json",
              body: JSON.stringify({ success: true, id: "notice-123" }),
            });
          } else if (method === "PATCH") {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ success: true }),
            });
          } else if (method === "DELETE") {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ success: true }),
            });
          } else {
            await route.continue();
          }
        });

        console.log("[Mock] Admin notices routes registered");
      },

      async mockAdminPolicies() {
        // Mock admin privacy policies CRUD endpoints
        await page.route("**/api/admin/privacy-policies**", async (route) => {
          const method = route.request().method();

          if (method === "POST") {
            await route.fulfill({
              status: 201,
              contentType: "application/json",
              body: JSON.stringify({ success: true, id: "policy-123" }),
            });
          } else if (method === "PATCH") {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ success: true }),
            });
          } else if (method === "DELETE") {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ success: true }),
            });
          } else if (method === "GET") {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ success: true, data: [] }),
            });
          } else {
            await route.continue();
          }
        });

        console.log("[Mock] Admin policies routes registered");
      },

      async clearAll() {
        await page.unrouteAll({ behavior: "ignoreErrors" });
        console.log("[Mock] All routes cleared");
      },
    };

    // Provide fixture value
    await use(controller);

    // Teardown: clear all routes
    try {
      await controller.clearAll();
    } catch {
      // Ignore if page is closed
    }
  },
});

export { expect } from "@playwright/test";
