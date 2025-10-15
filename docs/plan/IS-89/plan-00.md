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
  if (typeof window === 'undefined') return false;
  
  const ua = navigator.userAgent || navigator.vendor || '';
  
  // Common in-app browser markers
  const embeddedMarkers = [
    'KAKAOTALK',      // KakaoTalk in-app browser
    'wv',             // Android WebView
    'WebView',        // Generic WebView
    'FBAN',           // Facebook App
    'FBAV',           // Facebook App (alternative)
    'Instagram',      // Instagram in-app browser
    'Twitter',        // Twitter in-app browser
    'Line',           // Line messenger
    'Naver',          // Naver app
  ];
  
  return embeddedMarkers.some(marker => ua.includes(marker));
}

/**
 * Gets the browser type classification
 * @returns Browser type: 'standard', 'embedded', or 'unknown'
 */
export function getBrowserType(): 'standard' | 'embedded' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';
  
  if (isEmbeddedBrowser()) return 'embedded';
  return 'standard';
}

/**
 * Gets the current browser name for display purposes
 * @returns Browser name or 'Unknown'
 */
export function getBrowserName(): string {
  if (typeof window === 'undefined') return 'Unknown';
  
  const ua = navigator.userAgent || navigator.vendor || '';
  
  // Detect specific in-app browsers
  if (ua.includes('KAKAOTALK')) return 'KakaoTalk';
  if (ua.includes('FBAN') || ua.includes('FBAV')) return 'Facebook';
  if (ua.includes('Instagram')) return 'Instagram';
  if (ua.includes('Twitter')) return 'Twitter';
  if (ua.includes('Line')) return 'Line';
  if (ua.includes('Naver')) return 'Naver';
  
  // Detect standard browsers
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('SamsungBrowser')) return 'Samsung Internet';
  
  return 'Unknown';
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
    console.error('Failed to open external browser:', error);
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
import { isEmbeddedBrowser } from '../utils/browserDetection';
import EmbeddedBrowserWarningModal from '../components/EmbeddedBrowserWarningModal';
```

**State Section** (add after line ~20):
```typescript
const [showEmbeddedBrowserWarning, setShowEmbeddedBrowserWarning] = useState(false);
```

**Handler Function** (replace lines 28-50):
```typescript
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
      // E2E testing mode handling
      const { error } = await supabase.auth.signInWithPassword({
        email: `${provider}@test.com`,
        password: 'testpassword',
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

## Phase 5: Documentation and Testing

### Overview
Document the changes, add tests, and create user-facing documentation about browser requirements.

### Changes Required

#### 1. Add Unit Tests for Browser Detection
**File**: `src/frontend/src/utils/__tests__/browserDetection.test.ts` (NEW)
**Changes**: Create test suite

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isEmbeddedBrowser,
  getBrowserType,
  getBrowserName,
  getExternalBrowserUrl,
} from '../browserDetection';

describe('browserDetection', () => {
  beforeEach(() => {
    // Reset window.navigator mock
    vi.resetAllMocks();
  });

  describe('isEmbeddedBrowser', () => {
    it('returns true for KakaoTalk browser', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 13) KAKAOTALK 10.0.0',
        writable: true,
      });
      expect(isEmbeddedBrowser()).toBe(true);
    });

    it('returns true for Android WebView', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 13; wv) AppleWebKit/537.36',
        writable: true,
      });
      expect(isEmbeddedBrowser()).toBe(true);
    });

    it('returns true for Facebook in-app browser', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 13) FBAN/FB4A',
        writable: true,
      });
      expect(isEmbeddedBrowser()).toBe(true);
    });

    it('returns false for Chrome browser', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0',
        writable: true,
      });
      expect(isEmbeddedBrowser()).toBe(false);
    });

    it('returns false for Safari browser', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/605.1.15',
        writable: true,
      });
      expect(isEmbeddedBrowser()).toBe(false);
    });
  });

  describe('getBrowserType', () => {
    it('returns "embedded" for KakaoTalk', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'KAKAOTALK',
        writable: true,
      });
      expect(getBrowserType()).toBe('embedded');
    });

    it('returns "standard" for Chrome', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Chrome/120.0.0.0',
        writable: true,
      });
      expect(getBrowserType()).toBe('standard');
    });
  });

  describe('getBrowserName', () => {
    it('identifies KakaoTalk', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'KAKAOTALK',
        writable: true,
      });
      expect(getBrowserName()).toBe('KakaoTalk');
    });

    it('identifies Chrome', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Chrome/120.0.0.0 Safari/537.36',
        writable: true,
      });
      expect(getBrowserName()).toBe('Chrome');
    });

    it('identifies Samsung Internet', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'SamsungBrowser/23.0',
        writable: true,
      });
      expect(getBrowserName()).toBe('Samsung Internet');
    });
  });

  describe('getExternalBrowserUrl', () => {
    it('generates Android intent URL', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Android',
        writable: true,
      });
      
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://simulation.lightoflifeclub.com/login',
          host: 'simulation.lightoflifeclub.com',
          pathname: '/login',
          search: '',
          hash: '',
        },
        writable: true,
      });

      const result = getExternalBrowserUrl();
      expect(result).toContain('intent://');
      expect(result).toContain('simulation.lightoflifeclub.com/login');
      expect(result).toContain('#Intent;scheme=https;end');
    });

    it('returns direct URL for iOS', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'iPhone',
        writable: true,
      });
      
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://simulation.lightoflifeclub.com/login',
        },
        writable: true,
      });

      const result = getExternalBrowserUrl();
      expect(result).toBe('https://simulation.lightoflifeclub.com/login');
    });
  });
});
```

**Rationale**:
- Comprehensive test coverage
- Tests all detection markers
- Platform-specific URL generation
- Verifies edge cases

#### 2. Add Component Tests for Modal
**File**: `src/frontend/src/components/__tests__/EmbeddedBrowserWarningModal.test.tsx` (NEW)
**Changes**: Create component test

```typescript
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

#### 3. Update Technical Documentation
**File**: `docs/spec/tech-details.md`
**Lines**: Add new section after "Frontend Integration"
**Changes**: Document embedded browser handling

```markdown
## Embedded Browser Handling

**Detection**: `src/frontend/src/utils/browserDetection.ts`
- Identifies in-app browsers (KakaoTalk, Facebook, Instagram, etc.)
- Checks user-agent strings for common markers
- Provides browser type and name information

**Prevention**: `src/frontend/src/pages/LoginPage.tsx`
- Blocks OAuth attempts in embedded browsers
- Shows warning modal with guidance
- Logs detection events for monitoring

**Recovery Flow**:
1. User accesses app in embedded browser
2. Detection logic identifies browser type
3. User clicks OAuth login button
4. Modal appears with instructions
5. User clicks "브라우저에서 열기"
6. App opens in system default browser
7. OAuth flow proceeds normally

**Supported Platforms**:
- Android: Intent URL redirects to Chrome/Samsung Internet
- iOS: Direct URL opens in Safari/Chrome

**Detected Browsers**:
- KakaoTalk in-app browser
- Facebook in-app browser
- Instagram in-app browser
- Twitter in-app browser
- Line messenger browser
- Naver app browser
- Generic Android WebView

**Error Handling**:
- OAuth 403 errors trigger warning modal
- Network errors show specific message
- Generic errors show fallback message
```

**Rationale**:
- Comprehensive documentation
- Helps future maintainers
- Explains design decisions
- Documents supported scenarios

#### 4. Create User-Facing Help Document
**File**: `docs/user/browser-requirements.md` (NEW)
**Changes**: Create user guide

```markdown
# 브라우저 요구사항

생명빛 클럽 시뮬레이션은 Google 로그인을 지원합니다. 
원활한 로그인을 위해 아래 브라우저 요구사항을 확인해주세요.

## 지원되는 브라우저

### ✅ 지원됨 (권장)
- Chrome (Android, iOS, 데스크톱)
- Safari (iOS, macOS)
- Samsung Internet (Android)
- Edge (데스크톱)
- Firefox (데스크톱)

### ❌ 지원되지 않음
- KakaoTalk 앱 내부 브라우저
- Facebook 앱 내부 브라우저
- Instagram 앱 내부 브라우저
- 기타 앱 내부 브라우저

## KakaoTalk에서 링크를 받으셨나요?

KakaoTalk에서 받은 링크를 클릭하면 KakaoTalk 앱 내부 브라우저에서 열립니다.
Google 로그인은 보안 정책상 이러한 앱 내부 브라우저에서는 작동하지 않습니다.

### 해결 방법

**방법 1: 자동으로 브라우저 열기**
1. 시뮬레이션 앱의 로그인 페이지로 이동합니다
2. "Google로 로그인" 버튼을 누릅니다
3. 안내 창이 나타나면 "브라우저에서 열기" 버튼을 누릅니다
4. Chrome 또는 Safari에서 앱이 열립니다
5. Google 로그인을 진행합니다

**방법 2: 수동으로 브라우저 열기**
1. KakaoTalk 화면 오른쪽 상단의 메뉴(⋮) 버튼을 누릅니다
2. "다른 브라우저로 열기" 또는 "외부 브라우저에서 열기"를 선택합니다
3. Chrome 또는 Safari를 선택합니다
4. 브라우저에서 열린 앱에서 Google 로그인을 진행합니다

**방법 3: URL 직접 입력**
1. Chrome 또는 Safari 앱을 엽니다
2. 주소창에 다음을 입력합니다: `https://simulation.lightoflifeclub.com`
3. Google 로그인을 진행합니다

## 왜 앱 내부 브라우저에서는 안 되나요?

Google은 사용자 보안을 위해 표준 브라우저에서만 로그인을 허용합니다.
앱 내부 브라우저는 보안 기준을 충족하지 못해 로그인이 제한됩니다.

이는 Google의 정책이며, 모든 웹 애플리케이션에 동일하게 적용됩니다.

## 추가 도움이 필요하신가요?

문제가 계속되면 관리자에게 문의해주세요.

**연락처**: [관리자 이메일]
```

**Rationale**:
- User-friendly Korean language
- Clear step-by-step instructions
- Multiple solution paths
- Explains "why" for user understanding
- Provides contact for support

### Success Criteria

#### Automated Verification:
- [ ] All unit tests pass: `npm run test`
- [ ] Test coverage ≥80% for new files
- [ ] TypeScript compilation passes
- [ ] ESLint passes

#### Manual Verification:
- [ ] Documentation is clear and accurate
- [ ] Test suite covers edge cases
- [ ] User guide is easy to follow
- [ ] Technical docs help developers

---

## Phase 6: Analytics and Monitoring

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
  if (typeof window === 'undefined') return false;
  
  const ua = navigator.userAgent || navigator.vendor || '';
  const embeddedMarkers = [
    'KAKAOTALK', 'wv', 'WebView', 'FBAN', 'FBAV',
    'Instagram', 'Twitter', 'Line', 'Naver',
  ];
  
  const isEmbedded = embeddedMarkers.some(marker => ua.includes(marker));
  
  // Log detection result
  if (isEmbedded) {
    console.info('[BrowserDetection] Embedded browser detected:', {
      userAgent: ua,
      browserName: getBrowserName(),
      browserType: 'embedded',
    });
  }
  
  return isEmbedded;
}

// Add to openInExternalBrowser function
export async function openInExternalBrowser(): Promise<boolean> {
  try {
    const externalUrl = getExternalBrowserUrl();
    console.info('[BrowserDetection] Opening external browser:', {
      currentUrl: window.location.href,
      externalUrl,
      platform: /Android/i.test(navigator.userAgent) ? 'Android' : 
                /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'iOS' : 'Other',
    });
    
    window.location.href = externalUrl;
    return true;
  } catch (error) {
    console.error('[BrowserDetection] Failed to open external browser:', error);
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
  console.info('[EmbeddedBrowserWarning] Modal closed:', {
    action: 'cancel',
    browserName: detectedBrowser,
    timestamp: new Date().toISOString(),
  });
  onClose();
};

// Add to handleOpenInBrowser
const handleOpenInBrowser = async () => {
  console.info('[EmbeddedBrowserWarning] Opening external browser:', {
    action: 'open_browser',
    browserName: detectedBrowser,
    timestamp: new Date().toISOString(),
  });
  
  const success = await openInExternalBrowser();
  
  console.info('[EmbeddedBrowserWarning] External browser result:', {
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

---

## Testing Strategy

### Unit Testing
- Browser detection utility functions
- Modal component rendering and interactions
- Error handling logic

### Integration Testing
- LoginPage with embedded browser detection
- Modal opening and closing flows
- External browser redirect flow

### Manual Testing

#### Test Case 1: KakaoTalk Android
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

#### Test Case 2: Direct Chrome Access
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

#### Test Case 3: Facebook In-App Browser
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

#### Test Case 4: iOS Safari
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

## Rollback Plan

If issues arise after deployment, rollback in this order:

### Level 1: Disable Modal Only
**Action**: Comment out modal rendering in LoginPage
**File**: `src/frontend/src/pages/LoginPage.tsx`
**Code**:
```typescript
{/* Temporarily disabled for rollback
<EmbeddedBrowserWarningModal
  open={showEmbeddedBrowserWarning}
  onClose={() => setShowEmbeddedBrowserWarning(false)}
/>
*/}
```
**Impact**: Users won't see guidance, but OAuth still blocked

### Level 2: Disable Detection
**Action**: Comment out detection check in handleSocialLogin
**File**: `src/frontend/src/pages/LoginPage.tsx`
**Code**:
```typescript
// Temporarily disabled for rollback
// if (isEmbeddedBrowser()) {
//   setShowEmbeddedBrowserWarning(true);
//   return;
// }
```
**Impact**: OAuth attempts proceed, users see 403 error

### Level 3: Full Rollback
**Action**: Revert all commits from this implementation
**Command**: `git revert <commit-hash-range>`
**Impact**: Complete return to previous state

### Monitoring Post-Rollback
- Check error logs for OAuth failures
- Monitor user complaints
- Verify standard browser flow works
- Plan fix for rolled-back issue

---

## Deployment Plan

### Pre-Deployment Checklist
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual testing completed on target devices
- [ ] Code review approved
- [ ] Documentation updated
- [ ] Staging deployment successful

### Staging Deployment
1. Deploy to staging: `https://staging-simulation.lightoflifeclub.com`
2. Test all scenarios on staging
3. Verify analytics/logging
4. Check mobile devices
5. Monitor for 24 hours

### Production Deployment
1. Create deployment PR with full test results
2. Get approval from stakeholders
3. Deploy during low-traffic window
4. Monitor logs for first hour
5. Check error rates
6. Verify user reports

### Post-Deployment Monitoring (First Week)
- OAuth success/failure rates
- Embedded browser detection rate
- Modal interaction rates
- External browser redirect success rate
- User feedback/complaints

### Success Metrics
- OAuth 403 errors from embedded browsers: 0%
- Modal appearance rate in embedded browsers: 100%
- External browser redirect success: >90%
- User complaints about login: <5% of previous

---

## Future Enhancements

### Phase 7: Native Google Sign-In (Long-term)
**Timeline**: 1-2 months
**Effort**: 1-2 weeks development
**Benefit**: Seamless OAuth in embedded browsers

**Implementation**:
1. Add Google Sign-In SDK for Android
2. Implement native auth flow
3. Use `signInWithIdToken()` Supabase method
4. Maintain fallback to browser flow

### Phase 8: Deep Linking
**Timeline**: 2-3 months
**Effort**: 1 week development
**Benefit**: Better browser transition

**Implementation**:
1. Configure Android App Links
2. Configure iOS Universal Links
3. Handle deep link routing
4. Preserve auth state across transitions

### Phase 9: PWA Installation Promotion
**Timeline**: 1-2 months
**Effort**: 3-5 days development
**Benefit**: Avoid embedded browsers entirely

**Implementation**:
1. Add "Install App" banner for embedded browser users
2. Custom PWA install prompt
3. Track installation rate
4. Educate users about installed PWA benefits

---

## Appendix

### Code References

**Detection Logic**:
- `src/frontend/src/utils/browserDetection.ts` - Detection utilities
- `src/frontend/src/pages/LoginPage.tsx:28-50` - OAuth handler
- `src/frontend/src/context/AuthContext.tsx:56-92` - Auth context

**UI Components**:
- `src/frontend/src/components/EmbeddedBrowserWarningModal.tsx` - Warning modal
- `src/frontend/src/pages/LoginPage.tsx:105-112` - Google login button

**Configuration**:
- `src/frontend/src/supabaseClient.ts:16-22` - Supabase auth config
- `src/frontend/vite.config.ts:60-85` - PWA manifest

### Related Documentation

- **Research**: `docs/research/IS-89/research-00.md`
- **SSD**: `docs/spec/ssd.md` (Section 7: Auth, Section 10: Simulation)
- **Technical Details**: `docs/spec/tech-details.md`
- **Frontend Guidelines**: `docs/coding/frontend.md`
- **Issue**: GitHub Issue #89

### Known Limitations

1. **Detection Coverage**: May miss new/unknown embedded browsers
2. **Android Intent URLs**: Some devices may not support intent:// scheme
3. **User Education**: Requires user to understand browser difference
4. **Kakao OAuth**: Not verified if Kakao login works in KakaoTalk webview

### FAQ

**Q: Why not just support OAuth in embedded browsers?**
A: Google's security policy blocks it. We cannot bypass this restriction.

**Q: Will Kakao OAuth also be affected?**
A: Unknown. Kakao may have special handling for their own app. Needs testing.

**Q: Can we whitelist KakaoTalk with Google?**
A: No. Google enforces this policy broadly for security reasons.

**Q: What about iOS?**
A: iOS currently works, but detection provides consistent UX and prepares for potential future iOS policy changes.

**Q: How do we know the detection is accurate?**
A: Comprehensive testing + logging + error handling catches missed detections.

---

## Implementation Checklist

### Phase 1: Browser Detection Utility
- [ ] Create `src/frontend/src/utils/browserDetection.ts`
- [ ] Implement `isEmbeddedBrowser()`
- [ ] Implement `getBrowserType()`
- [ ] Implement `getBrowserName()`
- [ ] Implement `getExternalBrowserUrl()`
- [ ] Implement `openInExternalBrowser()`
- [ ] TypeScript compilation passes
- [ ] Manual testing on KakaoTalk
- [ ] Manual testing on Chrome

### Phase 2: Warning Modal
- [ ] Create `src/frontend/src/components/EmbeddedBrowserWarningModal.tsx`
- [ ] Implement modal UI with MUI
- [ ] Add Korean instructions
- [ ] Add manual fallback instructions
- [ ] Add "Open in Browser" button
- [ ] Test modal rendering
- [ ] Test button interactions
- [ ] Test responsive design

### Phase 3: Login Flow Integration
- [ ] Update `src/frontend/src/pages/LoginPage.tsx` imports
- [ ] Add `showEmbeddedBrowserWarning` state
- [ ] Add detection check in `handleSocialLogin`
- [ ] Add modal component to render
- [ ] Optional: Add warning banner
- [ ] Test in KakaoTalk webview
- [ ] Test in standard browser
- [ ] Verify no regression

### Phase 4: Error Handling
- [ ] Enhance error detection in catch block
- [ ] Add OAuth error identification
- [ ] Add network error detection
- [ ] Test error scenarios
- [ ] Verify error messages

### Phase 5: Documentation and Testing
- [ ] Create unit tests for browser detection
- [ ] Create component tests for modal
- [ ] Update technical documentation
- [ ] Create user guide
- [ ] All tests pass
- [ ] Documentation complete

### Phase 6: Analytics and Monitoring
- [ ] Add logging to detection functions
- [ ] Add OAuth error logging
- [ ] Add modal interaction logging
- [ ] Test logging output
- [ ] Verify no sensitive data logged

### Deployment
- [ ] Code review completed
- [ ] Staging deployment
- [ ] Manual testing on staging
- [ ] Production deployment
- [ ] Post-deployment monitoring
- [ ] Success metrics verified

---

**Implementation Start Date**: [To be determined]
**Target Completion Date**: [To be determined]
**Implementation Effort**: 2-3 days development + 1 day testing
**Priority**: High (blocks Android users from Google OAuth)
