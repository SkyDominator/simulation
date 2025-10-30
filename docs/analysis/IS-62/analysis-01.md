# Journey Test Coverage Verification

## Question 1: Should Journey Tests Include Run Simulation & Results?

### Answer: **YES, Absolutely**

According to the analysis document (`docs/analysis/IS-62/IS-92/analysis-00.md`), the critical user journeys that MUST be covered by E2E tests are:

1. **Onboarding** ✅ Already covered
2. **Create Simulation** ⚠️ Partially covered (navigation only, full 5-step flow not implemented)
3. **Run Simulation, View Results, and Allowance Table** ⚠️ Partially covered (via `e2e/specs/results-display.spec.ts`, though on legacy helpers; allowance table button exists but the navigation to it is not verified)
4. **Multi-Select Comprehensive Results** ❌ NOT covered (SummaryReport component exists but no E2E test)
5. **Mobile Landscape** ✅ Already covered (`e2e/specs/landscape-enforcer.spec.ts`)

## Migration Principle: Abandon Legacy Helpers

**CRITICAL**: All E2E tests MUST migrate to the new shared fixture architecture defined in `plan-00.md` (Phase 1–2). Legacy helpers (`TestHelpers`, `APIHelpers`, `auth-helpers.ts`) are deprecated and should be replaced with:

- **Fixtures**: `memberSession`, `adminSession`, `simulationSeed` from `e2e/fixtures/base.ts`
- **API Mocking**: `mockedApis` fixture providing typed payload factories
- **Journey Actions**: Functional helpers in `e2e/utils/journey-actions.ts`

Tests still using legacy helpers must be refactored to use the modern fixture-based approach for consistency, maintainability, and alignment with Playwright best practices.

### Recommended Journey Tests to Add

Based on the Test Pyramid principle (10% E2E, focusing on critical business flows), the smoke test suite should include:

#### **Journey 1: Complete Onboarding Flow** ✅ (migration verified)

**Status**: Already implemented using new fixture architecture  
**File**: `e2e/specs/onboarding.spec.ts`  
**Coverage**: Whitelist → OTP → Consent → Login → Dashboard

**Note**: This test already uses the modern `mockedApis` fixture and imports from `e2e/fixtures/base.ts`. No legacy helper migration needed.

#### **Journey 2: Create and Configure Simulation** 🔨 Needs Implementation

**Current Status**: `e2e/specs/simulation-flow.spec.ts` has only 2 basic navigation tests using the new fixture architecture. The full 5-step creation flow is **not yet implemented**.

**File**: `e2e/specs/simulation-flow.spec.ts` (expand existing)  
**Flow** (to be implemented):

```typescript
test("E2E-JOURNEY: creates a new simulation with investment plan", async ({
  memberSession,
  mockedApis,
}) => {
  const apis = mockedApis(memberSession);
  await apis.mockSimulationAPI();
  await apis.mockNoticesAPI();
  
  await memberSession.goto("/");
  await memberSession.getByTestId("create-simulation").click();
  
  // Step 1: Select plan type
  await selectPlan(memberSession, "A");
  await clickNext(memberSession);
  
  // Step 2: Starting company round
  await fillStartingRound(memberSession, 1);
  await clickNext(memberSession);
  
  // Step 3: Current company round
  await fillCurrentRound(memberSession, 1);
  await clickNext(memberSession);
  
  // Step 4: Investment amounts (3 rounds)
  await fillInvestmentAmount(memberSession, 1, "1000000");
  await fillInvestmentAmount(memberSession, 2, "2000000");
  await fillInvestmentAmount(memberSession, 3, "3000000");
  await clickNext(memberSession);
  
  // Step 5: Save simulation
  await memberSession.getByTestId("save-simulation").click();
  
  // Verify back on dashboard with new simulation
  await expect(memberSession.getByTestId("main-page")).toBeVisible();
  await expect(memberSession.locator("text=/플랜 A/i")).toBeVisible();
});
```

**Rationale**: This is the core business functionality - creating financial simulations. Must work end-to-end.


#### **Journey 3: Run Simulation, View Results, and Allowance Table** ⚠️ Covered (MUST migrate)

**Current State**: `e2e/specs/results-display.spec.ts` drives the run → results table journey but **uses deprecated legacy `TestHelpers` and `APIHelpers`**. The allowance table button exists in ResultsPage.tsx (button text "수당표 보기", navigates to 'allowance-table' page), so the feature is implemented.

**REQUIRED Migration**: Abandon legacy helpers and migrate to the shared fixture architecture (`simulationSeed`, `mockedApis`) per plan-00.md Phase 1–2. Add verification for allowance table navigation.

```typescript
test("E2E-JOURNEY: runs simulation, views results, and navigates to allowance table", async ({
  simulationSeed,
  mockedApis,
}) => {
  const apis = mockedApis(simulationSeed);
  await apis.mockSimulationAPI();
  await apis.mockNoticesAPI();

  await simulationSeed.goto("/");
  await simulationSeed.locator('[data-testid^="run-"]').first().click();

  await expect(
    simulationSeed.locator("text=/시뮬레이션.*결과/i")
  ).toBeVisible({ timeout: 10_000 });
  await expect(
    simulationSeed.locator("text=/누적 순이익|cumulative net income/i")
  ).toBeVisible();

  // Click the "수당표 보기" button (no testid, use text locator)
  await simulationSeed.getByRole("button", { name: /수당표 보기/i }).click();
  await expect(
    simulationSeed.locator("text=/수당.*내역|allowance/i")
  ).toBeVisible();
});
```

#### **Journey 4: Multi-Select Comprehensive Results** 🆕 New Test Required

**File**: `e2e/specs/comprehensive-results.spec.ts` (new file)

**Flow**:

```typescript
test("E2E-JOURNEY: multi-select and view comprehensive results", async ({
  simulationSeed,
  mockedApis,
}) => {
  const apis = mockedApis(simulationSeed);
  await apis.mockSimulationAPI();
  await apis.mockNoticesAPI();
  
  await simulationSeed.goto("/");
  
  // simulationSeed fixture should provide 2-3 pre-created simulations with different plan types
  
  // Select multiple simulations (one per plan type)
  // Note: Checkboxes don't have plan-specific testids. Use table row locators instead.
  const firstRow = simulationSeed.getByTestId("simulation-row-0");
  await firstRow.locator('input[type="checkbox"]').click();
  
  const secondRow = simulationSeed.getByTestId("simulation-row-1");
  await secondRow.locator('input[type="checkbox"]').click();
  
  // Verify validation: cannot select two simulations of same plan type
  // (Checkbox becomes disabled with tooltip, no error message shown)
  const thirdRow = simulationSeed.getByTestId("simulation-row-2");
  const thirdCheckbox = thirdRow.locator('input[type="checkbox"]');
  if (await thirdCheckbox.isVisible()) {
    // Check if it's disabled (same plan type as previously selected)
    const isDisabled = await thirdCheckbox.isDisabled();
    expect(isDisabled).toBe(true); // Should be disabled if same plan type
  }
  
  // Click "종합 결과" (Comprehensive Results) button (no testid, use text locator)
  await simulationSeed.getByRole("button", { name: /종합 결과/i }).click();
  
  // Verify comprehensive results modal/section displays (SummaryReport component)
  await expect(
    simulationSeed.locator("text=/종합 결과 보고서/i")
  ).toBeVisible();
  
  // Verify aggregated metrics are shown (총 필요 준비금)
  await expect(
    simulationSeed.locator("text=/총 필요 준비금/i")
  ).toBeVisible();
  
  // Verify multiple plan data is combined in report
  // The report displays plan sections with plan IDs
  await expect(
    simulationSeed.locator("text=/플랜 A/i")
  ).toBeVisible();
  await expect(
    simulationSeed.locator("text=/플랜 B/i")
  ).toBeVisible();
});
```

**Rationale**: Comprehensive results is a KEY feature per PRD Section "Get Comprehensive Simulation Results". Users need to compare multiple investment plans side-by-side to make informed decisions. This tests:

- Multi-select UI (checkboxes)
- Validation (one per plan type)
- Aggregated financial metrics
- Combined data display

#### **Journey 5: Mobile Landscape Enforcement** ✅ Covered

**Existing Coverage**: `e2e/specs/landscape-enforcer.spec.ts` already validates the portrait overlay, landscape dismissal, and E2E bypass logic that the PRD mandates for mobile devices. The test exercises both orientations and uses the `initE2EMode` helper.

```typescript
test("Skips overlay in E2E mode regardless of orientation", async ({ page }) => {
  await initE2EMode(page);
  await page.setViewportSize({ width: 393, height: 851 });
  await page.goto("/");

  await expect(page.getByText("가로 모드로 전환해주세요")).not.toBeVisible();

  const nameInput = page.getByLabel("이름");
  await expect(nameInput).toBeVisible();
  await nameInput.fill("Test User");
});
```

**Note**: This spec uses standard Playwright `test` import (not the new fixture architecture from Phase 1–2). This is acceptable since landscape enforcement is UI-only and doesn't require auth fixtures. No migration needed.

### Summary: Recommended Journey Test Suite (Total: 5 tests)

| Journey | Priority | Status | File | Migration Status |
|---------|----------|--------|------|------------------|
| 1. Onboarding | Critical | ✅ Complete | `onboarding.spec.ts` | ✅ Already using fixtures |
| 2. Create Simulation | Critical | 🔨 Implement | `simulation-flow.spec.ts` | ✅ Use fixtures (expand from 2 tests) |
| 3. Run Simulation + Results + Allowance Table | Critical | 🔨 Implement, ⚠️ Migrate | `results-display.spec.ts` | ⚠️ **MUST abandon legacy helpers** |
| 4. Comprehensive Results | Critical | 🆕 Add | `comprehensive-results.spec.ts` | ✅ Use fixtures (new file) |
| 5. Mobile Landscape | Medium | ✅ Complete | `landscape-enforcer.spec.ts` | N/A (UI-only, no auth needed) |

**Expected Runtime**: 5 tests × ~30 seconds = **2.5 minutes** (target: <5 min)

**Migration Priority**: Journey 3 (`results-display.spec.ts`) is the only remaining test using legacy helpers and MUST be migrated to the shared fixture architecture per plan-00.md.

### Risk Mitigation

1. **Journey Test Flakiness**
   - **Risk**: New tests may be flaky due to async operations
   - **Mitigation**: Use Playwright auto-waiting, explicit timeouts, retry configuration

2. **Mock Data Drift**
   - **Risk**: Backend API changes may break mock responses
   - **Mitigation**: Keep `test/shared/types.ts` in sync with backend DTOs

3. **Test Maintenance Burden**
   - **Risk**: More tests = more maintenance
   - **Mitigation**: Keep journey tests minimal (5 core tests), push everything else to unit/integration
