import { Page, expect } from "@playwright/test";

/**
 * Initialize E2E mode for the page
 * This should be called in beforeEach hooks before any other setup
 */
export async function initE2EMode(page: Page) {
  await page.addInitScript(() => {
    (window as any).__E2E_MODE__ = true;
  });
}

/**
 * Test helpers for common page interactions
 */
export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Fill the whitelist verification form
   */
  async fillWhitelistForm(name: string, phone: string) {
    // Use Material-UI label-based selectors
    await this.page.getByLabel("이름").fill(name);
    await this.page.getByLabel("휴대폰 번호").fill(phone);
    await this.page.getByRole("button", { name: "인증번호 받기" }).click();
  }

  /**
   * Fill the OTP verification form
   */
  async fillOTPForm(code: string) {
    await this.page.getByLabel("인증번호").fill(code);
    await this.page.getByRole("button", { name: "인증하기" }).click();
  }

  /**
   * Select a plan in the plan editor
   */
  async selectPlan(planId: string) {
    // Look for Material-UI Select component
    await this.page.click('[role="button"][aria-haspopup="listbox"]');
    await this.page.click(`text="${planId}"`);
  }

  /**
   * Fill investment amount for specific round
   */
  async fillInvestmentAmount(round: number, amount: string) {
    // Find the input field associated with the round by locating the text, then its parent, then the input
    await this.page
      .locator(`text=${round}회차`)
      .locator("..")
      .locator('input[type="text"]')
      .fill(amount);
  }

  /**
   * Wait for simulation results to appear
   */
  async waitForSimulationResults() {
    // Look for results content or table
    await this.page.waitForSelector("text=/시뮬레이션.*결과/", {
      timeout: 10000,
    });
    await expect(this.page.locator('table, [role="table"]')).toBeVisible();
  }

  /**
   * Wait for notification message
   */
  async waitForNotification(message: string) {
    // Look for Material-UI Alert or Snackbar
    await expect(
      this.page
        .locator('[role="alert"], .MuiAlert-root')
        .filter({ hasText: message })
    ).toBeVisible();
  }

  /**
   * Navigate through multi-step forms
   */
  async clickNext() {
    await this.page.getByRole("button", { name: /다음|Next|계속/i }).click();
  }

  async clickPrevious() {
    await this.page
      .getByRole("button", { name: /이전|Previous|뒤로/i })
      .click();
  }

  /**
   * Wait for page to load completely
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Check if element is visible with timeout
   */
  async isElementVisible(
    selector: string,
    timeout: number = 5000
  ): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout });
      return await this.page.isVisible(selector);
    } catch {
      return false;
    }
  }

  /**
   * Wait for main page to load
   */
  async waitForMainPage() {
    await expect(this.page.locator("text=내 시뮬레이션")).toBeVisible({
      timeout: 10000,
    });
  }

  /**
   * Click create simulation button
   */
  async clickCreateSimulation() {
    await this.page.getByRole("button", { name: "새 시뮬레이션" }).click();
  }
}

/**
 * API mocking helpers for external dependencies
 */
export class APIHelpers {
  /**
   * Mock successful OTP flow
   */
  static async mockOTPSuccess(page: Page) {
    try {
      await page.unroute("**/api/otp/send");
    } catch {
      // ignore if no existing route
    }
    await page.route("**/api/otp/send", async (route) => {
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

    try {
      await page.unroute("**/api/otp/verify");
    } catch {
      // ignore if no existing route
    }
    await page.route("**/api/otp/verify", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "OTP verified successfully",
        }),
      });
    });
  }

  /**
   * Mock OTP failure scenarios
   */
  static async mockOTPFailure(
    page: Page,
    scenario: "whitelist" | "invalid_code" | "expired"
  ) {
    if (scenario === "whitelist") {
      try {
        await page.unroute("**/api/otp/send");
      } catch {
        // ignore
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
    } else if (scenario === "invalid_code") {
      try {
        await page.unroute("**/api/otp/verify");
      } catch {
        // ignore
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
    }
  }

  /**
   * Mock simulation API endpoints
   */
  static async mockSimulationAPI(page: Page) {
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
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "sim-123",
            plan_id: "A",
            starting_company_round: 1,
            current_company_round: 1,
            simulation_rounds: 12,
            created_at: new Date().toISOString(),
          },
        }),
      });
    });

    // Mock simulation run
    await page.route("**/api/simulation/run", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
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
              {
                company_round: 2,
                investor_count: 2,
                total_payment: 2000000,
                total_revenue_after_tax: 1940000,
                cumulative_net_profit: -60000,
                round_bonus: 0,
                settlement_bonus: 100000,
              },
            ],
            summary: {
              total_rounds: 2,
              final_profit: -60000,
              total_investment: 3000000,
              total_revenue: 2910000,
              roi: -0.02,
            },
          },
        }),
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
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: {
                id: idMatch[1],
                plan_id: "A",
                memo: "Test simulation",
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-01T00:00:00Z",
                starting_company_round: 1,
                current_company_round: 1,
                simulation_rounds: 12,
                investments: { 1: 110000, 2: 220000 },
                simulation_results: null,
              },
            }),
          });
        } else {
          // GET all simulations
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([
              {
                id: "sim-123",
                plan_id: "A",
                memo: "Test simulation",
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-01T00:00:00Z",
                starting_company_round: 1,
                current_company_round: 1,
                simulation_rounds: 12,
              },
            ]),
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
  static async mockConsentSuccess(page: Page) {
    try {
      await page.unroute("**/api/privacy-policy**");
    } catch {
      // ignore
    }
    await page.route("**/api/privacy-policy**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          version: "v1",
          locale: "ko-KR",
          last_updated: new Date().toISOString(),
          content: "<p>Mock privacy policy content.</p>",
          source: "db",
        }),
      });
    });

    try {
      await page.unroute("**/api/consents**");
    } catch {
      // ignore
    }
    await page.route("**/api/consents**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            user_hash: "test-hash-123",
            consent_type: "privacy",
            consent_version: "v1",
            consent_given_at: new Date().toISOString(),
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, consents: [] }),
        });
      }
    });
  }

  /**
   * Mock network error scenarios
   */
  static async mockNetworkError(page: Page, endpoint: string) {
    await page.route(`**${endpoint}`, async (route) => {
      await route.abort("failed");
    });
  }

  /**
   * Mock authentication success
   */
  static async mockAuthSuccess(page: Page) {
    await page.addInitScript(() => {
      // Mock Supabase authentication
      const mockSession = {
        access_token: "mock-jwt-token",
        refresh_token: "mock-refresh-token",
        expires_at: Date.now() + 3600000, // 1 hour from now
        user: {
          id: "test-user-123",
          email: "test@example.com",
          user_metadata: { name: "Test User" },
        },
      };

      window.localStorage.setItem(
        "sb-test-auth-token",
        JSON.stringify(mockSession)
      );
      window.localStorage.setItem(
        "supabase.auth.token",
        JSON.stringify(mockSession)
      );
    });
  }

  /**
   * Mock notices API endpoints
   */
  static async mockNoticesAPI(page: Page) {
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
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              notice: {
                id: idMatch[1],
                title: "Test Notice",
                content: "This is a test notice content.",
                pinned: false,
                published: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            }),
          });
        } else {
          // GET all notices
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              notices: [
                {
                  id: "notice-1",
                  title: "Welcome Notice",
                  content: "Welcome to the simulation platform!",
                  pinned: true,
                  published: true,
                  created_at: "2024-01-01T00:00:00Z",
                  updated_at: "2024-01-01T00:00:00Z",
                },
                {
                  id: "notice-2",
                  title: "System Update",
                  content: "System maintenance scheduled.",
                  pinned: false,
                  published: true,
                  created_at: "2024-01-02T00:00:00Z",
                  updated_at: "2024-01-02T00:00:00Z",
                },
              ],
            }),
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
  static async mockAdminAPI(page: Page) {
    try {
      await page.unroute("**/api/admin/**");
    } catch {
      // ignore
    }

    // Mock admin verification endpoint
    await page.route("**/api/admin/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          is_admin: true,
          user_id: "admin-user-123",
        }),
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
              {
                id: "policy-2",
                version: "v2",
                locale: "ko-KR",
                content: "<p>Privacy policy content v2 (draft)</p>",
                published: false,
                effective_date: null,
                created_at: "2024-01-10T00:00:00Z",
              },
            ],
          }),
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
}
