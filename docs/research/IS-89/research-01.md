---
date: 2025-10-21T00:00:00+09:00
researcher: GitHub Copilot
git_commit: IS-89
branch: IS-89
repository: simulation
topic: "Issue #89 Persists After PR #90: Google Login Button Not Disabled in KakaoTalk"
tags: [research, bug, oauth, google-auth, embedded-browser, webview, android, ui-fix]
status: complete
last_updated: 2025-10-21
last_updated_by: GitHub Copilot
---

# Research: Issue #89 Persists After PR #90 Merge

**Date**: 2025-10-21T00:00:00+09:00  
**Researcher**: GitHub Copilot  
**Branch**: IS-89  
**Issue**: [#89](https://github.com/SkyDominator/simulation/issues/89)  
**Previous PR**: [#90](https://github.com/SkyDominator/simulation/pull/90) (merged but didn't solve the issue)

## Research Question

Why does issue #89 persist after PR #90 was merged? The user still experiences the same Google OAuth login failure in KakaoTalk in-app browser on Samsung Galaxy Android devices.

## Summary

**Root Cause**: PR #90 implemented embedded browser detection and warning systems, but **failed to disable or hide the Google login button** when running in KakaoTalk or other embedded browsers. The current implementation only shows warning messages but still allows users to click the Google login button, which leads to the 403 error from Google.

### The Gap Between Requirements and Implementation

**Requirement** (from issue #89):

```markdown
KakaoTalk 감지 시: "Google 로그인" 버튼을 숨기거나 비활성화합니다.
(When KakaoTalk is detected: Hide or disable the "Google 로그인" button)
```

**Current Implementation** (LoginPage.tsx:166-173):

- ✅ Detects embedded browser correctly
- ✅ Shows warning banner above buttons
- ✅ Shows warning modal when button clicked
- ❌ **Google login button remains enabled and clickable**

This allows users to still attempt Google OAuth, which fails with the same 403 error described in the original issue.

## Detailed Findings

### 1. Root Cause Code

#### File: `src/frontend/src/pages/LoginPage.tsx`

**Lines 166-173** - Google Login Button (Not Disabled):

```tsx
<Button
  variant="contained"
  color="error"
  fullWidth
  size="large"
  onClick={() => handleSocialLogin("google")}
  disabled={!!loadingProvider}  // ❌ Only disabled when loading, not when embedded
  data-testid="google-login"
>
```

**Problem**: The `disabled` prop only checks `loadingProvider` state. It does NOT check if the browser is embedded.

**Expected**: Should be `disabled={!!loadingProvider || isEmbeddedBrowser()}`

### 2. Code Map: Detection Flow (Working Correctly)

#### Detection Chain

```text
LoginPage.tsx:36-38 (useEffect)
  ↓
isEmbeddedBrowser() from browserDetection.ts:10-38
  ↓ (checks user agent)
setShowEmbeddedBanner(true) → Shows warning banner
```

**Code Map**:

- `src/frontend/src/pages/LoginPage.tsx:36-38` - Embedded browser detection on mount
- `src/frontend/src/utils/browserDetection.ts:10-38` - `isEmbeddedBrowser()` implementation
- `src/frontend/src/pages/LoginPage.tsx:147-159` - Warning banner (displays correctly)

### 3. Code Map: OAuth Click Flow (Bug Location)

#### Current Flow (Incorrect)

```text
User clicks Google button
  ↓
handleSocialLogin("google") [LoginPage.tsx:45]
  ↓
isEmbeddedBrowser() check [LoginPage.tsx:47-51]
  ↓ (if embedded)
setShowEmbeddedBrowserWarning(true) → Shows modal
  ↓
BUT: User has already clicked → Creates confusion
```

**Code Map**:

- `src/frontend/src/pages/LoginPage.tsx:166-173` - Google login button (NOT disabled)
- `src/frontend/src/pages/LoginPage.tsx:45-51` - OAuth handler checks embedded status
- `src/frontend/src/pages/LoginPage.tsx:47-51` - Shows warning modal (reactive, not preventive)

#### Expected Flow (Should Be)

```text
User sees Google button in KakaoTalk
  ↓
Button is DISABLED (visual cue: grayed out)
  ↓
Warning banner explains why
  ↓
User cannot click → Prevented at UI level
```

### 4. Related Code: Modal Component (Working Correctly)

**File**: `src/frontend/src/components/EmbeddedBrowserWarningModal.tsx`

**Lines 1-163** - Modal implementation works correctly:

- Shows proper warning message
- Provides "브라우저에서 열기" button
- Calls `openInExternalBrowser()` to redirect

**This component is fine** - the issue is that users shouldn't reach this modal at all. The button should be disabled.

### 5. Browser Detection Utility (Working Correctly)

**File**: `src/frontend/src/utils/browserDetection.ts`

**Lines 10-38** - `isEmbeddedBrowser()`:

```typescript
export function isEmbeddedBrowser(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent || navigator.vendor || "";

  const embeddedMarkers = [
    "KAKAOTALK", // ✅ Correctly detects KakaoTalk
    "wv", "WebView", "FBAN", "FBAV",
    "Instagram", "Twitter", "Line", "Naver",
  ];

  const isEmbedded = embeddedMarkers.some((marker) => ua.includes(marker));

  if (isEmbedded) {
    console.info("[BrowserDetection] Embedded browser detected:", {
      userAgent: ua,
      browserName: getBrowserName(),
      browserType: "embedded",
    });
  }

  return isEmbedded;
}
```

**This function works correctly** - it properly detects KakaoTalk and other embedded browsers.

## Data Flow Analysis

### Current Implementation Data Flow

```text
Component Mount
  ↓
useEffect (LoginPage.tsx:36-38)
  ↓
isEmbeddedBrowser() → true (in KakaoTalk)
  ↓
setShowEmbeddedBanner(true)
  ↓
Render: Banner visible ✅
Render: Google button ENABLED ❌ (BUG!)
  ↓
User clicks Google button (shouldn't be possible)
  ↓
handleSocialLogin("google")
  ↓
isEmbeddedBrowser() check again
  ↓
setShowEmbeddedBrowserWarning(true)
  ↓
Modal appears ✅
  ↓
User confused: "Why was button clickable?"
```

### Expected Data Flow

```text
Component Mount
  ↓
useEffect (LoginPage.tsx:36-38)
  ↓
isEmbeddedBrowser() → true (in KakaoTalk)
  ↓
setShowEmbeddedBanner(true)
  ↓
Render: Banner visible ✅
Render: Google button DISABLED ✅ (FIX!)
  ↓
User sees disabled button + banner explanation
  ↓
User understands: Must use external browser
  ↓
User clicks "브라우저에서 열기" from banner/instructions
```

## UX Flow Analysis

### Current UX (Problematic)

1. User opens app in KakaoTalk
2. Sees warning banner: "앱 내부 브라우저에서는 Google 로그인이 제한됩니다"
3. BUT: Google login button looks normal (enabled, red)
4. User thinks: "Maybe it works now?" → Clicks button
5. Modal appears: "브라우저에서 열어주세요"
6. User confused: "Why didn't you tell me before I clicked?"
7. Still might try again → Same 403 error from Google

**User Experience**: Confusing and frustrating

### Expected UX (Should Be)

1. User opens app in KakaoTalk
2. Sees warning banner: "앱 내부 브라우저에서는 Google 로그인이 제한됩니다"
3. Google login button is DISABLED (grayed out, not clickable)
4. User understands immediately: This won't work here
5. User reads banner instructions or looks for alternative
6. No confusion, no wasted clicks, no error encounters

**User Experience**: Clear and helpful

## Code Execution Flow

### LoginPage.tsx Component Lifecycle

```text
1. Component Mount
   ├─ Line 14: Import isEmbeddedBrowser
   ├─ Lines 29-31: State initialization
   │  ├─ showEmbeddedBrowserWarning: false
   │  └─ showEmbeddedBanner: false
   └─ Lines 36-38: useEffect detection
      └─ if (isEmbeddedBrowser()) → setShowEmbeddedBanner(true)

2. Render Phase
   ├─ Lines 147-159: Conditional banner (if showEmbeddedBanner)
   ├─ Lines 166-173: Google button
   │  └─ disabled={!!loadingProvider} ❌ Missing embedded check
   └─ Lines 174-189: Kakao button
      └─ disabled={!!loadingProvider} ❌ Same issue

3. User Interaction (if button clicked)
   ├─ Line 168: onClick={() => handleSocialLogin("google")}
   ├─ Lines 45-110: handleSocialLogin function
   │  ├─ Line 47-51: isEmbeddedBrowser() check
   │  │  └─ if embedded → setShowEmbeddedBrowserWarning(true)
   │  └─ Line 64-68: supabase.auth.signInWithOAuth (never reached if embedded)
   └─ Lines 197-200: Modal renders (if showEmbeddedBrowserWarning)
```

## Why PR #90 Failed to Solve the Issue

PR #90 implemented:

1. ✅ Browser detection utility (`browserDetection.ts`)
2. ✅ Warning modal component (`EmbeddedBrowserWarningModal.tsx`)
3. ✅ Detection on component mount
4. ✅ Warning banner display
5. ✅ Modal trigger on button click
6. ❌ **DID NOT disable the button**

The PR took a "reactive" approach (show warnings after user action) instead of a "preventive" approach (disable button to prevent action).

## Solution Requirements

### Changes Needed in `src/frontend/src/pages/LoginPage.tsx`

**Line 36-38**: Store embedded browser state in component state

```typescript
// Current:
useEffect(() => {
  if (isEmbeddedBrowser()) {
    setShowEmbeddedBanner(true);
  }
}, []);

// Should be:
const [isEmbedded, setIsEmbedded] = useState(false);

useEffect(() => {
  const embedded = isEmbeddedBrowser();
  setIsEmbedded(embedded);
  if (embedded) {
    setShowEmbeddedBanner(true);
  }
}, []);
```

**Line 170**: Add embedded check to disabled prop

```typescript
// Current:
disabled={!!loadingProvider}

// Should be:
disabled={!!loadingProvider || isEmbedded}
```

**Line 181** (Kakao button): Consider disabling as well

```typescript
// Kakao might have similar restrictions - verify with testing
disabled={!!loadingProvider || isEmbedded}
```

### Optional Enhancement

Add visual feedback explaining why button is disabled:

```tsx
<Tooltip 
  title={isEmbedded ? "외부 브라우저에서 Google 로그인을 진행해주세요" : ""}
  arrow
>
  <span> {/* Wrapper needed for disabled button tooltip */}
    <Button
      variant="contained"
      color="error"
      fullWidth
      size="large"
      onClick={() => handleSocialLogin("google")}
      disabled={!!loadingProvider || isEmbedded}
      data-testid="google-login"
    >
      {loadingProvider === "google"
        ? "Google 로그인 중..."
        : "Google로 로그인"}
    </Button>
  </span>
</Tooltip>
```

## Test Coverage Analysis

### Existing Tests

**File**: `src/frontend/src/test/utils/browserDetection.test.ts`

- ✅ Tests `isEmbeddedBrowser()` correctly
- ✅ Tests KakaoTalk detection
- ✅ Tests other embedded browsers
- ✅ Tests standard browsers

**File**: `src/frontend/src/test/components/EmbeddedBrowserWarningModal.test.tsx`

- ✅ Tests modal rendering
- ✅ Tests modal interactions
- ✅ Tests browser name display

**File**: `src/frontend/src/test/integration/auth/embeddedBrowser.test.tsx`

- ✅ Tests detection → modal flow
- ❌ **Does NOT test button disabled state**

### Missing Tests

Need to add test cases for:

1. Button disabled state when `isEmbeddedBrowser()` returns true
2. Button enabled state when `isEmbeddedBrowser()` returns false
3. Visual feedback (Tooltip or text) explaining why disabled

**Suggested Test** (add to `embeddedBrowser.test.tsx`):

```typescript
it('disables Google login button in embedded browser', () => {
  Object.defineProperty(window.navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Linux; Android 13) KAKAOTALK 10.0.0',
    writable: true,
    configurable: true,
  });

  renderWithProviders(<LoginPage />, { withAuth: false });

  const googleButton = screen.getByTestId('google-login');
  expect(googleButton).toBeDisabled();
});

it('enables Google login button in standard browser', () => {
  Object.defineProperty(window.navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0',
    writable: true,
    configurable: true,
  });

  renderWithProviders(<LoginPage />, { withAuth: false });

  const googleButton = screen.getByTestId('google-login');
  expect(googleButton).not.toBeDisabled();
});
```

## Related Files Summary

### Core Implementation Files

| File | Lines | Status | Purpose |
|------|-------|--------|---------|
| `src/frontend/src/pages/LoginPage.tsx` | 1-208 | ❌ Needs Fix | Login UI - button not disabled |
| `src/frontend/src/utils/browserDetection.ts` | 1-126 | ✅ Working | Detection utility |
| `src/frontend/src/components/EmbeddedBrowserWarningModal.tsx` | 1-163 | ✅ Working | Warning modal |

### Test Files

| File | Lines | Status | Purpose |
|------|-------|--------|---------|
| `src/frontend/src/test/utils/browserDetection.test.ts` | 1-163 | ✅ Complete | Unit tests for detection |
| `src/frontend/src/test/components/EmbeddedBrowserWarningModal.test.tsx` | 1-98 | ✅ Complete | Unit tests for modal |
| `src/frontend/src/test/integration/auth/embeddedBrowser.test.tsx` | 1-110 | ⚠️ Incomplete | Missing button state tests |
| `src/frontend/e2e/auth/embedded-browser.spec.ts` | 1-63 | ✅ Complete | E2E tests |

### Documentation Files

| File | Status | Purpose |
|------|--------|---------|
| `docs/spec/tech-details.md` | ✅ Updated | Technical specification |
| `docs/spec/prd.md` | ✅ Current | Product requirements |
| `docs/research/IS-89/research-00.md` | ✅ Complete | Initial research (PR #90) |
| `docs/plan/IS-89/plan-00.md` | ⚠️ Outdated | Implementation plan didn't specify button disable |

## Conclusion

**Why Issue #89 Persists**:
PR #90 implemented comprehensive embedded browser detection and warning systems, but failed to implement the core requirement: **disabling the Google login button** when in embedded browsers.

**The Fix** (Simple):

1. Store `isEmbeddedBrowser()` result in component state
2. Add `|| isEmbedded` to button's `disabled` prop
3. Add tests to verify button disabled state

**Estimated Impact**: 5 minutes of code changes, 15 minutes of testing, resolves issue completely.

**User Experience Improvement**: Users will immediately understand they cannot use Google login in KakaoTalk, avoiding confusion and error messages.

## References

- **Issue**: [#89 - User can't login Google on Samsung Galaxy Phone](https://github.com/SkyDominator/simulation/issues/89)
- **Previous PR**: [#90 - Solving issue #89](https://github.com/SkyDominator/simulation/pull/90)
- **Previous Research**: `docs/research/IS-89/research-00.md`
- **Implementation Plan**: `docs/plan/IS-89/plan-00.md`
- **Technical Spec**: `docs/spec/tech-details.md` (Section 5.1, 6.4)
- **PRD**: `docs/spec/prd.md` (Section 4 - Pre-Authentication Flow)

