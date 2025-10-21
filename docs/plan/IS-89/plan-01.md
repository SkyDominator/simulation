# Implementation Plan: Fix Google Login Button State in Embedded Browsers

## Overview

Fix issue #89 that persists after PR #90 merge: Google login button remains enabled in KakaoTalk in-app browser despite detection and warning systems being in place. This allows users to attempt OAuth which fails with Google's 403 error.

**Root Cause**: PR #90 implemented detection and warnings but **did not disable the Google login button** when running in embedded browsers.

**Solution**: Add `disabled` prop check for embedded browser state to prevent button clicks at UI level.

## Current State Analysis

### What PR #90 Implemented (Working)

✅ Browser detection utility (`browserDetection.ts`)
✅ Warning modal component (`EmbeddedBrowserWarningModal.tsx`)  
✅ Detection on component mount
✅ Warning banner display
✅ Modal trigger on button click

### What PR #90 Missed (Bug)

❌ **Google login button not disabled** when `isEmbeddedBrowser()` returns true
❌ **Kakao login button not disabled** when `isEmbeddedBrowser()` returns true  
❌ **No tests** for button disabled state

### Current Flow (Problematic)

```text
User in KakaoTalk → Sees warning banner → Button still clickable (RED, enabled)
  ↓
User clicks Google button (confusion)
  ↓
Modal appears: "Please open in browser"
  ↓
User frustrated: "Why was it clickable?"
```

### Expected Flow (Should Be)

```text
User in KakaoTalk → Sees warning banner → Button disabled (grayed out)
  ↓
User understands immediately: Won't work here
  ↓
No confusion, no wasted clicks
```

## What We're NOT Doing

- Changing detection logic (already works)
- Modifying modal component (already works)
- Changing banner display logic (already works)
- Changing OAuth provider configuration
- Backend changes
- Native app integration

## Implementation Approach

**Three-line fix** + comprehensive test coverage:

1. Store embedded browser state in component state variable
2. Add state check to button `disabled` prop  
3. Add tests to verify button disabled state

---

## Phase 1: Fix Button Disabled State

### Overview

Store embedded browser detection result in component state and use it to disable both Google and Kakao login buttons.

### Changes Required

#### 1. Store Embedded Browser State

**File**: `src/frontend/src/pages/LoginPage.tsx`
**Lines**: 29-31 (state section), 36-38 (useEffect)
**Changes**: Add state variable and update detection logic

**Current Code** (Lines 29-31):
```typescript
const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);
const [showEmbeddedBrowserWarning, setShowEmbeddedBrowserWarning] = useState(false);
const [showEmbeddedBanner, setShowEmbeddedBanner] = useState(false);
```

**Updated Code** (add new state):
```typescript
const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);
const [showEmbeddedBrowserWarning, setShowEmbeddedBrowserWarning] = useState(false);
const [showEmbeddedBanner, setShowEmbeddedBanner] = useState(false);
const [isEmbedded, setIsEmbedded] = useState(false);  // NEW: Store detection result
```

**Current Code** (Lines 36-38):
```typescript
useEffect(() => {
  if (isEmbeddedBrowser()) {
    setShowEmbeddedBanner(true);
  }
}, []);
```

**Updated Code** (store result in state):
```typescript
useEffect(() => {
  const embedded = isEmbeddedBrowser();
  setIsEmbedded(embedded);  // NEW: Store in state
  if (embedded) {
    setShowEmbeddedBanner(true);
  }
}, []);
```

**Rationale**:
- Single detection on mount (performance)
- State available for all render logic
- Consistent detection across component lifecycle
- Enables button disabled state

#### 2. Disable Google Login Button

**File**: `src/frontend/src/pages/LoginPage.tsx`
**Lines**: 166-173 (Google button)
**Changes**: Add embedded check to disabled prop

**Current Code**:
```typescript
<Button
  variant="contained"
  color="error"
  fullWidth
  size="large"
  onClick={() => handleSocialLogin("google")}
  disabled={!!loadingProvider}  // ❌ Only checks loading state
  data-testid="google-login"
>
  {loadingProvider === "google"
    ? "Google 로그인 중..."
    : "Google로 로그인"}
</Button>
```

**Updated Code**:
```typescript
<Button
  variant="contained"
  color="error"
  fullWidth
  size="large"
  onClick={() => handleSocialLogin("google")}
  disabled={!!loadingProvider || isEmbedded}  // ✅ Check embedded state
  data-testid="google-login"
>
  {loadingProvider === "google"
    ? "Google 로그인 중..."
    : "Google로 로그인"}
</Button>
```

**Rationale**:
- Prevents user from clicking button in embedded browsers
- Provides immediate visual feedback (grayed out button)
- Matches user expectation based on warning banner
- Prevents confusion and wasted clicks

#### 3. Disable Kakao Login Button

**File**: `src/frontend/src/pages/LoginPage.tsx`
**Lines**: 174-189 (Kakao button)
**Changes**: Add embedded check to disabled prop

**Current Code**:
```typescript
<Button
  variant="contained"
  fullWidth
  size="large"
  onClick={() => handleSocialLogin("kakao")}
  disabled={!!loadingProvider}  // ❌ Only checks loading state
  data-testid="kakao-login"
  sx={{
    backgroundColor: "#FEE500",
    color: "#000000",
    "&:hover": {
      backgroundColor: "#FDD835",
    },
    "&:disabled": {
      backgroundColor: "#E0E0E0",
      color: "#9E9E9E",
    },
  }}
>
  <img
    src="/kakao-icon.svg"
    alt="Kakao"
    style={{
      width: "20px",
      height: "20px",
      marginRight: "8px",
    }}
  />
  {loadingProvider === "kakao"
    ? "카카오 로그인 중..."
    : "카카오로 로그인"}
</Button>
```

**Updated Code**:
```typescript
<Button
  variant="contained"
  fullWidth
  size="large"
  onClick={() => handleSocialLogin("kakao")}
  disabled={!!loadingProvider || isEmbedded}  // ✅ Check embedded state
  data-testid="kakao-login"
  sx={{
    backgroundColor: "#FEE500",
    color: "#000000",
    "&:hover": {
      backgroundColor: "#FDD835",
    },
    "&:disabled": {
      backgroundColor: "#E0E0E0",
      color: "#9E9E9E",
    },
  }}
>
  <img
    src="/kakao-icon.svg"
    alt="Kakao"
    style={{
      width: "20px",
      height: "20px",
      marginRight: "8px",
    }}
  />
  {loadingProvider === "kakao"
    ? "카카오 로그인 중..."
    : "카카오로 로그인"}
</Button>
```

**Rationale**:
- Kakao OAuth may have similar restrictions
- Consistent UX for both providers
- Prevents confusion and testing edge cases
- Existing disabled styles already defined in sx prop

### Success Criteria

#### Automated Verification:
- [ ] TypeScript compilation passes: `npm run build`
- [ ] No ESLint errors: `npm run lint`
- [ ] Type checking passes for new state variable
- [ ] Existing tests still pass (no regressions)

#### Manual Verification (KakaoTalk Android):
- [ ] Open app in KakaoTalk in-app browser
- [ ] Navigate to LoginPage
- [ ] Verify warning banner appears
- [ ] Verify Google login button is disabled (grayed out)
- [ ] Verify Kakao login button is disabled (grayed out)
- [ ] Try clicking Google button → No action
- [ ] Try clicking Kakao button → No action
- [ ] Modal does NOT appear (button not clickable)

#### Manual Verification (Standard Chrome):
- [ ] Open app in Chrome browser
- [ ] Navigate to LoginPage
- [ ] Verify no warning banner appears
- [ ] Verify Google login button is enabled (clickable)
- [ ] Verify Kakao login button is enabled (clickable)
- [ ] Click Google button → OAuth flow proceeds
- [ ] OAuth login succeeds

#### Manual Verification (Other Platforms):
- [ ] Test in Facebook in-app browser → Buttons disabled
- [ ] Test in Instagram in-app browser → Buttons disabled
- [ ] Test in Safari iOS → Buttons enabled
- [ ] Test in desktop Chrome → Buttons enabled

---

## Phase 2: Test Implementation - Unit Tests

### Overview

Add comprehensive test coverage for button disabled state based on embedded browser detection.

### Changes Required

#### 1. Add Integration Tests for Button State

**File**: `src/frontend/src/test/integration/auth/embeddedBrowser.test.tsx` (UPDATE EXISTING)
**Lines**: Add new test cases to existing file
**Changes**: Add button state verification tests

**Add after existing tests**:
```typescript
describe('LoginPage Button State', () => {
  it('disables Google login button in embedded browser', () => {
    // Mock KakaoTalk user agent
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 13) KAKAOTALK 10.0.0',
      writable: true,
      configurable: true,
    });

    renderWithProviders(<LoginPage />, { withAuth: false });

    const googleButton = screen.getByTestId('google-login');
    expect(googleButton).toBeDisabled();
  });

  it('disables Kakao login button in embedded browser', () => {
    // Mock KakaoTalk user agent
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 13) KAKAOTALK 10.0.0',
      writable: true,
      configurable: true,
    });

    renderWithProviders(<LoginPage />, { withAuth: false });

    const kakaoButton = screen.getByTestId('kakao-login');
    expect(kakaoButton).toBeDisabled();
  });

  it('enables Google login button in standard browser', () => {
    // Mock Chrome user agent
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0 Mobile Safari/537.36',
      writable: true,
      configurable: true,
    });

    renderWithProviders(<LoginPage />, { withAuth: false });

    const googleButton = screen.getByTestId('google-login');
    expect(googleButton).not.toBeDisabled();
  });

  it('enables Kakao login button in standard browser', () => {
    // Mock Chrome user agent
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0 Mobile Safari/537.36',
      writable: true,
      configurable: true,
    });

    renderWithProviders(<LoginPage />, { withAuth: false });

    const kakaoButton = screen.getByTestId('kakao-login');
    expect(kakaoButton).not.toBeDisabled();
  });

  it('does not trigger modal when clicking disabled button in embedded browser', () => {
    // Mock KakaoTalk user agent
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 13) KAKAOTALK 10.0.0',
      writable: true,
      configurable: true,
    });

    renderWithProviders(<LoginPage />, { withAuth: false });

    const googleButton = screen.getByTestId('google-login');
    
    // Button is disabled, so click should not work
    fireEvent.click(googleButton);

    // Modal should not appear (button click doesn't trigger handler)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('disables buttons in Facebook in-app browser', () => {
    // Mock Facebook user agent
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 13) FBAN/FB4A',
      writable: true,
      configurable: true,
    });

    renderWithProviders(<LoginPage />, { withAuth: false });

    const googleButton = screen.getByTestId('google-login');
    const kakaoButton = screen.getByTestId('kakao-login');
    
    expect(googleButton).toBeDisabled();
    expect(kakaoButton).toBeDisabled();
  });

  it('disables buttons in Instagram in-app browser', () => {
    // Mock Instagram user agent
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Instagram 123.0.0',
      writable: true,
      configurable: true,
    });

    renderWithProviders(<LoginPage />, { withAuth: false });

    const googleButton = screen.getByTestId('google-login');
    const kakaoButton = screen.getByTestId('kakao-login');
    
    expect(googleButton).toBeDisabled();
    expect(kakaoButton).toBeDisabled();
  });

  it('enables buttons in Safari iOS', () => {
    // Mock Safari user agent
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/605.1.15',
      writable: true,
      configurable: true,
    });

    renderWithProviders(<LoginPage />, { withAuth: false });

    const googleButton = screen.getByTestId('google-login');
    const kakaoButton = screen.getByTestId('kakao-login');
    
    expect(googleButton).not.toBeDisabled();
    expect(kakaoButton).not.toBeDisabled();
  });

  it('disables buttons during loading even in standard browser', () => {
    // Mock Chrome user agent
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0',
      writable: true,
      configurable: true,
    });

    renderWithProviders(<LoginPage />, { withAuth: false });

    const googleButton = screen.getByTestId('google-login');
    
    // Click to start loading
    fireEvent.click(googleButton);

    // Button should be disabled during loading
    expect(googleButton).toBeDisabled();
  });
});
```

**Rationale**:
- Tests core requirement: button disabled in embedded browsers
- Tests control case: button enabled in standard browsers
- Tests multiple embedded browser types
- Tests loading state doesn't interfere
- Tests that disabled button doesn't trigger modal
- Comprehensive coverage of edge cases

### Success Criteria

#### Automated Verification:
- [ ] All new tests pass: `npx vitest run src/test/integration --reporter=verbose`
- [ ] Test coverage ≥90% for LoginPage button logic
- [ ] No flaky tests (run 10 times, all pass)
- [ ] Tests run in CI/CD pipeline successfully

#### Manual Verification:
- [ ] Tests execute in <5 seconds
- [ ] Test output is clear and descriptive
- [ ] Failures provide actionable error messages
- [ ] Tests don't require external dependencies

---

## Phase 3: Test Implementation - E2E Tests

### Overview

Add E2E tests using Playwright to verify button disabled state in real browser environments with different user agents.

### Changes Required

#### 1. Add E2E Tests for Button State

**File**: `src/frontend/e2e/auth/embedded-browser.spec.ts` (UPDATE EXISTING)
**Lines**: Add new test cases to existing file
**Changes**: Add button state verification tests

**Add after existing tests**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Login Button State in Embedded Browsers', () => {
  test('Google button disabled in KakaoTalk browser', async ({ page }) => {
    // Set KakaoTalk user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Linux; Android 13) KAKAOTALK 10.0.0 Mobile'
    );

    await page.goto('/');
    
    // Complete whitelist and OTP flow if needed
    // ... (navigate to login page)

    // Check button state
    const googleButton = page.getByTestId('google-login');
    await expect(googleButton).toBeDisabled();
    
    // Verify visual appearance (grayed out)
    const buttonClass = await googleButton.getAttribute('class');
    expect(buttonClass).toContain('Mui-disabled');
  });

  test('Kakao button disabled in KakaoTalk browser', async ({ page }) => {
    // Set KakaoTalk user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Linux; Android 13) KAKAOTALK 10.0.0 Mobile'
    );

    await page.goto('/');
    
    // Navigate to login page
    // ... (complete pre-auth flows)

    // Check button state
    const kakaoButton = page.getByTestId('kakao-login');
    await expect(kakaoButton).toBeDisabled();
  });

  test('Both buttons enabled in Chrome browser', async ({ page }) => {
    // Use default Chrome user agent (standard browser)
    await page.goto('/');
    
    // Navigate to login page
    // ... (complete pre-auth flows)

    // Check button states
    const googleButton = page.getByTestId('google-login');
    const kakaoButton = page.getByTestId('kakao-login');
    
    await expect(googleButton).not.toBeDisabled();
    await expect(kakaoButton).not.toBeDisabled();
  });

  test('Buttons disabled in Facebook browser', async ({ page }) => {
    // Set Facebook in-app browser user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Linux; Android 13) FBAN/FB4A'
    );

    await page.goto('/');
    
    // Navigate to login page
    // ... (complete pre-auth flows)

    // Check button states
    const googleButton = page.getByTestId('google-login');
    const kakaoButton = page.getByTestId('kakao-login');
    
    await expect(googleButton).toBeDisabled();
    await expect(kakaoButton).toBeDisabled();
  });

  test('Disabled button click does not trigger modal', async ({ page }) => {
    // Set KakaoTalk user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Linux; Android 13) KAKAOTALK 10.0.0 Mobile'
    );

    await page.goto('/');
    
    // Navigate to login page
    // ... (complete pre-auth flows)

    const googleButton = page.getByTestId('google-login');
    
    // Verify button is disabled
    await expect(googleButton).toBeDisabled();
    
    // Try to click (should not work)
    await googleButton.click({ force: true });
    
    // Modal should not appear
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('Warning banner appears with disabled buttons', async ({ page }) => {
    // Set KakaoTalk user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Linux; Android 13) KAKAOTALK 10.0.0 Mobile'
    );

    await page.goto('/');
    
    // Navigate to login page
    // ... (complete pre-auth flows)

    // Check banner and buttons together
    const banner = page.getByRole('alert');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('앱 내부 브라우저에서는 Google 로그인이 제한됩니다');
    
    const googleButton = page.getByTestId('google-login');
    await expect(googleButton).toBeDisabled();
  });
});
```

**Rationale**:
- Tests in real browser environment
- Validates user agent detection in browser
- Tests visual appearance of disabled state
- Confirms modal doesn't appear on disabled button
- Tests banner + disabled button together
- Mobile Chrome project configuration

### Success Criteria

#### Automated Verification:
- [ ] All E2E tests pass: `npx playwright test --project="Mobile Chrome" e2e/auth/embedded-browser.spec.ts`
- [ ] Tests run in CI/CD pipeline (staging deployment)
- [ ] Test reports generated on failure
- [ ] Screenshots captured on failure

#### Manual Verification:
- [ ] Tests run against staging environment
- [ ] Tests complete in <30 seconds
- [ ] Test output shows clear pass/fail status
- [ ] Failures include actionable debugging info

---

## Phase 4: Documentation Updates

### Overview

Update documentation to reflect the fix and guide future developers.

### Changes Required

#### 1. Update Technical Specification

**File**: `docs/spec/tech-details.md`
**Section**: 6.4 Embedded Browser OAuth
**Changes**: Add button disabled state to solution

**Add after existing content**:
```markdown
### Button State Management

**Implementation**: `src/frontend/src/pages/LoginPage.tsx:29-31, 36-38, 166-189`

When embedded browser is detected:
1. `isEmbedded` state is set to `true`
2. Google login button `disabled` prop: `disabled={!!loadingProvider || isEmbedded}`
3. Kakao login button `disabled` prop: `disabled={!!loadingProvider || isEmbedded}`

**Visual Feedback**:
- Disabled buttons appear grayed out (MUI default disabled styling)
- Kakao button uses custom disabled styles: `backgroundColor: "#E0E0E0", color: "#9E9E9E"`
- Warning banner above buttons explains why disabled

**User Experience**:
- Immediate visual feedback: Users see button is disabled
- No confusion: Users don't attempt impossible action
- Clear guidance: Banner explains situation and solution
```

**Rationale**:
- Documents the complete solution
- Explains visual feedback mechanism
- Guides future maintainers

#### 2. Update PRD with UX Pattern

**File**: `docs/spec/prd.md`
**Section**: 6 User Interface - Pre-Authentication Pages - Login Page
**Changes**: Add button state pattern

**Add after existing Login Page content**:
```markdown
- **Embedded Browser Detection**:
  - Warning banner when detected (dismissible)
  - Google/Kakao login buttons disabled (grayed out)
  - Tooltip or banner explains why disabled (optional)
  - "브라우저에서 열기" guidance in banner
```

**Rationale**:
- Updates product requirements to match implementation
- Documents expected UX pattern
- Aligns spec with reality

### Success Criteria

#### Automated Verification:
- [ ] Markdown files pass linting
- [ ] Links in documentation are valid
- [ ] No broken internal references

#### Manual Verification:
- [ ] Documentation accurately describes implementation
- [ ] Technical details are correct
- [ ] User guide is clear and actionable
- [ ] Future developers can understand solution

---

## Implementation Checklist

### Phase 1: Fix Button Disabled State

- [ ] Add `isEmbedded` state variable to LoginPage (line ~31)
- [ ] Update useEffect to store detection result in state (lines 36-38)
- [ ] Add `|| isEmbedded` to Google button disabled prop (line ~170)
- [ ] Add `|| isEmbedded` to Kakao button disabled prop (line ~181)
- [ ] Run TypeScript compilation: `npm run build`
- [ ] Run ESLint: `npm run lint`
- [ ] Test in KakaoTalk Android browser (buttons disabled)
- [ ] Test in Chrome Android browser (buttons enabled)
- [ ] Test in Facebook in-app browser (buttons disabled)
- [ ] Test in Safari iOS (buttons enabled)
- [ ] Verify no regression in standard OAuth flow

### Phase 2: Test Implementation - Unit Tests

- [ ] Open `src/frontend/src/test/integration/auth/embeddedBrowser.test.tsx`
- [ ] Add test: "disables Google login button in embedded browser"
- [ ] Add test: "disables Kakao login button in embedded browser"
- [ ] Add test: "enables Google login button in standard browser"
- [ ] Add test: "enables Kakao login button in standard browser"
- [ ] Add test: "does not trigger modal when clicking disabled button"
- [ ] Add test: "disables buttons in Facebook in-app browser"
- [ ] Add test: "disables buttons in Instagram in-app browser"
- [ ] Add test: "enables buttons in Safari iOS"
- [ ] Add test: "disables buttons during loading"
- [ ] Run tests: `npx vitest run src/test/integration --reporter=verbose`
- [ ] Verify all tests pass locally
- [ ] Verify test coverage ≥90%
- [ ] Run tests 10 times (check for flakiness)

### Phase 3: Test Implementation - E2E Tests

- [ ] Open `src/frontend/e2e/auth/embedded-browser.spec.ts`
- [ ] Add test: "Google button disabled in KakaoTalk browser"
- [ ] Add test: "Kakao button disabled in KakaoTalk browser"
- [ ] Add test: "Both buttons enabled in Chrome browser"
- [ ] Add test: "Buttons disabled in Facebook browser"
- [ ] Add test: "Disabled button click does not trigger modal"
- [ ] Add test: "Warning banner appears with disabled buttons"
- [ ] Run tests: `npx playwright test --project="Mobile Chrome" e2e/auth/embedded-browser.spec.ts`
- [ ] Verify all tests pass locally
- [ ] Test against staging environment
- [ ] Verify tests pass in CI/CD pipeline

### Phase 4: Documentation Updates

- [ ] Update `docs/spec/tech-details.md` Section 6.4
- [ ] Add button state management documentation
- [ ] Update `docs/spec/prd.md` Login Page section
- [ ] Add embedded browser detection UI pattern
- [ ] Run markdown linting
- [ ] Verify all internal links work
- [ ] Review documentation for clarity

### Final Verification

- [ ] All automated tests pass (unit + integration + E2E)
- [ ] All manual test scenarios pass
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Test coverage ≥80% for changed code
- [ ] Documentation updated and reviewed
- [ ] PR ready for review