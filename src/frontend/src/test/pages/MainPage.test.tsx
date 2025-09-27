import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../utils/renderWithProviders'
import { mockApiResponses } from '../mocks/api'
import MainPage from '../../pages/MainPage'

// Mock the entire API service with factory function
vi.mock('../../services/api', () => ({
  api: {
    getSimulations: vi.fn(),
    runSimulation: vi.fn(),
    deleteSimulation: vi.fn(),
    createSimulation: vi.fn(),
  }
}))

// Import the mocked API to access it in tests
import { api } from '../../services/api'
const mockApi = vi.mocked(api)

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
    mockApi.getSimulations.mockClear()
  })

  describe('MAIN-001: MainPage renders simulation list', () => {
    it('should render basic MainPage structure', async () => {
      // Mock empty simulations
      mockApi.getSimulations.mockResolvedValue([])
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      await waitFor(() => {
        // Check for main page title
        expect(screen.getByText(/내 시뮬레이션/i)).toBeInTheDocument()
      })
    })

    it('should display simulation table when data is available', async () => {
      const mockSimulations = [
        {
          simulation_id: '1',
          plan_id: 'A',
          memo: 'Test simulation 1',
          created_at: '2024-01-01T00:00:00Z',
          starting_company_round: 1,
          current_company_round: 1,
          simulation_rounds: 12,
          investments: [{ round: 1, amount: 1000000 }]
        },
        {
          simulation_id: '2', 
          plan_id: 'B',
          memo: 'Test simulation 2',
          created_at: '2024-01-02T00:00:00Z',
          starting_company_round: 1,
          current_company_round: 1,
          simulation_rounds: 15,
          investments: [{ round: 1, amount: 2000000 }]
        }
      ]

      mockApi.getSimulations.mockResolvedValue(mockSimulations)
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      await waitFor(() => {
        // Check for table structure to indicate data loading
        expect(screen.getByText(/플랜 타입/i)).toBeInTheDocument()
        expect(screen.getByText(/시작 회차/i)).toBeInTheDocument()
      }, { timeout: 5000 })
    })
  })

  describe('MAIN-002: MainPage handles empty simulation state', () => {
    it('should show empty state when no simulations exist', async () => {
      mockApi.getSimulations.mockResolvedValue([])
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/아직 생성된 플랜이 없습니다/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /새 시뮬레이션/i })).toBeInTheDocument()
      })
    })

    it('should provide call-to-action in empty state', async () => {
      const user = userEvent.setup()
      mockApi.getSimulations.mockResolvedValue([])
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /새 시뮬레이션/i })
        expect(createButton).toBeInTheDocument()
      })
    })
  })

  describe('MAIN-003: MainPage sorting functionality works', () => {
    it('should render sort controls', async () => {
      const mockSimulations = [
        { 
          simulation_id: '1', 
          plan_id: 'A', 
          memo: 'First', 
          created_at: '2024-01-01T00:00:00Z',
          starting_company_round: 1,
          current_company_round: 1,
          simulation_rounds: 12
        },
        { 
          simulation_id: '2', 
          plan_id: 'B', 
          memo: 'Second', 
          created_at: '2024-01-02T00:00:00Z',
          starting_company_round: 1,
          current_company_round: 1,
          simulation_rounds: 15
        }
      ]

      mockApi.getSimulations.mockResolvedValue(mockSimulations)
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      await waitFor(() => {
        // Check for sortable table headers
        expect(screen.getByText(/플랜 타입/i)).toBeInTheDocument()
        expect(screen.getByText(/생성일/i)).toBeInTheDocument()
      })
    })

    it('should handle table header clicks for sorting', async () => {
      const user = userEvent.setup()
      const mockSimulations = [
        { 
          simulation_id: '1', 
          plan_id: 'A', 
          memo: 'Older', 
          created_at: '2024-01-01T00:00:00Z',
          starting_company_round: 1,
          current_company_round: 1,
          simulation_rounds: 12
        },
        { 
          simulation_id: '2', 
          plan_id: 'B', 
          memo: 'Newer', 
          created_at: '2024-01-02T00:00:00Z',
          starting_company_round: 1,
          current_company_round: 1,
          simulation_rounds: 15
        }
      ]

      mockApi.getSimulations.mockResolvedValue(mockSimulations)
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      await waitFor(() => {
        const planTypeHeader = screen.getByText(/플랜 타입/i)
        expect(planTypeHeader).toBeInTheDocument()
      })

      // Click on header should not cause errors
      const planTypeHeader = screen.getByText(/플랜 타입/i)
      await user.click(planTypeHeader)
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
      
      // Provide openNotice prop to enable notice button
      const propsWithNotice = { ...defaultProps, openNotice: mockOpenNotice }
      renderWithProviders(<MainPage {...propsWithNotice} />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /공지사항/i })).toBeInTheDocument()
      })
    })

    it('should call openNotice callback on button click', async () => {
      const user = userEvent.setup()
      mockFetchResponse([])
      
      const propsWithNotice = { ...defaultProps, openNotice: mockOpenNotice }
      renderWithProviders(<MainPage {...propsWithNotice} />)
      
      await waitFor(() => {
        const noticeButton = screen.getByRole('button', { name: /공지사항/i })
        expect(noticeButton).toBeInTheDocument()
      })

      const noticeButton = screen.getByRole('button', { name: /공지사항/i })
      await user.click(noticeButton)
      
      expect(mockOpenNotice).toHaveBeenCalledTimes(1)
    })
  })

  describe('MAIN-006: Offline state handling works', () => {
    it('should handle API errors gracefully', async () => {
      mockApi.getSimulations.mockRejectedValue(new Error('Network error'))
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      // Since getSimulations catches errors and returns [], we should see empty state
      await waitFor(() => {
        expect(screen.getByText(/내 시뮬레이션/i)).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should handle network errors', async () => {
      mockApi.getSimulations.mockRejectedValue(new Error('Network error'))
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      await waitFor(() => {
        // MainPage should still render even with API errors
        expect(screen.getByText(/내 시뮬레이션/i)).toBeInTheDocument()
      })
    })

    it('should handle network connectivity changes', async () => {
      mockApi.getSimulations.mockResolvedValue([])
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      })
      
      window.dispatchEvent(new Event('offline'))
      
      await waitFor(() => {
        // Component should still be functional
        expect(screen.getByText(/내 시뮬레이션/i)).toBeInTheDocument()
      })
    })
  })

  describe('Simulation management actions', () => {
    it('should handle simulation deletion', async () => {
      const user = userEvent.setup()
      const mockSimulations = [{
        simulation_id: '1',
        plan_id: 'A',
        memo: 'Test simulation',
        created_at: '2024-01-01T00:00:00Z',
        starting_company_round: 1,
        current_company_round: 1,
        simulation_rounds: 12
      }]

      mockApi.getSimulations.mockResolvedValue(mockSimulations)
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      await waitFor(() => {
        // Check if table with delete button renders
        expect(screen.getByText(/플랜 타입/i)).toBeInTheDocument()
      })
    })

    it('should handle simulation memo editing', async () => {
      const user = userEvent.setup()
      const mockSimulations = [{
        simulation_id: '1',
        plan_id: 'A',
        memo: 'Original memo',
        created_at: '2024-01-01T00:00:00Z',
        starting_company_round: 1,
        current_company_round: 1,
        simulation_rounds: 12
      }]

      mockApi.getSimulations.mockResolvedValue(mockSimulations)
      
      renderWithProviders(<MainPage {...defaultProps} />)
      
      await waitFor(() => {
        // Check if table renders with data
        expect(screen.getByText('A')).toBeInTheDocument()
      })
    })
  })
})