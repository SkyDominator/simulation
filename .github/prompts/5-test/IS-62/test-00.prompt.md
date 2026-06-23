We did: #file:code.prompt.md 
I tested the results with: `npx playwright test --grep "E2E-JOURNEY"`

And got this:

```
[IS-62] C:\Users\raykim\Documents\workspace\MY_APP\simulation\src\frontend> npx playwright test --grep "E2E-JOURNEY"

Running 6 tests using 6 workers

  ✓  1 …m] › e2e\specs\simulation-flow.spec.ts:12:3 › Simulation management basics › E2E-JOURNEY: shows the simulation dashboard (8.1s)
  ✘  2 …e\specs\simulation-flow.spec.ts:29:3 › Simulation management basics › E2E-JOURNEY: allows navigating to the plan editor (30.5s)
  ✓  3 …ding.spec.ts:10:3 › User Onboarding Flow (Journey Tests) › E2E-JOURNEY: allows a whitelisted user to complete onboarding (5.0s)
  ✘  4 …e\specs\simulation-flow.spec.ts:29:3 › Simulation management basics › E2E-JOURNEY: allows navigating to the plan editor (30.4s)
  ✓  5 …ding.spec.ts:10:3 › User Onboarding Flow (Journey Tests) › E2E-JOURNEY: allows a whitelisted user to complete onboarding (5.4s)
  ✓  6 …m] › e2e\specs\simulation-flow.spec.ts:12:3 › Simulation management basics › E2E-JOURNEY: shows the simulation dashboard (7.9s)


  1) [mobile-chromium] › e2e\specs\simulation-flow.spec.ts:29:3 › Simulation management basics › E2E-JOURNEY: allows navigating to the plan editor

    Test timeout of 30000ms exceeded.

    Error: page.click: Target page, context or browser has been closed
    Call log:
      - waiting for locator('[role="button"][aria-haspopup="listbox"]')


       at utils\journey-actions.ts:40

      38 | export async function selectPlan(page: Page, planId: string): Promise<void> {
      39 |   // Look for Material-UI Select component
    > 40 |   await page.click('[role="button"][aria-haspopup="listbox"]');
         |              ^
      41 |   await page.click(`text="${planId}"`);
      42 | }
      43 |
        at selectPlan (C:\Users\raykim\Documents\workspace\MY_APP\simulation\src\frontend\e2e\utils\journey-actions.ts:40:14)     
        at C:\Users\raykim\Documents\workspace\MY_APP\simulation\src\frontend\e2e\specs\simulation-flow.spec.ts:44:11

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results\specs-simulation-flow-Simu-73b07-vigating-to-the-plan-editor-mobile-chromium\test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results\specs-simulation-flow-Simu-73b07-vigating-to-the-plan-editor-mobile-chromium\error-context.md

    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results\specs-simulation-flow-Simu-73b07-vigating-to-the-plan-editor-mobile-chromium\trace.zip
    Usage:

        npx playwright show-trace test-results\specs-simulation-flow-Simu-73b07-vigating-to-the-plan-editor-mobile-chromium\trace.zip  

    ────────────────────────────────────────────────────────────────────────────────────────────────

  2) [desktop-chromium] › e2e\specs\simulation-flow.spec.ts:29:3 › Simulation management basics › E2E-JOURNEY: allows navigating to the plan editor

    Test timeout of 30000ms exceeded.

    Error: page.click: Target page, context or browser has been closed
    Call log:
      - waiting for locator('[role="button"][aria-haspopup="listbox"]')


       at utils\journey-actions.ts:40

      38 | export async function selectPlan(page: Page, planId: string): Promise<void> {
      39 |   // Look for Material-UI Select component
    > 40 |   await page.click('[role="button"][aria-haspopup="listbox"]');
         |              ^
      41 |   await page.click(`text="${planId}"`);
      42 | }
      43 |
        at selectPlan (C:\Users\raykim\Documents\workspace\MY_APP\simulation\src\frontend\e2e\utils\journey-actions.ts:40:14)     
        at C:\Users\raykim\Documents\workspace\MY_APP\simulation\src\frontend\e2e\specs\simulation-flow.spec.ts:44:11

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results\specs-simulation-flow-Simu-73b07-vigating-to-the-plan-editor-desktop-chromium\test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results\specs-simulation-flow-Simu-73b07-vigating-to-the-plan-editor-desktop-chromium\error-context.md

    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results\specs-simulation-flow-Simu-73b07-vigating-to-the-plan-editor-desktop-chromium\trace.zip
    Usage:

        npx playwright show-trace test-results\specs-simulation-flow-Simu-73b07-vigating-to-the-plan-editor-desktop-chromium\trace.zip 

    ────────────────────────────────────────────────────────────────────────────────────────────────

  2 failed
    [mobile-chromium] › e2e\specs\simulation-flow.spec.ts:29:3 › Simulation management basics › E2E-JOURNEY: allows navigating to the plan editor
    [desktop-chromium] › e2e\specs\simulation-flow.spec.ts:29:3 › Simulation management basics › E2E-JOURNEY: allows navigating to the plan editor
  4 passed (49.8s)
```