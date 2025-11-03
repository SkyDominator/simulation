/**
 * Shared type definitions for test fixtures
 *
 * These types are used across Playwright E2E tests and Vitest unit/integration tests
 * to ensure consistent mock data structures.
 *
 * @see docs/plan/IS-62/plan-00.md - Phase 2: Helper & Mock Consolidation
 */

/**
 * Supabase auth token structure
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
 * OTP send response
 */
export interface OTPSendResponse {
  success: boolean;
  message: string;
  user_hash?: string;
  expires_in_seconds?: number;
}

/**
 * OTP verify response
 */
export interface OTPVerifyResponse {
  success: boolean;
  message: string;
  remaining_attempts?: number;
}

/**
 * Privacy policy response
 */
export interface PrivacyPolicyResponse {
  success: boolean;
  version: string;
  locale: string;
  last_updated: string;
  content: string;
  source: string;
}

/**
 * Consent record
 */
export interface ConsentRecord {
  user_hash: string;
  consent_type: string;
  consent_version: string;
  consent_given_at: string;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Consent response
 */
export interface ConsentResponse {
  success: boolean;
  consents?: ConsentRecord[];
  message?: string;
}

/**
 * Simulation data structure
 */
export interface SimulationData {
  id: string;
  plan_id: string;
  memo?: string;
  created_at: string;
  updated_at: string;
  starting_company_round: number;
  current_company_round: number;
  simulation_rounds: number;
  investments?: Record<number, number>;
  sales_achievement_rates?: Record<number, number>;
  simulation_results?: SimulationResults | null;
}

/**
 * Simulation results structure
 */
export interface SimulationResults {
  history: SimulationRoundResult[];
  summary: {
    total_rounds: number;
    final_profit: number;
    total_investment: number;
    total_revenue: number;
    roi: number;
  };
}

/**
 * Single round result
 */
export interface SimulationRoundResult {
  company_round: number;
  investor_count: number;
  total_payment: number;
  total_revenue_after_tax: number;
  cumulative_net_profit: number;
  round_bonus: number;
  settlement_bonus: number;
}

/**
 * Simulation create request
 */
export interface SimulationCreateRequest {
  plan_id: string;
  starting_company_round: number;
  current_company_round: number;
  simulation_rounds: number;
  investments: Record<number, number>;
}

/**
 * Simulation create response
 */
export interface SimulationCreateResponse {
  success: boolean;
  data?: SimulationData;
  message?: string;
}

/**
 * Simulation run response
 */
export interface SimulationRunResponse {
  success: boolean;
  data?: {
    id: string;
    results: SimulationResults;
  };
  message?: string;
}

/**
 * Simulation list response
 */
export interface SimulationListResponse {
  success: boolean;
  data?: SimulationData[];
  message?: string;
}

/**
 * Notice structure
 */
export interface Notice {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Notice list response
 */
export interface NoticeListResponse {
  success: boolean;
  notices?: Notice[];
  message?: string;
}

/**
 * Privacy policy structure
 */
export interface PrivacyPolicy {
  id: string;
  version: string;
  locale: string;
  content: string;
  published: boolean;
  effective_date: string | null;
  created_at: string;
}

/**
 * Privacy policy list response
 */
export interface PrivacyPolicyListResponse {
  success: boolean;
  policies?: PrivacyPolicy[];
  message?: string;
}

/**
 * Admin verification response
 */
export interface AdminVerifyResponse {
  success: boolean;
  is_admin: boolean;
  user_id?: string;
  message?: string;
}

/**
 * Generic API error response
 */
export interface APIErrorResponse {
  success: false;
  message: string;
  error_code?: string;
  details?: unknown;
}

/**
 * Generic API success response
 */
export interface APISuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}
