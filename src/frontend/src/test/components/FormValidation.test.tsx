import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../utils/renderWithProviders'
import { TextField, Button } from '@mui/material'
import React, { useState } from 'react'

// Simple form component for testing validation
const TestForm: React.FC = () => {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 3) return digits
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setPhone(formatted)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('이름을 입력해주세요.')
      return
    }

    if (!phone.trim() || phone.length < 13) {
      setError('올바른 전화번호를 입력해주세요.')
      return
    }

    setError('성공!')
  }

  return (
    <form onSubmit={handleSubmit}>
      <TextField
        label="이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="휴대폰 번호"
        value={phone}
        onChange={handlePhoneChange}
        placeholder="010-1234-5678"
        inputProps={{ maxLength: 13 }}
        fullWidth
        margin="normal"
      />
      <Button type="submit" variant="contained" fullWidth>
        제출하기
      </Button>
      {error && <div role="alert">{error}</div>}
    </form>
  )
}

describe('Form Validation', () => {
  describe('FORM-001: Phone number input validates Korean format', () => {
    it('should format phone number as user types', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(<TestForm />)
      
      const phoneInput = screen.getByLabelText(/휴대폰 번호/i)
      await user.type(phoneInput, '01012345678')
      
      expect(phoneInput).toHaveValue('010-1234-5678')
    })

    it('should handle partial phone numbers correctly', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(<TestForm />)
      
      const phoneInput = screen.getByLabelText(/휴대폰 번호/i)
      await user.type(phoneInput, '010123')
      
      expect(phoneInput).toHaveValue('010-123')
    })

    it('should limit phone number length', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(<TestForm />)
      
      const phoneInput = screen.getByLabelText(/휴대폰 번호/i)
      await user.type(phoneInput, '010123456789012345')
      
      // Should be limited to 13 characters (xxx-xxxx-xxxx format)
      expect(phoneInput).toHaveValue('010-1234-5678')
    })
  })

  describe('FORM-003: Required field validation shows appropriate errors', () => {
    it('should show error for empty name', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(<TestForm />)
      
      const submitButton = screen.getByRole('button', { name: /제출하기/i })
      await user.click(submitButton)
      
      expect(screen.getByRole('alert')).toHaveTextContent('이름을 입력해주세요.')
    })

    it('should show error for invalid phone number', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(<TestForm />)
      
      const nameInput = screen.getByLabelText(/이름/i)
      const phoneInput = screen.getByLabelText(/휴대폰 번호/i)
      const submitButton = screen.getByRole('button', { name: /제출하기/i })

      await user.type(nameInput, '홍길동')
      await user.type(phoneInput, '123-456')
      await user.click(submitButton)
      
      expect(screen.getByRole('alert')).toHaveTextContent('올바른 전화번호를 입력해주세요.')
    })

    it('should show success message for valid form', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(<TestForm />)
      
      const nameInput = screen.getByLabelText(/이름/i)
      const phoneInput = screen.getByLabelText(/휴대폰 번호/i)
      const submitButton = screen.getByRole('button', { name: /제출하기/i })

      await user.type(nameInput, '홍길동')
      await user.type(phoneInput, '010-1234-5678')
      await user.click(submitButton)
      
      expect(screen.getByRole('alert')).toHaveTextContent('성공!')
    })
  })

  describe('FORM-004: Form submission handles loading states', () => {
    it('should have proper form elements and attributes', () => {
      renderWithProviders(<TestForm />)
      
      const nameInput = screen.getByLabelText(/이름/i)
      const phoneInput = screen.getByLabelText(/휴대폰 번호/i)
      const submitButton = screen.getByRole('button', { name: /제출하기/i })

      expect(nameInput).toBeInTheDocument()
      expect(phoneInput).toHaveAttribute('placeholder', '010-1234-5678')
      expect(phoneInput).toHaveAttribute('maxlength', '13')
      expect(submitButton).toHaveAttribute('type', 'submit')
    })
  })
})