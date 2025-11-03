/**
 * Shared test fixture factories
 *
 * These factories produce consistent mock payloads for both Playwright and Vitest tests.
 * They provide a single source of truth for test data structures.
 *
 * @see docs/plan/IS-62/plan-00.md - Phase 2: Helper & Mock Consolidation
 */

import type {
  MockAuthToken,
  OTPSendResponse,
  OTPVerifyResponse,
  PrivacyPolicyResponse,
  ConsentRecord,
  ConsentResponse,
  SimulationData,
  SimulationResults,
  SimulationRoundResult,
  SimulationCreateResponse,
  SimulationRunResponse,
  SimulationListResponse,
  Notice,
  NoticeListResponse,
  PrivacyPolicy,
  PrivacyPolicyListResponse,
  AdminVerifyResponse,
  APIErrorResponse,
  APISuccessResponse,
} from "./types";

/**
 * Create a mock Supabase auth token for a regular member
 */
export function createMemberAuthToken(
  overrides?: Partial<MockAuthToken>
): MockAuthToken {
  return {
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
    ...overrides,
  };
}

/**
 * Create a mock Supabase auth token for an admin user
 */
export function createAdminAuthToken(
  overrides?: Partial<MockAuthToken>
): MockAuthToken {
  return {
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
    ...overrides,
  };
}

/**
 * Create an expired auth token for testing session expiry
 */
export function createExpiredAuthToken(
  overrides?: Partial<MockAuthToken>
): MockAuthToken {
  return {
    access_token: "expired-token",
    refresh_token: "expired-refresh",
    expires_at: Date.now() - 3600000, // 1 hour ago
    user: {
      id: "test-user-123",
      email: "test@example.com",
      user_metadata: {
        name: "Test User",
      },
    },
    ...overrides,
  };
}

/**
 * Create a successful OTP send response
 */
export function createOTPSendSuccessResponse(
  overrides?: Partial<OTPSendResponse>
): OTPSendResponse {
  return {
    success: true,
    message: "OTP sent successfully",
    user_hash: "test-hash-123",
    expires_in_seconds: 300,
    ...overrides,
  };
}

/**
 * Create a failed OTP send response (not whitelisted)
 */
export function createOTPSendWhitelistFailureResponse(
  overrides?: Partial<OTPSendResponse>
): OTPSendResponse {
  return {
    success: false,
    message: "가입 허용 명단에 없는 사용자입니다.",
    ...overrides,
  };
}

/**
 * Create a successful OTP verify response
 */
export function createOTPVerifySuccessResponse(
  overrides?: Partial<OTPVerifyResponse>
): OTPVerifyResponse {
  return {
    success: true,
    message: "OTP verified successfully",
    ...overrides,
  };
}

/**
 * Create a failed OTP verify response (invalid code)
 */
export function createOTPVerifyInvalidCodeResponse(
  overrides?: Partial<OTPVerifyResponse>
): OTPVerifyResponse {
  return {
    success: false,
    message: "인증번호가 올바르지 않습니다.",
    remaining_attempts: 2,
    ...overrides,
  };
}

/**
 * Create a failed OTP verify response (expired code)
 */
export function createOTPVerifyExpiredResponse(
  overrides?: Partial<OTPVerifyResponse>
): OTPVerifyResponse {
  return {
    success: false,
    message: "인증번호가 만료되었습니다.",
    ...overrides,
  };
}

/**
 * Create a privacy policy response
 */
export function createPrivacyPolicyResponse(
  overrides?: Partial<PrivacyPolicyResponse>
): PrivacyPolicyResponse {
  return {
    success: true,
    version: "v1",
    locale: "ko-KR",
    last_updated: new Date().toISOString(),
    content: "<p>Mock privacy policy content.</p>",
    source: "db",
    ...overrides,
  };
}

/**
 * Create a consent record
 */
export function createConsentRecord(
  overrides?: Partial<ConsentRecord>
): ConsentRecord {
  return {
    user_hash: "test-hash-123",
    consent_type: "privacy_policy",
    consent_version: "v1",
    consent_given_at: new Date().toISOString(),
    ip_address: "127.0.0.1",
    user_agent: "Mozilla/5.0 (E2E)",
    ...overrides,
  };
}

/**
 * Create a consent response
 */
export function createConsentResponse(
  overrides?: Partial<ConsentResponse>
): ConsentResponse {
  return {
    success: true,
    consents: [],
    ...overrides,
  };
}

/**
 * Create a simulation round result
 */
export function createSimulationRoundResult(
  round: number,
  overrides?: Partial<SimulationRoundResult>
): SimulationRoundResult {
  return {
    company_round: round,
    investor_count: round,
    total_payment: 1000000 * round,
    total_revenue_after_tax: 970000 * round,
    cumulative_net_profit: -30000 * round,
    round_bonus: 0,
    settlement_bonus: 100000,
    ...overrides,
  };
}

/**
 * Create simulation results
 */
export function createSimulationResults(
  rounds: number = 2,
  overrides?: Partial<SimulationResults>
): SimulationResults {
  const history = Array.from({ length: rounds }, (_, i) =>
    createSimulationRoundResult(i + 1)
  );

  return {
    history,
    summary: {
      total_rounds: rounds,
      final_profit: -60000,
      total_investment: 3000000,
      total_revenue: 2910000,
      roi: -0.02,
    },
    ...overrides,
  };
}

/**
 * Create a simulation data object
 */
export function createSimulationData(
  overrides?: Partial<SimulationData>
): SimulationData {
  return {
    id: "sim-123",
    plan_id: "A",
    memo: "Test simulation",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    starting_company_round: 1,
    current_company_round: 1,
    simulation_rounds: 12,
    investments: { 1: 110000, 2: 220000 },
    sales_achievement_rates: {},
    simulation_results: null,
    ...overrides,
  };
}

/**
 * Create a simulation create success response
 */
export function createSimulationCreateResponse(
  overrides?: Partial<SimulationCreateResponse>
): SimulationCreateResponse {
  return {
    success: true,
    data: {
      id: "sim-" + Date.now(),
      plan_id: "A",
      starting_company_round: 1,
      current_company_round: 1,
      simulation_rounds: 12,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    ...overrides,
  };
}

/**
 * Create a simulation run success response
 */
export function createSimulationRunResponse(
  overrides?: Partial<SimulationRunResponse>
): SimulationRunResponse {
  return {
    success: true,
    data: {
      id: "sim-123",
      results: createSimulationResults(2),
    },
    ...overrides,
  };
}

/**
 * Create a simulation list response
 */
export function createSimulationListResponse(
  count: number = 1,
  overrides?: Partial<SimulationListResponse>
): SimulationListResponse {
  const simulations = Array.from({ length: count }, (_, i) =>
    createSimulationData({ id: `sim-${i + 1}` })
  );

  return {
    success: true,
    data: simulations,
    ...overrides,
  };
}

/**
 * Create a notice
 */
export function createNotice(overrides?: Partial<Notice>): Notice {
  return {
    id: "notice-1",
    title: "Welcome Notice",
    content: "Welcome to the simulation platform!",
    pinned: false,
    published: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

/**
 * Create a notice list response
 */
export function createNoticeListResponse(
  count: number = 2,
  overrides?: Partial<NoticeListResponse>
): NoticeListResponse {
  const notices = [
    createNotice({
      id: "notice-1",
      title: "Welcome Notice",
      pinned: true,
      created_at: "2024-01-01T00:00:00Z",
    }),
    createNotice({
      id: "notice-2",
      title: "System Update",
      content: "System maintenance scheduled.",
      pinned: false,
      created_at: "2024-01-02T00:00:00Z",
    }),
  ].slice(0, count);

  return {
    success: true,
    notices,
    ...overrides,
  };
}

/**
 * Create a privacy policy
 */
export function createPrivacyPolicy(
  overrides?: Partial<PrivacyPolicy>
): PrivacyPolicy {
  return {
    id: "policy-1",
    version: "v1",
    locale: "ko-KR",
    content: "<p>Privacy policy content v1</p>",
    published: true,
    effective_date: "2024-01-01",
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

/**
 * Create a privacy policy list response
 */
export function createPrivacyPolicyListResponse(
  count: number = 2,
  overrides?: Partial<PrivacyPolicyListResponse>
): PrivacyPolicyListResponse {
  const policies = [
    createPrivacyPolicy({
      id: "policy-1",
      version: "v1",
      published: true,
      effective_date: "2024-01-01",
    }),
    createPrivacyPolicy({
      id: "policy-2",
      version: "v2",
      content: "<p>Privacy policy content v2 (draft)</p>",
      published: false,
      effective_date: null,
      created_at: "2024-01-10T00:00:00Z",
    }),
  ].slice(0, count);

  return {
    success: true,
    policies,
    ...overrides,
  };
}

/**
 * Create an admin verify response
 */
export function createAdminVerifyResponse(
  isAdmin: boolean = true,
  overrides?: Partial<AdminVerifyResponse>
): AdminVerifyResponse {
  return {
    success: true,
    is_admin: isAdmin,
    user_id: isAdmin ? "admin-user-123" : "test-user-123",
    ...overrides,
  };
}

/**
 * Create a generic error response
 */
export function createAPIErrorResponse(
  message: string = "An error occurred",
  overrides?: Partial<APIErrorResponse>
): APIErrorResponse {
  return {
    success: false,
    message,
    ...overrides,
  };
}

/**
 * Create a generic success response
 */
export function createAPISuccessResponse<T>(
  data?: T,
  overrides?: Partial<Omit<APISuccessResponse<T>, "success" | "data">>
): APISuccessResponse<T> {
  return {
    success: true,
    data,
    ...overrides,
  };
}
