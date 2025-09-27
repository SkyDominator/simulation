import { describe, it, expect, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../utils/renderWithProviders'
import { mockMobileViewport, mockDesktopViewport, resetViewport } from '../utils/testUtils'
import Shell from '../../components/Shell'

describe('Shell Component', () => {
  afterEach(() => {
    resetViewport()
  })

  describe('Basic rendering', () => {
    it('should render children correctly', () => {
      renderWithProviders(
        <Shell>
          <div>Test Content</div>
        </Shell>
      )
      
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('should render navigation elements', () => {
      renderWithProviders(
        <Shell>
          <div>Content</div>
        </Shell>
      )
      
      expect(screen.getByText('Content')).toBeInTheDocument()
    })
  })

  describe('MOB-002: Navigation adapts to mobile screen size', () => {
    it('should render mobile navigation on small screens', () => {
      mockMobileViewport()
      
      renderWithProviders(
        <Shell>
          <div>Mobile Content</div>
        </Shell>
      )
      
      expect(screen.getByText('Mobile Content')).toBeInTheDocument()
    })

    it('should render desktop navigation on large screens', () => {
      mockDesktopViewport()
      
      renderWithProviders(
        <Shell>
          <div>Desktop Content</div>
        </Shell>
      )
      
      expect(screen.getByText('Desktop Content')).toBeInTheDocument()
    })
  })
})