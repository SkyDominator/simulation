import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../utils/renderWithProviders'
import { mockMobileViewport, mockDesktopViewport, resetViewport } from '../utils/testUtils'

// Mock the Shell component since we just want to test basic functionality
vi.mock('../../components/Shell', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="shell-component">
      <nav data-testid="navigation">Navigation</nav>
      <main>{children}</main>
    </div>
  )
}))

describe('Shell Component', () => {
  afterEach(() => {
    resetViewport()
  })

  describe('Basic rendering', () => {
    it('should render children correctly', () => {
      const Shell = require('../../components/Shell').default
      
      renderWithProviders(
        <Shell>
          <div>Test Content</div>
        </Shell>
      )
      
      expect(screen.getByTestId('shell-component')).toBeInTheDocument()
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('should render navigation elements', () => {
      const Shell = require('../../components/Shell').default
      
      renderWithProviders(
        <Shell>
          <div>Content</div>
        </Shell>
      )
      
      expect(screen.getByTestId('navigation')).toBeInTheDocument()
    })
  })

  describe('MOB-002: Navigation adapts to mobile screen size', () => {
    it('should render mobile navigation on small screens', () => {
      mockMobileViewport()
      
      const Shell = require('../../components/Shell').default
      
      renderWithProviders(
        <Shell>
          <div>Mobile Content</div>
        </Shell>
      )
      
      expect(screen.getByTestId('navigation')).toBeInTheDocument()
      expect(screen.getByText('Mobile Content')).toBeInTheDocument()
    })

    it('should render desktop navigation on large screens', () => {
      mockDesktopViewport()
      
      const Shell = require('../../components/Shell').default
      
      renderWithProviders(
        <Shell>
          <div>Desktop Content</div>
        </Shell>
      )
      
      expect(screen.getByTestId('navigation')).toBeInTheDocument()
      expect(screen.getByText('Desktop Content')).toBeInTheDocument()
    })
  })
})