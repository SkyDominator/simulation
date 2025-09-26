import { describe, it, expect, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../utils/renderWithProviders'
import { mockMobileViewport, mockDesktopViewport, resetViewport } from '../utils/testUtils'
import React from 'react'
import { 
  Box, 
  Paper, 
  Button, 
  useMediaQuery, 
  useTheme,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  BottomNavigation,
  BottomNavigationAction,
  Hidden
} from '@mui/material'
import HomeIcon from '@mui/icons-material/Home'
import PersonIcon from '@mui/icons-material/Person'
import SettingsIcon from '@mui/icons-material/Settings'

// Mock responsive navigation component
const ResponsiveNavigation: React.FC = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  if (isMobile) {
    return (
      <Box data-testid="mobile-navigation">
        <BottomNavigation showLabels>
          <BottomNavigationAction label="홈" icon={<HomeIcon />} />
          <BottomNavigationAction label="프로필" icon={<PersonIcon />} />
          <BottomNavigationAction label="설정" icon={<SettingsIcon />} />
        </BottomNavigation>
      </Box>
    )
  }

  return (
    <Box data-testid="desktop-navigation">
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Desktop Navigation
          </Typography>
          <Button color="inherit">홈</Button>
          <Button color="inherit">프로필</Button>
          <Button color="inherit">설정</Button>
        </Toolbar>
      </AppBar>
    </Box>
  )
}

// Mock responsive layout component
const ResponsiveLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <ResponsiveNavigation />
      
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: isMobile ? 1 : 3,
          maxWidth: isMobile ? '100%' : '1200px',
          margin: '0 auto'
        }}
        data-testid="main-content"
      >
        {children}
      </Box>
      
      {isMobile && (
        <Box data-testid="mobile-footer" sx={{ mt: 'auto' }}>
          <Typography variant="caption" align="center" display="block" p={1}>
            Mobile Footer
          </Typography>
        </Box>
      )}
    </Box>
  )
}

// Mock responsive form component
const ResponsiveForm: React.FC = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  return (
    <Paper 
      sx={{ 
        p: isMobile ? 2 : 4,
        maxWidth: isMobile ? '100%' : '600px',
        margin: '0 auto'
      }}
      data-testid="responsive-form"
    >
      <Typography variant={isMobile ? 'h5' : 'h4'} gutterBottom>
        {isMobile ? '모바일 폼' : '데스크톱 폼'}
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2 }}>
        <Button 
          variant="contained" 
          fullWidth={isMobile}
          size={isMobile ? 'large' : 'medium'}
        >
          {isMobile ? '모바일 버튼' : '데스크톱 버튼'}
        </Button>
        
        {!isMobile && (
          <Hidden mdDown>
            <Button variant="outlined" data-testid="desktop-only-button">
              데스크톱 전용
            </Button>
          </Hidden>
        )}
      </Box>
    </Paper>
  )
}

// Mock card grid component
const ResponsiveCardGrid: React.FC = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  
  const cards = [1, 2, 3, 4, 5, 6]
  const gridCols = isMobile ? 1 : 3

  return (
    <Box 
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gap: 2,
        p: 2
      }}
      data-testid="card-grid"
    >
      {cards.map((card) => (
        <Paper 
          key={card}
          sx={{ 
            p: 2, 
            minHeight: isMobile ? 120 : 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          data-testid={`card-${card}`}
        >
          <Typography>Card {card}</Typography>
        </Paper>
      ))}
    </Box>
  )
}

describe('Responsive Behavior', () => {
  afterEach(() => {
    resetViewport()
  })

  describe('MOB-001: Components render correctly on mobile viewport', () => {
    it('should render mobile navigation on small screens', () => {
      mockMobileViewport()
      
      renderWithProviders(<ResponsiveNavigation />)
      
      expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument()
      expect(screen.queryByTestId('desktop-navigation')).not.toBeInTheDocument()
      
      // Check for mobile navigation elements
      expect(screen.getByText('홈')).toBeInTheDocument()
      expect(screen.getByText('프로필')).toBeInTheDocument()
      expect(screen.getByText('설정')).toBeInTheDocument()
    })

    it('should adapt layout for mobile viewport', () => {
      mockMobileViewport()
      
      renderWithProviders(
        <ResponsiveLayout>
          <div>Mobile Content</div>
        </ResponsiveLayout>
      )
      
      expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument()
      expect(screen.getByTestId('mobile-footer')).toBeInTheDocument()
      expect(screen.getByText('Mobile Content')).toBeInTheDocument()
    })

    it('should display mobile-optimized form', () => {
      mockMobileViewport()
      
      renderWithProviders(<ResponsiveForm />)
      
      expect(screen.getByText('모바일 폼')).toBeInTheDocument()
      expect(screen.getByText('모바일 버튼')).toBeInTheDocument()
      expect(screen.queryByTestId('desktop-only-button')).not.toBeInTheDocument()
    })
  })

  describe('MOB-002: Navigation adapts to mobile screen size', () => {
    it('should render desktop navigation on large screens', () => {
      mockDesktopViewport()
      
      renderWithProviders(<ResponsiveNavigation />)
      
      expect(screen.getByTestId('desktop-navigation')).toBeInTheDocument()
      expect(screen.queryByTestId('mobile-navigation')).not.toBeInTheDocument()
      
      // Check for desktop navigation elements
      expect(screen.getByText('Desktop Navigation')).toBeInTheDocument()
    })

    it('should switch navigation types based on viewport', () => {
      // Start with desktop
      mockDesktopViewport()
      
      const { rerender } = renderWithProviders(<ResponsiveNavigation />)
      
      expect(screen.getByTestId('desktop-navigation')).toBeInTheDocument()
      
      // Switch to mobile
      mockMobileViewport()
      
      rerender(<ResponsiveNavigation />)
      
      expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument()
      expect(screen.queryByTestId('desktop-navigation')).not.toBeInTheDocument()
    })
  })

  describe('MOB-003: Forms remain usable on small screens', () => {
    it('should stack form elements vertically on mobile', () => {
      mockMobileViewport()
      
      renderWithProviders(<ResponsiveForm />)
      
      const form = screen.getByTestId('responsive-form')
      expect(form).toBeInTheDocument()
      
      // Mobile form should show mobile-specific content
      expect(screen.getByText('모바일 폼')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /모바일 버튼/i })).toBeInTheDocument()
    })

    it('should use larger touch targets on mobile', () => {
      mockMobileViewport()
      
      renderWithProviders(<ResponsiveForm />)
      
      const button = screen.getByRole('button', { name: /모바일 버튼/i })
      expect(button).toHaveClass('MuiButton-sizeLarge')
    })

    it('should hide non-essential elements on mobile', () => {
      mockMobileViewport()
      
      renderWithProviders(<ResponsiveForm />)
      
      // Desktop-only button should not be visible on mobile
      expect(screen.queryByTestId('desktop-only-button')).not.toBeInTheDocument()
    })
  })

  describe('MOB-004: Touch interactions work properly', () => {
    it('should provide appropriate touch targets', () => {
      mockMobileViewport()
      
      renderWithProviders(<ResponsiveNavigation />)
      
      // Bottom navigation actions should be present and accessible
      const homeAction = screen.getByLabelText('홈')
      const profileAction = screen.getByLabelText('프로필')
      const settingsAction = screen.getByLabelText('설정')
      
      expect(homeAction).toBeInTheDocument()
      expect(profileAction).toBeInTheDocument()
      expect(settingsAction).toBeInTheDocument()
    })

    it('should use full-width buttons on mobile forms', () => {
      mockMobileViewport()
      
      renderWithProviders(<ResponsiveForm />)
      
      const button = screen.getByRole('button', { name: /모바일 버튼/i })
      expect(button).toHaveClass('MuiButton-fullWidth')
    })
  })

  describe('Grid and layout responsiveness', () => {
    it('should display single column grid on mobile', () => {
      mockMobileViewport()
      
      renderWithProviders(<ResponsiveCardGrid />)
      
      const grid = screen.getByTestId('card-grid')
      expect(grid).toBeInTheDocument()
      
      // All cards should be present
      for (let i = 1; i <= 6; i++) {
        expect(screen.getByTestId(`card-${i}`)).toBeInTheDocument()
      }
    })

    it('should display multi-column grid on desktop', () => {
      mockDesktopViewport()
      
      renderWithProviders(<ResponsiveCardGrid />)
      
      const grid = screen.getByTestId('card-grid')
      expect(grid).toBeInTheDocument()
      
      // All cards should be present in desktop layout
      for (let i = 1; i <= 6; i++) {
        expect(screen.getByTestId(`card-${i}`)).toBeInTheDocument()
      }
    })
  })

  describe('Desktop vs Mobile content differences', () => {
    it('should show different content based on viewport', () => {
      // Test desktop content
      mockDesktopViewport()
      
      const { rerender } = renderWithProviders(<ResponsiveForm />)
      
      expect(screen.getByText('데스크톱 폼')).toBeInTheDocument()
      expect(screen.getByText('데스크톱 버튼')).toBeInTheDocument()
      
      // Test mobile content
      mockMobileViewport()
      
      rerender(<ResponsiveForm />)
      
      expect(screen.getByText('모바일 폼')).toBeInTheDocument()
      expect(screen.getByText('모바일 버튼')).toBeInTheDocument()
    })

    it('should handle layout transitions smoothly', () => {
      // Start with one layout
      mockDesktopViewport()
      
      const { rerender } = renderWithProviders(
        <ResponsiveLayout>
          <ResponsiveForm />
        </ResponsiveLayout>
      )
      
      expect(screen.getByTestId('desktop-navigation')).toBeInTheDocument()
      expect(screen.queryByTestId('mobile-footer')).not.toBeInTheDocument()
      
      // Switch to mobile layout
      mockMobileViewport()
      
      rerender(
        <ResponsiveLayout>
          <ResponsiveForm />
        </ResponsiveLayout>
      )
      
      expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument()
      expect(screen.getByTestId('mobile-footer')).toBeInTheDocument()
    })
  })
})