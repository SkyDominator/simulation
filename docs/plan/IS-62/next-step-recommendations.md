# IS-62 Test Infrastructure: Next Step Recommendations

**Date**: 2025-10-30  
**Status**: Post Phase 0-4 Implementation  
**Branch**: IS-62  
**Author**: GitHub Copilot

---

## Executive Summary

Phases 0-4 of the test infrastructure modernization (IS-62) have been successfully completed. The fixture architecture, helper consolidation, and configuration updates are in place. This document addresses critical questions about the next steps and provides actionable recommendations for completing the journey test suite and leveraging the new infrastructure across all test layers.

**⚠️ CORRECTION NOTICE**: This document was updated after consulting PRD, SSD, and tech-details to add:
1. **Allowance Table View** navigation test (dedicated view from Results Page per PRD Section 6)
2. **Comprehensive Results Page** journey (multi-select aggregated metrics per PRD Section "Get Comprehensive Simulation Results")
3. **PWA caching strategy** specifics (NetworkFirst for /api/notices, simulation_results jsonb persistence per SSD/tech-details)

---

## Current Implementation Status

### ✅ Completed (Phases 0-4)

1. **Phase 0: Baseline & Safety Net**
   - Documented baseline helper signatures in `docs/plan/IS-62/appendix.md`
   - Established metrics baseline: ~150 E2E tests, 15-20 min runtime

2. **Phase 1: Playwright Fixture Architecture**
   - ✅ `e2e/fixtures/base.ts` - Composed fixture module
   - ✅ `e2e/fixtures/authenticated.ts` - `memberSession` fixture
   - ✅ `e2e/fixtures/admin-user.ts` - `adminSession` fixture
   - ✅ `e2e/fixtures/with-simulation.ts` - `simulationSeed` fixture
   - ✅ `e2e/fixtures/mocked-apis.ts` - `mockedApis` fixture with instrumentation
   - ✅ `e2e/fixtures/test-data.ts` - Test constants (TEST_USERS, TEST_SIMULATIONS, etc.)

3. **Phase 2: Helper & Mock Consolidation**
   - ✅ `test/shared/fixtures.ts` - Shared payload factories (453 lines)
   - ✅ `test/shared/types.ts` - Shared DTO types
   - ✅ `e2e/utils/apiMocks/playwright.ts` - Playwright API mocking using shared factories
   - ✅ `e2e/utils/journey-actions.ts` - Functional helpers (`fillWhitelistForm`, `fillOTPForm`, etc.)
   - ✅ Preserved backward compatibility with `TestHelpers` class

4. **Phase 3: Playwright Configuration**
   - ✅ Updated configuration with appropriate worker settings
   - ✅ Configured failure artifact capture

5. **Phase 4: Observability & Tooling**
   - ✅ Added `test:e2e:journeys` script to `package.json`
   - ✅ Instrumented `mockedApis` with console timing marks for debugging

### 🚧 In Progress: Journey Test Suite

**Current Coverage**: 2 journey tests (smoke tests)

1. **Onboarding Journey** (`e2e/specs/onboarding.spec.ts`)
   - ✅ Whitelist → OTP → Consent → Login → Dashboard
   - Status: Complete

2. **Simulation Dashboard** (`e2e/specs/simulation-flow.spec.ts`)
   - ✅ Shows dashboard
   - ✅ Navigate to plan editor (partial)
   - Status: Incomplete - needs full simulation lifecycle

---


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

## Recommended Next Steps

### Immediate Actions (Next 1-2 Weeks)

1. **Complete Journey Test Suite** (Priority: Critical)
   - [ ] Expand "Create Simulation" journey (full editor flow)
   - [ ] Add "Run Simulation and View Results" journey
   - [ ] Add "Offline Results Persistence" journey
   - [ ] Add "Mobile Landscape Enforcement" journey
   - **Expected Effort**: 8-12 hours
   - **Outcome**: 5-6 complete journey tests, <3 min runtime

2. **Create Vitest Mock Adapter** (Priority: High)
   - [ ] Create `test/shared/apiMocks/vitest.ts` with MSW handlers
   - [ ] Update `vitest.setup.ts` to use shared handlers
   - **Expected Effort**: 2-4 hours
   - **Outcome**: Shared infrastructure ready for unit/integration tests

3. **Pilot Migration: One Integration Test File** (Priority: Medium)
   - [ ] Choose one integration test file (e.g., `UserFlowIntegration.test.tsx`)
   - [ ] Refactor to use shared fixtures
   - [ ] Measure LOC reduction and developer experience improvement
   - **Expected Effort**: 2-3 hours
   - **Outcome**: Proof of concept, template for other migrations

### Medium-Term Actions (Next 1-2 Months)

4. **Migrate All Integration Tests** (Priority: Medium)
   - [ ] Update all 12 integration test files to use shared fixtures
   - [ ] Eliminate `test/utils/mockApiService.ts` duplication
   - **Expected Effort**: 12-16 hours
   - **Outcome**: Unified test data layer across all test types

5. **Document Test Writing Guidelines** (Priority: Medium)
   - [ ] Create `docs/code-review/test-writing-guidelines.md`
   - [ ] Include examples of using shared fixtures
   - [ ] Document when to use E2E vs integration vs unit tests
   - **Expected Effort**: 3-4 hours
   - **Outcome**: Clear onboarding for future contributors

6. **Add ESLint Rules** (Priority: Low)
   - [ ] Add `no-restricted-imports` rule to prevent direct Supabase usage in tests
   - [ ] Add rule to require shared fixtures for API mocks
   - **Expected Effort**: 1-2 hours
   - **Outcome**: Automated enforcement of test patterns

### Long-Term Actions (Next 2-3 Months)

7. **Test Pyramid Reshaping** (Priority: High - Separate Epic)
   - [ ] Audit all ~150 existing E2E tests
   - [ ] Migrate ~120 tests down to unit/integration level
   - [ ] Keep only ~30 critical journey tests at E2E level
   - **Expected Effort**: 40-60 hours
   - **Outcome**: Proper test pyramid (70% unit, 20% integration, 10% E2E)
   - **Reference**: See `docs/analysis/IS-62/IS-92/analysis-00.md` Section "Recommended Approach"

---

## Constraints & Considerations

### Given Your Application Context

1. **Solo Developer**
   - **Implication**: Prioritize high-ROI work (journey tests > full pyramid reshaping)
   - **Recommendation**: Complete journey tests first, defer full migration to Phase 2

2. **Small User Base (60-100 users)**
   - **Implication**: Don't need extensive cross-browser testing
   - **Recommendation**: Keep 2 Playwright projects (Mobile Chrome + Desktop Chrome)

3. **PWA with Offline Capability**
   - **Implication**: Offline functionality is critical
   - **Recommendation**: Offline results test is MANDATORY

4. **Mobile-First Korean Audience**
   - **Implication**: Landscape enforcer is important for UX
   - **Recommendation**: Include landscape enforcement in journey tests

5. **Windows CI with PowerShell**
   - **Implication**: Commands must be PowerShell-compatible
   - **Recommendation**: Test npm scripts work correctly on Windows before CI rollout

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

## Success Metrics

### After Completing Journey Tests (Immediate)

- ✅ 5-6 journey tests covering all critical user paths
- ✅ E2E test suite runtime: <3 minutes (down from 15-20 min)
- ✅ High confidence in production deployments (critical flows always tested)

### After Migrating Unit/Integration Tests (Medium-Term)

- ✅ Zero duplication of mock data across test layers
- ✅ 100% of unit/integration tests use shared fixtures
- ✅ ~200-300 lines of test code removed (reduced maintenance)
- ✅ Faster test writing (developers import factories, not create mocks)

### After Full Pyramid Reshaping (Long-Term)

- ✅ Test distribution: 70% unit, 20% integration, 10% E2E
- ✅ Total test suite runtime: <5 minutes (unit+integration+E2E combined)
- ✅ ~390-420 total tests (up from current ~277)
- ✅ 90% faster CI feedback loop (16-21 min → <5 min)

---

## Conclusion

### Question 1: Should journey tests include run simulation, see results, offline results?

**Answer**: **YES**. These are critical business flows that MUST be tested end-to-end. Without them, your smoke test suite is incomplete.

**Action**: Add 3-4 more journey tests (create simulation, run simulation, offline results, landscape enforcement) to reach 5-6 total.

### Question 2: Does the test infra work for unit/integration tests?

**Answer**: **YES**, the infrastructure is fully compatible, but **NO**, unit/integration tests are not yet using it.

**Action**: Create Vitest mock adapter (`test/shared/apiMocks/vitest.ts`) and migrate one integration test file as a pilot. Then gradually migrate remaining tests.

### Recommended Priorities

1. **Critical (Now)**: Complete journey test suite (3-4 more tests)
2. **High (Next)**: Create Vitest adapter and pilot one integration test migration
3. **Medium (Soon)**: Migrate all integration tests to shared fixtures
4. **Long-Term (Later)**: Full test pyramid reshaping (separate epic)

### Next Steps

Start with **Journey Test Expansion**:
1. Write "Create and Configure Simulation" journey test
2. Write "Run Simulation and View Results" journey test
3. Write "Offline Results Persistence" journey test
4. Run `pnpm test:e2e:journeys` to verify all pass
5. Update CI to run journey tests as smoke tests before deployment

Once journey tests are stable, move to **Unit/Integration Migration**:
1. Create Vitest mock adapter
2. Migrate `UserFlowIntegration.test.tsx` as proof of concept
3. Document findings and iterate

This approach balances **immediate value** (complete smoke tests) with **long-term maintainability** (unified test infrastructure).
