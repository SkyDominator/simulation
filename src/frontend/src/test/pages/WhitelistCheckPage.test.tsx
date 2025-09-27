import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../utils/renderWithProviders'
import { mockApiResponses } from '../mocks/api'
import WhitelistCheckPage from '../../pages/WhitelistCheckPage'

// Mock the API service directly  
vi.mock('../../services/api', () => ({
  api: {
    sendOtp: vi.fn(),
    verifyOtp: vi.fn(),
  }
}))

import { api } from '../../services/api'
const mockApi = vi.mocked(api)

describe('WhitelistCheckPage', () => {
  const mockOnVerified = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnVerified.mockClear()
    mockApi.sendOtp.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('AUTH-001: WhitelistCheckPage renders form correctly', () => {
    it('should render form elements correctly', () => {
      renderWithProviders(
        <WhitelistCheckPage onVerified={mockOnVerified} />
      )
      
      expect(screen.getByLabelText(/이름/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/휴대폰 번호/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /인증번호 받기/i })).toBeInTheDocument()
    })

    it('should have proper input placeholders and attributes', () => {
      renderWithProviders(
        <WhitelistCheckPage onVerified={mockOnVerified} />
      )
      
      const phoneInput = screen.getByLabelText(/휴대폰 번호/i)
      expect(phoneInput).toHaveAttribute('placeholder', '010-1234-5678')
      expect(phoneInput).toHaveAttribute('maxlength', '13')
    })
  })

  describe('AUTH-002: WhitelistCheckPage validates phone number format', () => {
    it('should format phone number as user types', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(
        <WhitelistCheckPage onVerified={mockOnVerified} />
      )
      
      const phoneInput = screen.getByLabelText(/휴대폰 번호/i)
      await user.type(phoneInput, '01012345678')
      
      expect(phoneInput).toHaveValue('010-1234-5678')
    })

    it('should validate phone number on form submission', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(
        <WhitelistCheckPage onVerified={mockOnVerified} />
      )
      
      const nameInput = screen.getByLabelText(/이름/i)
      const phoneInput = screen.getByLabelText(/휴대폰 번호/i)
      const submitButton = screen.getByRole('button', { name: /인증번호 받기/i })

      await user.type(nameInput, '홍길동')
      await user.type(phoneInput, '123-456')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/이름과 전화번호를 모두 입력해주세요/i)).toBeInTheDocument()
      })
    })
  })

  describe('AUTH-003: WhitelistCheckPage shows error for invalid users', () => {
    it('should display error message for non-whitelisted users', async () => {
      const user = userEvent.setup()
      
      // Mock API to return whitelist error
      mockApi.sendOtp.mockRejectedValue(new Error('가입 허용 명단에 없는 사용자입니다.'))
      
      renderWithProviders(
        <WhitelistCheckPage onVerified={mockOnVerified} />
      )
      
      const nameInput = screen.getByLabelText(/이름/i)
      const phoneInput = screen.getByLabelText(/휴대폰 번호/i)
      const submitButton = screen.getByRole('button', { name: /인증번호 받기/i })

      await user.type(nameInput, '홍길동')
      await user.type(phoneInput, '010-1234-5678')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/서비스에 일시적인 오류가 발생했습니다/i)).toBeInTheDocument()
      })
    })

    it('should transition to OTP verification on successful whitelist check', async () => {
      const user = userEvent.setup()
      
      // Mock successful response with the expected structure
      mockApi.sendOtp.mockResolvedValue({
        success: true,
        message: 'OTP sent',
        user_hash: 'hash123',
        expires_in_seconds: 300
      })
      
      renderWithProviders(
        <WhitelistCheckPage onVerified={mockOnVerified} />
      )
      
      const nameInput = screen.getByLabelText(/이름/i)
      const phoneInput = screen.getByLabelText(/휴대폰 번호/i)
      const submitButton = screen.getByRole('button', { name: /인증번호 받기/i })

      await user.type(nameInput, '홍길동')
      await user.type(phoneInput, '010-1234-5678')
      await user.click(submitButton)
      
      await waitFor(() => {
        // Should render OTP verification page with expected text
        expect(screen.getByText(/휴대폰 인증/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/인증번호/i)).toBeInTheDocument()
      })
    })
  })
})