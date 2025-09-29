import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../utils/renderWithProviders'
import { mockFetchResponse, mockFetchError } from '../utils/testUtils'
import { mockApiResponses } from '../mocks/api'
import OtpVerificationPage from '../../pages/OtpVerificationPage'

// Mock fetch for API calls
global.fetch = vi.fn()

describe('OtpVerificationPage', () => {
  const mockProps = {
    phone: '010-1234-5678',
    name: '홍길동',
    userHash: 'test-hash-123',
    onVerified: vi.fn(),
    onBack: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockProps.onVerified.mockClear()
    mockProps.onBack.mockClear()
    // Reset fetch mock
    vi.mocked(fetch).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Component rendering', () => {
    it('should render OTP input form correctly', () => {
      renderWithProviders(
        <OtpVerificationPage {...mockProps} />
      )
      
      expect(screen.getByLabelText(/인증번호/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /인증하기/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /이전으로/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /인증번호 재전송/i })).toBeInTheDocument()
    })

    it('should display user phone number in the UI', () => {
      renderWithProviders(
        <OtpVerificationPage {...mockProps} />
      )
      
      expect(screen.getByText(/010-1234-5678/)).toBeInTheDocument()
    })
  })

  describe('OTP verification', () => {
    it('should validate OTP input before submission', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(
        <OtpVerificationPage {...mockProps} />
      )
      
      // Initially, button should be disabled when no OTP code is entered
      const verifyButton = screen.getByRole('button', { name: /인증하기/i })
      const otpInput = screen.getByLabelText(/인증번호/i)
      
      // Initially empty, button should be disabled
      expect(verifyButton).toBeDisabled()
      
      // Enter invalid OTP (too short) - button should be enabled but validation should happen
      await user.type(otpInput, '123')
      expect(verifyButton).not.toBeDisabled() // Button is enabled when there's any text
      
      // Clear input - button should be disabled again
      await user.clear(otpInput)
      expect(verifyButton).toBeDisabled()
    })

    it('should handle successful OTP verification', async () => {
      const user = userEvent.setup()
      
      // Mock successful verification response
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApiResponses.otp.verify,
      } as Response)
      
      renderWithProviders(
        <OtpVerificationPage {...mockProps} />
      )
      
      const otpInput = screen.getByLabelText(/인증번호/i)
      const verifyButton = screen.getByRole('button', { name: /인증하기/i })

      await user.type(otpInput, '123456')
      
      // Button should be enabled now
      expect(verifyButton).not.toBeDisabled()
      
      await user.click(verifyButton)
      
      await waitFor(() => {
        expect(mockProps.onVerified).toHaveBeenCalledWith(mockProps.userHash)
      })
    })

    it('should display error for invalid OTP code', async () => {
      const user = userEvent.setup()
      
      // Mock verification error response  
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockApiResponses.otp.verifyError,
      } as Response)
      
      renderWithProviders(
        <OtpVerificationPage {...mockProps} />
      )
      
      const otpInput = screen.getByLabelText(/인증번호/i)
      const verifyButton = screen.getByRole('button', { name: /인증하기/i })

      await user.type(otpInput, '000000')
      await user.click(verifyButton)
      
      await waitFor(() => {
        // The error message will contain the raw error from the API
        expect(screen.getByText(/Error: API error: 400/i)).toBeInTheDocument()
      })
    })

    it('should handle network errors during verification', async () => {
      const user = userEvent.setup()
      
      // Mock network error
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
      
      renderWithProviders(
        <OtpVerificationPage {...mockProps} />
      )
      
      const otpInput = screen.getByLabelText(/인증번호/i)
      const verifyButton = screen.getByRole('button', { name: /인증하기/i })

      await user.type(otpInput, '123456')
      await user.click(verifyButton)
      
      await waitFor(() => {
        // When fetch is rejected, the API function returns { success: false, message: "Error: Network error" }
        expect(screen.getByText(/Error: Network error/i)).toBeInTheDocument()
      })
    })
  })

  describe('OTP resend functionality', () => {
    it('should handle successful OTP resend', async () => {
      const user = userEvent.setup()
      
      // Mock successful resend response
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ...mockApiResponses.otp.send, expires_in_seconds: 180 }),
      } as Response)
      
      renderWithProviders(
        <OtpVerificationPage {...mockProps} />
      )
      
      const resendButton = screen.getByRole('button', { name: /인증번호 재전송/i })
      await user.click(resendButton)
      
      await waitFor(() => {
        expect(screen.getByText(/재전송/)).toBeInTheDocument()
      })
    })

    it('should show countdown timer after resend', async () => {
      const user = userEvent.setup()
      
      // Mock successful resend with countdown
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ...mockApiResponses.otp.send, expires_in_seconds: 180 }),
      } as Response)
      
      renderWithProviders(
        <OtpVerificationPage {...mockProps} />
      )
      
      const resendButton = screen.getByRole('button', { name: /인증번호 재전송/i })
      await user.click(resendButton)
      
      await waitFor(() => {
        expect(resendButton).toBeDisabled()
        expect(screen.getByText(/재전송 \d+:\d+/)).toBeInTheDocument()
      })
    })

    it('should handle resend errors', async () => {
      const user = userEvent.setup()
      
      // Mock resend error
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Rate limit exceeded'))
      
      renderWithProviders(
        <OtpVerificationPage {...mockProps} />
      )
      
      const resendButton = screen.getByRole('button', { name: /인증번호 재전송/i })
      await user.click(resendButton)
      
      await waitFor(() => {
        // sendOtp also catches errors and returns them as message
        expect(screen.getByText(/Error: Rate limit exceeded/i)).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('should call onBack when back button is clicked', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(
        <OtpVerificationPage {...mockProps} />
      )
      
      const backButton = screen.getByRole('button', { name: /이전으로/i })
      await user.click(backButton)
      
      expect(mockProps.onBack).toHaveBeenCalledTimes(1)
    })

    it('should disable buttons during loading states', async () => {
      const user = userEvent.setup()
      
      // Mock delayed response to test loading state
      vi.mocked(fetch).mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: async () => mockApiResponses.otp.verify,
          } as Response), 100)
        )
      )
      
      renderWithProviders(
        <OtpVerificationPage {...mockProps} />
      )
      
      const otpInput = screen.getByLabelText(/인증번호/i)
      const verifyButton = screen.getByRole('button', { name: /인증하기/i })
      const backButton = screen.getByRole('button', { name: /이전으로/i })

      await user.type(otpInput, '123456')
      
      // Start verification
      await user.click(verifyButton)
      
      // Check loading state immediately after click
      await waitFor(() => {
        expect(verifyButton).toBeDisabled()
        expect(backButton).toBeDisabled()
      })
    })
  })
})