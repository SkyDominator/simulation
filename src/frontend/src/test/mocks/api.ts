import { vi } from 'vitest'

export const mockApiResponses = {
  simulations: {
    list: { data: [], success: true },
    create: { data: { id: '123', title: 'Test Simulation' }, success: true },
    run: { 
      data: { 
        history: [{ round: 1, investors: 1, revenue: 1000 }],
        summary: { total_rounds: 1 }
      }, 
      success: true 
    },
    delete: { success: true },
  },
  otp: {
    send: { success: true, message: 'OTP sent', user_hash: 'hash123' },
    verify: { success: true, message: 'Verified' },
    // Error responses following PR #27 structure
    sendError: { success: false, detail: '가입 허용 명단에 없는 사용자입니다.', error_code: 'USER_NOT_WHITELISTED' },
    verifyError: { success: false, detail: 'Invalid OTP code', error_code: 'OTP_VERIFICATION_FAILED', context: { remaining_attempts: 2 } },
  },
  notices: {
    list: { notices: [{ id: 1, title: 'Test Notice', content: 'Content' }], success: true },
  },
  errors: {
    // Standard error structure from PR #27
    notFound: { success: false, detail: 'Resource not found', error_code: 'RESOURCE_NOT_FOUND' },
    unauthorized: { success: false, detail: 'Authentication required', error_code: 'AUTHENTICATION_ERROR' },
    validation: { success: false, detail: 'Invalid field data', error_code: 'VALIDATION_ERROR', context: { validation_errors: [] } },
    serverError: { success: false, detail: 'Internal server error', error_code: 'INTERNAL_SERVER_ERROR' },
  }
}

// Mock fetch globally
global.fetch = vi.fn()