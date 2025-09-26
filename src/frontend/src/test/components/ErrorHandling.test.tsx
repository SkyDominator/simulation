import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../utils/renderWithProviders'
import { mockFetchResponse, mockFetchError, mockOnlineStatus } from '../utils/testUtils'
import { mockApiResponses } from '../mocks/api'
import React, { useState, useEffect } from 'react'
import { Button, Alert, CircularProgress, Box } from '@mui/material'

// Mock component that simulates API calls and error handling
const ApiTestComponent: React.FC = () => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/test')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData?.detail || `API error: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    fetchData()
  }

  return (
    <Box>
      <Button onClick={fetchData} disabled={loading}>
        {loading ? <CircularProgress size={20} /> : 'Fetch Data'}
      </Button>
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
          <Button onClick={handleRetry} sx={{ ml: 2 }}>
            다시 시도
          </Button>
        </Alert>
      )}
      
      {data && (
        <Alert severity="success" sx={{ mt: 2 }}>
          성공: {JSON.stringify(data)}
        </Alert>
      )}
    </Box>
  )
}

// Component that simulates network connectivity
const NetworkStatusComponent: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <Box>
      <div data-testid="network-status">
        상태: {isOnline ? '온라인' : '오프라인 상태'}
      </div>
      {!isOnline && (
        <Alert severity="warning">
          인터넷 연결을 확인해주세요.
        </Alert>
      )}
    </Box>
  )
}

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ERR-001: Network error displays user-friendly message', () => {
    it('should display error message when API fails', async () => {
      const user = userEvent.setup()
      
      // Mock network error
      mockFetchError(500, 'Internal Server Error')
      
      renderWithProviders(<ApiTestComponent />)
      
      const fetchButton = screen.getByRole('button', { name: /fetch data/i })
      await user.click(fetchButton)
      
      await waitFor(() => {
        // Check for actual error message shown in the test output
        expect(screen.getByText(/500 Internal Server Error/i)).toBeInTheDocument()
      })
    })

    it('should display structured error from API', async () => {
      const user = userEvent.setup()
      
      // Mock API error with structured response
      mockFetchResponse(mockApiResponses.errors.notFound, false, 404)
      
      renderWithProviders(<ApiTestComponent />)
      
      const fetchButton = screen.getByRole('button', { name: /fetch data/i })
      await user.click(fetchButton)
      
      await waitFor(() => {
        expect(screen.getByText(/resource not found/i)).toBeInTheDocument()
      })
    })
  })

  describe('ERR-002: Invalid API responses handled gracefully', () => {
    it('should handle successful API response', async () => {
      const user = userEvent.setup()
      
      // Mock successful response
      mockFetchResponse({ success: true, data: 'test data' })
      
      renderWithProviders(<ApiTestComponent />)
      
      const fetchButton = screen.getByRole('button', { name: /fetch data/i })
      await user.click(fetchButton)
      
      await waitFor(() => {
        expect(screen.getByText(/성공:/)).toBeInTheDocument()
        expect(screen.getByText(/test data/)).toBeInTheDocument()
      })
    })

    it('should handle malformed API responses', async () => {
      const user = userEvent.setup()
      
      // Mock response with invalid JSON
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => { throw new Error('Invalid JSON') }
      } as Response)
      
      renderWithProviders(<ApiTestComponent />)
      
      const fetchButton = screen.getByRole('button', { name: /fetch data/i })
      await user.click(fetchButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid JSON/i)).toBeInTheDocument()
      })
    })
  })

  describe('ERR-004: Retry mechanisms work for failed requests', () => {
    it('should provide retry functionality', async () => {
      const user = userEvent.setup()
      
      // Mock initial error
      mockFetchError(500)
      
      renderWithProviders(<ApiTestComponent />)
      
      const fetchButton = screen.getByRole('button', { name: /fetch data/i })
      await user.click(fetchButton)
      
      await waitFor(() => {
        expect(screen.getByText(/500 Internal Server Error/i)).toBeInTheDocument()
        
        const retryButton = screen.getByRole('button', { name: /다시 시도/i })
        expect(retryButton).toBeInTheDocument()
      })
    })

    it('should retry after error', async () => {
      const user = userEvent.setup()
      const mockFetch = vi.mocked(fetch)
      
      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: 'retry success' })
        } as Response)
      
      renderWithProviders(<ApiTestComponent />)
      
      const fetchButton = screen.getByRole('button', { name: /fetch data/i })
      await user.click(fetchButton)
      
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
      
      const retryButton = screen.getByRole('button', { name: /다시 시도/i })
      await user.click(retryButton)
      
      await waitFor(() => {
        expect(screen.getByText(/retry success/)).toBeInTheDocument()
      })
    })
  })

  describe('ERR-005: Offline mode shows appropriate status', () => {
    it('should display online status', () => {
      // Mock online state using our utility function
      mockOnlineStatus(true)
      
      renderWithProviders(<NetworkStatusComponent />)
      
      expect(screen.getByTestId('network-status')).toHaveTextContent('상태: 온라인')
    })

    it('should display offline status and warning', () => {
      // Mock offline state using our utility function
      mockOnlineStatus(false)
      
      renderWithProviders(<NetworkStatusComponent />)
      
      expect(screen.getByTestId('network-status')).toHaveTextContent('상태: 오프라인 상태')
      expect(screen.getByText(/인터넷 연결을 확인해주세요/i)).toBeInTheDocument()
    })

    it('should respond to network connectivity changes', async () => {
      // Start online
      mockOnlineStatus(true)
      
      renderWithProviders(<NetworkStatusComponent />)
      
      expect(screen.getByTestId('network-status')).toHaveTextContent('상태: 온라인')
      
      // Simulate going offline
      mockOnlineStatus(false)
      
      // Wait for the component to update
      await waitFor(() => {
        expect(screen.getByTestId('network-status')).toHaveTextContent('상태: 오프라인 상태')
      })
    })
  })

  describe('Loading states', () => {
    it('should show loading spinner during API call', async () => {
      const user = userEvent.setup()
      
      // Mock delayed response
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, data: 'loaded' })
        } as Response), 100))
      )
      
      renderWithProviders(<ApiTestComponent />)
      
      const fetchButton = screen.getByRole('button', { name: /fetch data/i })
      await user.click(fetchButton)
      
      // Should show loading spinner
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      expect(fetchButton).toBeDisabled()
      
      await waitFor(() => {
        expect(screen.getByText(/loaded/)).toBeInTheDocument()
      })
    })
  })
})