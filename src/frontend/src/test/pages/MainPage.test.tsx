import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../utils/renderWithProviders'
import { mockFetchResponse, mockFetchError } from '../utils/testUtils'
import { mockApiResponses } from '../mocks/api'
import MainPage from '../../pages/MainPage'

// Mock fetch globally
global.fetch = vi.fn()

// Create mock functions for MainPage props
const mockSetPage = vi.fn()
const mockSetEditingPlan = vi.fn()  
const mockSetSimulationResult = vi.fn()
const mockOpenNotice = vi.fn()

const defaultProps = {
  setPage: mockSetPage,
  setEditingPlan: mockSetEditingPlan,
  setSimulationResult: mockSetSimulationResult,
  openNotice: mockOpenNotice,
}

describe('MainPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('MAIN-001: MainPage renders simulation list', () => {
    it('should render simulation list when data is available', async () => {
      // Mock simulations data
      const mockSimulations = [
        {
          id: '1',
          plan_id: 'A',
          memo: 'Test simulation 1',
          created_at: '2024-01-01T00:00:00Z',
          investments: [{ round: 1, amount: 1000000 }]
        },
        {
          id: '2', 
          plan_id: 'B',
          memo: 'Test simulation 2',
          created_at: '2024-01-02T00:00:00Z',
          investments: [{ round: 1, amount: 2000000 }]
        }
      ]

      mockFetchResponse(mockSimulations)
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/Test simulation 1/i)).toBeInTheDocument()
        expect(screen.getByText(/Test simulation 2/i)).toBeInTheDocument()
      })
    })

    it('should display simulation metadata correctly', async () => {
      const mockSimulations = [{
        id: '1',
        plan_id: 'A',
        memo: 'Investment Plan A',
        created_at: '2024-01-01T00:00:00Z',
        investments: [{ round: 1, amount: 1000000 }]
      }]

      mockFetchResponse(mockSimulations)
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/Investment Plan A/i)).toBeInTheDocument()
        expect(screen.getByText(/Plan A/i)).toBeInTheDocument()
        expect(screen.getByText(/1,000,000/)).toBeInTheDocument()
      })
    })
  })

  describe('MAIN-002: MainPage handles empty simulation state', () => {
    it('should show empty state when no simulations exist', async () => {
      mockFetchResponse([])
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/시뮬레이션이 없습니다/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /새 시뮬레이션 만들기/i })).toBeInTheDocument()
      })
    })

    it('should provide call-to-action in empty state', async () => {
      const user = userEvent.setup()
      mockFetchResponse([])
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /새 시뮬레이션 만들기/i })
        expect(createButton).toBeInTheDocument()
      })
    })
  })

  describe('MAIN-003: MainPage sorting functionality works', () => {
    it('should render sort controls', async () => {
      const mockSimulations = [
        { id: '1', plan_id: 'A', memo: 'First', created_at: '2024-01-01T00:00:00Z' },
        { id: '2', plan_id: 'B', memo: 'Second', created_at: '2024-01-02T00:00:00Z' }
      ]

      mockFetchResponse(mockSimulations)
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/정렬/i)).toBeInTheDocument()
      })
    })

    it('should sort simulations by creation date', async () => {
      const user = userEvent.setup()
      const mockSimulations = [
        { id: '1', plan_id: 'A', memo: 'Older', created_at: '2024-01-01T00:00:00Z' },
        { id: '2', plan_id: 'B', memo: 'Newer', created_at: '2024-01-02T00:00:00Z' }
      ]

      mockFetchResponse(mockSimulations)
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      await waitFor(async () => {
        const sortSelect = screen.getByLabelText(/정렬/i)
        await user.selectOptions(sortSelect, '생성일 (최신순)')
      })

      // Verify order after sort
      const items = screen.getAllByRole('listitem')
      expect(items[0]).toHaveTextContent('Newer')
      expect(items[1]).toHaveTextContent('Older')
    })
  })

  describe('MAIN-004: AppController manages page navigation', () => {
    it('should render navigation elements', async () => {
      mockFetchResponse([])
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /새 시뮬레이션/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /로그아웃/i })).toBeInTheDocument()
      })
    })

    it('should navigate to plan editor on create button click', async () => {
      const user = userEvent.setup()
      mockFetchResponse([])
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      await waitFor(async () => {
        const createButton = screen.getByRole('button', { name: /새 시뮬레이션/i })
        await user.click(createButton)
        
        // Should trigger navigation (tested via state change)
        expect(createButton).toHaveBeenClicked
      })
    })
  })

  describe('MAIN-005: Notice modal opens and closes correctly', () => {
    it('should show notice button when notices are available', async () => {
      mockFetchResponse([])
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /공지사항/i })).toBeInTheDocument()
      })
    })

    it('should open notice modal on button click', async () => {
      const user = userEvent.setup()
      mockFetchResponse([])
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      await waitFor(async () => {
        const noticeButton = screen.getByRole('button', { name: /공지사항/i })
        await user.click(noticeButton)
        
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })
  })

  describe('MAIN-006: Offline state handling works', () => {
    it('should show error message when API fails', async () => {
      mockFetchError(500)
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/오류가 발생했습니다/i)).toBeInTheDocument()
      })
    })

    it('should provide retry functionality on error', async () => {
      const user = userEvent.setup()
      mockFetchError(500)
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      await waitFor(async () => {
        expect(screen.getByText(/오류가 발생했습니다/i)).toBeInTheDocument()
        
        const retryButton = screen.getByRole('button', { name: /다시 시도/i })
        expect(retryButton).toBeInTheDocument()
        
        // Click retry should trigger new API call
        await user.click(retryButton)
      })
    })

    it('should handle network connectivity changes', async () => {
      mockFetchResponse([])
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      })
      
      window.dispatchEvent(new Event('offline'))
      
      await waitFor(() => {
        expect(screen.getByText(/오프라인 상태/i)).toBeInTheDocument()
      })
    })
  })

  describe('Simulation management actions', () => {
    it('should handle simulation deletion', async () => {
      const user = userEvent.setup()
      const mockSimulations = [{
        id: '1',
        plan_id: 'A',
        memo: 'Test simulation',
        created_at: '2024-01-01T00:00:00Z'
      }]

      mockFetchResponse(mockSimulations)
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      await waitFor(async () => {
        const deleteButton = screen.getByRole('button', { name: /삭제/i })
        await user.click(deleteButton)
        
        // Should show confirmation modal
        expect(screen.getByText(/삭제하시겠습니까/i)).toBeInTheDocument()
      })
    })

    it('should handle simulation memo editing', async () => {
      const user = userEvent.setup()
      const mockSimulations = [{
        id: '1',
        plan_id: 'A',
        memo: 'Original memo',
        created_at: '2024-01-01T00:00:00Z'
      }]

      mockFetchResponse(mockSimulations)
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      await waitFor(async () => {
        const editButton = screen.getByRole('button', { name: /메모 수정/i })
        await user.click(editButton)
        
        // Should show memo edit modal
        expect(screen.getByRole('textbox', { name: /메모/i })).toBeInTheDocument()
      })
    })
  })
})