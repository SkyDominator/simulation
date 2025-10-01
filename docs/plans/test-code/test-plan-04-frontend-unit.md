# Test Plan – Frontend Unit Tests (Concrete v1.0)

This covers unit-level tests for frontend components, context providers, and utility functions. Tests focus on isolated component behavior with mocked dependencies.

Target: Unit tests in `src/frontend/src/test/` with focus on smoke tests, context providers, and page components.

--------------------------------------------------------------------------------
## 1. Scope & Principles
--------------------------------------------------------------------------------

**In Scope:**
* Basic React component rendering
* Material-UI component integration
* Test infrastructure verification
* Authentication context state management
* Component prop handling and state updates

**Out of Scope:**
* API integration (covered in integration tests)
* Complete user flows (covered in integration tests)
* Browser-specific behavior (covered in E2E tests)
* Performance testing

**Test Philosophy:**
* Pure unit tests with minimal external dependencies
* Mock all external services (API, Supabase)
* Test component behavior in isolation
* Verify proper prop and state handling
* Ensure proper error boundaries

--------------------------------------------------------------------------------
## 2. Test Category Matrix
--------------------------------------------------------------------------------

### 2.1 Smoke Tests (CAT-SMOKE)

**Why**: Verify basic test infrastructure works correctly  
**Location**: `src/test/smoke.test.tsx`  
**Cases**:

* SMOKE-001: Should render React components correctly
* SMOKE-002: Should support Material-UI components
* SMOKE-003: Should render with theme provider
* SMOKE-004: Should render with auth provider
* SMOKE-005: Should support basic user interactions
* SMOKE-006: Should have proper test globals available
* SMOKE-007: Should support vitest matchers
* SMOKE-008: Should support jest-dom matchers

### 2.2 Authentication Context (CAT-AUTH-CTX)

**Why**: Core authentication state management  
**Location**: `src/test/context/AuthContext.test.tsx`  
**Cases**:

* AUTH-CTX-001: Should provide user information when authenticated
* AUTH-CTX-002: Should handle user sign out
* AUTH-CTX-003: Should show not logged in state when user is null
* AUTH-CTX-004: Should handle loading state
* AUTH-CTX-005: Should provide authentication state correctly
* AUTH-CTX-006: Should handle authentication state changes
* AUTH-CTX-007: Should provide consistent user data structure

### 2.3 Page Component Tests (CAT-PAGE)

**Why**: Validate page-level component behavior  
**Location**: `src/test/pages/MainPage.improved.test.tsx`  
**Cases**:

* PAGE-001: Should render basic MainPage structure
* PAGE-002: Should display simulation table when data is available
* PAGE-003: Should handle API error without crashing
* PAGE-004: Should retry API calls with different tokens
* PAGE-005: Should run simulation with real API service
* PAGE-006: Should delete simulation with confirmation
* PAGE-007: Should update memo using real API
* PAGE-008: Should handle network timeout gracefully

### 2.4 Real Component Tests (CAT-COMP)

**Why**: Test actual components instead of test-only mocks  
**Location**: `src/test/components/RealComponentTests.test.tsx`  
**Cases**:

* COMP-001: Should handle empty simulation list correctly
* COMP-002: Should display real simulation data
* COMP-003: Should handle API errors gracefully in real component
* COMP-004: Should support user interactions with controlled mocks
* COMP-005: Should maintain component state across updates

--------------------------------------------------------------------------------
## 3. Fixtures & Infrastructure
--------------------------------------------------------------------------------

### 3.1 Test Render Utilities

```typescript
// renderWithProviders utility
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: {
    withAuth?: boolean
    withTheme?: boolean
    mockUser?: any
    mockSession?: any
  }
) => {
  return render(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider theme={theme}>
        <MockAuthProvider 
          mockUser={options?.mockUser} 
          mockSession={options?.mockSession}
        >
          {children}
        </MockAuthProvider>
      </ThemeProvider>
    )
  })
}
```

### 3.2 Mock API Service

```typescript
export const createMockApiService = (): ApiServiceInterface => ({
  deleteSimulation: vi.fn(),
  runSimulation: vi.fn(),
  getSimulations: vi.fn().mockResolvedValue([]),
  getSimulationDetails: vi.fn(),
  createSimulation: vi.fn(),
  updateSimulation: vi.fn(),
  updateSimulationMemo: vi.fn(),
  // ... other methods
})

export const createFailingApiService = (errorMessage: string) => {
  const service = createMockApiService()
  vi.mocked(service.getSimulations).mockRejectedValue(
    new Error(errorMessage)
  )
  return service
}
```

### 3.3 Mock Authentication Context

```typescript
const MockAuthProvider = ({
  children,
  mockUser = null,
  mockSession = null
}: any) => {
  const [user, setUser] = useState(mockUser)
  const [session, setSession] = useState(mockSession)

  const signOut = vi.fn().mockImplementation(() => {
    setUser(null)
    setSession(null)
  })

  return (
    <MockAuthContext.Provider value={{ user, session, signOut }}>
      {children}
    </MockAuthContext.Provider>
  )
}
```

--------------------------------------------------------------------------------
## 4. Representative Test Snippets
--------------------------------------------------------------------------------

### 4.1 SMOKE-001: Basic React Rendering

```typescript
it('should render React components correctly', () => {
  renderWithProviders(<BasicComponent />)
  
  expect(screen.getByText('Test Application')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Test Button' })).toBeInTheDocument()
  expect(screen.getByLabelText('Test Input')).toBeInTheDocument()
  expect(screen.getByText('Test Alert')).toBeInTheDocument()
})
```

### 4.2 AUTH-CTX-001: User Authentication State

```typescript
it('should provide user information when authenticated', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' }
  
  renderWithProviders(<TestComponent />, {
    withAuth: true,
    mockUser
  })
  
  expect(screen.getByTestId('user-display')).toHaveTextContent('user-123')
  expect(screen.getByText('Logged In')).toBeInTheDocument()
})
```

### 4.3 PAGE-001: MainPage Structure

```typescript
it('should render basic MainPage structure', async () => {
  const mockApiService = createMockApiService()
  vi.mocked(mockApiService.getSimulations).mockResolvedValue([])
  
  renderWithProviders(
    <MainPage {...defaultProps} apiService={mockApiService} />
  )
  
  await waitFor(() => {
    expect(screen.getByText(/내 시뮬레이션/i)).toBeInTheDocument()
  })

  expect(mockApiService.getSimulations).toHaveBeenCalledWith('mock-access-token')
})
```

### 4.4 COMP-002: Display Real Simulation Data

```typescript
it('should display real simulation data', async () => {
  const testSimulations: Plan[] = [{
    simulation_id: 'sim-1',
    plan_id: 'A',
    memo: 'Real simulation test',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    starting_company_round: 1,
    current_company_round: 3,
    simulation_rounds: 12,
    investments: [{ round: 1, amount: 1000000 }],
    sales_achievement_rates: [],
    simulation_results: null
  }]

  const apiService = createApiServiceWithSimulations(testSimulations)
  
  renderWithProviders(
    <MainPage {...mockProps} apiService={apiService} />
  )
  
  await waitFor(() => {
    expect(screen.getByText(/플랜 타입/i)).toBeInTheDocument()
    expect(screen.getByText(/시작 회차/i)).toBeInTheDocument()
  })

  expect(apiService.getSimulations).toHaveBeenCalledTimes(1)
})
```

--------------------------------------------------------------------------------
## 5. Test Execution
--------------------------------------------------------------------------------

**Location**: `src/frontend/src/test/`

**Run Commands**:

```bash
# Run all unit tests (excluding integration, security, E2E)
cd src/frontend
npm run test -- src/test/smoke.test.tsx src/test/pages src/test/components src/test/context

# Run specific test file
npm run test -- src/test/smoke.test.tsx

# Run with coverage
npm run test -- --coverage src/test/
```

**VS Code Debug**: Use launch configuration "Unit Test: Frontend"

--------------------------------------------------------------------------------
## 6. Coverage Requirements
--------------------------------------------------------------------------------

* **Target Coverage**: ≥60% for frontend components
* **Critical Components**: ≥80% coverage for MainPage, AuthContext
* **Utility Functions**: ≥70% coverage

--------------------------------------------------------------------------------
## 7. Test Summary
--------------------------------------------------------------------------------

| Category | Test Cases | Priority | Dependencies |
|----------|-----------|----------|--------------|
| SMOKE | 8 | Critical | None |
| AUTH-CTX | 7 | High | MockAuthProvider |
| PAGE | 8 | High | MockApiService |
| COMP | 5 | Medium | RealComponents |

**Total: 28 test cases**

--------------------------------------------------------------------------------
## 8. Testing Principles
--------------------------------------------------------------------------------

1. **Isolation**: Test components in isolation with mocked dependencies
2. **Real Components**: Use actual components instead of test-only mocks
3. **Dependency Injection**: Pass API services as props for testability
4. **Async Handling**: Properly wait for async operations to complete
5. **Error Boundaries**: Verify components handle errors gracefully
6. **State Management**: Test state changes and prop updates
7. **Accessibility**: Ensure proper ARIA labels and roles

--------------------------------------------------------------------------------
## 9. Maintenance Notes
--------------------------------------------------------------------------------

* Update mocks when API interfaces change
* Keep test data realistic and representative
* Review and update test infrastructure quarterly
* Document any test-specific workarounds
* Maintain consistent test naming conventions (CAT-XXX-###)
