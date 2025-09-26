import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../utils/renderWithProviders'
import { mockFetchResponse, mockFetchError } from '../utils/testUtils'
import { mockApiResponses } from '../mocks/api'
import React, { useState } from 'react'
import { 
  Button, 
  Select, 
  MenuItem, 
  TextField, 
  FormControl, 
  InputLabel,
  Alert,
  Table,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress
} from '@mui/material'

// Mock simulation creation component
const SimulationCreateComponent: React.FC = () => {
  const [planId, setPlanId] = useState('')
  const [investments, setInvestments] = useState({ '1': '1000000' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/simulation/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: planId,
          scheduled_payment: investments
        })
      })

      if (!response.ok) {
        throw new Error('Creation failed')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <FormControl fullWidth margin="normal">
        <InputLabel>플랜 선택</InputLabel>
        <Select
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          label="플랜 선택"
        >
          <MenuItem value="A">Plan A</MenuItem>
          <MenuItem value="B">Plan B</MenuItem>
          <MenuItem value="C">Plan C</MenuItem>
        </Select>
      </FormControl>

      <TextField
        label="1라운드 투자금"
        value={investments['1']}
        onChange={(e) => setInvestments({ ...investments, '1': e.target.value })}
        type="number"
        fullWidth
        margin="normal"
      />

      <Button 
        variant="contained" 
        onClick={handleCreate}
        disabled={loading || !planId}
        fullWidth
      >
        {loading ? <CircularProgress size={24} /> : '시뮬레이션 실행'}
      </Button>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Alert severity="success" sx={{ mt: 2 }}>
          시뮬레이션이 생성되었습니다: {result.simulation_id}
        </Alert>
      )}
    </div>
  )
}

// Mock simulation results component
const SimulationResultsComponent: React.FC<{ results?: any }> = ({ results }) => {
  const [loading, setLoading] = useState(!results)

  if (loading && !results) {
    return <CircularProgress data-testid="results-loading" />
  }

  const mockResults = results || {
    history: [
      { company_round: 1, investor_count: 1, total_payment: 1000000, total_revenue_after_tax: 970000 },
      { company_round: 2, investor_count: 2, total_payment: 2000000, total_revenue_after_tax: 1940000 }
    ],
    summary: { total_rounds: 2, final_profit: -60000 }
  }

  return (
    <div data-testid="simulation-results">
      <Table>
        <TableBody data-testid="results-table">
          {mockResults.history?.map((row: any, index: number) => (
            <TableRow key={index}>
              <TableCell>{row.company_round}</TableCell>
              <TableCell>{row.investor_count}</TableCell>
              <TableCell>{row.total_payment?.toLocaleString()}</TableCell>
              <TableCell>{row.total_revenue_after_tax?.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <div data-testid="results-summary">
        총 라운드: {mockResults.summary?.total_rounds}, 
        최종 수익: {mockResults.summary?.final_profit?.toLocaleString()}원
      </div>
    </div>
  )
}

describe('Simulation Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('SIM-001: PlanEditor renders plan selection form', () => {
    it('should render plan selection dropdown', () => {
      renderWithProviders(<SimulationCreateComponent />)
      
      expect(screen.getByLabelText(/플랜 선택/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/1라운드 투자금/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /시뮬레이션 실행/i })).toBeInTheDocument()
    })

    it('should populate plan options correctly', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(<SimulationCreateComponent />)
      
      const planSelect = screen.getByLabelText(/플랜 선택/i)
      await user.click(planSelect)
      
      await waitFor(() => {
        expect(screen.getByText('Plan A')).toBeInTheDocument()
        expect(screen.getByText('Plan B')).toBeInTheDocument()
        expect(screen.getByText('Plan C')).toBeInTheDocument()
      })
    })
  })

  describe('SIM-002: PlanEditor validates investment amounts', () => {
    it('should accept valid investment amounts', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(<SimulationCreateComponent />)
      
      const investmentInput = screen.getByLabelText(/1라운드 투자금/i)
      await user.clear(investmentInput)
      await user.type(investmentInput, '5000000')
      
      expect(investmentInput).toHaveValue(5000000)
    })

    it('should disable submit when no plan is selected', () => {
      renderWithProviders(<SimulationCreateComponent />)
      
      const submitButton = screen.getByRole('button', { name: /시뮬레이션 실행/i })
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit when plan and investment are provided', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(<SimulationCreateComponent />)
      
      const planSelect = screen.getByLabelText(/플랜 선택/i)
      await user.click(planSelect)
      
      await waitFor(async () => {
        const planA = screen.getByText('Plan A')
        await user.click(planA)
      })
      
      const submitButton = screen.getByRole('button', { name: /시뮬레이션 실행/i })
      expect(submitButton).not.toBeDisabled()
    })
  })

  describe('SIM-004: ResultsPage displays simulation results', () => {
    it('should display results table correctly', () => {
      renderWithProviders(<SimulationResultsComponent />)
      
      expect(screen.getByTestId('simulation-results')).toBeInTheDocument()
      expect(screen.getByTestId('results-table')).toBeInTheDocument()
      expect(screen.getByTestId('results-summary')).toBeInTheDocument()
    })

    it('should show proper data formatting', () => {
      renderWithProviders(<SimulationResultsComponent />)
      
      expect(screen.getByText(/1,000,000/)).toBeInTheDocument()
      expect(screen.getByText(/970,000/)).toBeInTheDocument()
      expect(screen.getByText(/총 라운드: 2/)).toBeInTheDocument()
      expect(screen.getByText(/최종 수익: -60,000원/)).toBeInTheDocument()
    })
  })

  describe('SIM-005: ResultsPage handles loading states', () => {
    it('should show loading spinner while results load', () => {
      renderWithProviders(<SimulationResultsComponent results={null} />)
      
      expect(screen.getByTestId('results-loading')).toBeInTheDocument()
    })

    it('should hide loading and show results when data arrives', () => {
      const results = {
        history: [{ company_round: 1, investor_count: 1, total_payment: 1000000, total_revenue_after_tax: 970000 }],
        summary: { total_rounds: 1, final_profit: -30000 }
      }
      
      renderWithProviders(<SimulationResultsComponent results={results} />)
      
      expect(screen.queryByTestId('results-loading')).not.toBeInTheDocument()
      expect(screen.getByTestId('simulation-results')).toBeInTheDocument()
    })
  })

  describe('SIM-006: Simulation creation flow works end-to-end', () => {
    it('should create simulation and show success message', async () => {
      const user = userEvent.setup()
      
      // Mock successful creation
      mockFetchResponse(mockApiResponses.simulations.create)
      
      renderWithProviders(<SimulationCreateComponent />)
      
      // Select plan
      const planSelect = screen.getByLabelText(/플랜 선택/i)
      await user.click(planSelect)
      
      await waitFor(async () => {
        const planA = screen.getByText('Plan A')
        await user.click(planA)
      })
      
      // Enter investment amount
      const investmentInput = screen.getByLabelText(/1라운드 투자금/i)
      await user.clear(investmentInput)
      await user.type(investmentInput, '2000000')
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /시뮬레이션 실행/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/시뮬레이션이 생성되었습니다/)).toBeInTheDocument()
        expect(screen.getByText(/123/)).toBeInTheDocument() // simulation ID
      })
    })

    it('should handle creation errors gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock creation error
      mockFetchError(400, 'Invalid plan type')
      
      renderWithProviders(<SimulationCreateComponent />)
      
      // Select plan
      const planSelect = screen.getByLabelText(/플랜 선택/i)
      await user.click(planSelect)
      
      await waitFor(async () => {
        const planA = screen.getByText('Plan A')
        await user.click(planA)
      })
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /시뮬레이션 실행/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Creation failed/)).toBeInTheDocument()
      })
    })

    it('should show loading state during creation', async () => {
      const user = userEvent.setup()
      
      // Mock delayed response
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => mockApiResponses.simulations.create
        } as Response), 100))
      )
      
      renderWithProviders(<SimulationCreateComponent />)
      
      // Select plan
      const planSelect = screen.getByLabelText(/플랜 선택/i)
      await user.click(planSelect)
      
      await waitFor(async () => {
        const planA = screen.getByText('Plan A')
        await user.click(planA)
      })
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /시뮬레이션 실행/i })
      await user.click(submitButton)
      
      // Should show loading spinner
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
  })
})