# Frontend Test Issues - Concrete Examples

This document provides specific examples of the test issues found in the frontend codebase.

## Issue 1: Over-Mocking Prevents Real Implementation Testing

### Problem Example: MainPage.test.tsx

**Current Test (Problematic):**
```typescript
// Mock the entire API service
vi.mock('../../services/api', () => ({
  api: {
    getSimulations: vi.fn(),
    runSimulation: vi.fn(),
    deleteSimulation: vi.fn(),
    createSimulation: vi.fn(),
  }
}))

// Test that passes but doesn't validate real implementation
it('should display simulation table when data is available', async () => {
  mockApi.getSimulations.mockResolvedValue(mockSimulations)
  
  renderWithProviders(<MainPage {...defaultProps} />)
  
  await waitFor(() => {
    expect(screen.getByText(/플랜 타입/i)).toBeInTheDocument()
  })
})
```

**Issues:**
- Real `getSimulations()` error handling not tested
- Real response parsing not validated  
- Network timeouts and retries not tested
- Real API URL construction not validated

**Better Approach:**
```typescript
// Test with real API service but controlled responses
it('should handle API errors gracefully', async () => {
  // Use real API service with test server
  const testApi = new ApiService('http://localhost:8001/api')
  
  renderWithProviders(
    <MainPage {...defaultProps} apiService={testApi} />
  )
  
  // Test real error scenarios
  await waitFor(() => {
    expect(screen.getByText(/연결 오류/i)).toBeInTheDocument()
  })
})
```

## Issue 2: Fake Components Don't Test Real Implementation

### Problem Example: SimulationManagement.test.tsx

**Current Test (Problematic):**
```typescript
// Creates fake component in test file instead of testing real one
const SimulationCreateComponent: React.FC = () => {
  const [planId, setPlanId] = useState('')
  // ... fake implementation
  
  return (
    <div>
      {/* Simplified test markup that doesn't match real component */}
    </div>
  )
}

describe('Simulation Management', () => {
  it('should render plan selection dropdown', () => {
    renderWithProviders(<SimulationCreateComponent />)
    // Tests fake component, not real one
  })
})
```

**Issues:**
- Real PlanEditor component not tested
- Real validation logic not covered
- Real prop interfaces not validated
- Real user interactions not tested

**Better Approach:**
```typescript
import PlanEditor from '../../pages/PlanEditor/PlanEditor'

describe('PlanEditor Integration', () => {
  it('should validate plan selection with real component', () => {
    const mockOnSave = vi.fn()
    
    renderWithProviders(
      <PlanEditor onSave={mockOnSave} initialPlan={null} />
    )
    
    // Test real component behavior
    expect(screen.getByLabelText(/플랜 타입/)).toBeInTheDocument()
  })
})
```

## Issue 3: Auth Context Completely Mocked

### Problem Example: MockAuthProvider

**Current Test (Problematic):**
```typescript
// Completely replaces real auth implementation
export const mockAuthContext = {
  user: { id: 'test-user-id' } as User,
  session: { access_token: 'mock-token' } as Session,
  loading: false,
  signOut: vi.fn(),
}

// Mock overrides everything
vi.mock('../../context/useAuth', () => ({
  useAuth: () => mockAuthContext,
}))
```

**Issues:**
- Real Supabase integration not tested
- Real session management not validated
- Real token refresh not tested
- Real auth state changes not covered

**Better Approach:**
```typescript
// Test with real auth context and controlled Supabase client
const TestAuthProvider = ({ children, mockSupabase }) => {
  return (
    <AuthContextProvider supabaseClient={mockSupabase}>
      {children}  
    </AuthContextProvider>
  )
}

it('should handle auth state changes', async () => {
  const mockSupabase = createMockSupabaseClient()
  
  renderWithProviders(
    <TestAuthProvider mockSupabase={mockSupabase}>
      <MainPage />
    </TestAuthProvider>
  )
  
  // Trigger real auth state change
  mockSupabase.auth.setSession(testSession)
  
  await waitFor(() => {
    expect(screen.getByText(/내 시뮬레이션/)).toBeInTheDocument()
  })
})
```

## Issue 4: Missing Dependency Injection

### Current Problematic Pattern:

```typescript
// Component tightly coupled to API service
import { api } from "../services/api"

const MainPage = () => {
  const [plans, setPlans] = useState([])
  
  useEffect(() => {
    // Direct dependency - hard to test
    api.getSimulations(token).then(setPlans)
  }, [])
  
  return <div>{/* render */}</div>
}
```

**Problems:**
- Cannot inject test doubles
- Forces complete API mocking
- Cannot test with different API implementations
- Tight coupling prevents unit testing

### Recommended Pattern:

```typescript
interface MainPageProps {
  apiService?: ApiService
}

const MainPage = ({ apiService = api }: MainPageProps) => {
  const [plans, setPlans] = useState([])
  
  useEffect(() => {
    // Injected dependency - easily testable
    apiService.getSimulations(token).then(setPlans)
  }, [apiService])
  
  return <div>{/* render */}</div>
}

// Test with controlled API service
it('should handle API errors', async () => {
  const errorApi = {
    getSimulations: () => Promise.reject(new Error('Network error'))
  }
  
  renderWithProviders(<MainPage apiService={errorApi} />)
  
  await waitFor(() => {
    expect(screen.getByText(/오류가 발생했습니다/)).toBeInTheDocument()
  })
})
```

## Issue 5: E2E Tests Mock Backend Integration

### Problem Example: E2E API Mocking

**Current E2E Test (Problematic):**
```typescript
// E2E test mocks backend instead of testing integration
static async mockSimulationAPI(page: Page) {
  await page.route('**/api/simulation/create', async route => {
    await route.fulfill({
      status: 201,
      body: JSON.stringify({ success: true, id: 'sim-123' })
    })
  })
}

test('should create simulation', async ({ page }) => {
  await APIHelpers.mockSimulationAPI(page) // Mocks backend!
  
  await page.goto('/')
  // Test frontend only, not real integration
})
```

**Issues:**
- Backend integration not tested
- Real API contract not validated
- Network issues not detected
- CORS problems not caught

**Better Approach:**
```typescript
// E2E test with real backend integration
test('should create simulation with real backend', async ({ page }) => {
  // Use test backend environment
  await page.goto('http://localhost:3000')
  
  // Real authentication flow
  await completeRealAuthFlow(page)
  
  // Real simulation creation
  await page.click('[data-testid="create-simulation"]')
  await page.selectOption('[data-testid="plan-type"]', 'A')
  await page.click('[data-testid="submit"]')
  
  // Verify real backend response
  await expect(page.locator('[data-testid="simulation-created"]')).toBeVisible()
  
  // Verify data persisted in real database
  const response = await page.request.get('/api/simulations')
  expect(response.status()).toBe(200)
})
```

## Summary

The main issues are:

1. **Over-mocking** - Tests mock so much they don't validate real implementation
2. **Fake components** - Tests create simplified components instead of testing real ones  
3. **Missing DI** - Tight coupling prevents proper unit testing
4. **E2E mocking** - Even E2E tests mock backend integration
5. **No integration layer** - Gap between mocked units and full E2E tests

These issues mean tests may pass while real functionality is broken, providing false confidence in the codebase quality.