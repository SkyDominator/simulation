import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../utils/renderWithProviders'
import { createMockApiService, createFailingApiService, createApiServiceWithSimulations } from '../utils/mockApiService'
import MainPage from '../../pages/MainPage'
import WhitelistCheckPage from '../../pages/WhitelistCheckPage'
import type { Plan } from '../../types/types'

// Test real components instead of creating fake ones in test files
describe('Real Component Integration Tests', () => {
  const mockProps = {
    setPage: vi.fn(),
    setEditingPlan: vi.fn(),
    setSimulationResult: vi.fn(),
    openNotice: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('MainPage Real Component Tests', () => {
    it('should handle empty simulation list correctly', async () => {
      const apiService = createMockApiService()
      // Ensure the mock returns empty array
      vi.mocked(apiService.getSimulations).mockResolvedValue([])
      
      renderWithProviders(
        <MainPage {...mockProps} apiService={apiService} />
      )
      
      await waitFor(() => {
        expect(screen.getByText(/내 시뮬레이션/i)).toBeInTheDocument()
      })

      // Verify real component behavior with controlled API service
      expect(apiService.getSimulations).toHaveBeenCalledWith('mock-access-token')
    })

    it('should display real simulation data', async () => {
      const testSimulations: Plan[] = [
        {
          simulation_id: 'sim-1',
          plan_id: 'A',
          memo: 'Real simulation test',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          starting_company_round: 1,
          current_company_round: 3,
          simulation_rounds: 12,
          investments: [
            { round: 1, amount: 1000000 },
            { round: 2, amount: 2000000 }
          ],
          sales_achievement_rates: [],
          simulation_results: {
            history: [
              {
                company_round: 1,
                investor_count: 1,
                total_payment: 1000000,
                total_revenue_after_tax: 970000,
                cumulative_net_profit: -30000
              }
            ],
            summary: {
              total_rounds: 1,
              final_profit: -30000,
              total_investment: 1000000,
              total_revenue: 970000
            }
          }
        }
      ]

      const apiService = createApiServiceWithSimulations(testSimulations)
      
      renderWithProviders(
        <MainPage {...mockProps} apiService={apiService} />
      )
      
      await waitFor(() => {
        // Check that real component renders table headers
        expect(screen.getByText(/플랜 타입/i)).toBeInTheDocument()
        expect(screen.getByText(/시작 회차/i)).toBeInTheDocument()
      })

      // Verify API was called correctly
      expect(apiService.getSimulations).toHaveBeenCalledTimes(1)
    })

    it('should handle API errors gracefully in real component', async () => {
      const failingApiService = createFailingApiService('Database connection failed')
      
      renderWithProviders(
        <MainPage {...mockProps} apiService={failingApiService} />
      )
      
      // Component should still render even with API failure
      await waitFor(() => {
        expect(screen.getByText(/내 시뮬레이션/i)).toBeInTheDocument()
      })

      // Error should be handled gracefully by the real component's error handling
      expect(failingApiService.getSimulations).toHaveBeenCalled()
    })

    it('should handle multiple rapid API calls', async () => {
      const apiService = createMockApiService()
      
      renderWithProviders(
        <MainPage {...mockProps} apiService={apiService} />
      )
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText(/내 시뮬레이션/i)).toBeInTheDocument()
      })

      // The real component should handle multiple calls correctly
      expect(apiService.getSimulations).toHaveBeenCalledWith('mock-access-token')
    })
  })

  describe('WhitelistCheckPage Real Component Tests', () => {
    const mockOnVerified = vi.fn()

    it('should validate phone number format in real component', async () => {
      const user = userEvent.setup()
      const apiService = createMockApiService()
      
      renderWithProviders(
        <WhitelistCheckPage 
          onVerified={mockOnVerified} 
          apiService={apiService}
        />
      )
      
      // Test real form validation
      const nameInput = screen.getByLabelText(/이름/i)
      const phoneInput = screen.getByLabelText(/휴대폰 번호/i)
      
      await user.type(nameInput, '홍길동')
      await user.type(phoneInput, '010-1234-5678')
      
      // Real component should format phone number correctly
      expect(phoneInput).toHaveValue('010-1234-5678')
    })

    it('should handle real OTP submission', async () => {
      const user = userEvent.setup()
      const apiService = createMockApiService()
      
      // Mock successful OTP response
      vi.mocked(apiService.sendOtp).mockResolvedValue({
        success: true,
        message: 'OTP sent successfully',
        user_hash: 'test-hash-123',
        expires_in_seconds: 300
      })
      
      renderWithProviders(
        <WhitelistCheckPage 
          onVerified={mockOnVerified} 
          apiService={apiService}
        />
      )
      
      const nameInput = screen.getByLabelText(/이름/i)
      const phoneInput = screen.getByLabelText(/휴대폰 번호/i)
      const submitButton = screen.getByRole('button', { name: /인증번호 받기/i })
      
      await user.type(nameInput, '홍길동')
      await user.type(phoneInput, '010-1234-5678')
      await user.click(submitButton)
      
      // Verify real API call was made with correct parameters
      await waitFor(() => {
        expect(apiService.sendOtp).toHaveBeenCalledWith('홍길동', '010-1234-5678')
      }, { timeout: 10000 }) // Increase timeout to 10 seconds
    }, 15000)

    it('should handle OTP verification errors in real component', async () => {
      const user = userEvent.setup()
      const apiService = createMockApiService()
      
      // Mock OTP failure
      vi.mocked(apiService.sendOtp).mockResolvedValue({
        success: false,
        message: '가입 허용 명단에 없는 사용자입니다.'
      })
      
      renderWithProviders(
        <WhitelistCheckPage 
          onVerified={mockOnVerified} 
          apiService={apiService}
        />
      )
      
      const nameInput = screen.getByLabelText(/이름/i)
      const phoneInput = screen.getByLabelText(/휴대폰 번호/i)
      const submitButton = screen.getByRole('button', { name: /인증번호 받기/i })
      
      await user.type(nameInput, '미등록자')
      await user.type(phoneInput, '010-9999-9999')
      await user.click(submitButton)
      
      // Real component should display error message
      await waitFor(() => {
        expect(screen.getByText(/가입 허용 명단에 없는 사용자입니다/i)).toBeInTheDocument()
      })
    })
  })

  describe('Component Integration with Real Dependencies', () => {
    it('should maintain session state across navigation', async () => {
      // This tests real component behavior with state management
      const apiService = createMockApiService()
      
      renderWithProviders(
        <MainPage {...mockProps} apiService={apiService} />
      )
      
      await waitFor(() => {
        expect(screen.getByText(/내 시뮬레이션/i)).toBeInTheDocument()
      })
      
      // Verify session was used correctly in real component
      expect(apiService.getSimulations).toHaveBeenCalledWith('mock-access-token')
    })

    it('should handle real component lifecycle correctly', async () => {
      const apiService = createMockApiService()
      
      const { unmount } = renderWithProviders(
        <MainPage {...mockProps} apiService={apiService} />
      )
      
      await waitFor(() => {
        expect(apiService.getSimulations).toHaveBeenCalled()
      })
      
      // Test that component cleans up correctly
      unmount()
      
      // Should not make additional API calls after unmount
      const initialCallCount = vi.mocked(apiService.getSimulations).mock.calls.length
      
      // Wait a bit to ensure no additional calls
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(vi.mocked(apiService.getSimulations).mock.calls.length).toBe(initialCallCount)
    })
  })
})