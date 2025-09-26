import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../utils/renderWithProviders'
import { mockFetchResponse, mockFetchError } from '../utils/testUtils'
import { mockApiResponses } from '../mocks/api'
import OtpVerificationPage from '../../pages/OtpVerificationPage'

// Mock the API module
vi.mock('../../services/api', () => ({
  api: {
    sendOtp: vi.fn(),
    verifyOtp: vi.fn(),
  }
}))

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
      
      const verifyButton = screen.getByRole('button', { name: /인증하기/i })
      await user.click(verifyButton)
      
      await waitFor(() => {
        expect(screen.getByText(/인증번호를 입력해주세요/i)).toBeInTheDocument()
      })
    })

    it('should handle successful OTP verification', async () => {
      const user = userEvent.setup()
      
      // Mock successful verification
      mockFetchResponse(mockApiResponses.otp.verify)
      
      renderWithProviders(
        <OtpVerificationPage {...mockProps} />
      )
      
      const otpInput = screen.getByLabelText(/인증번호/i)
      const verifyButton = screen.getByRole('button', { name: /인증하기/i })

      await user.type(otpInput, '123456')
      await user.click(verifyButton)
      
      await waitFor(() => {
        expect(mockProps.onVerified).toHaveBeenCalledWith(mockProps.userHash)
      })
    })

    it('should display error for invalid OTP code', async () => {
      const user = userEvent.setup()
      
      // Mock verification error
      mockFetchResponse(mockApiResponses.otp.verifyError, false, 400)
      
      renderWithProviders(
        <OtpVerificationPage {...mockProps} />
      )
      
      const otpInput = screen.getByLabelText(/인증번호/i)
      const verifyButton = screen.getByRole('button', { name: /인증하기/i })

      await user.type(otpInput, '000000')
      await user.click(verifyButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid OTP code/i)).toBeInTheDocument()
      })
    })

    it('should handle network errors during verification', async () => {
      const user = userEvent.setup()
      
      // Mock network error
      mockFetchError(500)
      
      renderWithProviders(
        <OtpVerificationPage {...mockProps} />
      )
      
      const otpInput = screen.getByLabelText(/인증번호/i)
      const verifyButton = screen.getByRole('button', { name: /인증하기/i })

      await user.type(otpInput, '123456')
      await user.click(verifyButton)
      
      await waitFor(() => {
        expect(screen.getByText(/서비스에 일시적인 오류가 발생했습니다/i)).toBeInTheDocument()
      })
    })
  })

  describe('OTP resend functionality', () => {
    it('should handle successful OTP resend', async () => {
      const user = userEvent.setup()
      
      // Mock successful resend
      mockFetchResponse({ ...mockApiResponses.otp.send, expires_in_seconds: 180 })
      
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
      mockFetchResponse({ ...mockApiResponses.otp.send, expires_in_seconds: 180 })
      
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
      mockFetchError(429) // Rate limit
      
      renderWithProviders(
        <OtpVerificationPage {...mockProps} />
      )
      
      const resendButton = screen.getByRole('button', { name: /인증번호 재전송/i })
      await user.click(resendButton)
      
      await waitFor(() => {
        expect(screen.getByText(/서비스에 일시적인 오류가 발생했습니다/i)).toBeInTheDocument()
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
      
      // Mock delayed response
      mockFetchResponse(mockApiResponses.otp.verify)
      
      renderWithProviders(
        <OtpVerificationPage {...mockProps} />
      )
      
      const otpInput = screen.getByLabelText(/인증번호/i)
      const verifyButton = screen.getByRole('button', { name: /인증하기/i })
      const backButton = screen.getByRole('button', { name: /이전으로/i })

      await user.type(otpInput, '123456')
      await user.click(verifyButton)
      
      expect(verifyButton).toBeDisabled()
      expect(backButton).toBeDisabled()
    })
  })
})