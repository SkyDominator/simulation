# IS-62 Next Steps: Quick Summary

**Date**: 2025-10-30  
**Full Document**: `next-step-recommendations.md`

---

## Your Questions Answered

### Q1: Should journey tests include run simulation, see results, offline results?

**Answer: YES ✅**

Your current journey tests only cover:
- Onboarding (complete)
- Dashboard navigation (partial)

**You need to add**:
- Create simulation (full 5-step editor flow)
- Run simulation and view results (both Results Page + Allowance Table)
- Multi-select comprehensive results (aggregated metrics across plans)
- Offline results persistence (PWA with NetworkFirst for notices)
- Mobile landscape enforcement

**Target**: 6-7 journey tests total, <3 min runtime

---

### Q2: Does test infra work for unit/integration tests?

**Answer: YES, but not adopted yet ⚠️**

**Infrastructure ready**:
- ✅ `test/shared/fixtures.ts` (453 lines of reusable factories)
- ✅ `test/shared/types.ts` (TypeScript types)
- ✅ Can be used by Vitest tests

**Current state**:
- ❌ Unit/integration tests NOT using shared fixtures
- ❌ They maintain separate mock implementations
- ❌ Results in duplication and drift

**Solution**:
1. Create `test/shared/apiMocks/vitest.ts` (MSW handlers)
2. Migrate one integration test as pilot
3. Gradually migrate all tests to shared fixtures

---

## Recommended Priority Order

### 1. Complete Journey Tests (CRITICAL - Do Now)

Add these 3-4 journey tests to `e2e/specs/`:

**File**: `simulation-flow.spec.ts` (expand)
```text
✅ Shows dashboard (done)
✅ Navigate to editor (done)
🆕 Create simulation (full 5-step flow)
🆕 Run simulation and view results
🆕 Navigate to allowance table from results
```

**File**: `comprehensive-results.spec.ts` (new)
```text
🆕 Multi-select simulations (one per plan type)
🆕 View comprehensive results with aggregated metrics
```

**File**: `pwa-offline.spec.ts` (new)
```text
🆕 Offline results persistence (NetworkFirst for /api/notices)
🆕 Verify simulation_results from DB persists offline
```

**File**: `mobile-landscape.spec.ts` (new)
```text
🆕 Landscape enforcement test
```

**Effort**: 8-12 hours  
**Value**: High - ensures critical business flows work

---

### 2. Create Vitest Mock Adapter (HIGH - Next)

**File**: `test/shared/apiMocks/vitest.ts` (new)

```typescript
import { http, HttpResponse } from 'msw';
import { 
  createSimulationRunResponse,
  createSimulationListResponse 
} from '../fixtures';

export const simulationHandlers = [
  http.post('/api/simulation/run', () => {
    return HttpResponse.json(createSimulationRunResponse());
  }),
  // ... more handlers
];

export const handlers = [...simulationHandlers];
```

**Effort**: 2-4 hours  
**Value**: Medium - enables unit test migration

---

### 3. Pilot Integration Test Migration (MEDIUM - Soon)

Migrate `UserFlowIntegration.test.tsx` to use shared fixtures:

**Before**:
```typescript
const mockSimulation: Plan = {
  simulation_id: "1",
  plan_id: "A",
  // ... 20 lines of manual construction
};
```

**After**:
```typescript
import { createSimulationData } from '../../shared/fixtures';

const mockSimulation = createSimulationData({
  simulation_id: "1",
  plan_id: "A",
});
```

**Effort**: 2-3 hours  
**Value**: Medium - proof of concept

---

### 4. Full Test Migration (LONG-TERM - Later)

This is the big test pyramid reshaping:
- Migrate ~120 E2E tests down to unit/integration
- Keep only ~30 critical journey tests
- Add ~90 new unit tests

**Effort**: 40-60 hours  
**Value**: High - but can be deferred

**Reference**: See `analysis-00.md` for full plan

---

## What to Do Today

1. **Read** `next-step-recommendations.md` (detailed explanations)
2. **Decide** which journey tests to add first
3. **Write** 1-2 journey tests this week
4. **Run** `pnpm test:e2e:journeys` to verify
5. **Iterate** based on findings

---

## Key Takeaways

✅ **Infrastructure is ready** - Phases 0-4 complete  
✅ **Shared fixtures work** - Already used by E2E tests  
⚠️ **Journey tests incomplete** - Need 3-4 more critical paths  
⚠️ **Unit tests not migrated** - Still using old mock approach  

**Priority**: Complete journey tests first, migrate unit tests later.

**Expected outcome**: High confidence in production deployments through comprehensive smoke tests.
