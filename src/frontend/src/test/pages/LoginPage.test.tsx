import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../utils/renderWithProviders'
import LoginPage from '../../pages/LoginPage'

// Mock Supabase client
vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
    }
  }
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AUTH-004: LoginPage renders OAuth providers', () => {
    it('should render OAuth sign-in options', () => {
      renderWithProviders(<LoginPage />)
      
      // Should render Google OAuth button
      expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
    })

    it('should display proper branding and messaging', () => {
      renderWithProviders(<LoginPage />)
      
      expect(screen.getByText(/light of life club/i)).toBeInTheDocument()
      expect(screen.getByText(/simulation/i)).toBeInTheDocument()
    })
  })

  describe('AUTH-005: LoginPage handles authentication success', () => {
    it('should initiate Google OAuth when button is clicked', async () => {
      const user = userEvent.setup()
      const { supabase } = await import('../../supabaseClient')
      
      renderWithProviders(<LoginPage />)
      
      const googleButton = screen.getByRole('button', { name: /google/i })
      await user.click(googleButton)
      
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining(window.location.origin)
        }
      })
    })

    it('should handle OAuth errors gracefully', async () => {
      const user = userEvent.setup()
      const { supabase } = await import('../../supabaseClient')
      
      // Mock OAuth failure
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'OAuth failed' }
      } as any)
      
      renderWithProviders(<LoginPage />)
      
      const googleButton = screen.getByRole('button', { name: /google/i })
      await user.click(googleButton)
      
      await waitFor(() => {
        expect(screen.getByText(/sign in failed/i)).toBeInTheDocument()
      })
    })

    it('should show loading state during OAuth process', async () => {
      const user = userEvent.setup()
      const { supabase } = await import('../../supabaseClient')
      
      // Mock delayed OAuth response
      vi.mocked(supabase.auth.signInWithOAuth).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: { user: null, session: null },
          error: null
        } as any), 100))
      )
      
      renderWithProviders(<LoginPage />)
      
      const googleButton = screen.getByRole('button', { name: /google/i })
      await user.click(googleButton)
      
      // Should show loading state
      expect(googleButton).toBeDisabled()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('Accessibility and UX', () => {
    it('should have proper accessibility attributes', () => {
      renderWithProviders(<LoginPage />)
      
      const googleButton = screen.getByRole('button', { name: /google/i })
      expect(googleButton).toHaveAttribute('aria-label', expect.stringContaining('Google'))
    })

    it('should display terms and privacy policy links', () => {
      renderWithProviders(<LoginPage />)
      
      expect(screen.getByText(/terms/i)).toBeInTheDocument()
      expect(screen.getByText(/privacy/i)).toBeInTheDocument()
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(<LoginPage />)
      
      // Tab to the Google button
      await user.tab()
      
      const googleButton = screen.getByRole('button', { name: /google/i })
      expect(googleButton).toHaveFocus()
      
      // Should be able to activate with Enter/Space
      await user.keyboard('{Enter}')
      
      const { supabase } = await import('../../supabaseClient')
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalled()
    })
  })
})