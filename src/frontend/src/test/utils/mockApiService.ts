import { vi } from 'vitest'
import type { ApiServiceInterface } from '../../services/ApiService'
import type { Plan, SimulationRunResponse, OTPSendResponse } from '../../types/types'

/**
 * Creates a mock API service with all methods mocked
 * This allows testing real component behavior with controlled API responses
 */
export const createMockApiService = (overrides?: Partial<ApiServiceInterface>): ApiServiceInterface => {
  const mockService: ApiServiceInterface = {
    deleteSimulation: vi.fn().mockResolvedValue({ 
      simulation_id: 'test-id', 
      message: 'Deleted', 
      success: true 
    }),
    
    runSimulation: vi.fn().mockResolvedValue({
      success: true,
      message: 'Simulation completed',
      data: {
        history: [{
          company_round: 1,
          investor_count: 1,
          total_payment: 1000000,
          total_revenue_after_tax: 970000,
          cumulative_net_profit: -30000
        }],
        summary: {
          total_rounds: 1,
          final_profit: -30000,
          total_investment: 1000000,
          total_revenue: 970000
        }
      }
    } as SimulationRunResponse),
    
    getSimulations: vi.fn().mockResolvedValue([]),
    
    getSimulationDetails: vi.fn().mockResolvedValue({
      simulation_id: 'test-id',
      plan_id: 'A',
      memo: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      starting_company_round: 1,
      current_company_round: 1,
      simulation_rounds: 12,
      investments: [],
      sales_achievement_rates: [],
      simulation_results: null
    } as Plan),
    
    createSimulation: vi.fn().mockResolvedValue({
      success: true,
      message: 'Created',
      data: { simulation_id: 'new-sim-id' }
    }),
    
    updateSimulation: vi.fn().mockResolvedValue({
      simulation_id: 'test-id',
      plan_id: 'A',
      message: 'Updated',
      success: true
    }),
    
    updateSimulationMemo: vi.fn().mockResolvedValue({
      success: true,
      message: 'Memo updated',
      simulation_id: 'test-id',
      memo: 'Updated memo'
    }),
    
    adminMe: vi.fn().mockResolvedValue({
      is_admin: true,
      user_id: 'admin-user-id'
    }),
    
    listNotices: vi.fn().mockResolvedValue({
      notices: [],
      success: true
    }),
    
    getNotice: vi.fn().mockResolvedValue({
      notice: {
        id: 'notice-id',
        title: 'Test Notice',
        content: 'Test content',
        published: true,
        pinned: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      success: true
    }),
    
    createNotice: vi.fn().mockResolvedValue({
      notice: {
        id: 'new-notice-id',
        title: 'New Notice',
        content: 'New content'
      },
      success: true
    }),
    
    updateNotice: vi.fn().mockResolvedValue({
      notice: {
        id: 'notice-id',
        title: 'Updated Notice',
        content: 'Updated content'
      },
      success: true
    }),
    
    deleteNotice: vi.fn().mockResolvedValue({
      success: true,
      message: 'Notice deleted'
    }),
    
    getPrivacyPolicy: vi.fn().mockResolvedValue({
      version: '1.0',
      last_updated: '2024-01-01',
      content: 'Privacy policy content',
      success: true,
      source: 'db' as const,
      locale: 'ko-KR'
    }),
    
    createPrivacyPolicy: vi.fn().mockResolvedValue({
      id: 'new-policy-id',
      message: 'Policy created',
      success: true
    }),
    
    updatePrivacyPolicy: vi.fn().mockResolvedValue({
      id: 'policy-id',
      message: 'Policy updated',
      success: true
    }),
    
    publishPrivacyPolicy: vi.fn().mockResolvedValue({
      id: 'policy-id',
      message: 'Policy published',
      success: true
    }),
    
    listPrivacyPolicies: vi.fn().mockResolvedValue({
      policies: [],
      success: true
    }),
    
    getPrivacyPolicyAdmin: vi.fn().mockResolvedValue({
      policy: {
        id: 'policy-id',
        version: '1.0',
        content: 'Policy content',
        published: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      success: true
    }),
    
    deletePrivacyPolicy: vi.fn().mockResolvedValue({
      id: 'policy-id',
      message: 'Policy deleted',
      success: true
    }),
    
    recordConsent: vi.fn().mockResolvedValue({
      user_hash: 'test-hash',
      consent_type: 'privacy_policy',
      consent_version: '1.0',
      consent_given_at: '2024-01-01T00:00:00Z',
      ip_address: '127.0.0.1',
      user_agent: 'Test User Agent'
    }),
    
    getUserConsents: vi.fn().mockResolvedValue({
      consents: [],
      success: true
    }),
    
    sendOtp: vi.fn().mockResolvedValue({
      success: true,
      message: 'OTP sent',
      user_hash: 'test-hash',
      expires_in_seconds: 300
    } as OTPSendResponse),
    
    verifyOtp: vi.fn().mockResolvedValue({
      success: true,
      message: 'OTP verified'
    }),
  }

  // Apply any overrides
  return { ...mockService, ...overrides }
}

/**
 * Creates a mock API service that simulates network errors
 */
export const createFailingApiService = (errorMessage = 'Network error'): ApiServiceInterface => {
  const error = new Error(errorMessage)
  
  return createMockApiService({
    getSimulations: vi.fn().mockRejectedValue(error),
    runSimulation: vi.fn().mockRejectedValue(error),
    deleteSimulation: vi.fn().mockRejectedValue(error),
    updateSimulationMemo: vi.fn().mockRejectedValue(error),
  })
}

/**
 * Creates a mock API service with specific simulation data
 */
export const createApiServiceWithSimulations = (simulations: Plan[]): ApiServiceInterface => {
  return createMockApiService({
    getSimulations: vi.fn().mockResolvedValue(simulations)
  })
}

/**
 * Creates a mock API service that simulates authentication errors
 */
export const createUnauthorizedApiService = (): ApiServiceInterface => {
  const authError = new Error('401 Unauthorized')
  
  return createMockApiService({
    getSimulations: vi.fn().mockRejectedValue(authError),
    runSimulation: vi.fn().mockRejectedValue(authError),
    deleteSimulation: vi.fn().mockRejectedValue(authError),
    adminMe: vi.fn().mockRejectedValue(authError),
  })
}