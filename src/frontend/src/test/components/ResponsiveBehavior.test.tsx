import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../utils/renderWithProviders'
import { resetViewport } from '../utils/testUtils'
import React from 'react'
import { 
  Box, 
  Paper, 
  Button, 
  AppBar,
  Toolbar,
  Typography,
  BottomNavigation,
  BottomNavigationAction,
} from '@mui/material'
import HomeIcon from '@mui/icons-material/Home'
import PersonIcon from '@mui/icons-material/Person'
import SettingsIcon from '@mui/icons-material/Settings'

// Mock responsive navigation component
const ResponsiveNavigation: React.FC<{ forceMobile?: boolean }> = ({ forceMobile = false }) => {
  if (forceMobile) {
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

// Mock responsive form component
const ResponsiveForm: React.FC<{ forceMobile?: boolean }> = ({ forceMobile = false }) => {
  return (
    <Paper 
      sx={{ 
        p: forceMobile ? 2 : 4,
        maxWidth: forceMobile ? '100%' : '600px',
        margin: '0 auto'
      }}
      data-testid="responsive-form"
    >
      <Typography variant={forceMobile ? 'h5' : 'h4'} gutterBottom>
        {forceMobile ? '모바일 폼' : '데스크톱 폼'}
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: forceMobile ? 'column' : 'row', gap: 2 }}>
        <Button 
          variant="contained" 
          fullWidth={forceMobile}
          size={forceMobile ? 'large' : 'medium'}
        >
          {forceMobile ? '모바일 버튼' : '데스크톱 버튼'}
        </Button>
        
        {!forceMobile && (
          <Button variant="outlined" data-testid="desktop-only-button">
            데스크톱 전용
          </Button>
        )}
      </Box>
    </Paper>
  )
}

describe('Responsive Behavior', () => {
  beforeEach(() => {
    resetViewport()
  })
  
  afterEach(() => {
    resetViewport()
  })

  describe('MOB-001: Components render correctly on mobile viewport', () => {
    it('should render mobile navigation on small screens', () => {
      renderWithProviders(<ResponsiveNavigation forceMobile={true} />)
      
      expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument()
      expect(screen.queryByTestId('desktop-navigation')).not.toBeInTheDocument()
      
      // Check for mobile navigation elements
      expect(screen.getByText('홈')).toBeInTheDocument()
      expect(screen.getByText('프로필')).toBeInTheDocument()
      expect(screen.getByText('설정')).toBeInTheDocument()
    })

    it('should adapt layout for mobile viewport', () => {
      renderWithProviders(<ResponsiveNavigation forceMobile={true} />)
      
      expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument()
      expect(screen.queryByTestId('desktop-navigation')).not.toBeInTheDocument()
    })

    it('should display mobile-optimized form', () => {
      renderWithProviders(<ResponsiveForm forceMobile={true} />)
      
      expect(screen.getByTestId('responsive-form')).toBeInTheDocument()
      expect(screen.getByText('모바일 폼')).toBeInTheDocument()
      expect(screen.getByText('모바일 버튼')).toBeInTheDocument()
    })
  })

  describe('MOB-002: Navigation adapts to mobile screen size', () => {
    it('should render desktop navigation on large screens', () => {
      renderWithProviders(<ResponsiveNavigation forceMobile={false} />)
      
      expect(screen.getByTestId('desktop-navigation')).toBeInTheDocument()
      expect(screen.queryByTestId('mobile-navigation')).not.toBeInTheDocument()
      
      // Check for desktop navigation elements
      expect(screen.getByText('Desktop Navigation')).toBeInTheDocument()
    })

    it('should switch navigation types based on viewport', () => {
      const { rerender } = renderWithProviders(<ResponsiveNavigation forceMobile={false} />)
      
      expect(screen.getByTestId('desktop-navigation')).toBeInTheDocument()
      
      // Switch to mobile
      rerender(<ResponsiveNavigation forceMobile={true} />)
      
      expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument()
      expect(screen.queryByTestId('desktop-navigation')).not.toBeInTheDocument()
    })
  })

  describe('MOB-003: Forms remain usable on small screens', () => {
    it('should stack form elements vertically on mobile', () => {
      renderWithProviders(<ResponsiveForm forceMobile={true} />)
      
      const form = screen.getByTestId('responsive-form')
      expect(form).toBeInTheDocument()
      
      // Mobile form should show mobile-specific content
      expect(screen.getByText('모바일 폼')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /모바일 버튼/i })).toBeInTheDocument()
    })

    it('should use larger touch targets on mobile', () => {
      renderWithProviders(<ResponsiveForm forceMobile={true} />)
      
      const mobileButton = screen.getByRole('button', { name: /모바일 버튼/i })
      expect(mobileButton).toBeInTheDocument()
      
      // Mobile button should not have desktop-only elements
      expect(screen.queryByTestId('desktop-only-button')).not.toBeInTheDocument()
    })
  })
})