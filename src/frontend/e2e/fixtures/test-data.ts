/**
 * Test data fixtures for E2E tests
 *
 * ⚠️ IMPORTANT: Data Structure Consolidation Policy
 *
 * This file contains E2E-specific test data that has no equivalent in shared fixtures:
 * - TEST_USERS: E2E user scenarios for whitelist verification
 * - TEST_OTP_CODES: E2E OTP verification codes
 * - VIEWPORT_SIZES: E2E viewport configurations for responsive testing
 * - TEST_CONSTANTS: E2E-specific timeouts and validation constants
 * - TEST_MESSAGES: E2E-specific UI message assertions
 * - TEST_TIMEOUTS: E2E-specific timeout configurations
 *
 * For API response structures (simulations, OTP responses, consent records, etc.),
 * ALWAYS use shared fixture factories from test/shared/fixtures.ts to maintain
 * consistency between Playwright E2E tests and Vitest unit tests. This ensures:
 * 1. Single source of truth for API payload structures
 * 2. Type safety across test suites
 * 3. Reduced maintenance burden when API contracts change
 *
 * @see test/shared/fixtures.ts - Shared factory functions for API payloads
 * @see docs/plan/IS-62/plan-01.md - Phase 1: Test Data Consolidation 2
 */

import {
  createSimulationData,
  createSimulationResults,
  createSimulationRoundResult,
} from "../../test/shared/fixtures";

export const TEST_USERS = {
  WHITELISTED: {
    name: "홍길동",
    phone: "010-1234-5678",
    hash: "valid-hash-123",
  },
  NON_WHITELISTED: {
    name: "김철수",
    phone: "010-9876-5432",
    hash: "invalid-hash-456",
  },
  ADMIN: {
    name: "관리자",
    phone: "010-0000-0001",
    email: "admin@example.com",
    hash: "admin-hash-789",
  },
} as const;

export const TEST_SIMULATIONS = {
  PLAN_A: createSimulationData({
    id: "test-plan-a",
    plan_id: "A",
    starting_company_round: 1,
    current_company_round: 1,
    simulation_rounds: 10,
    investments: {
      1: 1000000,
      2: 2000000,
      3: 3000000,
      4: 4000000,
      5: 5000000,
    },
    sales_achievement_rates: {
      4: 1.0,
      5: 1.0,
      6: 1.0,
    },
  }),
  PLAN_B: createSimulationData({
    id: "test-plan-b",
    plan_id: "B",
    starting_company_round: 1,
    current_company_round: 1,
    simulation_rounds: 15,
    investments: {
      1: 500000,
      2: 1000000,
      3: 1500000,
    },
    sales_achievement_rates: {
      4: 0.8,
      5: 0.9,
      6: 1.1,
    },
  }),
  PLAN_D: createSimulationData({
    id: "test-plan-d",
    plan_id: "D",
    starting_company_round: 1,
    current_company_round: 3,
    simulation_rounds: 18,
    investments: {
      1: 110000,
      2: 220000,
      3: 440000,
      4: 880000,
    },
    sales_achievement_rates: {
      4: 1.2,
      5: 1.0,
      6: 0.9,
      7: 1.1,
    },
  }),
} as const;

export const MOCK_RESULTS = {
  SIMPLE: createSimulationResults(2, {
    history: [
      createSimulationRoundResult(1, {
        investor_count: 1,
        total_payment: 1000000,
        total_revenue_after_tax: 970000,
        cumulative_net_profit: -30000,
        round_bonus: 0,
        settlement_bonus: 100000,
      }),
      createSimulationRoundResult(2, {
        investor_count: 2,
        total_payment: 2000000,
        total_revenue_after_tax: 1940000,
        cumulative_net_profit: -60000,
        round_bonus: 0,
        settlement_bonus: 100000,
      }),
    ],
    summary: {
      total_rounds: 2,
      final_profit: -60000,
      total_investment: 3000000,
      total_revenue: 2910000,
      roi: -0.02, // -2%
    },
  }),
  COMPLEX: createSimulationResults(5, {
    history: [
      createSimulationRoundResult(1, {
        investor_count: 1,
        total_payment: 1000000,
        cumulative_net_profit: -30000,
      }),
      createSimulationRoundResult(2, {
        investor_count: 2,
        total_payment: 2000000,
        cumulative_net_profit: -60000,
      }),
      createSimulationRoundResult(3, {
        investor_count: 4,
        total_payment: 4000000,
        cumulative_net_profit: -120000,
      }),
      createSimulationRoundResult(4, {
        investor_count: 8,
        total_payment: 8000000,
        cumulative_net_profit: 200000,
      }),
      createSimulationRoundResult(5, {
        investor_count: 16,
        total_payment: 16000000,
        cumulative_net_profit: 1200000,
      }),
    ],
    summary: {
      total_rounds: 5,
      final_profit: 1200000,
      total_investment: 31000000,
      total_revenue: 32200000,
      roi: 0.039, // 3.9%
    },
  }),
} as const;

export const TEST_OTP_CODES = {
  VALID: "123456",
  INVALID: "000000",
  EXPIRED: "999999",
} as const;

// Test constants to avoid hardcoded values
export const TEST_CONSTANTS = {
  OTP_LENGTH: 6,
  OTP_TIMEOUT_MS: 300000, // 5 minutes
  DEFAULT_TIMEOUT_MS: 5000,
  LONG_TIMEOUT_MS: 10000,
  NETWORK_TIMEOUT_MS: 15000,
  PHONE_INPUT_MAX_LENGTH: 13, // 010-1234-5678 format
  INVESTMENT_MIN_AMOUNT: 110000,
  MAX_SIMULATION_ROUNDS: 36,
} as const;

export const TEST_MESSAGES = {
  SUCCESS: {
    OTP_SENT: "OTP sent successfully",
    OTP_VERIFIED: "OTP verified successfully",
    SIMULATION_CREATED: "Simulation created successfully",
    SIMULATION_SAVED: "Results saved successfully",
  },
  ERROR: {
    NOT_WHITELISTED: "가입 허용 명단에 없는 사용자입니다.",
    INVALID_OTP: "인증번호가 올바르지 않습니다.",
    CONSENT_SUBMISSION_FAILED:
      "동의 처리 중 오류가 발생했습니다. 다시 시도해 주세요.",
    NETWORK_ERROR: "네트워크 오류가 발생했습니다.",
    SESSION_EXPIRED: "세션이 만료되었습니다.",
  },
} as const;

export const VIEWPORT_SIZES = {
  MOBILE: { width: 375, height: 667 },
  TABLET: { width: 768, height: 1024 },
  DESKTOP: { width: 1200, height: 800 },
  LARGE_DESKTOP: { width: 1920, height: 1080 },
} as const;

export const TEST_TIMEOUTS = {
  SHORT: 2000,
  MEDIUM: 5000,
  LONG: 10000,
  NETWORK: 15000,
} as const;

/**
 * Generate test simulation data with realistic values
 * Wraps createSimulationData() from shared fixtures
 */
export function generateTestSimulation(
  planId: keyof typeof TEST_SIMULATIONS,
  overrides: Partial<Record<string, unknown>> = {}
) {
  const baseData = TEST_SIMULATIONS[planId];
  return createSimulationData({
    ...baseData,
    ...overrides,
    id: `test-sim-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}
