/**
 * Node.js/Vitest API mocking utilities
 *
 * Mock response builders for Vitest unit and integration tests.
 * Uses shared fixture factories for consistent mock payloads.
 *
 * @see docs/plan/IS-62/plan-00.md - Phase 2: Helper & Mock Consolidation
 */

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
  createNotice,
  createPrivacyPolicyListResponse,
  createPrivacyPolicy,
  createAdminVerifyResponse,
  createAPIErrorResponse,
  createMemberAuthToken,
  createAdminAuthToken,
  createExpiredAuthToken,
} from "../fixtures";

import type {
  OTPSendResponse,
  OTPVerifyResponse,
  PrivacyPolicyResponse,
  ConsentResponse,
  SimulationCreateResponse,
  SimulationRunResponse,
  SimulationListResponse,
  NoticeListResponse,
  PrivacyPolicyListResponse,
  AdminVerifyResponse,
  APIErrorResponse,
  MockAuthToken,
} from "../types";

/**
 * Mock builders for OTP endpoints
 */
export const otpMocks = {
  /**
   * Successful OTP send
   */
  sendSuccess(): OTPSendResponse {
    return createOTPSendSuccessResponse();
  },

  /**
   * Failed OTP send (not whitelisted)
   */
  sendWhitelistFailure(): OTPSendResponse {
    return createOTPSendWhitelistFailureResponse();
  },

  /**
   * Successful OTP verify
   */
  verifySuccess(): OTPVerifyResponse {
    return createOTPVerifySuccessResponse();
  },

  /**
   * Failed OTP verify (invalid code)
   */
  verifyInvalidCode(): OTPVerifyResponse {
    return createOTPVerifyInvalidCodeResponse();
  },

  /**
   * Failed OTP verify (expired code)
   */
  verifyExpired(): OTPVerifyResponse {
    return createOTPVerifyExpiredResponse();
  },
};

/**
 * Mock builders for privacy policy and consent endpoints
 */
export const consentMocks = {
  /**
   * Privacy policy response
   */
  privacyPolicy(): PrivacyPolicyResponse {
    return createPrivacyPolicyResponse();
  },

  /**
   * Consent response
   */
  consentResponse(userHash: string = "test-hash-123"): ConsentResponse {
    const consent = createConsentRecord({ user_hash: userHash });
    return createConsentResponse({ consents: [consent] });
  },

  /**
   * Empty consent response
   */
  emptyConsentResponse(): ConsentResponse {
    return createConsentResponse({ consents: [] });
  },
};

/**
 * Mock builders for simulation endpoints
 */
export const simulationMocks = {
  /**
   * Simulation create response
   */
  createResponse(planId: string = "A"): SimulationCreateResponse {
    return createSimulationCreateResponse({
      data: {
        ...createSimulationData({ plan_id: planId }),
        id: "sim-" + Date.now(),
      },
    });
  },

  /**
   * Simulation run response
   */
  runResponse(simulationId: string = "sim-123"): SimulationRunResponse {
    return createSimulationRunResponse({
      data: {
        id: simulationId,
        results: createSimulationRunResponse().data!.results,
      },
    });
  },

  /**
   * Simulation list response
   */
  listResponse(count: number = 1): SimulationListResponse {
    return createSimulationListResponse(count);
  },

  /**
   * Single simulation data
   */
  single(simulationId: string = "sim-123") {
    return createSimulationData({ id: simulationId });
  },
};

/**
 * Mock builders for notice endpoints
 */
export const noticeMocks = {
  /**
   * Notice list response
   */
  listResponse(count: number = 2): NoticeListResponse {
    return createNoticeListResponse(count);
  },

  /**
   * Single notice
   */
  single(noticeId: string = "notice-1") {
    return createNotice({ id: noticeId });
  },
};

/**
 * Mock builders for privacy policy management (admin)
 */
export const privacyPolicyMocks = {
  /**
   * Privacy policy list response
   */
  listResponse(count: number = 2): PrivacyPolicyListResponse {
    return createPrivacyPolicyListResponse(count);
  },

  /**
   * Single privacy policy
   */
  single(policyId: string = "policy-1") {
    return createPrivacyPolicy({ id: policyId });
  },
};

/**
 * Mock builders for admin endpoints
 */
export const adminMocks = {
  /**
   * Admin verification response (user is admin)
   */
  verifyAdmin(): AdminVerifyResponse {
    return createAdminVerifyResponse(true);
  },

  /**
   * Admin verification response (user is not admin)
   */
  verifyNotAdmin(): AdminVerifyResponse {
    return createAdminVerifyResponse(false);
  },
};

/**
 * Mock builders for authentication
 */
export const authMocks = {
  /**
   * Member auth token
   */
  memberToken(): MockAuthToken {
    return createMemberAuthToken();
  },

  /**
   * Admin auth token
   */
  adminToken(): MockAuthToken {
    return createAdminAuthToken();
  },

  /**
   * Expired auth token
   */
  expiredToken(): MockAuthToken {
    return createExpiredAuthToken();
  },
};

/**
 * Mock builders for error responses
 */
export const errorMocks = {
  /**
   * Generic error response
   */
  generic(message: string = "An error occurred"): APIErrorResponse {
    return createAPIErrorResponse(message);
  },

  /**
   * Not found error
   */
  notFound(resource: string = "resource"): APIErrorResponse {
    return createAPIErrorResponse(`${resource} not found`, {
      error_code: "NOT_FOUND",
    });
  },

  /**
   * Unauthorized error
   */
  unauthorized(): APIErrorResponse {
    return createAPIErrorResponse("Unauthorized", {
      error_code: "UNAUTHORIZED",
    });
  },

  /**
   * Forbidden error
   */
  forbidden(): APIErrorResponse {
    return createAPIErrorResponse("Forbidden", {
      error_code: "FORBIDDEN",
    });
  },

  /**
   * Validation error
   */
  validation(message: string = "Validation failed"): APIErrorResponse {
    return createAPIErrorResponse(message, {
      error_code: "VALIDATION_ERROR",
    });
  },
};

/**
 * Helper to create a mock fetch response
 */
export function createMockFetchResponse<T>(
  data: T,
  status: number = 200,
  statusText: string = "OK"
): Response {
  return new Response(JSON.stringify(data), {
    status,
    statusText,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Helper to create a mock fetch error
 */
export function createMockFetchError(message: string = "Network error"): Error {
  const error = new Error(message);
  error.name = "FetchError";
  return error;
}
