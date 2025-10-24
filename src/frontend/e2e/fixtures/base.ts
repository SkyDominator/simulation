/**
 * Playwright Fixture Architecture
 *
 * This module provides reusable, typed fixtures for E2E tests following Playwright best practices.
 * Fixtures deliver pre-configured test states (authentication, mocked APIs, seeded data) through
 * dependency injection, eliminating manual setup in test files.
 *
 * @see docs/plan/IS-62/plan-00.md - Phase 1: Playwright Fixture Architecture
 * @see https://playwright.dev/docs/test-fixtures - Playwright Fixture Guide
 */

import { test as base, Page } from "@playwright/test";
import {
  createMemberAuthToken,
  createAdminAuthToken,
  createOTPSendSuccessResponse,
  createOTPVerifySuccessResponse,
  createPrivacyPolicyResponse,
  createSimulationData,
  createSimulationRunResponse,
  createNoticeListResponse,
  createAdminVerifyResponse,
} from "../../test/shared/fixtures";
import type { MockAuthToken } from "../../test/shared/types";

/**
 * Fixture for member (regular user) session
 * Sets up authenticated member state in localStorage via init script
 */
interface MemberSessionFixture {
  /**
   * Page with authenticated member session
   */
  page: Page;
  /**
   * Mock auth token used for the session
   */
  authToken: MockAuthToken;
}

/**
 * Fixture for admin session
 * Extends member session with admin privileges and role
 */
interface AdminSessionFixture {
  /**
   * Page with authenticated admin session
   */
  page: Page;
  /**
   * Mock admin auth token
   */
  authToken: MockAuthToken;
}

/**
 * API mock controller for OTP-related endpoints
 */
interface OTPMockController {
  /**
   * Configure OTP send endpoint behavior
   */
  mockSendSuccess(): Promise<void>;
  mockSendWhitelistFailure(): Promise<void>;
  /**
   * Configure OTP verify endpoint behavior
   */
  mockVerifySuccess(): Promise<void>;
  mockVerifyInvalidCode(): Promise<void>;
  mockVerifyExpired(): Promise<void>;
}

/**
 * API mock controller for simulation-related endpoints
 */
interface SimulationMockController {
  /**
   * Mock successful simulation creation
   */
  mockCreate(simulationId?: string): Promise<void>;
  /**
   * Mock successful simulation run with results
   */
  mockRun(): Promise<void>;
  /**
   * Mock simulation list retrieval
   */
  mockList(simulations?: unknown[]): Promise<void>;
  /**
   * Mock specific simulation GET by ID
   */
  mockGet(simulationId: string): Promise<void>;
  /**
   * Mock simulation update
   */
  mockUpdate(simulationId: string): Promise<void>;
  /**
   * Mock simulation delete
   */
  mockDelete(simulationId: string): Promise<void>;
}

/**
 * API mock controller for consent-related endpoints
 */
interface ConsentMockController {
  /**
   * Mock privacy policy retrieval
   */
  mockPrivacyPolicy(): Promise<void>;
  /**
   * Mock consent recording (POST)
   */
  mockConsentRecord(): Promise<void>;
  /**
   * Mock consent retrieval (GET by user_hash)
   */
  mockConsentGet(): Promise<void>;
  /**
   * Get diagnostic snapshot of consent mock state
   */
  getState(): {
    postCount: number;
    getCount: number;
    consentsByHash: Record<string, unknown[]>;
  } | null;
}

/**
 * API mock controller for notices
 */
interface NoticeMockController {
  /**
   * Mock notices list retrieval
   */
  mockList(): Promise<void>;
  /**
   * Mock specific notice GET by ID
   */
  mockGet(noticeId: string): Promise<void>;
}

/**
 * API mock controller for admin endpoints
 */
interface AdminMockController {
  /**
   * Mock admin verification endpoint
   */
  mockVerify(isAdmin?: boolean): Promise<void>;
  /**
   * Mock admin notice management endpoints
   */
  mockNoticeCreate(): Promise<void>;
  mockNoticeUpdate(noticeId: string): Promise<void>;
  mockNoticeDelete(noticeId: string): Promise<void>;
  /**
   * Mock admin privacy policy management endpoints
   */
  mockPolicyList(): Promise<void>;
  mockPolicyCreate(): Promise<void>;
  mockPolicyUpdate(policyId: string): Promise<void>;
  mockPolicyDelete(policyId: string): Promise<void>;
  mockPolicyPublish(policyId: string): Promise<void>;
}

/**
 * Centralized API mocking fixture providing typed mock controllers
 */
interface MockedAPIsFixture {
  otp: OTPMockController;
  simulation: SimulationMockController;
  consent: ConsentMockController;
  notice: NoticeMockController;
  admin: AdminMockController;
}

/**
 * Fixture for seeded simulation data state
 * Composes with memberSession to provide pre-loaded simulation environment
 */
interface SimulationSeedFixture {
  /**
   * Page with member session and simulation API mocks enabled
   */
  page: Page;
  /**
   * Seeded simulation IDs for easy test reference
   */
  simulationIds: string[];
}

/**
 * Combined fixture types for test consumption
 */
type TestFixtures = {
  /**
   * Member session with authenticated regular user
   */
  memberSession: MemberSessionFixture;
  /**
   * Admin session with authenticated admin user
   */
  adminSession: AdminSessionFixture;
  /**
   * Centralized API mock controllers
   */
  mockedApis: MockedAPIsFixture;
  /**
   * Simulation seed with pre-configured simulation data and mocks
   */
  simulationSeed: SimulationSeedFixture;
};

/**
 * Initialize E2E mode flag on page
 * Sets window.__E2E_MODE__ and localStorage flag for application to detect test environment
 */
async function initE2EMode(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Set global E2E mode flag
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__E2E_MODE__ = true;
    window.localStorage.setItem("__e2e_mode__", "true");
  });

  // Also set immediately if page already loaded
  try {
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__E2E_MODE__ = true;
      window.localStorage.setItem("__e2e_mode__", "true");
    });
  } catch {
    // Ignore if page not ready; init script will handle it
  }
}

/**
 * Setup member authentication in page storage
 */
async function setupMemberAuth(
  page: Page,
  authToken: MockAuthToken
): Promise<void> {
  await page.addInitScript((token) => {
    window.localStorage.setItem("supabase.auth.token", JSON.stringify(token));
    window.localStorage.setItem("ui.page", '"main"');
    window.localStorage.setItem("ui.noticeOpen", "false");
  }, authToken);

  // Apply immediately if page already loaded
  try {
    await page.evaluate((token) => {
      window.localStorage.setItem("supabase.auth.token", JSON.stringify(token));
      window.localStorage.setItem("ui.page", '"main"');
      window.localStorage.setItem("ui.noticeOpen", "false");
    }, authToken);
  } catch {
    // Init script will handle if page not ready
  }
}

/**
 * Setup admin authentication in page storage
 */
async function setupAdminAuth(
  page: Page,
  authToken: MockAuthToken
): Promise<void> {
  await page.addInitScript((token) => {
    window.localStorage.setItem("supabase.auth.token", JSON.stringify(token));
    window.localStorage.setItem("ui.page", '"main"');
    window.localStorage.setItem("ui.noticeOpen", "false");
    window.sessionStorage.setItem("user.isAdmin", "true");
  }, authToken);

  // Apply immediately if page already loaded
  try {
    await page.evaluate((token) => {
      window.localStorage.setItem("supabase.auth.token", JSON.stringify(token));
      window.localStorage.setItem("ui.page", '"main"');
      window.localStorage.setItem("ui.noticeOpen", "false");
      window.sessionStorage.setItem("user.isAdmin", "true");
    }, authToken);
  } catch {
    // Init script will handle if page not ready
  }
}

/**
 * Create OTP mock controller
 */
function createOTPMockController(page: Page): OTPMockController {
  return {
    async mockSendSuccess() {
      try {
        await page.unroute("**/api/otp/send");
      } catch {
        // Ignore if no existing route
      }
      await page.route("**/api/otp/send", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(createOTPSendSuccessResponse()),
        });
      });
    },

    async mockSendWhitelistFailure() {
      try {
        await page.unroute("**/api/otp/send");
      } catch {
        // Ignore
      }
      await page.route("**/api/otp/send", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            message: "가입 허용 명단에 없는 사용자입니다.",
          }),
        });
      });
    },

    async mockVerifySuccess() {
      try {
        await page.unroute("**/api/otp/verify");
      } catch {
        // Ignore
      }
      await page.route("**/api/otp/verify", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(createOTPVerifySuccessResponse()),
        });
      });
    },

    async mockVerifyInvalidCode() {
      try {
        await page.unroute("**/api/otp/verify");
      } catch {
        // Ignore
      }
      await page.route("**/api/otp/verify", async (route) => {
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
    },

    async mockVerifyExpired() {
      try {
        await page.unroute("**/api/otp/verify");
      } catch {
        // Ignore
      }
      await page.route("**/api/otp/verify", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            message: "인증번호가 만료되었습니다.",
          }),
        });
      });
    },
  };
}

/**
 * Create simulation mock controller
 */
function createSimulationMockController(page: Page): SimulationMockController {
  return {
    async mockCreate(simulationId = "sim-123") {
      try {
        await page.unroute("**/api/simulation/create");
      } catch {
        // Ignore
      }
      await page.route("**/api/simulation/create", async (route) => {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: createSimulationData({ id: simulationId }),
          }),
        });
      });
    },

    async mockRun() {
      try {
        await page.unroute("**/api/simulation/run");
      } catch {
        // Ignore
      }
      await page.route("**/api/simulation/run", async (route) => {
        const response = createSimulationRunResponse();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(response),
        });
      });
    },

    async mockList(simulations = []) {
      try {
        await page.unroute("**/api/simulations");
      } catch {
        // Ignore
      }
      await page.route("**/api/simulations", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(simulations),
          });
        } else {
          await route.continue();
        }
      });
    },

    async mockGet(simulationId: string) {
      try {
        await page.unroute(`**/api/simulations/${simulationId}`);
      } catch {
        // Ignore
      }
      await page.route(`**/api/simulations/${simulationId}`, async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: createSimulationData({ id: simulationId }),
            }),
          });
        } else {
          await route.continue();
        }
      });
    },

    async mockUpdate(simulationId: string) {
      try {
        await page.unroute(`**/api/simulations/${simulationId}`);
      } catch {
        // Ignore
      }
      await page.route(`**/api/simulations/${simulationId}`, async (route) => {
        if (route.request().method() === "PATCH") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: {
                id: simulationId,
                updated_at: new Date().toISOString(),
              },
            }),
          });
        } else {
          await route.continue();
        }
      });
    },

    async mockDelete(simulationId: string) {
      try {
        await page.unroute(`**/api/simulations/${simulationId}`);
      } catch {
        // Ignore
      }
      await page.route(`**/api/simulations/${simulationId}`, async (route) => {
        if (route.request().method() === "DELETE") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              message: "Simulation deleted successfully",
            }),
          });
        } else {
          await route.continue();
        }
      });
    },
  };
}

/**
 * Consent mock internal state tracker (using WeakMap pattern from legacy code)
 */
type ConsentRecord = {
  user_hash: string;
  consent_type: string;
  consent_version: string;
  consent_given_at: string;
  ip_address?: string;
  user_agent?: string;
};

type ConsentMockInternalState = {
  consentMap: Map<string, ConsentRecord[]>;
  postCount: number;
  getCount: number;
};

const consentMockStates = new WeakMap<Page, ConsentMockInternalState>();

/**
 * Create consent mock controller
 */
function createConsentMockController(page: Page): ConsentMockController {
  // Initialize state for this page
  const state: ConsentMockInternalState = {
    consentMap: new Map(),
    postCount: 0,
    getCount: 0,
  };
  consentMockStates.set(page, state);

  // Clean up on page close
  page.once("close", () => consentMockStates.delete(page));

  return {
    async mockPrivacyPolicy() {
      try {
        await page.unroute("**/api/privacy-policy**");
      } catch {
        // Ignore
      }
      await page.route("**/api/privacy-policy**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(createPrivacyPolicyResponse()),
        });
      });
    },

    async mockConsentRecord() {
      try {
        await page.unroute("**/api/consents");
      } catch {
        // Ignore
      }
      await page.route("**/api/consents", async (route) => {
        if (route.request().method() === "POST") {
          let requestBody: Record<string, unknown> = {};
          try {
            requestBody = route.request().postDataJSON() ?? {};
          } catch {
            requestBody = {};
          }

          const userHash =
            typeof requestBody.user_hash === "string"
              ? requestBody.user_hash
              : "test-hash-123";
          const consentType =
            typeof requestBody.consent_type === "string"
              ? requestBody.consent_type
              : "privacy_policy";
          const consentVersion =
            typeof requestBody.consent_version === "string"
              ? requestBody.consent_version
              : "v1";

          const consentRecord: ConsentRecord = {
            user_hash: userHash,
            consent_type: consentType,
            consent_version: consentVersion,
            consent_given_at: new Date().toISOString(),
            ip_address:
              typeof requestBody.ip_address === "string"
                ? requestBody.ip_address
                : "127.0.0.1",
            user_agent:
              typeof requestBody.user_agent === "string"
                ? requestBody.user_agent
                : "Mozilla/5.0 (E2E)",
          };

          const existingConsents = state.consentMap.get(userHash) ?? [];
          state.consentMap.set(userHash, [...existingConsents, consentRecord]);
          state.postCount += 1;

          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(consentRecord),
          });
        } else {
          await route.continue();
        }
      });
    },

    async mockConsentGet() {
      try {
        await page.unroute("**/api/consents/*");
      } catch {
        // Ignore
      }
      await page.route("**/api/consents/*", async (route) => {
        if (route.request().method() === "GET") {
          const url = route.request().url();
          const hashMatch = url.match(/\/api\/consents\/([^/?#]+)/);
          const userHash = hashMatch?.[1] ?? "test-hash-123";
          const consents = state.consentMap.get(userHash) ?? [];
          state.getCount += 1;

          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              consents,
              success: true,
            }),
          });
        } else {
          await route.continue();
        }
      });
    },

    getState() {
      const currentState = consentMockStates.get(page);
      if (!currentState) {
        return null;
      }

      const consentsByHash: Record<string, unknown[]> = Object.fromEntries(
        Array.from(currentState.consentMap.entries()).map(([hash, records]) => [
          hash,
          records.map((record) => ({ ...record })),
        ])
      );

      return {
        postCount: currentState.postCount,
        getCount: currentState.getCount,
        consentsByHash,
      };
    },
  };
}

/**
 * Create notice mock controller
 */
function createNoticeMockController(page: Page): NoticeMockController {
  return {
    async mockList() {
      try {
        await page.unroute("**/api/notices**");
      } catch {
        // Ignore
      }
      await page.route("**/api/notices**", async (route) => {
        if (route.request().method() === "GET") {
          const url = route.request().url();
          const idMatch = url.match(/\/notices\/([^/?]+)/);
          if (!idMatch) {
            // List all notices
            const response = createNoticeListResponse();
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(response),
            });
          } else {
            await route.continue();
          }
        } else {
          await route.continue();
        }
      });
    },

    async mockGet(noticeId: string) {
      try {
        await page.unroute(`**/api/notices/${noticeId}`);
      } catch {
        // Ignore
      }
      await page.route(`**/api/notices/${noticeId}`, async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              notice: {
                id: noticeId,
                title: "Test Notice",
                content: "Test notice content",
                pinned: false,
                published: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            }),
          });
        } else {
          await route.continue();
        }
      });
    },
  };
}

/**
 * Create admin mock controller
 */
function createAdminMockController(page: Page): AdminMockController {
  return {
    async mockVerify(isAdmin = true) {
      try {
        await page.unroute("**/api/admin/me");
      } catch {
        // Ignore
      }
      await page.route("**/api/admin/me", async (route) => {
        const response = createAdminVerifyResponse(isAdmin);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(response),
        });
      });
    },

    async mockNoticeCreate() {
      try {
        await page.unroute("**/api/admin/notices");
      } catch {
        // Ignore
      }
      await page.route("**/api/admin/notices", async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: {
                id: "notice-new",
                title: "New Notice",
                content: "New content",
                created_at: new Date().toISOString(),
              },
            }),
          });
        } else {
          await route.continue();
        }
      });
    },

    async mockNoticeUpdate(noticeId: string) {
      try {
        await page.unroute(`**/api/admin/notices/${noticeId}`);
      } catch {
        // Ignore
      }
      await page.route(`**/api/admin/notices/${noticeId}`, async (route) => {
        if (route.request().method() === "PATCH") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: {
                id: noticeId,
                updated_at: new Date().toISOString(),
              },
            }),
          });
        } else {
          await route.continue();
        }
      });
    },

    async mockNoticeDelete(noticeId: string) {
      try {
        await page.unroute(`**/api/admin/notices/${noticeId}`);
      } catch {
        // Ignore
      }
      await page.route(`**/api/admin/notices/${noticeId}`, async (route) => {
        if (route.request().method() === "DELETE") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              message: "Notice deleted successfully",
            }),
          });
        } else {
          await route.continue();
        }
      });
    },

    async mockPolicyList() {
      try {
        await page.unroute("**/api/admin/privacy-policies**");
      } catch {
        // Ignore
      }
      await page.route("**/api/admin/privacy-policies**", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              policies: [
                {
                  id: "policy-1",
                  version: "v1",
                  locale: "ko-KR",
                  content: "<p>Privacy policy content v1</p>",
                  published: true,
                  effective_date: "2024-01-01",
                  created_at: "2024-01-01T00:00:00Z",
                },
              ],
            }),
          });
        } else {
          await route.continue();
        }
      });
    },

    async mockPolicyCreate() {
      try {
        await page.unroute("**/api/admin/privacy-policies");
      } catch {
        // Ignore
      }
      await page.route("**/api/admin/privacy-policies", async (route) => {
        if (route.request().method() === "POST") {
          const url = route.request().url();
          if (!url.includes("/publish")) {
            await route.fulfill({
              status: 201,
              contentType: "application/json",
              body: JSON.stringify({
                success: true,
                data: {
                  id: "policy-new",
                  version: "v3",
                  created_at: new Date().toISOString(),
                },
              }),
            });
          } else {
            await route.continue();
          }
        } else {
          await route.continue();
        }
      });
    },

    async mockPolicyUpdate(policyId: string) {
      try {
        await page.unroute(`**/api/admin/privacy-policies/${policyId}`);
      } catch {
        // Ignore
      }
      await page.route(
        `**/api/admin/privacy-policies/${policyId}`,
        async (route) => {
          if (route.request().method() === "PATCH") {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({
                success: true,
                data: {
                  id: policyId,
                  updated_at: new Date().toISOString(),
                },
              }),
            });
          } else {
            await route.continue();
          }
        }
      );
    },

    async mockPolicyDelete(policyId: string) {
      try {
        await page.unroute(`**/api/admin/privacy-policies/${policyId}`);
      } catch {
        // Ignore
      }
      await page.route(
        `**/api/admin/privacy-policies/${policyId}`,
        async (route) => {
          if (route.request().method() === "DELETE") {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({
                success: true,
                message: "Policy deleted successfully",
              }),
            });
          } else {
            await route.continue();
          }
        }
      );
    },

    async mockPolicyPublish(policyId: string) {
      try {
        await page.unroute(`**/api/admin/privacy-policies/${policyId}/publish`);
      } catch {
        // Ignore
      }
      await page.route(
        `**/api/admin/privacy-policies/${policyId}/publish`,
        async (route) => {
          if (route.request().method() === "POST") {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({
                success: true,
                data: {
                  id: policyId,
                  published: true,
                  effective_date: new Date().toISOString(),
                },
              }),
            });
          } else {
            await route.continue();
          }
        }
      );
    },
  };
}

/**
 * Extended test object with custom fixtures
 */
export const test = base.extend<TestFixtures>({
  /**
   * Member session fixture
   * Provides authenticated member state via localStorage
   * Auto-initializes E2E mode
   */
  memberSession: async ({ page }, use) => {
    const authToken = createMemberAuthToken();
    await initE2EMode(page);
    await setupMemberAuth(page, authToken);
    await use({ page, authToken });
  },

  /**
   * Admin session fixture
   * Provides authenticated admin state with admin role and privileges
   * Auto-initializes E2E mode
   */
  adminSession: async ({ page }, use) => {
    const authToken = createAdminAuthToken();
    await initE2EMode(page);
    await setupAdminAuth(page, authToken);
    await use({ page, authToken });
  },

  /**
   * Mocked APIs fixture
   * Provides centralized API mock controllers for all test endpoints
   * Auto-initializes E2E mode
   */
  mockedApis: async ({ page }, use) => {
    await initE2EMode(page);

    const apis: MockedAPIsFixture = {
      otp: createOTPMockController(page),
      simulation: createSimulationMockController(page),
      consent: createConsentMockController(page),
      notice: createNoticeMockController(page),
      admin: createAdminMockController(page),
    };

    // Emit console marks for request tracking (observability per plan §4)
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/api/")) {
        console.log(`[E2E Mock Request] ${request.method()} ${url}`);
      }
    });

    page.on("response", (response) => {
      const url = response.url();
      if (url.includes("/api/")) {
        console.log(`[E2E Mock Response] ${response.status()} ${url}`);
      }
    });

    await use(apis);
  },

  /**
   * Simulation seed fixture
   * Provides member session with pre-configured simulation API mocks and localStorage drafts
   * Composes memberSession with simulation mocking
   */
  simulationSeed: async ({ memberSession, mockedApis }, use) => {
    const { page } = memberSession;

    // Mock simulation list with seeded data
    const seedSimulations = [
      createSimulationData({ id: "sim-seed-1", plan_id: "A" }),
      createSimulationData({ id: "sim-seed-2", plan_id: "B" }),
      createSimulationData({ id: "sim-seed-3", plan_id: "D" }),
    ];

    await mockedApis.simulation.mockList(seedSimulations);
    await mockedApis.simulation.mockCreate("sim-seed-new");
    await mockedApis.simulation.mockRun();

    // Inject localStorage draft if needed for plan editor tests
    await page.evaluate(() => {
      window.localStorage.setItem(
        "simulation.draft",
        JSON.stringify({
          plan_id: "A",
          starting_company_round: 1,
          current_company_round: 1,
          simulation_rounds: 10,
          investments: {},
        })
      );
    });

    await use({
      page,
      simulationIds: seedSimulations.map((s) => s.id),
    });
  },
});

/**
 * Re-export expect from Playwright for convenience
 */
export { expect } from "@playwright/test";
