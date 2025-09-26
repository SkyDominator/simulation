import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from './utils/renderWithProviders'
import { Button, TextField, Alert } from '@mui/material'
import React from 'react'

// Simple test component to verify our setup works
const BasicComponent: React.FC = () => {
  return (
    <div>
      <h1>Test Application</h1>
      <Button variant="contained">Test Button</Button>
      <TextField label="Test Input" />
      <Alert severity="info">Test Alert</Alert>
    </div>
  )
}

describe('Smoke Tests - Basic Setup Verification', () => {
  it('should render React components correctly', () => {
    renderWithProviders(<BasicComponent />)
    
    expect(screen.getByText('Test Application')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Test Button' })).toBeInTheDocument()
    expect(screen.getByLabelText('Test Input')).toBeInTheDocument()
    expect(screen.getByText('Test Alert')).toBeInTheDocument()
  })

  it('should support Material-UI components', () => {
    renderWithProviders(<BasicComponent />)
    
    const button = screen.getByRole('button', { name: 'Test Button' })
    const input = screen.getByLabelText('Test Input')
    
    expect(button).toHaveClass('MuiButton-root')
    expect(input).toHaveClass('MuiInputBase-input')
  })

  it('should render with theme provider', () => {
    renderWithProviders(<BasicComponent />, { withTheme: true })
    
    const button = screen.getByRole('button', { name: 'Test Button' })
    expect(button).toBeInTheDocument()
  })

  it('should render with auth provider', () => {
    renderWithProviders(<BasicComponent />, { withAuth: true })
    
    expect(screen.getByTestId('mock-auth-provider')).toBeInTheDocument()
  })

  it('should support basic user interactions', async () => {
    renderWithProviders(
      <TextField 
        label="Interactive Input" 
        data-testid="interactive-input"
      />
    )
    
    const input = screen.getByTestId('interactive-input')
    expect(input).toBeInTheDocument()
  })
})

describe('Test Infrastructure Verification', () => {
  it('should have proper test globals available', () => {
    expect(global.localStorage).toBeDefined()
    expect(global.IntersectionObserver).toBeDefined()
    expect(global.ResizeObserver).toBeDefined()
  })

  it('should support vitest matchers', () => {
    expect(true).toBe(true)
    expect('hello').toMatch(/ello/)
    expect([1, 2, 3]).toHaveLength(3)
  })

  it('should support jest-dom matchers', () => {
    renderWithProviders(<div>Test Content</div>)
    
    const element = screen.getByText('Test Content')
    expect(element).toBeInTheDocument()
    expect(element).toBeVisible()
  })
})