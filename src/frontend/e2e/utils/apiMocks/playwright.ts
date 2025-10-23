/**
 * Playwright API mocking utilities
 *
 * Route handlers for intercepting API requests in Playwright E2E tests.
 * Uses shared fixture factories for consistent mock payloads.
 *
 * @see docs/plan/IS-62/plan-00.md - Phase 2: Helper & Mock Consolidation
 */

import { Page } from "@playwright/test";
import {
  createOTPSendSuccessResponse,
  createOTPSendWhitelistFailureResponse,
  createOTPVerifySuccessResponse,
  createOTPVerifyInvalidCodeResponse,
  createOTPVerifyExpiredResponse,
  createPrivacyPolicyResponse,
  createConsentRecord,
  createConsentResponse,
  createSimulationCreateResponse,
  createSimulationRunResponse,
  createSimulationListResponse,
  createSimulationData,
  createNoticeListResponse,
  createPrivacyPolicyListResponse,
  createAdminVerifyResponse,
  createAPIErrorResponse,
} from "../../../test/shared/fixtures";

import type { ConsentRecord } from "../../../test/shared/types";

type ConsentMockInternalState = {
  consentMap: Map<string, ConsentRecord[]>;
  postCount: number;
  getCount: number;
};

type ConsentMockSnapshot = {
  postCount: number;
  getCount: number;
  consentsByHash: Record<string, ConsentRecord[]>;
};

const consentMockStates = new WeakMap<Page, ConsentMockInternalState>();

/**
 * Mock successful OTP flow
 */
export async function mockOTPSuccess(page: Page): Promise<void> {
  try {
    await page.unroute("**/api/otp/send");
  } catch {
    // ignore if no existing route
  }
  await page.route("**/api/otp/send", async (route) => {
    const response = createOTPSendSuccessResponse();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });

  try {
    await page.unroute("**/api/otp/verify");
  } catch {
    // ignore if no existing route
  }
  await page.route("**/api/otp/verify", async (route) => {
    const response = createOTPVerifySuccessResponse();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

/**
 * Mock OTP failure scenarios
 */
export async function mockOTPFailure(
  page: Page,
  scenario: "whitelist" | "invalid_code" | "expired"
): Promise<void> {
  if (scenario === "whitelist") {
    try {
      await page.unroute("**/api/otp/send");
    } catch {
      // ignore
    }
    await page.route("**/api/otp/send", async (route) => {
      const response = createOTPSendWhitelistFailureResponse();
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    });
  } else if (scenario === "invalid_code") {
    try {
      await page.unroute("**/api/otp/verify");
    } catch {
      // ignore
    }
    await page.route("**/api/otp/verify", async (route) => {
      const response = createOTPVerifyInvalidCodeResponse();
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    });
  } else if (scenario === "expired") {
    try {
      await page.unroute("**/api/otp/verify");
    } catch {
      // ignore
    }
    await page.route("**/api/otp/verify", async (route) => {
      const response = createOTPVerifyExpiredResponse();
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    });
  }
}

/**
 * Mock simulation API endpoints
 */
export async function mockSimulationAPI(page: Page): Promise<void> {
  // Clean up existing routes
  try {
    await page.unroute("**/api/simulation/create");
  } catch {
    // ignore
  }
  try {
    await page.unroute("**/api/simulation/run");
  } catch {
    // ignore
  }
  try {
    await page.unroute("**/api/simulations**");
  } catch {
    // ignore
  }

  // Mock simulation creation
  await page.route("**/api/simulation/create", async (route) => {
    const response = createSimulationCreateResponse();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });

  // Mock simulation run
  await page.route("**/api/simulation/run", async (route) => {
    const response = createSimulationRunResponse();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });

  // Mock simulation list GET and specific simulation operations
  await page.route("**/api/simulations**", async (route) => {
    const method = route.request().method();
    const url = route.request().url();

    if (method === "GET") {
      // Check if requesting specific simulation by ID
      const idMatch = url.match(/\/simulations\/([^/?]+)/);
      if (idMatch) {
        // GET specific simulation
        const simData = createSimulationData({ id: idMatch[1] });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: simData,
          }),
        });
      } else {
        // GET all simulations
        const response = createSimulationListResponse(1);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(response.data),
        });
      }
    } else if (method === "PATCH") {
      // UPDATE simulation
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "sim-123",
            updated_at: new Date().toISOString(),
          },
        }),
      });
    } else if (method === "DELETE") {
      // DELETE simulation
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Simulation deleted successfully",
        }),
      });
    } else {
      // Fallback for other methods
      await route.continue();
    }
  });
}

/**
 * Mock privacy policy retrieval and consent recording
 */
export async function mockConsentSuccess(page: Page): Promise<void> {
  const state: ConsentMockInternalState = {
    consentMap: new Map(),
    postCount: 0,
    getCount: 0,
  };
  consentMockStates.set(page, state);
  page.once("close", () => consentMockStates.delete(page));

  // Mock GET /api/privacy-policy (with optional query params)
  try {
    await page.unroute("**/api/privacy-policy**");
  } catch {
    // ignore
  }
  await page.route("**/api/privacy-policy**", async (route) => {
    const response = createPrivacyPolicyResponse();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });

  // Mock POST /api/consents - Record consent
  try {
    await page.unroute("**/api/consents");
  } catch {
    // ignore
  }
  await page.route("**/api/consents", async (route) => {
    if (route.request().method() === "POST") {
      let requestBody: Record<string, unknown> = {};
      try {
        requestBody = route.request().postDataJSON?.() ?? {};
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

      const consentRecord = createConsentRecord({
        user_hash: userHash,
        consent_type: consentType,
        consent_version: consentVersion,
        ip_address:
          typeof requestBody.ip_address === "string"
            ? requestBody.ip_address
            : "127.0.0.1",
        user_agent:
          typeof requestBody.user_agent === "string"
            ? requestBody.user_agent
            : "Mozilla/5.0 (E2E)",
      });

      const existingConsents = state.consentMap.get(userHash) ?? [];
      state.consentMap.set(userHash, [...existingConsents, consentRecord]);
      state.postCount += 1;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(consentRecord),
      });
    } else {
      // Unexpected method on /api/consents
      await route.continue();
    }
  });

  // Mock GET /api/consents/{user_hash} - Get user consents
  try {
    await page.unroute("**/api/consents/*");
  } catch {
    // ignore
  }
  await page.route("**/api/consents/*", async (route) => {
    if (route.request().method() === "GET") {
      const url = route.request().url();
      const hashMatch = url.match(/\/api\/consents\/([^/?#]+)/);
      const userHash = hashMatch?.[1] ?? "test-hash-123";
      const consents = state.consentMap.get(userHash) ?? [];
      state.getCount += 1;

      const response = createConsentResponse({ consents });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Mock network error scenarios
 */
export async function mockNetworkError(
  page: Page,
  endpoint: string
): Promise<void> {
  await page.route(`**${endpoint}`, async (route) => {
    await route.abort("failed");
  });
}

/**
 * Mock notices API endpoints
 */
export async function mockNoticesAPI(page: Page): Promise<void> {
  try {
    await page.unroute("**/api/notices**");
  } catch {
    // ignore
  }

  await page.route("**/api/notices**", async (route) => {
    const method = route.request().method();
    const url = route.request().url();

    if (method === "GET") {
      const idMatch = url.match(/\/notices\/([^/?]+)/);
      if (idMatch) {
        // GET specific notice
        const response = createNoticeListResponse(1);
        const notice = response.notices?.[0];
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            notice: { ...notice, id: idMatch[1] },
          }),
        });
      } else {
        // GET all notices
        const response = createNoticeListResponse(2);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(response),
        });
      }
    } else {
      await route.continue();
    }
  });
}

/**
 * Mock admin API endpoints
 */
export async function mockAdminAPI(page: Page): Promise<void> {
  try {
    await page.unroute("**/api/admin/**");
  } catch {
    // ignore
  }

  // Mock admin verification endpoint
  await page.route("**/api/admin/me", async (route) => {
    const response = createAdminVerifyResponse(true);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });

  // Mock admin notices endpoints
  await page.route("**/api/admin/notices**", async (route) => {
    const method = route.request().method();

    if (method === "POST") {
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
    } else if (method === "PATCH") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "notice-1",
            updated_at: new Date().toISOString(),
          },
        }),
      });
    } else if (method === "DELETE") {
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

  // Mock admin privacy policy endpoints
  await page.route("**/api/admin/privacy-policies**", async (route) => {
    const method = route.request().method();
    const url = route.request().url();

    if (method === "GET") {
      const response = createPrivacyPolicyListResponse(2);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    } else if (method === "POST") {
      if (url.includes("/publish")) {
        // Publish policy
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              id: "policy-2",
              published: true,
              effective_date: new Date().toISOString(),
            },
          }),
        });
      } else {
        // Create policy
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
      }
    } else if (method === "PATCH") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "policy-1",
            updated_at: new Date().toISOString(),
          },
        }),
      });
    } else if (method === "DELETE") {
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
  });
}

/**
 * Retrieve consent mock state for diagnostics
 */
export function getConsentMockState(page: Page): ConsentMockSnapshot | null {
  const state = consentMockStates.get(page);
  if (!state) {
    return null;
  }

  const consentsByHash: Record<string, ConsentRecord[]> = Object.fromEntries(
    Array.from(state.consentMap.entries()).map(([hash, records]) => [
      hash,
      records.map((record) => ({ ...record })),
    ])
  );

  return {
    postCount: state.postCount,
    getCount: state.getCount,
    consentsByHash,
  };
}
