# Test Plan – Frontend Smoke Tests (Concrete v1.0)

This covers basic smoke tests for main React user flows and core business features. Uses Vitest + React Testing Library for component testing and basic user flow validation.

Target: Core user journeys in `src/frontend/src/pages/*` and critical components with focus on rendering and basic interactions.

--------------------------------------------------------------------------------
1. Scope & Principles
--------------------------------------------------------------------------------

**In Scope:**
* Component rendering without crashes
* Basic user interactions (form submissions, navigation)
* Core business feature smoke tests (simulation CRUD)
* Authentication state handling
* Critical error states and loading states
* Local storage persistence basics

**Out of Scope:**
* Detailed business logic (handled by backend)
* Complex user interactions (covered in E2E)
* Visual regression testing
* Performance testing
* Cross-browser compatibility (manual checklist)

**Test Philosophy:**
* Use Vitest + React Testing Library for fast component tests
* Mock external dependencies (Supabase, API calls)
* Focus on user-visible behavior, not implementation details
* Test components in isolation with mocked contexts

--------------------------------------------------------------------------------
2. Test Category Matrix
--------------------------------------------------------------------------------

2.1 Authentication Flow (CAT-AUTH)
* Why: Critical user onboarding and security boundary
* Targets: `WhitelistCheckPage`, `LoginPage`, `AuthContext`
* Cases:
  * AUTH-001: WhitelistCheckPage renders form correctly
  * AUTH-002: WhitelistCheckPage validates phone number format
  * AUTH-003: WhitelistCheckPage shows error for invalid users
  * AUTH-004: LoginPage renders OAuth providers
  * AUTH-005: LoginPage handles authentication success
  * AUTH-006: AuthContext provides user state correctly
  * AUTH-007: Protected routes redirect when not authenticated

2.2 Main Application Flow (CAT-MAIN)
* Why: Primary user interface and navigation
* Targets: `MainPage`, `AppController`, navigation state
* Cases:
  * MAIN-001: MainPage renders simulation list
  * MAIN-002: MainPage handles empty simulation state
  * MAIN-003: MainPage sorting functionality works
  * MAIN-004: AppController manages page navigation
  * MAIN-005: Notice modal opens and closes correctly
  * MAIN-006: Offline state handling works

2.3 Simulation Management (CAT-SIM)
* Why: Core business functionality
* Targets: `PlanEditor/*`, simulation components
* Cases:
  * SIM-001: PlanEditor renders plan selection form
  * SIM-002: PlanEditor validates investment amounts
  * SIM-003: PlanEditor saves draft to localStorage
  * SIM-004: ResultsPage displays simulation results
  * SIM-005: ResultsPage handles loading states
  * SIM-006: Simulation creation flow works end-to-end
  * SIM-007: Simulation update functionality works
  * SIM-008: Simulation deletion confirms and removes

2.4 Form Validation & Input Handling (CAT-FORMS)
* Why: Data integrity and user experience
* Targets: Form components across pages
* Cases:
  * FORM-001: Phone number input validates Korean format
  * FORM-002: Investment amount inputs validate numeric values
  * FORM-003: Required field validation shows appropriate errors
  * FORM-004: Form submission handles loading states
  * FORM-005: Form reset functionality works

2.5 Error Handling & Edge Cases (CAT-ERROR)
* Why: Graceful degradation and user guidance
* Targets: Error boundaries, error states
* Cases:
  * ERR-001: Network error displays user-friendly message
  * ERR-002: Invalid API responses handled gracefully
  * ERR-003: Component crash triggers error boundary
  * ERR-004: Retry mechanisms work for failed requests
  * ERR-005: Offline mode shows appropriate status

2.6 Responsive & Mobile Behavior (CAT-MOBILE)
* Why: Mobile-first PWA requirements
* Targets: Shell component, responsive layouts
* Cases:
  * MOB-001: Components render correctly on mobile viewport
  * MOB-002: Navigation adapts to mobile screen size
  * MOB-003: Forms remain usable on small screens
  * MOB-004: Touch interactions work properly

--------------------------------------------------------------------------------
3. Fixtures & Infrastructure
--------------------------------------------------------------------------------

3.1 Test Setup (vitest.config.ts)
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
```

3.2 Test Setup File (src/test/setup.ts)
```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock
```

3.3 Mock Supabase Client
```typescript
// src/test/mocks/supabase.ts
import { vi } from 'vitest'

export const mockSupabaseClient = {
  auth: {
    signInWithOAuth: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue({ data: [], error: null }),
}

vi.mock('../supabaseClient', () => ({
  supabase: mockSupabaseClient,
  default: mockSupabaseClient,
}))
```

3.4 Auth Context Mock
```typescript
// src/test/mocks/AuthContext.tsx
import React from 'react'
import { vi } from 'vitest'
import type { User } from '@supabase/supabase-js'

interface MockAuthContextType {
  user: User | null
  loading: boolean
  signIn: ReturnType<typeof vi.fn>
  signOut: ReturnType<typeof vi.fn>
}

export const mockAuthContext: MockAuthContextType = {
  user: null,
  loading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
}

export const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div data-testid="mock-auth-provider">{children}</div>
}
```

3.5 API Mocks
```typescript
// src/test/mocks/api.ts
import { vi } from 'vitest'

export const mockApiResponses = {
  simulations: {
    list: { data: [], success: true },
    create: { data: { id: '123', title: 'Test Simulation' }, success: true },
    run: { 
      data: { 
        history: [{ round: 1, investors: 1, revenue: 1000 }],
        summary: { total_rounds: 1 }
      }, 
      success: true 
    },
    delete: { success: true },
  },
  otp: {
    send: { success: true, message: 'OTP sent', user_hash: 'hash123' },
    verify: { success: true, message: 'Verified' },
  },
  notices: {
    list: { notices: [{ id: 1, title: 'Test Notice', content: 'Content' }], success: true },
  },
}

// Mock fetch globally
global.fetch = vi.fn()
```

--------------------------------------------------------------------------------
4. Representative Test Snippets
--------------------------------------------------------------------------------

4.1 Component Rendering Test
```typescript
// src/test/pages/WhitelistCheckPage.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import WhitelistCheckPage from '../../pages/WhitelistCheckPage'
import { MockAuthProvider } from '../mocks/AuthContext'

describe('WhitelistCheckPage', () => {
  it('should render form elements correctly', () => {
    render(
      <MockAuthProvider>
        <WhitelistCheckPage onWhitelistSuccess={() => {}} />
      </MockAuthProvider>
    )
    
    expect(screen.getByLabelText(/이름/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/전화번호/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /인증번호 받기/i })).toBeInTheDocument()
  })
})
```

4.2 User Interaction Test
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('WhitelistCheckPage interactions', () => {
  it('should validate phone number format', async () => {
    const user = userEvent.setup()
    const mockOnSuccess = vi.fn()
    
    render(
      <MockAuthProvider>
        <WhitelistCheckPage onWhitelistSuccess={mockOnSuccess} />
      </MockAuthProvider>
    )
    
    const phoneInput = screen.getByLabelText(/전화번호/i)
    await user.type(phoneInput, '123-456')
    
    const submitButton = screen.getByRole('button', { name: /인증번호 받기/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/올바른 전화번호/i)).toBeInTheDocument()
    })
  })
})
```

4.3 API Integration Test
```typescript
import { vi } from 'vitest'
import { mockApiResponses } from '../mocks/api'

describe('Simulation creation flow', () => {
  it('should create simulation and navigate to results', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponses.simulations.create
    } as Response)
    
    const user = userEvent.setup()
    
    render(
      <MockAuthProvider>
        <PlanEditorPage />
      </MockAuthProvider>
    )
    
    // Fill form and submit
    await user.selectOptions(screen.getByLabelText(/플랜 선택/i), 'A')
    await user.type(screen.getByLabelText(/1라운드 투자금/i), '1000000')
    await user.click(screen.getByRole('button', { name: /시뮬레이션 실행/i }))
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/simulation/create'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('plan_id')
        })
      )
    })
  })
})
```

4.4 Error Handling Test
```typescript
describe('Error handling', () => {
  it('should display error when API fails', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    
    const user = userEvent.setup()
    
    render(
      <MockAuthProvider>
        <MainPage />
      </MockAuthProvider>
    )
    
    await waitFor(() => {
      expect(screen.getByText(/오류가 발생했습니다/i)).toBeInTheDocument()
    })
  })
})
```

4.5 Responsive Test
```typescript
describe('Responsive behavior', () => {
  it('should adapt navigation for mobile viewport', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })
    
    render(
      <MockAuthProvider>
        <Shell>
          <MainPage />
        </Shell>
      </MockAuthProvider>
    )
    
    expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument()
    expect(screen.queryByTestId('desktop-navigation')).not.toBeInTheDocument()
  })
})
```

--------------------------------------------------------------------------------
5. Test Structure & Organization
--------------------------------------------------------------------------------

File organization:
```
src/frontend/src/test/
├── setup.ts                         # Test setup and global mocks
├── smoke.test.tsx                   # Basic smoke tests
├── mocks/
│   ├── supabase.ts                  # Supabase client mock
│   ├── AuthContext.tsx              # Auth context mock  
│   ├── api.ts                       # API response mocks
│   └── localStorage.ts              # LocalStorage utilities
├── utils/
│   ├── renderWithProviders.tsx      # Test rendering utilities
│   └── testUtils.ts                 # Common test helpers
├── components/
│   ├── Shell.test.tsx               # Shell component tests
│   ├── ErrorHandling.test.tsx       # Error handling components
│   ├── FormValidation.test.tsx      # Form validation tests
│   ├── ResponsiveBehavior.test.tsx  # Responsive behavior tests
│   └── SimulationManagement.test.tsx # Simulation management UI
├── pages/
│   ├── WhitelistCheckPage.test.tsx  # Whitelist check page
│   ├── LoginPage.test.tsx           # OAuth login page
│   ├── MainPage.test.tsx            # Main application page
│   ├── OtpVerificationPage.test.tsx # OTP verification page
│   └── ResultsPage.test.tsx         # Results display (if exists)
└── context/
    └── AuthContext.test.tsx         # Authentication context tests
```

Test naming convention: `ComponentName.test.tsx`
Test descriptions: `should [expected behavior] when [condition]`

--------------------------------------------------------------------------------
6. Dependencies & Setup
--------------------------------------------------------------------------------

**Required Dependencies:**
```json
{
  "devDependencies": {
    "vitest": "^3.2.4",
    "@testing-library/react": "^16.3.0",
    "@testing-library/jest-dom": "^6.8.0",
    "@testing-library/user-event": "^14.6.1",
    "jsdom": "^27.0.0",
    "@vitest/coverage-v8": "^3.2.4",
    "@vitest/ui": "^3.2.4"
  }
}
```

**Package.json Scripts:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:run": "vitest run"
  }
}
```

--------------------------------------------------------------------------------
7. Coverage Targets & Exit Criteria
--------------------------------------------------------------------------------

**Success Criteria:**
* All critical user flows render without crashing
* Form validation works for key inputs
* Authentication state changes properly handled
* API integration points properly mocked and tested
* Error states display user-friendly messages
* Mobile responsiveness verified in key components
* Tests complete in under 20 seconds

**Coverage Goals:**
* 70%+ line coverage for pages and critical components
* 100% of user-facing flows covered
* All error boundaries tested

**Quality Gates:**
* No console errors during test runs
* All async operations properly awaited
* No memory leaks in component mounting/unmounting

--------------------------------------------------------------------------------
8. Integration with Manual Testing
--------------------------------------------------------------------------------

These smoke tests complement the manual testing checklist by:

**Automated Coverage:**
* Component rendering and basic interactions
* Form validation and error states
* Authentication flow basics
* API response handling

**Manual Testing Focus:**
* Cross-browser compatibility
* PWA installation and behavior
* Performance on real devices
* Complex user interactions
* Visual design consistency

--------------------------------------------------------------------------------
9. Implementation Checklist
--------------------------------------------------------------------------------

| Category | Cases Count | Priority | Dependencies |
|----------|-------------|----------|--------------|
| AUTH | 7 | High | Supabase mocks, AuthContext |
| MAIN | 6 | High | Navigation, API mocks |
| SIM | 8 | High | Form mocks, API integration |
| FORMS | 5 | Medium | Validation utilities |
| ERROR | 5 | Medium | Error boundary mocks |
| MOBILE | 4 | Low | Viewport mocking |

**Total: 35 test cases**

--------------------------------------------------------------------------------
10. Current Implementation Status
--------------------------------------------------------------------------------

**✅ IMPLEMENTED:**
- Vitest configuration and test environment setup
- Basic smoke tests infrastructure
- Test utilities and provider mocking
- Page tests: WhitelistCheckPage, LoginPage, MainPage, OtpVerificationPage
- Component tests: Shell, ErrorHandling, FormValidation, ResponsiveBehavior, SimulationManagement
- Context tests: AuthContext
- Mock infrastructure: Supabase, API responses, LocalStorage

**❌ NOT YET IMPLEMENTED:**
- Hook tests: useMainPageState, useConsentFlow, useSimulationActions
- ResultsPage tests (if ResultsPage component exists)
- Additional form component tests
- Mobile responsiveness tests (partially covered in ResponsiveBehavior)
- Complete API integration test coverage

**⚠️ GAPS IDENTIFIED:**
- Test coverage for hooks directory components
- PlanEditor page tests (component exists but no tests)
- Some test cases in plan may not align with actual component APIs

**Next Steps After Plan Approval:**
1. ✅ ~~Set up Vitest configuration and test environment~~ **DONE**
2. ✅ ~~Create mock infrastructure~~ **DONE**  
3. ✅ ~~Implement authentication flow tests~~ **DONE**
4. ✅ ~~Add main application and navigation tests~~ **DONE**
5. ✅ ~~Create simulation management tests~~ **DONE**
6. ✅ ~~Add form validation and error handling tests~~ **DONE**
7. 🔄 Implement responsive behavior tests **PARTIALLY DONE**
8. ❌ Add missing hook tests
9. ❌ Create PlanEditor page tests
10. ❌ Integrate with CI/CD pipeline
11. ❌ Generate coverage reports and optimize

--------------------------------------------------------------------------------
11. Risks & Mitigations
--------------------------------------------------------------------------------

| Risk | Mitigation |
|------|------------|
| Mock drift from real API | Regular integration test runs |
| Async timing issues | Proper use of waitFor and findBy queries |
| Test environment differences | Standardize jsdom configuration |
| Component isolation issues | Use proper provider mocking |
| Flaky tests due to animations | Mock animation libraries |

End of Plan.