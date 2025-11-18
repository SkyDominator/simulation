
## Question 2: Does Test Infra Work for Unit/Integration Tests?

### Answer: **YES, But Not Yet Adopted**

The test infrastructure is **fully compatible** with unit and integration tests, but current unit/integration tests **are not yet using it**.

### Infrastructure Readiness: ✅

1. **Shared Fixtures** (`test/shared/fixtures.ts`)
   - ✅ 453 lines of payload factory functions
   - ✅ Works with both Playwright and Vitest
   - ✅ Provides consistent mock data across all test layers

2. **Shared Types** (`test/shared/types.ts`)
   - ✅ TypeScript interfaces for all API responses
   - ✅ Can be imported by any test file

3. **Mock Adapters**
   - ✅ Playwright adapter: `e2e/utils/apiMocks/playwright.ts`
   - ⚠️ Vitest adapter: Not yet created (but easy to add)

### Current Unit/Integration Test Status: ❌ Not Using Shared Infrastructure

**Evidence**: Grep search for `from.*shared/(fixtures|types)` in `src/frontend/test/**/*.test.{ts,tsx}` returned **ZERO matches**.

**Current Approach**: Unit/integration tests maintain their own mock implementations:
- `src/test/utils/mockApiService.ts` - Separate mock factory
- `src/test/mocks/*` - Separate mock data
- **Problem**: Duplication! Mock data drifts between E2E and unit tests

### Recommended Migration Path

#### Step 1: Create Vitest API Mock Adapter

**File**: `src/frontend/test/shared/apiMocks/vitest.ts` (new file)

```typescript
/**
 * Vitest API mocking utilities
 * 
 * MSW (Mock Service Worker) handlers for intercepting API requests
 * in Vitest unit/integration tests. Uses shared fixture factories.
 */

import { http, HttpResponse } from 'msw';
import {
  createOTPSendSuccessResponse,
  createOTPVerifySuccessResponse,
  createSimulationRunResponse,
  createSimulationListResponse,
  // ... import all fixture factories
} from '../fixtures';

/**
 * OTP API handlers
 */
export const otpHandlers = [
  http.post('/api/otp/send', () => {
    return HttpResponse.json(createOTPSendSuccessResponse());
  }),
  
  http.post('/api/otp/verify', () => {
    return HttpResponse.json(createOTPVerifySuccessResponse());
  }),
];

/**
 * Simulation API handlers
 */
export const simulationHandlers = [
  http.post('/api/simulation/create', () => {
    return HttpResponse.json(createSimulationCreateResponse());
  }),
  
  http.post('/api/simulation/run', () => {
    return HttpResponse.json(createSimulationRunResponse());
  }),
  
  http.get('/api/simulations', () => {
    return HttpResponse.json(createSimulationListResponse());
  }),
];

/**
 * All default handlers
 */
export const handlers = [
  ...otpHandlers,
  ...simulationHandlers,
  // Add more handler groups as needed
];
```

#### Step 2: Update MSW Setup to Use Shared Handlers

**File**: `src/frontend/test/setup.ts` or `vitest.setup.ts`

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './shared/apiMocks/vitest';

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

#### Step 3: Migrate Existing Unit Tests to Use Shared Fixtures

**Example**: Update `src/test/integration/UserFlowIntegration.test.tsx`

**Before** (current approach):
```typescript
// Manual mock data creation (duplicated logic)
const mockSimulation: Plan = {
  simulation_id: "1",
  plan_id: "A",
  memo: "Test simulation",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  starting_company_round: 1,
  current_company_round: 1,
  simulation_rounds: 12,
  investments: [],
  sales_achievement_rates: [],
  simulation_results: null,
};
```

**After** (using shared fixtures):
```typescript
import { createSimulationData } from '../../shared/fixtures';

// Use shared factory with custom overrides
const mockSimulation = createSimulationData({
  simulation_id: "1",
  plan_id: "A",
  memo: "Test simulation",
  // All other fields use defaults from factory
});
```

**Benefits**:
- ✅ Consistency: E2E and unit tests use same data structures
- ✅ Maintainability: Change once, applies everywhere
- ✅ Type Safety: Shared types ensure correctness
- ✅ Reduced Duplication: ~50% less test code

#### Step 4: Update mockApiService to Use Shared Fixtures

**File**: `src/frontend/test/utils/mockApiService.ts`

**Before**:
```typescript
export const createMockApiService = (): ApiServiceInterface => ({
  runSimulation: vi.fn().mockResolvedValue({
    success: true,
    message: 'Simulation completed',
    data: {
      history: [{ company_round: 1, ... }], // Manual construction
      summary: { total_rounds: 1, ... }
    }
  }),
  // ...
});
```

**After**:
```typescript
import { createSimulationRunResponse } from '../shared/fixtures';

export const createMockApiService = (): ApiServiceInterface => ({
  runSimulation: vi.fn().mockResolvedValue(
    createSimulationRunResponse() // Uses shared factory
  ),
  // ...
});
```

### Integration Test Suitability Matrix

| Test Type | Can Use Shared Infra? | Recommended Approach |
|-----------|------------------------|----------------------|
| **Unit Tests** (components, utils) | ✅ Yes | Import `test/shared/fixtures` directly |
| **Integration Tests** (user flows) | ✅ Yes | Use MSW + shared handlers |
| **Security Tests** (XSS, auth) | ✅ Yes | Use shared auth token factories |
| **E2E Tests** (Playwright) | ✅ Yes | Already implemented via `mockedApis` fixture |

### Expected Benefits After Migration

1. **Consistency**: All test layers use identical mock data structures
2. **Maintainability**: Single source of truth for test data (453 lines in `fixtures.ts`)
3. **Type Safety**: Shared TypeScript types prevent drift
4. **Reduced Code**: Eliminate ~200-300 lines of duplicated mock setup
5. **Faster Onboarding**: New tests just import factories, no need to recreate mock structures

---

### Risk Mitigation

1. **Journey Test Flakiness**
   - **Risk**: New tests may be flaky due to async operations
   - **Mitigation**: Use Playwright auto-waiting, explicit timeouts, retry configuration

2. **Mock Data Drift**
   - **Risk**: Backend API changes may break mock responses
   - **Mitigation**: Keep `test/shared/types.ts` in sync with backend DTOs

3. **Test Maintenance Burden**
   - **Risk**: More tests = more maintenance
   - **Mitigation**: Keep journey tests minimal (5-6 only), push everything else to unit/integration

---
