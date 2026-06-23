# Implementation Plan: Fix Google OAuth in Embedded Browser

## Overview

Fix Google OAuth login failure in KakaoTalk in-app webview on Samsung Galaxy Android devices (Issue #89). Implement webview detection and guide users to open the application in a standard browser where Google OAuth will function properly.

**Approach**: Approach 1 - Detect and Redirect to External Browser (Recommended)

## Current State Analysis

The application fails Google OAuth authentication when accessed through embedded browsers (in-app webviews) like KakaoTalk on Android devices. The issue is caused by:

1. **Google's Security Policy**: Blocks OAuth in embedded/in-app browsers with error "403: disallowed_useragent"
2. **No Webview Detection**: Application doesn't detect embedded browser environments
3. **Generic Error Handling**: Doesn't provide actionable guidance for webview scenarios
4. **Single OAuth Flow**: Only supports standard browser redirect flow without fallback

**Working Platforms**:

- iPhone 11 Pro (iOS 18.1.1) with Chrome - WORKS
- Desktop browsers (Windows 11 Chrome) - Works
- Samsung Galaxy A32 (Android 13) in standard Chrome - Expected to work
- Samsung Galaxy A32 (Android 13) in KakaoTalk webview - FAILS

**Key Code Locations**:

- OAuth Handler: `src/frontend/src/pages/LoginPage.tsx:28-50`
- Supabase Client: `src/frontend/src/supabaseClient.ts:16-22`
- Auth Context: `src/frontend/src/context/AuthContext.tsx:56-92`

## What We're NOT Doing

- Implementing native Google Sign-In SDK (future enhancement)
- Modifying Supabase OAuth configuration on server side
- Changing backend JWT validation logic
- Requesting Google to whitelist KakaoTalk webview (not feasible)
- Supporting OAuth in embedded browsers (violates Google's policy)
- Making changes to Kakao OAuth provider (may work differently)

## Implementation Approach

Implement a three-layer solution:

1. **Detection Layer**: Identify when user is in embedded browser
2. **Prevention Layer**: Block OAuth attempt and show guidance modal
3. **Guidance Layer**: Provide clear instructions and "Open in Browser" button

This maintains security (uses Google's standard OAuth), provides good UX (clear guidance), and requires minimal code changes.

---

## Phase 1: Browser Detection Utility

### Overview

Create utility functions to detect embedded/in-app browsers and provide browser type information.

### Changes Required

#### 1. Create Browser Detection Utility

**File**: `src/frontend/src/utils/browserDetection.ts` (NEW)
**Changes**: Create new utility file with detection logic

```typescript
/**
 * Browser detection utilities for identifying embedded/in-app browsers
 * that don't support standard OAuth flows.
 */

/**
 * Detects if the current browser is an embedded/in-app browser
 * @returns true if running in an embedded browser, false otherwise
 */
export function isEmbeddedBrowser(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent || navigator.vendor || "";

  // Common in-app browser markers
  const embeddedMarkers = [
    "KAKAOTALK", // KakaoTalk in-app browser
    "wv", // Android WebView
    "WebView", // Generic WebView
    "FBAN", // Facebook App
    "FBAV", // Facebook App (alternative)
    "Instagram", // Instagram in-app browser
    "Twitter", // Twitter in-app browser
    "Line", // Line messenger
    "Naver", // Naver app
  ];

  return embeddedMarkers.some((marker) => ua.includes(marker));
}

/**
 * Gets the browser type classification
 * @returns Browser type: 'standard', 'embedded', or 'unknown'
 */
export function getBrowserType(): "standard" | "embedded" | "unknown" {
  if (typeof window === "undefined") return "unknown";

  if (isEmbeddedBrowser()) return "embedded";
  return "standard";
}

/**
 * Gets the current browser name for display purposes
 * @returns Browser name or 'Unknown'
 */
export function getBrowserName(): string {
  if (typeof window === "undefined") return "Unknown";

  const ua = navigator.userAgent || navigator.vendor || "";

  // Detect specific in-app browsers
  if (ua.includes("KAKAOTALK")) return "KakaoTalk";
  if (ua.includes("FBAN") || ua.includes("FBAV")) return "Facebook";
  if (ua.includes("Instagram")) return "Instagram";
  if (ua.includes("Twitter")) return "Twitter";
  if (ua.includes("Line")) return "Line";
  if (ua.includes("Naver")) return "Naver";

  // Detect standard browsers
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("SamsungBrowser")) return "Samsung Internet";

  return "Unknown";
}

/**
 * Generates a URL to open the current page in the system default browser
 * @returns URL string with intent:// scheme for Android or current URL for iOS
 */
export function getExternalBrowserUrl(): string {
  const currentUrl = window.location.href;

  // Detect platform
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isAndroid) {
    // Android intent URL to open in external browser
    // Format: intent://<host><path>#Intent;scheme=https;end
    const url = new URL(currentUrl);
    return `intent://${url.host}${url.pathname}${url.search}${url.hash}#Intent;scheme=https;end`;
  }

  // For iOS and other platforms, return the direct URL
  // iOS will prompt user to choose browser when clicked
  return currentUrl;
}

/**
 * Attempts to open the current page in the system default browser
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function openInExternalBrowser(): Promise<boolean> {
  try {
    const externalUrl = getExternalBrowserUrl();
    window.location.href = externalUrl;
    return true;
  } catch (error) {
    console.error("Failed to open external browser:", error);
    return false;
  }
}
```

**Rationale**:

- Centralized detection logic for maintainability
- Comprehensive marker list covers major in-app browsers
- Platform-specific URL generation for best UX
- Pure functions for easy testing

### Success Criteria

#### Automated Verification:

- [ ] TypeScript compilation passes: `npm run build`
- [ ] No ESLint errors in new file
- [ ] Export statements are valid
- [ ] All functions return expected types

#### Manual Verification:

- [ ] `isEmbeddedBrowser()` returns true in KakaoTalk webview
- [ ] `isEmbeddedBrowser()` returns false in Chrome browser
- [ ] `getBrowserName()` correctly identifies KakaoTalk
- [ ] `getBrowserName()` correctly identifies Chrome
- [ ] `getExternalBrowserUrl()` generates valid Android intent URL
- [ ] `openInExternalBrowser()` successfully opens Chrome on Android

---

## Phase 2: Embedded Browser Warning Modal

### Overview

Create a modal component that displays when users attempt OAuth login from an embedded browser, providing clear guidance and action buttons.

### Changes Required

#### 1. Create Warning Modal Component

**File**: `src/frontend/src/components/EmbeddedBrowserWarningModal.tsx` (NEW)
**Changes**: Create new modal component

```typescript
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  List,
  ListItem,
  ListItemText,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import OpenInBrowserIcon from '@mui/icons-material/OpenInBrowser';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { openInExternalBrowser, getBrowserName } from '../utils/browserDetection';

interface EmbeddedBrowserWarningModalProps {
  open: boolean;
  onClose: () => void;
  browserName?: string;
}

/**
 * Modal that warns users about OAuth limitations in embedded browsers
 * and guides them to open the app in a standard browser.
 */
export const EmbeddedBrowserWarningModal: React.FC<EmbeddedBrowserWarningModalProps> = ({
  open,
  onClose,
  browserName,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const detectedBrowser = browserName || getBrowserName();

  const handleOpenInBrowser = async () => {
    const success = await openInExternalBrowser();
    if (success) {
      // Close modal as user is being redirected
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      aria-labelledby="embedded-browser-warning-title"
      aria-describedby="embedded-browser-warning-description"
    >
      <DialogTitle id="embedded-browser-warning-title">
        <Box display="flex" alignItems="center" gap={1}>
          <InfoOutlinedIcon color="warning" />
          <Typography variant="h6" component="span">
            브라우저에서 열어주세요
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Alert severity="warning" sx={{ mb: 2 }}>
          현재 {detectedBrowser} 앱 내부 브라우저에서 실행 중입니다.
          Google 로그인은 보안 정책상 표준 브라우저에서만 지원됩니다.
        </Alert>

        <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
          아래 버튼을 눌러 <strong>Chrome</strong> 또는 <strong>Safari</strong>와 같은
          일반 브라우저에서 열어주세요.
        </Typography>

        <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, border: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom color="primary">
            💡 수동으로 여는 방법
          </Typography>
          <List dense>
            <ListItem sx={{ pl: 0 }}>
              <ListItemText
                primary="1. 화면 오른쪽 상단의 메뉴(⋮) 버튼을 누르세요"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem sx={{ pl: 0 }}>
              <ListItemText
                primary="2. '다른 브라우저로 열기' 또는 '외부 브라우저에서 열기'를 선택하세요"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem sx={{ pl: 0 }}>
              <ListItemText
                primary="3. Chrome 또는 Safari를 선택하세요"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          </List>
        </Box>

        <Typography variant="caption" display="block" sx={{ mt: 2 }} color="text.secondary">
          이는 Google의 보안 정책에 따른 제한이며, 사용자의 계정 보안을 위한 조치입니다.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} color="inherit">
          취소
        </Button>
        <Button
          onClick={handleOpenInBrowser}
          variant="contained"
          startIcon={<OpenInBrowserIcon />}
          color="primary"
        >
          브라우저에서 열기
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmbeddedBrowserWarningModal;
```

**Rationale**:

- Material-UI Dialog for consistent design
- Clear, actionable Korean language instructions
- Visual hierarchy with icons and alerts
- Responsive design (full-screen on mobile)
- Accessibility attributes (aria-labels)
- Manual fallback instructions for when auto-open fails

### Success Criteria

#### Automated Verification:

- [ ] TypeScript compilation passes
- [ ] No ESLint errors
- [ ] Component exports correctly
- [ ] All MUI imports resolve

#### Manual Verification:

- [ ] Modal displays with correct Korean text
- [ ] "브라우저에서 열기" button triggers external browser open
- [ ] "취소" button closes modal
- [ ] Modal is full-screen on mobile devices
- [ ] Modal is dialog on desktop devices
- [ ] Icons display correctly
- [ ] Manual instructions are clear and readable
- [ ] Alert box has warning styling

---

## Phase 3: Integrate Detection into Login Flow

### Overview

Integrate webview detection into the LoginPage to prevent OAuth attempts in embedded browsers and show the warning modal instead.

### Changes Required

#### 1. Update LoginPage OAuth Handler

**File**: `src/frontend/src/pages/LoginPage.tsx`
**Lines**: 28-50 (OAuth handler), 105-112 (Google button)
**Changes**: Add webview detection before OAuth attempt

```typescript
// Add imports at top of file (after existing imports)
import { isEmbeddedBrowser } from '../utils/browserDetection';
import EmbeddedBrowserWarningModal from '../components/EmbeddedBrowserWarningModal';

// Add state for modal (after existing state declarations around line 20)
const [showEmbeddedBrowserWarning, setShowEmbeddedBrowserWarning] = useState(false);

// Modify handleSocialLogin function (lines 28-50)
const handleSocialLogin = async (provider: OAuthProvider) => {
  if (loadingProvider) return; // prevent double clicks

  // Check if running in embedded browser before attempting OAuth
  if (isEmbeddedBrowser()) {
    console.warn(`OAuth blocked: Running in embedded browser. Provider: ${provider}`);
    setShowEmbeddedBrowserWarning(true);
    return;
  }

  setError(null);
  setLoadingProvider(provider);
  try {
    if (e2eMode) {
      // E2E mode handling...
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
  } catch (err) {
    console.error(`${provider} login error:`, err);
    setError("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
    setLoadingProvider(null);
  }
};

// Add modal component before closing tag of main component return (around line 120)
<EmbeddedBrowserWarningModal
  open={showEmbeddedBrowserWarning}
  onClose={() => setShowEmbeddedBrowserWarning(false)}
/>
```

**Detailed Changes**:

**Import Section** (add after existing imports):

```typescript
import { isEmbeddedBrowser } from "../utils/browserDetection";
import EmbeddedBrowserWarningModal from "../components/EmbeddedBrowserWarningModal";
```

**State Section** (add after line ~20):

```typescript
const [showEmbeddedBrowserWarning, setShowEmbeddedBrowserWarning] =
  useState(false);
```

**Handler Function** (replace lines 28-50):

```typescript
const handleSocialLogin = async (provider: OAuthProvider) => {
  if (loadingProvider) return; // prevent double clicks

  // Check if running in embedded browser before attempting OAuth
  if (isEmbeddedBrowser()) {
    console.warn(
      `OAuth blocked: Running in embedded browser. Provider: ${provider}`,
    );
    setShowEmbeddedBrowserWarning(true);
    return;
  }

  setError(null);
  setLoadingProvider(provider);
  try {
    if (e2eMode) {
      // E2E testing mode handling
      const { error } = await supabase.auth.signInWithPassword({
        email: `${provider}@test.com`,
        password: "testpassword",
      });
      if (error) throw error;
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
  } catch (err) {
    console.error(`${provider} login error:`, err);
    setError("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
    setLoadingProvider(null);
  }
};
```

**Render Section** (add before closing Container tag around line 120):

```typescript
      {/* Embedded Browser Warning Modal */}
      <EmbeddedBrowserWarningModal
        open={showEmbeddedBrowserWarning}
        onClose={() => setShowEmbeddedBrowserWarning(false)}
      />
```

**Rationale**:

- Early detection prevents unnecessary OAuth attempts
- Console warning for debugging
- Modal provides clear user guidance
- No changes to successful OAuth flow
- Maintains existing error handling

#### 2. Add Detection Warning on Page Load (Optional Enhancement)

**File**: `src/frontend/src/pages/LoginPage.tsx`
**Lines**: Add new useEffect after existing hooks
**Changes**: Show persistent warning banner for embedded browsers

```typescript
// Add state for banner visibility (after other state declarations)
const [showEmbeddedBanner, setShowEmbeddedBanner] = useState(false);

// Add useEffect to detect on mount (after existing useEffect hooks)
useEffect(() => {
  if (isEmbeddedBrowser()) {
    setShowEmbeddedBanner(true);
  }
}, []);

// Add Alert banner in render section (after error Alert, before buttons)
{showEmbeddedBanner && (
  <Alert
    severity="warning"
    onClose={() => setShowEmbeddedBanner(false)}
    sx={{ mb: 2 }}
  >
    <Typography variant="body2">
      앱 내부 브라우저에서는 Google 로그인이 제한됩니다.
      일반 브라우저(Chrome, Safari)에서 열어주세요.
    </Typography>
  </Alert>
)}
```

**Rationale**:

- Proactive user education
- Visible before user attempts login
- Dismissible for users who understand
- Complements modal warning

### Success Criteria

#### Automated Verification:

- [ ] TypeScript compilation passes: `npm run build`
- [ ] No ESLint errors
- [ ] Imports resolve correctly
- [ ] Type checking passes

#### Manual Verification (Android KakaoTalk):

- [ ] Open app in KakaoTalk in-app browser
- [ ] Warning banner appears on LoginPage (if optional enhancement added)
- [ ] Click "Google로 로그인" button
- [ ] Warning modal appears immediately (no OAuth redirect)
- [ ] Console shows warning message
- [ ] Click "브라우저에서 열기" button
- [ ] Chrome opens with app URL
- [ ] Google login works in Chrome

#### Manual Verification (Standard Browser):

- [ ] Open app in Chrome browser directly
- [ ] No warning banner appears
- [ ] Click "Google로 로그인" button
- [ ] No warning modal appears
- [ ] Google OAuth flow proceeds normally
- [ ] Login succeeds

---

## Phase 4: Error Handling Enhancement

### Overview

Improve error handling to detect Google's 403 OAuth errors and provide specific guidance for embedded browser issues.

### Changes Required

#### 1. Add OAuth Error Detection

**File**: `src/frontend/src/pages/LoginPage.tsx`
**Lines**: 47-50 (error handler in handleSocialLogin)
**Changes**: Enhanced error detection and messaging

```typescript
// Replace catch block in handleSocialLogin (lines 47-50)
  } catch (err: any) {
    console.error(`${provider} login error:`, err);

    // Check if error is related to embedded browser
    const errorMessage = err?.message || '';
    const isOAuthError = errorMessage.includes('403') ||
                         errorMessage.includes('disallowed_useragent') ||
                         errorMessage.includes('secure browser');

    if (isOAuthError && isEmbeddedBrowser()) {
      // OAuth failed due to embedded browser
      setShowEmbeddedBrowserWarning(true);
      setError(null); // Clear generic error
    } else {
      // Other errors
      setError("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
    }

    setLoadingProvider(null);
  }
```

**Rationale**:

- Catches OAuth failures that slip through detection
- Provides specific guidance for OAuth errors
- Maintains generic error for other failures
- Defensive programming for edge cases

#### 2. Add Network Error Detection

**File**: `src/frontend/src/pages/LoginPage.tsx`
**Lines**: Same catch block
**Changes**: Add network timeout detection

```typescript
// Enhanced catch block with network detection
  } catch (err: any) {
    console.error(`${provider} login error:`, err);

    // Check for network errors
    const errorMessage = err?.message || '';
    const isNetworkError = errorMessage.includes('fetch') ||
                           errorMessage.includes('network') ||
                           errorMessage.includes('timeout');

    // Check for OAuth policy errors
    const isOAuthPolicyError = errorMessage.includes('403') ||
                               errorMessage.includes('disallowed_useragent') ||
                               errorMessage.includes('secure browser');

    if (isOAuthPolicyError && isEmbeddedBrowser()) {
      // OAuth blocked by Google in embedded browser
      setShowEmbeddedBrowserWarning(true);
      setError(null);
    } else if (isNetworkError) {
      setError("네트워크 연결을 확인해주세요.");
    } else {
      // Generic error
      setError("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
    }

    setLoadingProvider(null);
  }
```

**Rationale**:

- Distinguishes between error types
- Provides actionable messages
- Helps with debugging
- Better user experience

### Success Criteria

#### Automated Verification:

- [ ] TypeScript compilation passes
- [ ] Error handling logic doesn't break existing flow
- [ ] All code paths set loadingProvider to null

#### Manual Verification:

- [ ] Simulated 403 error shows warning modal
- [ ] Network error shows network message
- [ ] Other errors show generic message
- [ ] Error state resets properly between attempts

---

## Phase 5: Testing Strategy

### Overview

Define comprehensive testing approach covering all test types from the project's test infrastructure: unit tests, component tests, integration tests, and E2E tests using Playwright.

### Test Infrastructure

Based on project configuration:

- **Test Runner**: Vitest for unit/component/integration tests
- **E2E Framework**: Playwright with Mobile Chrome project
- **Test Locations**:
  - `src/frontend/src/test/utils/` - Utility function tests
  - `src/frontend/src/test/components/` - Component tests
  - `src/frontend/src/test/pages/` - Page-level unit tests
  - `src/frontend/src/test/integration/` - Integration tests
  - `src/frontend/e2e/` - Playwright E2E tests

### Test Types Overview

#### 1. Unit Tests (Utility Functions)

**Location**: `src/frontend/src/test/utils/browserDetection.test.ts`
**Purpose**: Test browser detection utility functions in isolation
**Coverage**:

- `isEmbeddedBrowser()` - All embedded browser markers
- `getBrowserType()` - Type classification logic
- `getBrowserName()` - Browser name identification
- `getExternalBrowserUrl()` - Platform-specific URL generation
- `openInExternalBrowser()` - External browser launch

**Run Command**: `npx vitest run src/test/utils --reporter=verbose`

#### 2. Component Tests

**Location**: `src/frontend/src/test/components/EmbeddedBrowserWarningModal.test.tsx`
**Purpose**: Test modal component rendering and interactions
**Coverage**:

- Modal visibility based on props
- Button click handlers
- Custom browser name display
- Accessibility attributes
- Responsive behavior

**Run Command**: `npx vitest run src/test/components --reporter=verbose`

#### 3. Page Unit Tests

**Location**: `src/frontend/src/test/pages/LoginPage.test.tsx` (update existing)
**Purpose**: Test LoginPage with embedded browser detection logic
**Coverage**:

- Detection check before OAuth attempt
- Modal state management
- Error handling with detection
- Integration with browser detection utils

**Run Command**: `npx vitest run src/test/pages --reporter=verbose`

#### 4. Integration Tests

**Location**: `src/frontend/src/test/integration/auth/embeddedBrowser.test.ts`
**Purpose**: Test full flow from detection to modal display to redirect
**Coverage**:

- LoginPage + Modal integration
- Detection → Modal → External browser flow
- Error recovery paths
- State management across components

**Run Command**: `npx vitest run src/test/integration --reporter=verbose`

#### 5. E2E Tests (Playwright)

**Location**: `src/frontend/e2e/auth/embedded-browser.spec.ts`
**Purpose**: Test real browser behavior with user agents
**Coverage**:

- Simulated embedded browser detection
- Full OAuth flow in standard browser
- Mobile Chrome viewport
- Real DOM interactions

**Run Command**: `npx playwright test --project="Mobile Chrome" e2e/auth/embedded-browser.spec.ts`

### CI/CD Integration

Tests run in this order (matching `ci-cd.yml`):

1. **test-unit** job:
   - Frontend: `src/test/pages`, `src/test/components`, `src/test/smoke.test.tsx`
   - Includes new utility and component tests

2. **test-integration** job:
   - Frontend: `src/test/integration`
   - Includes new embedded browser integration tests

3. **test-e2e** job (optional):
   - Playwright: `e2e/` directory
   - Runs against staging deployment
   - Mobile Chrome project

### Detailed Test Scenarios

#### E2E Test Case 1: KakaoTalk Android Embedded Browser

**Environment**: Samsung Galaxy A32, Android 13, KakaoTalk app

**Steps**:

1. Send app URL in KakaoTalk chat
2. Click link (opens in KakaoTalk webview)
3. Navigate to login page
4. Observe warning banner (if optional enhancement added)
5. Click "Google로 로그인"
6. Verify warning modal appears
7. Click "브라우저에서 열기"
8. Verify Chrome opens with app URL
9. Complete Google OAuth in Chrome
10. Verify login succeeds

**Expected**:

- Modal appears before OAuth attempt
- Chrome opens successfully
- OAuth works in Chrome
- No 403 error

#### E2E Test Case 2: Direct Chrome Access (Control)

**Environment**: Samsung Galaxy A32, Android 13, Chrome browser

**Steps**:

1. Open Chrome
2. Navigate to app URL
3. Navigate to login page
4. Observe no warning banner
5. Click "Google로 로그인"
6. Verify no warning modal
7. Complete Google OAuth
8. Verify login succeeds

**Expected**:

- No modal appears
- OAuth proceeds normally
- Login succeeds

#### E2E Test Case 3: Facebook In-App Browser

**Environment**: Any device, Facebook app

**Steps**:

1. Share app URL in Facebook
2. Click link (opens in Facebook webview)
3. Navigate to login page
4. Click "Google로 로그인"
5. Verify warning modal appears
6. Test external browser redirect

**Expected**:

- Facebook webview detected
- Modal appears
- External browser opens

#### E2E Test Case 4: iOS Safari (Control)

**Environment**: iPhone, Safari browser

**Steps**:

1. Open Safari
2. Navigate to app URL
3. Navigate to login page
4. Click "Google로 로그인"
5. Complete OAuth
6. Verify login succeeds

**Expected**:

- No detection (Safari is standard browser)
- OAuth works normally

### Edge Cases

#### Edge Case 1: Unknown Embedded Browser

**Scenario**: New in-app browser not in detection list

**Expected**:

- Detection misses
- OAuth attempt proceeds
- 403 error caught
- Modal shown via error handler

#### Edge Case 2: External Browser Redirect Fails

**Scenario**: Android intent URL doesn't work

**Expected**:

- Modal shows manual instructions
- User can follow 3-step guide
- Fallback path available

#### Edge Case 3: User Dismisses Modal

**Scenario**: User clicks "취소" without following guidance

**Expected**:

- Modal closes
- User can retry
- Warning banner remains (if optional enhancement added)

---

## Phase 6: Test Implementation

### Overview

Implement all test code following the project's test structure: utility tests, component tests, page tests, integration tests, and E2E tests.

### Changes Required

#### 1. Unit Tests: Browser Detection Utilities

**File**: `src/frontend/src/test/utils/browserDetection.test.ts` (NEW)
**Changes**: Create test suite

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isEmbeddedBrowser,
  getBrowserType,
  getBrowserName,
  getExternalBrowserUrl,
} from "../browserDetection";

describe("browserDetection", () => {
  beforeEach(() => {
    // Reset window.navigator mock
    vi.resetAllMocks();
  });

  describe("isEmbeddedBrowser", () => {
    it("returns true for KakaoTalk browser", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 (Linux; Android 13) KAKAOTALK 10.0.0",
        writable: true,
      });
      expect(isEmbeddedBrowser()).toBe(true);
    });

    it("returns true for Android WebView", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 (Linux; Android 13; wv) AppleWebKit/537.36",
        writable: true,
      });
      expect(isEmbeddedBrowser()).toBe(true);
    });

    it("returns true for Facebook in-app browser", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 (Linux; Android 13) FBAN/FB4A",
        writable: true,
      });
      expect(isEmbeddedBrowser()).toBe(true);
    });

    it("returns false for Chrome browser", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0",
        writable: true,
      });
      expect(isEmbeddedBrowser()).toBe(false);
    });

    it("returns false for Safari browser", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/605.1.15",
        writable: true,
      });
      expect(isEmbeddedBrowser()).toBe(false);
    });
  });

  describe("getBrowserType", () => {
    it('returns "embedded" for KakaoTalk', () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "KAKAOTALK",
        writable: true,
      });
      expect(getBrowserType()).toBe("embedded");
    });

    it('returns "standard" for Chrome', () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Chrome/120.0.0.0",
        writable: true,
      });
      expect(getBrowserType()).toBe("standard");
    });
  });

  describe("getBrowserName", () => {
    it("identifies KakaoTalk", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "KAKAOTALK",
        writable: true,
      });
      expect(getBrowserName()).toBe("KakaoTalk");
    });

    it("identifies Chrome", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Chrome/120.0.0.0 Safari/537.36",
        writable: true,
      });
      expect(getBrowserName()).toBe("Chrome");
    });

    it("identifies Samsung Internet", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "SamsungBrowser/23.0",
        writable: true,
      });
      expect(getBrowserName()).toBe("Samsung Internet");
    });
  });

  describe("getExternalBrowserUrl", () => {
    it("generates Android intent URL", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Android",
        writable: true,
      });

      Object.defineProperty(window, "location", {
        value: {
          href: "https://simulation.LOLCLUB.com/login",
          host: "simulation.LOLCLUB.com",
          pathname: "/login",
          search: "",
          hash: "",
        },
        writable: true,
      });

      const result = getExternalBrowserUrl();
      expect(result).toContain("intent://");
      expect(result).toContain("simulation.LOLCLUB.com/login");
      expect(result).toContain("#Intent;scheme=https;end");
    });

    it("returns direct URL for iOS", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "iPhone",
        writable: true,
      });

      Object.defineProperty(window, "location", {
        value: {
          href: "https://simulation.LOLCLUB.com/login",
        },
        writable: true,
      });

      const result = getExternalBrowserUrl();
      expect(result).toBe("https://simulation.LOLCLUB.com/login");
    });
  });
});
```

**Rationale**:

- Comprehensive test coverage
- Tests all detection markers
- Platform-specific URL generation
- Verifies edge cases

**Run Command**: `npx vitest run src/test/utils/browserDetection.test.ts --reporter=verbose`

#### 2. Component Tests: Warning Modal

**File**: `src/frontend/src/test/components/EmbeddedBrowserWarningModal.test.tsx` (NEW)

**Changes**: Create component test

```ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmbeddedBrowserWarningModal from '../EmbeddedBrowserWarningModal';
import * as browserDetection from '../../utils/browserDetection';

// Mock the browser detection module
vi.mock('../../utils/browserDetection', () => ({
  getBrowserName: vi.fn(() => 'KakaoTalk'),
  openInExternalBrowser: vi.fn(() => Promise.resolve(true)),
}));

describe('EmbeddedBrowserWarningModal', () => {
  it('renders when open prop is true', () => {
    render(
      <EmbeddedBrowserWarningModal
        open={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('브라우저에서 열어주세요')).toBeInTheDocument();
    expect(screen.getByText(/KakaoTalk 앱 내부 브라우저/)).toBeInTheDocument();
  });

  it('does not render when open prop is false', () => {
    render(
      <EmbeddedBrowserWarningModal
        open={false}
        onClose={() => {}}
      />
    );

    expect(screen.queryByText('브라우저에서 열어주세요')).not.toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    const onCloseMock = vi.fn();
    render(
      <EmbeddedBrowserWarningModal
        open={true}
        onClose={onCloseMock}
      />
    );

    const cancelButton = screen.getByText('취소');
    fireEvent.click(cancelButton);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('calls openInExternalBrowser when primary button is clicked', async () => {
    const openInExternalBrowserMock = vi.spyOn(
      browserDetection,
      'openInExternalBrowser'
    );

    render(
      <EmbeddedBrowserWarningModal
        open={true}
        onClose={() => {}}
      />
    );

    const openButton = screen.getByText('브라우저에서 열기');
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(openInExternalBrowserMock).toHaveBeenCalledTimes(1);
    });
  });

  it('displays custom browser name when provided', () => {
    render(
      <EmbeddedBrowserWarningModal
        open={true}
        onClose={() => {}}
        browserName="Facebook"
      />
    );

    expect(screen.getByText(/Facebook 앱 내부 브라우저/)).toBeInTheDocument();
  });

  it('displays manual instructions', () => {
    render(
      <EmbeddedBrowserWarningModal
        open={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/수동으로 여는 방법/)).toBeInTheDocument();
    expect(screen.getByText(/메뉴\(⋮\) 버튼을 누르세요/)).toBeInTheDocument();
    expect(screen.getByText(/다른 브라우저로 열기/)).toBeInTheDocument();
  });
});
```

**Rationale**:

- Tests component rendering
- Verifies button interactions
- Checks props handling
- Ensures accessibility

**Run Command**: `npx vitest run src/test/components/EmbeddedBrowserWarningModal.test.tsx --reporter=verbose`

#### 3. Page Unit Tests: LoginPage Updates

**File**: `src/frontend/src/test/pages/LoginPage.test.tsx` (UPDATE EXISTING)

**Changes**: Add tests for embedded browser detection in LoginPage

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginPage from '../../pages/LoginPage';
import * as browserDetection from '../../utils/browserDetection';
import { supabase } from '../../supabaseClient';

// Mock dependencies
vi.mock('../../utils/browserDetection');
vi.mock('../../supabaseClient');

describe('LoginPage - Embedded Browser Detection', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows warning modal when Google login clicked in embedded browser', async () => {
    vi.mocked(browserDetection.isEmbeddedBrowser).mockReturnValue(true);
    vi.mocked(browserDetection.getBrowserName).mockReturnValue('KakaoTalk');

    render(<LoginPage />);

    const googleButton = screen.getByText(/Google로 로그인/);
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(screen.getByText('브라우저에서 열어주세요')).toBeInTheDocument();
    });

    // OAuth should NOT be called
    expect(supabase.auth.signInWithOAuth).not.toHaveBeenCalled();
  });

  it('proceeds with OAuth when Google login clicked in standard browser', async () => {
    vi.mocked(browserDetection.isEmbeddedBrowser).mockReturnValue(false);
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({ data: null, error: null });

    render(<LoginPage />);

    const googleButton = screen.getByText(/Google로 로그인/);
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: expect.any(String) },
      });
    });

    // Modal should NOT appear
    expect(screen.queryByText('브라우저에서 열어주세요')).not.toBeInTheDocument();
  });

  it('shows warning modal on OAuth 403 error in embedded browser', async () => {
    vi.mocked(browserDetection.isEmbeddedBrowser).mockReturnValue(true);
    vi.mocked(supabase.auth.signInWithOAuth).mockRejectedValue(
      new Error('403: disallowed_useragent')
    );

    render(<LoginPage />);

    const googleButton = screen.getByText(/Google로 로그인/);
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(screen.getByText('브라우저에서 열어주세요')).toBeInTheDocument();
    });
  });

  it('displays warning banner on mount in embedded browser', () => {
    vi.mocked(browserDetection.isEmbeddedBrowser).mockReturnValue(true);

    render(<LoginPage />);

    // If optional banner enhancement is implemented
    expect(screen.queryByText(/앱 내부 브라우저에서는 Google 로그인이 제한됩니다/)).toBeInTheDocument();
  });
});
```

**Rationale**:

- Tests LoginPage integration with detection
- Verifies modal trigger logic
- Tests OAuth flow protection
- Validates error handling

**Run Command**: `npx vitest run src/test/pages/LoginPage.test.tsx --reporter=verbose`

#### 4. Integration Tests: Full Auth Flow

**File**: `src/frontend/src/test/integration/auth/embeddedBrowser.test.ts` (NEW)

**Changes**: Create integration test for complete flow

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../../../pages/LoginPage';
import * as browserDetection from '../../../utils/browserDetection';

// Integration test with real component interactions
describe('Embedded Browser Detection - Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Set up embedded browser environment
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 13) KAKAOTALK 10.0.0',
      writable: true,
    });
  });

  it('completes full detection → modal → redirect flow', async () => {
    const openInExternalBrowserSpy = vi.spyOn(browserDetection, 'openInExternalBrowser')
      .mockResolvedValue(true);

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    // Step 1: Verify detection
    expect(browserDetection.isEmbeddedBrowser()).toBe(true);

    // Step 2: Click Google login
    const googleButton = screen.getByText(/Google로 로그인/);
    fireEvent.click(googleButton);

    // Step 3: Modal appears
    await waitFor(() => {
      expect(screen.getByText('브라우저에서 열어주세요')).toBeInTheDocument();
      expect(screen.getByText(/KakaoTalk 앱 내부 브라우저/)).toBeInTheDocument();
    });

    // Step 4: Click open in browser
    const openBrowserButton = screen.getByText('브라우저에서 열기');
    fireEvent.click(openBrowserButton);

    // Step 5: Verify redirect attempt
    await waitFor(() => {
      expect(openInExternalBrowserSpy).toHaveBeenCalled();
    });
  });

  it('handles user dismissal and retry', async () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    // Click Google login - modal appears
    fireEvent.click(screen.getByText(/Google로 로그인/));

    await waitFor(() => {
      expect(screen.getByText('브라우저에서 열어주세요')).toBeInTheDocument();
    });

    // User dismisses modal
    fireEvent.click(screen.getByText('취소'));

    await waitFor(() => {
      expect(screen.queryByText('브라우저에서 열어주세요')).not.toBeInTheDocument();
    });

    // User can retry
    fireEvent.click(screen.getByText(/Google로 로그인/));

    await waitFor(() => {
      expect(screen.getByText('브라우저에서 열어주세요')).toBeInTheDocument();
    });
  });

  it('shows manual instructions when auto-redirect fails', async () => {
    vi.spyOn(browserDetection, 'openInExternalBrowser').mockResolvedValue(false);

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText(/Google로 로그인/));

    await waitFor(() => {
      expect(screen.getByText(/수동으로 여는 방법/)).toBeInTheDocument();
      expect(screen.getByText(/메뉴\(⋮\) 버튼을 누르세요/)).toBeInTheDocument();
    });
  });
});
```

**Rationale**:

- Tests complete user journey
- Verifies component integration
- Tests error recovery paths
- Simulates real user interactions

**Run Command**: `npx vitest run src/test/integration/auth --reporter=verbose`

#### 5. E2E Tests: Playwright Mobile Chrome

**File**: `src/frontend/e2e/auth/embedded-browser.spec.ts` (NEW)

**Changes**: Create Playwright E2E test

```typescript
import { test, expect } from "@playwright/test";

test.describe("Embedded Browser Detection - E2E", () => {
  test.use({
    // Simulate KakaoTalk in-app browser
    userAgent:
      "Mozilla/5.0 (Linux; Android 13) KAKAOTALK 10.0.0 Mobile Safari/537.36",
    viewport: { width: 375, height: 667 },
  });

  test("detects KakaoTalk browser and shows warning modal", async ({
    page,
  }) => {
    // Navigate to login page
    await page.goto("/login");

    // Wait for page load
    await page.waitForLoadState("networkidle");

    // Optional: Check if warning banner appears
    const banner = page.locator(
      "text=/앱 내부 브라우저에서는 Google 로그인이 제한됩니다/",
    );
    if (await banner.isVisible()) {
      await expect(banner).toBeVisible();
    }

    // Click Google login button
    await page.click('button:has-text("Google로 로그인")');

    // Modal should appear
    await expect(page.locator("text=브라우저에서 열어주세요")).toBeVisible();
    await expect(
      page.locator("text=/KakaoTalk 앱 내부 브라우저/"),
    ).toBeVisible();

    // Verify modal content
    await expect(page.locator("text=브라우저에서 열기")).toBeVisible();
    await expect(page.locator("text=취소")).toBeVisible();
    await expect(page.locator("text=/수동으로 여는 방법/")).toBeVisible();
  });

  test("allows user to dismiss modal", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Trigger modal
    await page.click('button:has-text("Google로 로그인")');
    await expect(page.locator("text=브라우저에서 열어주세요")).toBeVisible();

    // Dismiss modal
    await page.click('button:has-text("취소")');

    // Modal should disappear
    await expect(
      page.locator("text=브라우저에서 열어주세요"),
    ).not.toBeVisible();
  });

  test("shows manual instructions for external browser opening", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Trigger modal
    await page.click('button:has-text("Google로 로그인")');

    // Check manual instructions
    await expect(
      page.locator("text=/메뉴\\(⋮\\) 버튼을 누르세요/"),
    ).toBeVisible();
    await expect(page.locator("text=/다른 브라우저로 열기/")).toBeVisible();
  });
});

test.describe("Standard Browser - E2E Control", () => {
  test.use({
    // Simulate standard Chrome browser
    userAgent:
      "Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0 Mobile Safari/537.36",
    viewport: { width: 375, height: 667 },
  });

  test("allows OAuth in standard browser without warning", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // No warning banner should appear
    await expect(
      page.locator("text=/앱 내부 브라우저에서는 Google 로그인이 제한됩니다/"),
    ).not.toBeVisible();

    // Click Google login button
    await page.click('button:has-text("Google로 로그인")');

    // Modal should NOT appear
    await expect(page.locator("text=브라우저에서 열어주세요")).not.toBeVisible({
      timeout: 2000,
    });

    // Should redirect to OAuth (or show OAuth-related page)
    // Note: Actual OAuth redirect will happen, just verify no modal interference
  });
});
```

**Rationale**:

- Tests real browser behavior
- Simulates different user agents
- Validates mobile viewport
- Tests both embedded and standard browsers

**Run Command**: `npx playwright test --project="Mobile Chrome" e2e/auth/embedded-browser.spec.ts`

### Test Execution Plan

#### Local Development

```bash
# Run all unit tests
npm run test

# Run specific test suites
npx vitest run src/test/utils --reporter=verbose
npx vitest run src/test/components --reporter=verbose
npx vitest run src/test/pages --reporter=verbose
npx vitest run src/test/integration --reporter=verbose

# Run E2E tests
npm run test:e2e
# Or specific file
npx playwright test e2e/auth/embedded-browser.spec.ts
```

#### CI/CD Pipeline

Tests will run automatically in this order:

1. **test-unit** job (Frontend Unit Suites):
   - `npx vitest run src/test/pages --reporter=verbose`
   - `npx vitest run src/test/components --reporter=verbose`
   - `npx vitest run src/test/smoke.test.tsx --reporter=verbose`

2. **test-integration** job:
   - `npx vitest run src/test/integration --reporter=verbose`

3. **test-e2e** job (optional, against staging):
   - `npm run test:e2e`

### Success Criteria

#### Automated Tests

- [ ] All unit tests pass (utils, components, pages)
- [ ] All integration tests pass
- [ ] All E2E tests pass in CI/CD
- [ ] Test coverage ≥80% for new files
- [ ] TypeScript compilation passes
- [ ] No ESLint errors

#### Manual Verification

- [ ] Tests run successfully in local environment
- [ ] Tests run successfully in CI/CD pipeline
- [ ] Test reports are clear and actionable
- [ ] Edge cases are covered

---

## Phase 7: Analytics and Monitoring

### Overview

Add logging and analytics to track embedded browser detection and OAuth flow issues.

### Changes Required

#### 1. Add Console Logging

**File**: `src/frontend/src/utils/browserDetection.ts`
**Lines**: Add logging to detection functions
**Changes**: Add debug logging

```typescript
// Add to isEmbeddedBrowser function
export function isEmbeddedBrowser(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent || navigator.vendor || "";
  const embeddedMarkers = [
    "KAKAOTALK",
    "wv",
    "WebView",
    "FBAN",
    "FBAV",
    "Instagram",
    "Twitter",
    "Line",
    "Naver",
  ];

  const isEmbedded = embeddedMarkers.some((marker) => ua.includes(marker));

  // Log detection result
  if (isEmbedded) {
    console.info("[BrowserDetection] Embedded browser detected:", {
      userAgent: ua,
      browserName: getBrowserName(),
      browserType: "embedded",
    });
  }

  return isEmbedded;
}

// Add to openInExternalBrowser function
export async function openInExternalBrowser(): Promise<boolean> {
  try {
    const externalUrl = getExternalBrowserUrl();
    console.info("[BrowserDetection] Opening external browser:", {
      currentUrl: window.location.href,
      externalUrl,
      platform: /Android/i.test(navigator.userAgent)
        ? "Android"
        : /iPhone|iPad|iPod/i.test(navigator.userAgent)
          ? "iOS"
          : "Other",
    });

    window.location.href = externalUrl;
    return true;
  } catch (error) {
    console.error("[BrowserDetection] Failed to open external browser:", error);
    return false;
  }
}
```

**Rationale**:

- Debugging in production
- Track detection accuracy
- Monitor redirect success
- Identify edge cases

#### 2. Add OAuth Error Logging

**File**: `src/frontend/src/pages/LoginPage.tsx`
**Lines**: Enhanced error logging in catch block
**Changes**: Structured error logging

```typescript
// Enhanced catch block with detailed logging
  } catch (err: any) {
    console.error('[OAuth] Login error:', {
      provider,
      error: err,
      message: err?.message,
      isEmbeddedBrowser: isEmbeddedBrowser(),
      browserName: getBrowserName(),
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });

    // ... existing error handling logic
  }
```

**Rationale**:

- Comprehensive error context
- Easier debugging
- Pattern identification
- Production monitoring

#### 3. Add Modal Interaction Logging

**File**: `src/frontend/src/components/EmbeddedBrowserWarningModal.tsx`
**Lines**: Add logging to button handlers
**Changes**: Track user interactions

```typescript
// Add to onClose handler
const handleClose = () => {
  console.info("[EmbeddedBrowserWarning] Modal closed:", {
    action: "cancel",
    browserName: detectedBrowser,
    timestamp: new Date().toISOString(),
  });
  onClose();
};

// Add to handleOpenInBrowser
const handleOpenInBrowser = async () => {
  console.info("[EmbeddedBrowserWarning] Opening external browser:", {
    action: "open_browser",
    browserName: detectedBrowser,
    timestamp: new Date().toISOString(),
  });

  const success = await openInExternalBrowser();

  console.info("[EmbeddedBrowserWarning] External browser result:", {
    success,
    browserName: detectedBrowser,
  });

  if (success) {
    onClose();
  }
};

// Update button onClick handlers to use these functions
```

**Rationale**:

- Track modal effectiveness
- Monitor user choices
- Measure redirect success
- A/B testing data

### Success Criteria

#### Automated Verification:

- [ ] Logging doesn't break functionality
- [ ] Console methods are called correctly
- [ ] No sensitive data in logs

#### Manual Verification:

- [ ] Console shows detection events
- [ ] Error logs include full context
- [ ] Modal interactions logged
- [ ] Logs help with debugging

## Implementation Checklist

### Phase 1: Browser Detection Utility

- [ ] Create `src/frontend/src/utils/browserDetection.ts`
- [ ] Implement `isEmbeddedBrowser()` function
- [ ] Implement `getBrowserType()` function
- [ ] Implement `getBrowserName()` function
- [ ] Implement `getExternalBrowserUrl()` function
- [ ] Implement `openInExternalBrowser()` function
- [ ] TypeScript compilation passes
- [ ] ESLint passes for new file
- [ ] Manual testing on KakaoTalk webview
- [ ] Manual testing on Chrome browser

### Phase 2: Warning Modal Component

- [ ] Create `src/frontend/src/components/EmbeddedBrowserWarningModal.tsx`
- [ ] Implement modal UI with Material-UI Dialog
- [ ] Add Korean language instructions
- [ ] Add manual fallback instructions
- [ ] Implement "브라우저에서 열기" button with handler
- [ ] Implement "취소" button with handler
- [ ] Add icons (OpenInBrowserIcon, InfoOutlinedIcon)
- [ ] Test modal rendering
- [ ] Test button interactions
- [ ] Test responsive design (mobile vs desktop)

### Phase 3: Login Flow Integration

- [ ] Update `src/frontend/src/pages/LoginPage.tsx` imports
- [ ] Add `showEmbeddedBrowserWarning` state variable
- [ ] Add detection check at start of `handleSocialLogin`
- [ ] Add modal component to JSX render
- [ ] Optional: Add `showEmbeddedBanner` state
- [ ] Optional: Add `useEffect` for banner detection
- [ ] Optional: Add Alert banner in render
- [ ] Test in KakaoTalk webview (Android)
- [ ] Test in Chrome browser (Android)
- [ ] Test in Safari browser (iOS)
- [ ] Verify no regression in standard OAuth flow

### Phase 4: Error Handling Enhancement

- [ ] Enhance catch block in `handleSocialLogin`
- [ ] Add OAuth 403 error detection
- [ ] Add network error detection
- [ ] Show modal on OAuth policy errors
- [ ] Show network message on network errors
- [ ] Test simulated 403 error
- [ ] Test simulated network error
- [ ] Verify error state resets properly

### Phase 5: Testing Strategy

- [ ] Define test infrastructure and locations
- [ ] Plan unit test coverage (utils)
- [ ] Plan component test coverage (modal)
- [ ] Plan page test coverage (LoginPage)
- [ ] Plan integration test coverage (auth flow)
- [ ] Plan E2E test coverage (Playwright)
- [ ] Document test execution commands
- [ ] Document CI/CD test integration

### Phase 6: Test Implementation

**Unit Tests:**

- [ ] Create `src/frontend/src/test/utils/browserDetection.test.ts`
- [ ] Test `isEmbeddedBrowser()` - all markers
- [ ] Test `getBrowserType()` - all types
- [ ] Test `getBrowserName()` - all browsers
- [ ] Test `getExternalBrowserUrl()` - Android/iOS
- [ ] Run: `npx vitest run src/test/utils --reporter=verbose`

**Component Tests:**

- [ ] Create `src/frontend/src/test/components/EmbeddedBrowserWarningModal.test.tsx`
- [ ] Test modal visibility based on props
- [ ] Test button click handlers
- [ ] Test custom browser name prop
- [ ] Test manual instructions display
- [ ] Run: `npx vitest run src/test/components --reporter=verbose`

**Page Tests:**

- [ ] Update `src/frontend/src/test/pages/LoginPage.test.tsx`
- [ ] Test modal trigger in embedded browser
- [ ] Test OAuth proceeds in standard browser
- [ ] Test error handling with detection
- [ ] Test banner display (if implemented)
- [ ] Run: `npx vitest run src/test/pages --reporter=verbose`

**Integration Tests:**

- [ ] Create `src/frontend/src/test/integration/auth/embeddedBrowser.test.ts`
- [ ] Test detection → modal → redirect flow
- [ ] Test user dismissal and retry
- [ ] Test manual instructions fallback
- [ ] Run: `npx vitest run src/test/integration --reporter=verbose`

**E2E Tests:**

- [ ] Create `src/frontend/e2e/auth/embedded-browser.spec.ts`
- [ ] Test KakaoTalk user agent detection
- [ ] Test modal appearance and content
- [ ] Test modal dismissal
- [ ] Test standard browser control (no modal)
- [ ] Run: `npx playwright test --project="Mobile Chrome" e2e/auth/embedded-browser.spec.ts`

**Test Verification:**

- [ ] All unit tests pass locally
- [ ] All component tests pass locally
- [ ] All page tests pass locally
- [ ] All integration tests pass locally
- [ ] All E2E tests pass locally
- [ ] Test coverage ≥80% for new files
- [ ] All tests pass in CI/CD pipeline

### Phase 7: Analytics and Monitoring

**Logging Implementation:**

- [ ] Add logging to `isEmbeddedBrowser()` function
- [ ] Add logging to `openInExternalBrowser()` function
- [ ] Add logging to `handleSocialLogin()` catch block
- [ ] Add logging to modal `handleClose()` handler
- [ ] Add logging to modal `handleOpenInBrowser()` handler
- [ ] Test logging output in console
- [ ] Verify no sensitive data in logs
- [ ] Verify structured log format

## Overall Success Metrics

- [ ] OAuth 403 errors from embedded browsers: 0%
- [ ] Modal appearance rate in embedded browsers: 100%
- [ ] External browser redirect success: >90%
- [ ] User complaints about login: <5% of previous baseline
- [ ] Test coverage: ≥80% for new code
- [ ] No regressions in standard browser OAuth flow
