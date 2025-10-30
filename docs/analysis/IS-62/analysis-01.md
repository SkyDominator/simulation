# Journey Test Coverage Verification

## Question 1: Should Journey Tests Include Run Simulation & Results?

### Answer: **YES, Absolutely**

According to the analysis document (`docs/analysis/IS-62/IS-92/analysis-00.md`), the critical user journeys that MUST be covered by E2E tests are:

1. **Onboarding** ✅ Already covered
2. **Create Simulation** ⚠️ Partially covered (navigation only)
3. **Run Simulation** ✅ Already covered (via `e2e/specs/main-dashboard.spec.ts` & `e2e/specs/results-display.spec.ts`, though still on legacy helpers)
4. **View Results** ⚠️ Partially covered (results tables verified, but Allowance Table navigation missing)
5. **Multi-Select Comprehensive Results** ❌ NOT covered (aggregated metrics across plans)
6. PWA Install (lower priority for smoke)
7. Mobile Landscape ✅ Already covered (`e2e/specs/landscape-enforcer.spec.ts`)

### Recommended Journey Tests to Add

Based on the Test Pyramid principle (10% E2E, focusing on critical business flows), the smoke test suite should include:

#### **Journey 1: Complete Onboarding Flow** ✅

**Status**: Already implemented  
**Coverage**: Whitelist → OTP → Consent → Login → Dashboard

#### **Journey 2: Create and Configure Simulation** 🔨 Needs Expansion

**File**: `e2e/specs/simulation-flow.spec.ts` (expand existing)  
**Flow**:

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


#### **Journey 3: Run Simulation and View Results** ✅ Covered (migrate & extend)

**Existing Coverage**: `e2e/specs/results-display.spec.ts` drives the run → results table journey, and `e2e/specs/main-dashboard.spec.ts` verifies the run/results entry points. Both still rely on legacy `TestHelpers` instead of the new fixture stack from Phase 1–2, and neither asserts the Allowance Table navigation called out in the PRD (Section “Results Page”).

**Next Step**: Migrate the existing flow onto the shared fixtures (`simulationSeed`, `mockedApis`) and layer the missing Allowance Table assertion so the journey matches the PRD/SSD contract.


```typescript
test("E2E-JOURNEY: runs simulation and drills into allowance table", async ({
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

  await simulationSeed.getByTestId("view-allowance-table").click();
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
  
  // Create multiple simulations with different plan types
  // (In reality, simulationSeed fixture should provide 2-3 pre-created simulations)
  
  // Select multiple simulations (one per plan type)
  await simulationSeed.getByTestId("simulation-checkbox-plan-A").click();
  await simulationSeed.getByTestId("simulation-checkbox-plan-B").click();
  
  // Verify validation: cannot select two simulations of same plan type
  const secondPlanA = simulationSeed.getByTestId("simulation-checkbox-plan-A-2");
  if (await secondPlanA.isVisible()) {
    await secondPlanA.click();
    // Should show error message
    await expect(
      simulationSeed.locator("text=/플랜당 하나만/i")
    ).toBeVisible();
  }
  
  // Click "종합 결과" (Comprehensive Results) button
  await simulationSeed.getByTestId("view-comprehensive-results").click();
  
  // Verify comprehensive results page displays
  await expect(
    simulationSeed.locator("text=/종합.*결과/i")
  ).toBeVisible();
  
  // Verify aggregated metrics are shown
  await expect(
    simulationSeed.locator("text=/총.*투자금/i")
  ).toBeVisible();
  await expect(
    simulationSeed.locator("text=/총.*수익/i")
  ).toBeVisible();
  
  // Verify multiple plan data is combined
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

#### **Journey 5: Offline Results Persistence (PWA)** 🆕 New Test Required

**File**: `e2e/specs/pwa-offline.spec.ts` (new file)  
**Flow**:

```typescript
test("E2E-JOURNEY: simulation results persist offline", async ({
  simulationSeed,
  mockedApis,
}) => {
  const apis = mockedApis(simulationSeed);
  await apis.mockSimulationAPI();
  await apis.mockNoticesAPI();
  
  await simulationSeed.goto("/");
  
  // Run simulation to get results
  const runButton = simulationSeed.locator('[data-testid^="run-"]').first();
  await runButton.click();
  await expect(
    simulationSeed.locator("text=/시뮬레이션.*결과/i")
  ).toBeVisible({ timeout: 10000 });
  
  // Go offline
  await simulationSeed.context().setOffline(true);
  
  // Reload page (simulates app restart while offline)
  await simulationSeed.reload();
  
  // Verify results are still accessible from localStorage/IndexedDB
  await expect(
    simulationSeed.locator("text=/시뮬레이션.*결과/i")
  ).toBeVisible();
  await expect(
    simulationSeed.locator("text=/1,000,000|1000000/")
  ).toBeVisible();
  
  // Restore online
  await simulationSeed.context().setOffline(false);
});
```

**Rationale**: Your app is a PWA targeting Korean mobile users who may have intermittent connectivity. Offline capability is a critical feature that must work end-to-end.

**Note**: Per SSD/tech-details:

- Results are persisted in `simulation_results` jsonb field in database
- PWA uses **NetworkFirst** strategy for `/api/notices`
- **StaleWhileRevalidate** for images
- localStorage/sessionStorage for UI state only (not simulation data)

#### **Journey 6: Mobile Landscape Enforcement** ✅ Covered

**Existing Coverage**: `e2e/specs/landscape-enforcer.spec.ts` already validates the portrait overlay, landscape dismissal, and E2E bypass logic that the PRD mandates for mobile devices. The test exercises both orientations and uses the shared `initE2EMode` helper to mirror authenticated flows.

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

**Next Step**: Keep the spec aligned with the new fixture architecture when `test` re-exports are consolidated, but no additional coverage is required for the landscape enforcement behaviour itself.

### Summary: Recommended Journey Test Suite (Total: 6-7 tests)

| Journey | Priority | Status | File |
|---------|----------|--------|------|
| 1. Onboarding | Critical | ✅ Complete | `onboarding.spec.ts` |
| 2. Create Simulation | Critical | 🔨 Expand | `simulation-flow.spec.ts` |
| 3. Run Simulation + Allowance Table | Critical | ⚠️ Migrate & extend | `results-display.spec.ts` → fixtures |
| 4. Comprehensive Results | Critical | 🆕 Add | `comprehensive-results.spec.ts` |
| 5. Offline Results | High | 🆕 Add | `pwa-offline.spec.ts` |
| 6. Mobile Landscape | Medium | ✅ Complete | `landscape-enforcer.spec.ts` |
| 7. Admin Content (optional) | Low | ❌ Skip | Move to integration |

**Expected Runtime**: 6-7 tests × ~30 seconds = **3-3.5 minutes** (target: <5 min)

### Risk Mitigation

1. **Journey Test Flakiness**
   - **Risk**: New tests may be flaky due to async operations
   - **Mitigation**: Use Playwright auto-waiting, explicit timeouts, retry configuration

2. **Mock Data Drift**
   - **Risk**: Backend API changes may break mock responses
   - **Mitigation**: Keep `test/shared/types.ts` in sync with backend DTOs

3. **Test Maintenance Burden**
   - **Risk**: More tests = more maintenance
   - **Mitigation**: Keep journey tests minimal (6-7 only), push everything else to unit/integration
