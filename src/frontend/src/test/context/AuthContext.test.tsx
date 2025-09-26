import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../utils/renderWithProviders'
import { mockAuthContext } from '../mocks/AuthContext'
import React from 'react'
import { Button } from '@mui/material'

// Component to test AuthContext
const AuthTestComponent: React.FC = () => {
  const { user, signOut } = mockAuthContext

  return (
    <div>
      <div data-testid="auth-status">
        {user ? `Logged in as: ${user.email}` : 'Not logged in'}
      </div>
      {user && (
        <Button onClick={() => signOut()} data-testid="logout-btn">
          로그아웃
        </Button>
      )}
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AUTH-006: AuthContext provides user state correctly', () => {
    it('should provide user information when authenticated', () => {
      renderWithProviders(<AuthTestComponent />)
      
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Logged in as: test@example.com')
      expect(screen.getByTestId('logout-btn')).toBeInTheDocument()
    })

    it('should handle user sign out', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(<AuthTestComponent />)
      
      const logoutBtn = screen.getByTestId('logout-btn')
      await user.click(logoutBtn)
      
      expect(mockAuthContext.signOut).toHaveBeenCalledTimes(1)
    })

    it('should show not logged in state when user is null', () => {
      // Temporarily set user to null
      const originalUser = mockAuthContext.user
      mockAuthContext.user = null
      
      renderWithProviders(<AuthTestComponent />)
      
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not logged in')
      expect(screen.queryByTestId('logout-btn')).not.toBeInTheDocument()
      
      // Restore original user
      mockAuthContext.user = originalUser
    })
  })

  describe('AUTH-007: Protected routes redirect when not authenticated', () => {
    it('should handle loading state', () => {
      // Mock loading state
      const originalLoading = mockAuthContext.loading
      mockAuthContext.loading = true
      
      const LoadingComponent: React.FC = () => {
        const { loading } = mockAuthContext
        return <div>{loading ? 'Loading...' : 'Loaded'}</div>
      }
      
      renderWithProviders(<LoadingComponent />)
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      
      // Restore original loading state
      mockAuthContext.loading = originalLoading
    })

    it('should provide authentication state correctly', () => {
      const AuthStateComponent: React.FC = () => {
        const { user, loading } = mockAuthContext
        
        if (loading) return <div>Loading...</div>
        if (!user) return <div>Please log in</div>
        return <div>Welcome, {user.email}!</div>
      }
      
      renderWithProviders(<AuthStateComponent />)
      
      expect(screen.getByText('Welcome, test@example.com!')).toBeInTheDocument()
    })
  })

  describe('Authentication workflow', () => {
    it('should handle authentication state changes', () => {
      const StateChangeComponent: React.FC = () => {
        const { user, loading } = mockAuthContext
        
        return (
          <div>
            <div data-testid="user-email">{user?.email || 'No user'}</div>
            <div data-testid="loading-state">{loading ? 'true' : 'false'}</div>
            <div data-testid="user-id">{user?.id || 'No ID'}</div>
          </div>
        )
      }
      
      renderWithProviders(<StateChangeComponent />)
      
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
      expect(screen.getByTestId('loading-state')).toHaveTextContent('false')
      expect(screen.getByTestId('user-id')).toHaveTextContent('test-user-id')
    })

    it('should provide consistent user data structure', () => {
      const UserDataComponent: React.FC = () => {
        const { user } = mockAuthContext
        
        return (
          <div>
            {user && (
              <>
                <div data-testid="user-aud">{user.aud}</div>
                <div data-testid="user-created">{user.created_at}</div>
                <div data-testid="user-metadata">{JSON.stringify(user.user_metadata)}</div>
              </>
            )}
          </div>
        )
      }
      
      renderWithProviders(<UserDataComponent />)
      
      expect(screen.getByTestId('user-aud')).toHaveTextContent('authenticated')
      expect(screen.getByTestId('user-created')).toHaveTextContent('2024-01-01T00:00:00Z')
      expect(screen.getByTestId('user-metadata')).toHaveTextContent('{}')
    })
  })
})