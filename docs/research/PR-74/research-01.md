---
date: 2025-10-03T00:00:00+09:00
researcher: GitHub Copilot
git_commit: [current]
branch: copilot/fix-f6c08c90-81a3-452c-920e-a4e949c9a985
topic: "PR-74 LandscapeEnforcer blocking E2E tests on mobile viewports"
tags: [research, frontend, e2e, playwright, mobile, landscape-enforcer]
status: complete
last_updated: 2025-10-03
last_updated_by: GitHub Copilot
---

# Research: LandscapeEnforcer Blocking Mobile E2E Tests (PR-74)

## Research Question

Investigate why `E2E-AUTH-001` in `src/frontend/e2e/specs/auth-session.spec.ts` fails with click timeout error, specifically why the LandscapeEnforcer overlay (`<div class="MuiBox-root css-dzc7qr">`) is intercepting pointer events despite `initE2EMode()` being called, and why the component still detects portrait orientation on mobile test viewports.

## Summary

- The test runs on mobile viewports (Pixel 5: 393×851, iPhone 12: 390×844) which are **portrait by default** in Playwright's device presets
- `LandscapeEnforcer` component checks `window.matchMedia("(orientation: portrait)").matches` during initialization, which returns `true` on portrait viewports
- While `initE2EMode()` sets `window.__E2E_MODE__ = true` via `page.addInitScript()`, the component calls `isE2EMode()` during the **first render**, creating a timing race
- `page.addInitScript()` runs **before page scripts**, but React hydration/mounting can happen synchronously during initial HTML parse, potentially before the flag is reliably detectable
- The component's `useState` initializer runs synchronously during first render: `const [isPortrait, setIsPortrait] = useState(() => { if (e2eMode || ...) return false; return window.matchMedia("(orientation: portrait)").matches; })`
- Even if `e2eMode` is eventually true, the initial state is captured as `true` (portrait detected), rendering the blocking overlay

## Code Map

### Test Infrastructure

**src/frontend/e2e/specs/auth-session.spec.ts:28-39** – Test setup
```typescript
test.beforeEach(async ({ page }) => {
  await initE2EMode(page);  // Sets window.__E2E_MODE__ = true
  helpers = new TestHelpers(page);
  await APIHelpers.mockOTPSuccess(page);
  await APIHelpers.mockConsentSuccess(page);
  await APIHelpers.mockSimulationAPI(page);
});
```

**src/frontend/e2e/specs/auth-session.spec.ts:47-63** – Failing test
```typescript
test("E2E-AUTH-001: Login button triggers Supabase OAuth (Google)", async ({ page }) => {
  // OAuth spy setup...
  await page.goto("/");
  
  // FAILS HERE: LandscapeEnforcer overlay blocks button click
  await helpers.fillWhitelistForm("홍길동", "010-1234-5678");
  // ^-- fillWhitelistForm clicks '인증번호 받기' button
  //     Error: <div class="MuiBox-root css-dzc7qr">…</div> intercepts pointer events
```

**src/frontend/e2e/utils/test-helpers.ts:25-38** – E2E mode initialization
```typescript
export async function initE2EMode(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __E2E_MODE__: boolean }).__E2E_MODE__ = true;
  });
}
```
- Uses Playwright's `page.addInitScript()` which runs **before page scripts** but **during page navigation**
- Script is injected into every new document/frame

**src/frontend/e2e/utils/test-helpers.ts:47-54** – Button click in helper
```typescript
async fillWhitelistForm(name: string, phone: string) {
  await this.page.getByLabel("이름").fill(name);
  await this.page.getByLabel("휴대폰 번호").fill(phone);
  await this.page.getByRole("button", { name: "인증번호 받기" }).click();
  // ^-- This click times out due to LandscapeEnforcer overlay
}
```

### Frontend Components

**src/frontend/src/components/LandscapeEnforcer.tsx:1-86** – Overlay component
```typescript
import { isE2EMode } from "../utils/testMode";

const LandscapeEnforcer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const e2eMode = isE2EMode();  // Line 10: Called during render

  const [isPortrait, setIsPortrait] = useState(() => {
    if (e2eMode || typeof window === "undefined") {
      return false;  // Should prevent overlay in E2E mode
    }
    return window.matchMedia("(orientation: portrait)").matches;  // Line 16
  });

  useEffect(() => {
    if (e2eMode || typeof window === "undefined") {
      return;  // No listener in E2E mode
    }
    const mq = window.matchMedia("(orientation: portrait)");
    const handler = () => setIsPortrait(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [e2eMode]);

  // ... orientation lock attempt ...

  if (e2eMode) {
    return <>{children}</>;  // Early return if E2E detected
  }

  return (
    <>
      {children}
      {isPortrait && (  // Line 58: Overlay rendered if portrait
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,  // Blocks all interactions
            bgcolor: "background.default",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            p: 3,
            textAlign: "center",
          }}
        >
          <Typography variant="h5" gutterBottom fontWeight={700}>
            가로 모드로 전환해주세요
          </Typography>
          <Typography variant="body1" color="text.secondary">
            이 앱은 가로(landscape) 모드에서만 사용할 수 있습니다. 기기를 회전해주세요.
          </Typography>
        </Box>
      )}
    </>
  );
};
```

**src/frontend/src/utils/testMode.ts:1-22** – E2E mode detection
```typescript
export const isE2EMode = (): boolean => {
  // Check for explicit E2E flag set by test runner
  if (typeof window !== "undefined" && (window as any).__E2E_MODE__) {
    return true;  // Line 3: Primary detection method
  }

  if (typeof import.meta !== "undefined" && import.meta.env) {
    const flag = import.meta.env.VITE_E2E_MODE;
    if (flag !== undefined) {
      return String(flag).toLowerCase() === "true";
    }
  }

  if (typeof navigator !== "undefined" && "webdriver" in navigator) {
    return Boolean((navigator as Navigator & { webdriver?: boolean }).webdriver);
  }

  return false;
};
```

**src/frontend/src/App.tsx:8-19** – Component tree
```typescript
import LandscapeEnforcer from "./components/LandscapeEnforcer";

function App() {
  return (
    <AuthProvider>
      <Shell>
        <LandscapeEnforcer>
          <AppController />
        </LandscapeEnforcer>
      </Shell>
    </AuthProvider>
  );
}
```
- `LandscapeEnforcer` wraps the entire app
- Mounts during initial React render after `page.goto("/")`

### Playwright Configuration

**src/frontend/playwright.config.ts:9-75** – Test configuration
```typescript
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
    screenshot: "off",
    video: "off",
  },

  projects: [
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },  // Line 61: Portrait viewport
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },  // Line 64: Portrait viewport
    },
    {
      name: "Microsoft Edge",
      use: { ...devices["Desktop Edge"], channel: "msedge" },
    },
    {
      name: "Google Chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],

  webServer: {
    command: "npm run preview",
    port: 4173,
    reuseExistingServer: true,
  },
});
```

**Playwright Device Presets** (from @playwright/test):
```typescript
// Pixel 5
{
  userAgent: "...",
  viewport: { width: 393, height: 851 },  // Portrait: height > width
  deviceScaleFactor: 2.75,
  isMobile: true,
  hasTouch: true,
}

// iPhone 12
{
  userAgent: "...",
  viewport: { width: 390, height: 844 },  // Portrait: height > width
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
}
```

## Data Flow Analysis

### E2E Mode Flag Propagation

**Intended Flow:**
1. Test calls `await initE2EMode(page)` in `beforeEach`
2. Playwright registers init script via `page.addInitScript()`
3. Test calls `await page.goto("/")`
4. Browser navigates, init script runs **before page scripts**
5. `window.__E2E_MODE__` is set to `true`
6. React app loads, components mount
7. `LandscapeEnforcer` calls `isE2EMode()` → detects flag → returns early
8. No overlay, tests proceed

**Actual Flow (Race Condition):**
1. Test calls `await initE2EMode(page)` ✓
2. Init script registered ✓
3. Test calls `await page.goto("/")` ✓
4. Browser navigates, init script **attempts** to run
5. **TIMING ISSUE**: React may start hydrating/rendering during HTML parse
6. `LandscapeEnforcer` component initializes:
   - Calls `isE2EMode()` synchronously during render
   - Checks `window.__E2E_MODE__` 
   - **Flag may not be reliably set yet** due to script execution timing
7. `useState` initializer runs:
   ```typescript
   const [isPortrait] = useState(() => {
     if (e2eMode) return false;  // e2eMode might be false at this instant
     return window.matchMedia("(orientation: portrait)").matches;  // true for Pixel 5/iPhone 12
   });
   ```
8. `isPortrait` state captured as `true`
9. Overlay renders with `zIndex: 2000`, blocking all clicks
10. Test attempts to click button → **timeout**

### Orientation Detection Flow

**In Production (Real Mobile Device):**
1. User opens app on iPhone in portrait
2. `window.matchMedia("(orientation: portrait)")` → `{ matches: true }`
3. `isPortrait` state set to `true`
4. Overlay shown: "가로 모드로 전환해주세요"
5. User rotates device to landscape
6. Media query listener fires: `mq.addEventListener("change", handler)`
7. `setIsPortrait(false)` called
8. Overlay removed, app usable

**In Playwright Tests (Mobile Viewport):**
1. Viewport set to `{ width: 393, height: 851 }` (portrait dimensions)
2. `window.matchMedia("(orientation: portrait)")` → `{ matches: true }`
3. Even if `e2eMode` were reliably detected, **viewport is still portrait**
4. Component logic: if not E2E mode → show overlay
5. **Problem**: Playwright doesn't "rotate" viewports mid-test by default

## Issue Analysis

### Root Cause

**Primary Issue: Viewport Orientation**
- Playwright's `devices["Pixel 5"]` and `devices["iPhone 12"]` use **portrait dimensions** (height > width)
- `window.matchMedia("(orientation: portrait)").matches` returns `true` in these viewports
- LandscapeEnforcer is **correctly detecting portrait orientation** and showing overlay
- Even with perfect E2E mode detection, the viewport is objectively portrait

**Secondary Issue: E2E Mode Detection Timing**
- `page.addInitScript()` guarantees script runs **before page scripts**, but not before React hydration
- React 18+ uses concurrent rendering with selective hydration
- Component state initialization (`useState` callbacks) is synchronous during first render
- Potential race: `isE2EMode()` called before `window.__E2E_MODE__` is reliably accessible
- This would fail the E2E guard, allowing portrait overlay logic to proceed

### Why Tests Fail Specifically

**Test Failure Sequence:**
1. `beforeEach` runs: `initE2EMode(page)` → script registered
2. Test starts: `await page.goto("/")` → navigation begins
3. React app mounts in **portrait viewport**
4. `LandscapeEnforcer` renders:
   - Calls `isE2EMode()` (may return `false` if flag not yet set)
   - Falls through to `window.matchMedia("(orientation: portrait)")` check
   - Detects portrait → `isPortrait = true`
   - Renders overlay with `position: fixed; inset: 0; zIndex: 2000`
5. Test helper calls `fillWhitelistForm("홍길동", "010-1234-5678")`
6. Attempts to click `getByRole("button", { name: "인증번호 받기" })`
7. Playwright detects overlay element intercepting pointer events
8. Retries for 30 seconds (default timeout)
9. **Test fails with timeout error**

**Error Message Breakdown:**
```
- <div class="MuiBox-root css-dzc7qr">…</div> intercepts pointer events
```
- `MuiBox-root` → Material-UI Box component
- `css-dzc7qr` → Emotion-generated class from LandscapeEnforcer's sx prop
- This is the overlay at `LandscapeEnforcer.tsx:58-78`

### Why E2E Mode Guard Fails

**Hypothesis 1: Init Script Race Condition**
- `page.addInitScript()` runs "before page scripts" per Playwright docs
- But React hydration can start **during HTML parsing** (streaming SSR, inline scripts)
- `LandscapeEnforcer` is high in component tree (wraps AppController)
- May mount before init script completes or before flag is readable

**Hypothesis 2: Multiple Evaluation Contexts**
- `isE2EMode()` reads `window.__E2E_MODE__`
- `page.addInitScript()` sets flag in **page context**
- React renders in **page context** (same global)
- Should work, but timing is critical

**Hypothesis 3: SSR/Build Optimization**
- Vite builds with static rendering optimizations
- Initial HTML may include pre-rendered React structure
- Component state could initialize before client-side hydration
- Init scripts run during hydration, not before HTML parse

## Execution Flow Trace

### Successful Desktop E2E Test (Hypothetical)

```
1. beforeEach → initE2EMode(page)
2. page.goto("/")
3. Browser loads HTML
4. Init script runs: window.__E2E_MODE__ = true
5. React hydrates
6. LandscapeEnforcer mounts
   - Viewport: { width: 1280, height: 720 } (landscape)
   - isE2EMode() → true (flag detected)
   - Early return: <>{children}</>
7. No overlay
8. Test interactions succeed ✓
```

### Failing Mobile E2E Test (Actual)

```
1. beforeEach → initE2EMode(page)
2. page.goto("/")
3. Browser loads HTML with viewport: { width: 393, height: 851 }
4. Init script ATTEMPTS to run: window.__E2E_MODE__ = true
5. React hydration STARTS (possibly concurrent with step 4)
6. LandscapeEnforcer mounts DURING hydration
   - isE2EMode() called synchronously
   - window.__E2E_MODE__ may be undefined (race)
   - Falls through to orientation check
   - window.matchMedia("(orientation: portrait)").matches → true
   - useState initializer captures: isPortrait = true
7. Component renders with overlay (zIndex: 2000)
8. Test attempts click
9. Playwright: "element intercepts pointer events"
10. Retry loop exhausts 30s timeout
11. Test fails ✗
```

## Advanced Questions

### 1. Why doesn't `initE2EMode()` properly disable LandscapeEnforcer?

**Primary Reason:** Even if E2E mode is detected, the viewport is **objectively in portrait orientation**. The component's logic would still trigger the overlay because `window.matchMedia("(orientation: portrait)").matches` returns `true`.

**Secondary Reason:** Timing race between `page.addInitScript()` and React component initialization. The flag may not be set before `isE2EMode()` is called during the first render.

**Evidence:**
- Page snapshot shows overlay text: "가로 모드로 전환해주세요"
- Error message confirms `<div class="MuiBox-root css-dzc7qr">` (LandscapeEnforcer overlay)
- Viewport dimensions: Pixel 5 (393×851), iPhone 12 (390×844) are portrait
- Component code: `if (e2eMode) return <>{children}</>;` at line 52 should prevent overlay, but clearly not executing

### 2. Is there a race condition in E2E mode initialization vs component mounting?

**Yes, highly likely.** 

**Evidence:**
- `page.addInitScript()` runs "before page scripts" but **during navigation**
- React 18+ uses concurrent rendering with selective hydration
- Component `useState` initializers are synchronous
- `LandscapeEnforcer` is high in tree (wraps AppController), mounts early
- Timing-sensitive: `isE2EMode()` reads global flag during render

**Confirmation Needed:** Add console logs to `isE2EMode()` and `LandscapeEnforcer` constructor to verify execution order.

### 3. Is viewport orientation detection working correctly in Playwright?

**Yes, working as designed.**

Playwright's device presets use portrait dimensions:
- Pixel 5: `viewport: { width: 393, height: 851 }` → height > width → portrait
- iPhone 12: `viewport: { width: 390, height: 844 }` → height > width → portrait

`window.matchMedia("(orientation: portrait)")` correctly returns `{ matches: true }` for these dimensions.

**The issue is not detection, but that tests are running in portrait mode without rotation.**

### 4. Are there differences between mobile and desktop projects?

**Yes, critical difference:**

**Mobile Projects:**
- Use portrait viewports by default
- Trigger LandscapeEnforcer overlay
- Tests fail with pointer event interception

**Desktop Projects:**
- Use landscape viewports (width > height)
- `window.matchMedia("(orientation: portrait)").matches` → `false`
- LandscapeEnforcer never shows overlay
- Tests would pass (if E2E mode is detected)

**This explains why the issue is **mobile-specific**.**

## Recommended Follow-ups

### Immediate Fixes

1. **Option A: Configure Mobile Projects with Landscape Viewports**
   ```typescript
   // playwright.config.ts
   projects: [
     {
       name: "Mobile Chrome",
       use: { 
         ...devices["Pixel 5"],
         viewport: { width: 851, height: 393 },  // Swap width/height for landscape
       },
     },
     // ...
   ]
   ```

2. **Option B: Improve E2E Mode Detection Reliability**
   ```typescript
   // test-helpers.ts
   export async function initE2EMode(page: Page) {
     await page.addInitScript(() => {
       Object.defineProperty(window, '__E2E_MODE__', {
         value: true,
         writable: false,
         configurable: false,
       });
       // Add localStorage backup
       localStorage.setItem('__E2E_MODE__', 'true');
     });
     
     // Wait for flag to be set
     await page.waitForFunction(() => {
       return (window as any).__E2E_MODE__ === true;
     });
   }
   ```

3. **Option C: Force Landscape Orientation in E2E Tests**
   ```typescript
   // In beforeEach
   await page.addInitScript(() => {
     Object.defineProperty(window.screen.orientation, 'type', {
       value: 'landscape-primary',
       writable: false,
     });
   });
   ```

### Long-term Improvements

1. **Add E2E Mode Indicator to Component**
   ```typescript
   // LandscapeEnforcer.tsx
   if (e2eMode) {
     console.log('[E2E] LandscapeEnforcer: E2E mode detected, skipping overlay');
     return <>{children}</>;
   }
   ```

2. **Add Test-Specific Data Attribute**
   ```typescript
   // App.tsx or test setup
   if (isE2EMode()) {
     document.documentElement.setAttribute('data-e2e-mode', 'true');
   }
   
   // LandscapeEnforcer can check: document.documentElement.hasAttribute('data-e2e-mode')
   ```

3. **Use Viewport Meta Tag for Orientation**
   ```html
   <!-- index.html -->
   <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, orientation=landscape">
   ```

4. **Conditional Component Rendering**
   ```typescript
   // App.tsx
   {!isE2EMode() && <LandscapeEnforcer>{children}</LandscapeEnforcer>}
   {isE2EMode() && children}
   ```

### Test Plan Alignment

Per `docs/plans/test-code/test-plan-08-frontend-e2e.md:826-832`:
```markdown
E2E-MOB-007: LandscapeEnforcer shows overlay in portrait mode
- Purpose: Verify landscape enforcement for mobile users
- Actions: Load app in portrait viewport (width < height)
- Expect: Overlay visible with "가로 모드로 전환해주세요" message
```

**Current behavior matches this test case exactly**, but it's **blocking all other mobile tests** that aren't specifically testing the enforcer.

**Recommendation:** Configure mobile E2E projects to use landscape viewports by default, and create a **separate test suite** specifically for testing LandscapeEnforcer behavior with controlled orientation changes.

## Conclusion

The test failure is caused by:

1. **Primary:** Mobile viewport projects use portrait dimensions, triggering LandscapeEnforcer overlay
2. **Secondary:** Potential race condition where `isE2EMode()` is called before `window.__E2E_MODE__` flag is reliably set
3. **Compounding:** Component state initialization happens synchronously during first render, capturing portrait orientation before E2E mode can be detected

**Recommended Solution:** Configure mobile projects with landscape viewports (Option A) and add reliability improvements to E2E mode detection (Option B) for defense-in-depth.
