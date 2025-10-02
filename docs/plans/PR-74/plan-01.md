---
pr: 74
author: GitHub Copilot
date: 2025-10-03
title: "Fix Mobile E2E Tests: Configure Landscape Viewports and Improve E2E Mode Detection"
status: draft
---

## Problem Recap

`E2E-AUTH-001` in `src/frontend/e2e/specs/auth-session.spec.ts` fails with click timeout because:

- Playwright's mobile device presets (Pixel 5: 393×851, iPhone 12: 390×844) use **portrait dimensions**
- `LandscapeEnforcer` component detects portrait orientation via `window.matchMedia("(orientation: portrait)").matches`
- Component renders full-screen blocking overlay (`zIndex: 2000`) with message "가로 모드로 전환해주세요"
- Overlay intercepts all pointer events, causing test clicks to timeout after 30 seconds
- Potential race condition: `page.addInitScript()` sets `window.__E2E_MODE__` during navigation, but React component may call `isE2EMode()` before flag is reliably accessible

**Error Evidence:**
```
Error: locator.click: Test timeout of 30000ms exceeded.
- <div class="MuiBox-root css-dzc7qr">…</div> intercepts pointer events
```

## Objectives

1. **Unblock mobile E2E tests** - Configure Playwright projects to use landscape viewports so `LandscapeEnforcer` doesn't trigger overlay
2. **Improve E2E mode reliability** - Add defensive checks to ensure `window.__E2E_MODE__` flag is set before React hydration
3. **Maintain production behavior** - Real mobile users in portrait mode must still see landscape enforcement
4. **Enable orientation testing** - Create dedicated test for `LandscapeEnforcer` behavior with controlled viewport changes
5. **Document solution** - Update test plan with viewport configuration rationale and testing approach

## Out of Scope

- Removing or disabling `LandscapeEnforcer` component (required for production UX)
- Changing production orientation detection logic
- Testing all possible device orientations exhaustively
- Implementing screen orientation API mocking (not supported in Playwright)
- Modifying backend API or authentication flows

## Implementation Steps

### Step 1: Configure Mobile Projects with Landscape Viewports

**File:** `src/frontend/playwright.config.ts`

**Change:** Modify mobile projects to use landscape-oriented viewports

```typescript
// Line 60-65: Replace mobile project configurations
projects: [
  {
    name: "Mobile Chrome",
    use: { 
      ...devices["Pixel 5"],
      // Override viewport to landscape orientation for E2E tests
      viewport: { width: 851, height: 393 },  // Swap width/height from default 393×851
      // Preserve other Pixel 5 properties: userAgent, deviceScaleFactor, isMobile, hasTouch
    },
  },
  {
    name: "Mobile Safari",
    use: { 
      ...devices["iPhone 12"],
      // Override viewport to landscape orientation for E2E tests
      viewport: { width: 844, height: 390 },  // Swap width/height from default 390×844
    },
  },
  // Keep desktop projects unchanged
  {
    name: "Microsoft Edge",
    use: { ...devices["Desktop Edge"], channel: "msedge" },
  },
  {
    name: "Google Chrome",
    use: { ...devices["Desktop Chrome"], channel: "chrome" },
  },
],
```

**Rationale:**
- Landscape orientation (width > height) prevents `window.matchMedia("(orientation: portrait)").matches` from returning `true`
- Preserves mobile device characteristics (touch, user agent, scale factor)
- Aligns with production expectation: app designed for landscape use

**Verification:**
```typescript
// After change, viewport dimensions:
// Mobile Chrome: 851×393 (landscape)
// Mobile Safari: 844×390 (landscape)
```

### Step 2: Improve E2E Mode Detection Reliability

**File:** `src/frontend/e2e/utils/test-helpers.ts`

**Change:** Enhance `initE2EMode()` to ensure flag is set before navigation

```typescript
// Line 29-38: Replace initE2EMode function
/**
 * Initialize E2E mode for the page
 * This should be called in beforeEach hooks before any other setup
 * 
 * Sets window.__E2E_MODE__ flag BEFORE page navigation to ensure
 * components can reliably detect E2E environment during initialization
 */
export async function initE2EMode(page: Page) {
  // Method 1: Use addInitScript with Object.defineProperty for immutability
  await page.addInitScript(() => {
    Object.defineProperty(window, '__E2E_MODE__', {
      value: true,
      writable: false,
      configurable: false,
      enumerable: true,
    });
    
    // Backup: Set localStorage flag as additional detection method
    try {
      localStorage.setItem('__E2E_MODE__', 'true');
    } catch {
      // Ignore if localStorage is unavailable
    }
  });
}
```

**Rationale:**
- `Object.defineProperty` ensures flag cannot be accidentally overwritten
- `addInitScript` runs in every frame/navigation before page scripts
- localStorage backup provides alternative detection if global timing issues persist

**Optional Enhancement (if issues persist):**

```typescript
// Add verification step after page.goto()
export async function verifyE2EMode(page: Page): Promise<boolean> {
  const isSet = await page.evaluate(() => {
    return (window as any).__E2E_MODE__ === true;
  });
  
  if (!isSet) {
    console.warn('[E2E] WARNING: __E2E_MODE__ flag not detected after navigation');
  }
  
  return isSet;
}
```

### Step 3: Add Diagnostic Logging to LandscapeEnforcer (Optional)

**File:** `src/frontend/src/components/LandscapeEnforcer.tsx`

**Change:** Add console logs for debugging E2E mode detection

```typescript
// Line 10-20: Enhance initialization logging
const LandscapeEnforcer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const e2eMode = isE2EMode();
  
  // Debug logging (only in development or E2E)
  if (import.meta.env.DEV || e2eMode) {
    console.log('[LandscapeEnforcer] Initialized:', {
      e2eMode,
      viewport: typeof window !== 'undefined' ? {
        width: window.innerWidth,
        height: window.innerHeight,
      } : null,
      orientation: typeof window !== 'undefined' 
        ? window.matchMedia("(orientation: portrait)").matches ? 'portrait' : 'landscape'
        : null,
    });
  }

  const [isPortrait, setIsPortrait] = useState(() => {
    if (e2eMode || typeof window === "undefined") {
      return false;
    }
    const matches = window.matchMedia("(orientation: portrait)").matches;
    if (import.meta.env.DEV) {
      console.log('[LandscapeEnforcer] Initial portrait detection:', matches);
    }
    return matches;
  });
  
  // ... rest of component
```

**Rationale:**
- Provides visibility into E2E mode detection during test runs
- Helps diagnose timing issues if they resurface
- Only logs in dev/E2E modes to avoid production console noise

### Step 4: Create Dedicated LandscapeEnforcer Test

**File:** `src/frontend/e2e/specs/landscape-enforcer.spec.ts` (new file)

**Purpose:** Explicitly test orientation enforcement behavior

```typescript
import { test, expect } from "@playwright/test";
import { initE2EMode } from "../utils/test-helpers";

test.describe("LandscapeEnforcer Component", () => {
  test("Shows overlay in portrait viewport (not in E2E mode)", async ({ page }) => {
    // Do NOT call initE2EMode - we want to test real behavior
    
    // Use portrait viewport
    await page.setViewportSize({ width: 393, height: 851 });
    await page.goto("/");
    
    // Verify overlay is visible
    await expect(page.getByText("가로 모드로 전환해주세요")).toBeVisible();
    await expect(page.getByText(/가로.*모드에서만 사용할 수 있습니다/)).toBeVisible();
    
    // Verify overlay blocks interactions (expected behavior)
    const button = page.getByRole("button", { name: "인증번호 받기" });
    // Button exists but is not clickable due to overlay
    await expect(button).toBeVisible();
  });
  
  test("Hides overlay in landscape viewport", async ({ page }) => {
    // Use landscape viewport
    await page.setViewportSize({ width: 851, height: 393 });
    await page.goto("/");
    
    // Verify overlay is NOT visible
    await expect(page.getByText("가로 모드로 전환해주세요")).not.toBeVisible();
    
    // Verify interactions work
    const nameInput = page.getByLabel("이름");
    await expect(nameInput).toBeVisible();
    await nameInput.fill("Test User");
  });
  
  test("Skips overlay in E2E mode regardless of orientation", async ({ page }) => {
    await initE2EMode(page);
    
    // Use portrait viewport but E2E mode should prevent overlay
    await page.setViewportSize({ width: 393, height: 851 });
    await page.goto("/");
    
    // Verify overlay is NOT visible
    await expect(page.getByText("가로 모드로 전환해주세요")).not.toBeVisible();
    
    // Verify interactions work despite portrait viewport
    const nameInput = page.getByLabel("이름");
    await expect(nameInput).toBeVisible();
    await nameInput.fill("Test User");
  });
});
```

**Rationale:**
- Dedicated test suite for orientation-specific behavior
- Tests component in isolation from authentication flow
- Verifies both production behavior (portrait blocking) and E2E mode (no blocking)

### Step 5: Update Existing Test Setup

**File:** `src/frontend/e2e/specs/auth-session.spec.ts`

**Change:** Add comment documenting viewport assumptions

```typescript
// Line 28-39: Add documentation comment
test.describe("Authentication & Session Management", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    // Note: Tests run in landscape viewports (Mobile Chrome: 851×393, Mobile Safari: 844×390)
    // This prevents LandscapeEnforcer overlay from blocking interactions
    // See landscape-enforcer.spec.ts for dedicated orientation testing
    await initE2EMode(page);
    helpers = new TestHelpers(page);
    await APIHelpers.mockOTPSuccess(page);
    await APIHelpers.mockConsentSuccess(page);
    await APIHelpers.mockSimulationAPI(page);
  });
  
  // ... rest of tests
```

**No functional changes needed** - tests will pass with viewport configuration from Step 1

### Step 6: Update Test Plan Documentation

**File:** `docs/plans/test-code/test-plan-08-frontend-e2e.md`

**Change:** Add section explaining viewport configuration

```markdown
## 2.7 Responsive & Mobile (CAT-MOBILE)

**Viewport Configuration Strategy:**

E2E tests use **landscape viewports** for mobile projects to match production usage:
- Mobile Chrome: 851×393 (Pixel 5 rotated)
- Mobile Safari: 844×390 (iPhone 12 rotated)

**Rationale:**
- App is designed for landscape orientation (per LandscapeEnforcer component)
- Production users are expected to rotate devices for optimal experience
- Prevents LandscapeEnforcer overlay from blocking E2E test interactions
- Dedicated `landscape-enforcer.spec.ts` tests orientation behavior in isolation

**Cases:**
    - E2E-MOB-001: Whitelist page renders correctly at mobile width (851px)
    - E2E-MOB-002: OTP page renders correctly at mobile width
    - E2E-MOB-003: MainPage table scrolls horizontally on narrow screens
    - E2E-MOB-004: Plan editor steps render in single column on mobile
    - E2E-MOB-005: Buttons meet minimum touch target size (44px)
    - E2E-MOB-006: Modal dialogs are full-screen on mobile
    - E2E-MOB-007: LandscapeEnforcer shows overlay in portrait mode (separate test file)
```

**Update line 826-832** to reference separate test file:

```markdown
- E2E-MOB-007: LandscapeEnforcer shows overlay in portrait mode
  - **Location**: `e2e/specs/landscape-enforcer.spec.ts` (dedicated test)
  - Purpose: Verify landscape enforcement for mobile users
  - Actions: Load app in portrait viewport (width < height) without E2E mode
  - Expect: Overlay visible with "가로 모드로 전환해주세요" message
  - Note: Separate from main test suite to avoid blocking other mobile tests
```

## Testing & Verification

### Phase 1: Local Verification

1. **Run failing test with new configuration:**
   ```powershell
   cd src/frontend
   npx playwright test e2e/specs/auth-session.spec.ts --project="Mobile Chrome" -g "E2E-AUTH-001"
   ```
   - **Expected:** Test passes without timeout errors
   - **Verify:** No "intercepts pointer events" errors in output

2. **Run full auth-session suite on mobile:**
   ```powershell
   npx playwright test e2e/specs/auth-session.spec.ts --project="Mobile Chrome"
   npx playwright test e2e/specs/auth-session.spec.ts --project="Mobile Safari"
   ```
   - **Expected:** All 8 tests pass on both mobile projects

3. **Run new LandscapeEnforcer tests:**
   ```powershell
   npx playwright test e2e/specs/landscape-enforcer.spec.ts
   ```
   - **Expected:** All 3 orientation tests pass
   - **Verify:** Portrait viewport shows overlay when not in E2E mode

4. **Run full E2E suite:**
   ```powershell
   npx playwright test e2e/
   ```
   - **Expected:** No regressions in other test files

### Phase 2: Desktop Project Verification

1. **Verify desktop projects unchanged:**
   ```powershell
   npx playwright test e2e/specs/auth-session.spec.ts --project="Google Chrome"
   npx playwright test e2e/specs/auth-session.spec.ts --project="Microsoft Edge"
   ```
   - **Expected:** Desktop tests continue to pass
   - **Verify:** LandscapeEnforcer never triggered (desktop viewports are landscape by default)

### Phase 3: CI/CD Verification

1. **Check CI pipeline:**
   - Playwright config has `workers: process.env.CI ? 1 : undefined`
   - Tests run sequentially in CI to avoid resource contention
   - Verify all projects pass in CI environment

2. **Review test reports:**
   - Check HTML report: `npx playwright show-report`
   - Verify no screenshots indicate portrait overlay blocking
   - Confirm timing of test execution (should be faster without timeouts)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Landscape viewports hide real mobile issues** | Medium | Create dedicated `landscape-enforcer.spec.ts` to explicitly test portrait behavior |
| **E2E mode detection still has race condition** | Low | `Object.defineProperty` + localStorage backup provides defense-in-depth |
| **Test report shows incorrect device names** | Low | Viewport override doesn't change device names in reports (acceptable) |
| **Real users rotate to portrait mid-session** | Low | Production behavior unchanged; LandscapeEnforcer still enforces orientation |
| **Future tests forget viewport assumption** | Medium | Document in test plan + add comment in test setup |
| **New mobile devices added with wrong viewports** | Medium | Add documentation comment in playwright.config.ts explaining landscape requirement |

## Edge Cases to Consider

1. **Tablet viewports** (not currently tested):
   - iPad Pro (1024×1366) → landscape would be 1366×1024
   - Should LandscapeEnforcer apply to tablets? (Design decision)

2. **Desktop narrow windows** (< 600px width):
   - User manually resizes browser to portrait dimensions
   - Current logic would show overlay (correct behavior)

3. **Foldable devices** with dynamic orientation:
   - Screen.orientation API not reliably mocked in Playwright
   - Accept limitation: test in fixed viewports only

4. **E2E mode in production** (accidental exposure):
   - `window.__E2E_MODE__` only set via Playwright
   - No env variable or URL parameter allows external activation
   - Safe against production misuse

## Follow-up Ideas (Not Required for This PR)

1. **Parameterized viewport testing:**
   ```typescript
   const viewports = [
     { name: "Mobile Portrait", width: 393, height: 851, expectOverlay: true },
     { name: "Mobile Landscape", width: 851, height: 393, expectOverlay: false },
     { name: "Tablet Portrait", width: 768, height: 1024, expectOverlay: true },
   ];
   viewports.forEach(vp => {
     test(`LandscapeEnforcer behavior at ${vp.name}`, async ({ page }) => {
       // Test logic
     });
   });
   ```

2. **Visual regression testing:**
   - Capture screenshots of LandscapeEnforcer overlay
   - Verify styling consistency across devices
   - Use Playwright's `screenshot()` with baseline comparison

3. **Accessibility testing for overlay:**
   - Verify overlay message is screen-reader accessible
   - Check color contrast meets WCAG standards
   - Ensure focus management when overlay is shown

4. **Alternative E2E mode detection:**
   - Use meta tag: `<meta name="e2e-mode" content="true">`
   - Injected via `page.addInitScript()` into `<head>`
   - Component reads: `document.querySelector('meta[name="e2e-mode"]')`

5. **CI/CD guard against portrait config:**
   ```typescript
   // In playwright.config.ts
   projects.forEach(project => {
     const viewport = project.use.viewport;
     if (viewport && viewport.height > viewport.width) {
       throw new Error(`Project ${project.name} uses portrait viewport - E2E tests require landscape`);
     }
   });
   ```

## Success Criteria

✅ **Functional:**
- [ ] `E2E-AUTH-001` passes on Mobile Chrome and Mobile Safari
- [ ] All auth-session tests pass on mobile projects
- [ ] LandscapeEnforcer tests verify portrait/landscape/E2E mode behavior
- [ ] No regressions in desktop project tests

✅ **Documentation:**
- [ ] Playwright config includes comments explaining viewport overrides
- [ ] Test plan updated with viewport strategy section
- [ ] `landscape-enforcer.spec.ts` clearly documents test purpose

✅ **Code Quality:**
- [ ] `initE2EMode()` uses defensive programming patterns
- [ ] No linting errors introduced
- [ ] No console warnings during test execution (except intentional logs)

✅ **CI/CD:**
- [ ] All tests pass in CI environment
- [ ] Test execution time reduced (no 30-second timeouts)
- [ ] HTML report shows no portrait overlay screenshots

## Implementation Order

1. **Step 1** (Playwright config) - Immediate fix, unblocks all mobile tests
2. **Step 2** (initE2EMode) - Reliability improvement, prevents future races
3. **Step 5** (auth-session comments) - Documentation for maintainability
4. **Step 4** (landscape-enforcer tests) - Explicit coverage of orientation logic
5. **Step 6** (test plan update) - Document strategy for future reference
6. **Step 3** (diagnostic logging) - Optional, only if debugging needed

**Estimated Effort:** 2-3 hours for implementation + testing
