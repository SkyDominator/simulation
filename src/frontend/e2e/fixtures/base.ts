/* eslint-disable react-hooks/rules-of-hooks */
/**
 * Playwright Fixture Architecture for E2E Tests
 *
 * This module provides typed fixtures for common test scenarios:
 * - memberSession: Authenticated member with whitelisted credentials
 * - adminSession: Authenticated admin with elevated privileges
 * - simulationSeed: Pre-seeded simulation data and localStorage state
 * - mockedApis: Centralized API request interception with typed payloads
 *
 * Usage:
 * ```typescript
 * import { test, expect } from '../fixtures/base';
 *
 * test('user can view dashboard', async ({ page, memberSession }) => {
 *   await page.goto('/');
 *   await expect(page.locator('text=내 시뮬레이션')).toBeVisible();
 * });
 * ```
 *
 * @see docs/plan/IS-62/plan-00.md - Phase 1: Playwright Fixture Architecture
 */

import { test as base, Page } from "@playwright/test";

/**
 * Supabase auth token stub structure
 */
export interface MockAuthToken {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    email: string;
    user_metadata: {
      name: string;
      phone?: string;
      role?: string;
    };
  };
}

/**
 * Mock API controller for request interception
 */
export interface MockedApiController {
  /** Enable OTP success mocking */
  enableOTPSuccess(): Promise<void>;
  /** Enable OTP failure mocking */
  enableOTPFailure(
    scenario: "whitelist" | "invalid_code" | "expired"
  ): Promise<void>;
  /** Enable simulation API mocking */
  enableSimulationAPI(): Promise<void>;
  /** Enable consent API mocking with stateful tracking */
  enableConsentAPI(): Promise<void>;
  /** Enable notices API mocking */
  enableNoticesAPI(): Promise<void>;
  /** Enable admin API mocking */
  enableAdminAPI(): Promise<void>;
  /** Disable all API mocking */
  disableAll(): Promise<void>;
}

/**
 * Simulation seed data structure
 */
export interface SimulationSeedData {
  id: string;
  plan_id: string;
  starting_company_round: number;
  current_company_round: number;
  simulation_rounds: number;
  created_at: string;
}

/**
 * Extended test fixtures
 */
export interface TestFixtures {
  /**
   * Authenticated member session
   * Sets up Supabase auth localStorage state before navigation
   */
  memberSession: void;

  /**
   * Authenticated admin session
   * Composes memberSession with admin role and privileges
   */
  adminSession: void;

  /**
   * Pre-seeded simulation data
   * Injects localStorage drafts and mocked API responses
   */
  simulationSeed: SimulationSeedData;

  /**
   * Centralized API mocking controller
   * Provides typed methods to enable/disable endpoint interception
   */
  mockedApis: MockedApiController;
}

/**
 * Initialize E2E mode flag for the page
 * Ensures __E2E_MODE__ is available before scripts execute on navigation
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
      // Ignore if storage is unavailable (e.g., sandboxed contexts)
    }
  });
}

/**
 * Set Supabase auth token in localStorage via init script
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
 * Create mock API controller for the page
 */
function createMockedApiController(page: Page): MockedApiController {
  const activeRoutes = new Set<string>();

  return {
    async enableOTPSuccess() {
      const sendKey = "**/api/otp/send";
      const verifyKey = "**/api/otp/verify";

      if (activeRoutes.has(sendKey)) {
        await page.unroute(sendKey);
      }
      await page.route(sendKey, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "OTP sent successfully",
            user_hash: "test-hash-123",
            expires_in_seconds: 300,
          }),
        });
      });
      activeRoutes.add(sendKey);

      if (activeRoutes.has(verifyKey)) {
        await page.unroute(verifyKey);
      }
      await page.route(verifyKey, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "OTP verified successfully",
          }),
        });
      });
      activeRoutes.add(verifyKey);
    },

    async enableOTPFailure(scenario: "whitelist" | "invalid_code" | "expired") {
      if (scenario === "whitelist") {
        const key = "**/api/otp/send";
        if (activeRoutes.has(key)) {
          await page.unroute(key);
        }
        await page.route(key, async (route) => {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({
              success: false,
              message: "가입 허용 명단에 없는 사용자입니다.",
            }),
          });
        });
        activeRoutes.add(key);
      } else if (scenario === "invalid_code") {
        const key = "**/api/otp/verify";
        if (activeRoutes.has(key)) {
          await page.unroute(key);
        }
        await page.route(key, async (route) => {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({
              success: false,
              message: "인증번호가 올바르지 않습니다.",
              remaining_attempts: 2,
            }),
          });
        });
        activeRoutes.add(key);
      } else if (scenario === "expired") {
        const key = "**/api/otp/verify";
        if (activeRoutes.has(key)) {
          await page.unroute(key);
        }
        await page.route(key, async (route) => {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({
              success: false,
              message: "인증번호가 만료되었습니다.",
            }),
          });
        });
        activeRoutes.add(key);
      }
    },

    async enableSimulationAPI() {
      const createKey = "**/api/simulation/create";
      const runKey = "**/api/simulation/run";
      const listKey = "**/api/simulations**";
      // const _getKey = '**/api/simulation/*';
      // const _updateKey = '**/api/simulation/update';
      // const _deleteKey = '**/api/simulation/delete';

      // Create
      if (activeRoutes.has(createKey)) {
        await page.unroute(createKey);
      }
      await page.route(createKey, async (route) => {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              id: "sim-" + Date.now(),
              plan_id: "A",
              starting_company_round: 1,
              current_company_round: 1,
              simulation_rounds: 12,
              created_at: new Date().toISOString(),
            },
          }),
        });
      });
      activeRoutes.add(createKey);

      // Run
      if (activeRoutes.has(runKey)) {
        await page.unroute(runKey);
      }
      await page.route(runKey, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              id: "sim-123",
              results: {
                history: [
                  {
                    company_round: 1,
                    investor_count: 1,
                    total_payment: 1000000,
                    total_revenue_after_tax: 970000,
                    cumulative_net_profit: -30000,
                    round_bonus: 0,
                    settlement_bonus: 100000,
                  },
                ],
                final_profit: 970000,
                total_investment: 1000000,
              },
            },
          }),
        });
      });
      activeRoutes.add(runKey);

      // List
      if (activeRoutes.has(listKey)) {
        await page.unroute(listKey);
      }
      await page.route(listKey, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: [],
          }),
        });
      });
      activeRoutes.add(listKey);

      // Get, Update, Delete can be added as needed
    },

    async enableConsentAPI() {
      const policyKey = "**/api/privacy-policy**";
      const consentKey = "**/api/consent**";

      if (activeRoutes.has(policyKey)) {
        await page.unroute(policyKey);
      }
      await page.route(policyKey, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              version: "1.0.0",
              locale: "ko-KR",
              content: "개인정보 보호 정책 내용",
              effective_date: new Date().toISOString(),
              published: true,
            },
          }),
        });
      });
      activeRoutes.add(policyKey);

      if (activeRoutes.has(consentKey)) {
        await page.unroute(consentKey);
      }
      await page.route(consentKey, async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              message: "Consent recorded",
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: {
                consent_given: true,
                consent_version: "1.0.0",
              },
            }),
          });
        }
      });
      activeRoutes.add(consentKey);
    },

    async enableNoticesAPI() {
      const listKey = "**/api/notices**";
      // const _getKey = '**/api/notice/*';

      if (activeRoutes.has(listKey)) {
        await page.unroute(listKey);
      }
      await page.route(listKey, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: "notice-1",
                title: "테스트 공지사항",
                content: "테스트 공지사항 내용",
                created_at: new Date().toISOString(),
                published: true,
                pinned: false,
              },
            ],
          }),
        });
      });
      activeRoutes.add(listKey);
    },

    async enableAdminAPI() {
      const verifyKey = "**/api/admin/verify";
      // const _noticesKey = '**/api/admin/notices**';
      // const _policiesKey = '**/api/admin/privacy-policies**';

      if (activeRoutes.has(verifyKey)) {
        await page.unroute(verifyKey);
      }
      await page.route(verifyKey, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            is_admin: true,
          }),
        });
      });
      activeRoutes.add(verifyKey);

      // Admin notices and privacy policies can be mocked similarly
    },

    async disableAll() {
      for (const routeKey of activeRoutes) {
        try {
          await page.unroute(routeKey);
        } catch {
          // Ignore if route doesn't exist
        }
      }
      activeRoutes.clear();
    },
  };
}

/**
 * Extended Playwright test with custom fixtures
 */
export const test = base.extend<TestFixtures>({
  /**
   * Member session fixture
   * Automatically initializes E2E mode and sets up authenticated member state
   */
  memberSession: async ({ page }, use) => {
    // Initialize E2E mode
    await initE2EMode(page);

    // Set up member auth token
    const memberToken: MockAuthToken = {
      access_token: "mock-jwt-token",
      refresh_token: "mock-refresh-token",
      expires_at: Date.now() + 3600000, // 1 hour from now
      user: {
        id: "test-user-123",
        email: "test@example.com",
        user_metadata: {
          name: "Test User",
          phone: "010-1234-5678",
        },
      },
    };

    await setAuthToken(page, memberToken);

    // Use the fixture
    await use();

    // Cleanup is automatic via Playwright fixture lifecycle
  },

  /**
   * Admin session fixture
   * Composes memberSession with admin role and sessionStorage flag
   */
  adminSession: async ({ page }, use) => {
    // Initialize E2E mode
    await initE2EMode(page);

    // Set up admin auth token
    const adminToken: MockAuthToken = {
      access_token: "mock-admin-jwt-token",
      refresh_token: "mock-admin-refresh-token",
      expires_at: Date.now() + 3600000,
      user: {
        id: "admin-user-123",
        email: "admin@example.com",
        user_metadata: {
          name: "Admin User",
          role: "admin",
        },
      },
    };

    await setAuthToken(page, adminToken);

    // Set admin privileges in sessionStorage
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

    // Use the fixture
    await use();
  },

  /**
   * Simulation seed fixture
   * Provides deterministic simulation data in localStorage
   */
  simulationSeed: async ({ page, memberSession: _memberSession }, use) => {
    const seedData: SimulationSeedData = {
      id: "sim-seed-123",
      plan_id: "A",
      starting_company_round: 1,
      current_company_round: 1,
      simulation_rounds: 12,
      created_at: new Date().toISOString(),
    };

    // Inject seed data into localStorage
    await page.addInitScript((data) => {
      window.localStorage.setItem("simulation.draft", JSON.stringify(data));
    }, seedData);

    try {
      await page.evaluate((data) => {
        window.localStorage.setItem("simulation.draft", JSON.stringify(data));
      }, seedData);
    } catch {
      // Ignored: page might not be navigated yet
    }

    // Use the fixture
    await use(seedData);
  },

  /**
   * Mocked APIs fixture
   * Provides controller to enable/disable API interception
   */
  mockedApis: async ({ page }, use) => {
    const controller = createMockedApiController(page);

    // Use the fixture
    await use(controller);

    // Cleanup all routes
    await controller.disableAll();
  },
});

/**
 * Re-export expect from @playwright/test for convenience
 */
export { expect } from "@playwright/test";
