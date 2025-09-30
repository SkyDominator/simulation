# E2E Testing Setup and Environment Variables

This document explains the environment variable setup for E2E tests and how to run them properly.

## Environment Variables

### NODE_ENV vs import.meta.env

**Important**: In frontend code (React/Vite), use `import.meta.env` instead of `process.env`:

```typescript
// ❌ Wrong - process.env is not available at runtime in frontend
if (process.env.NODE_ENV !== "production") {
  console.log("Development mode");
}

// ✅ Correct - use Vite's import.meta.env
if (import.meta.env.DEV) {
  console.log("Development mode");
}
```

### E2E Mode Detection

E2E tests use the `isE2EMode()` function which checks:

1. `import.meta.env.VITE_E2E_MODE` environment variable
2. `navigator.webdriver` property (automatically set by Playwright)

```typescript
// src/utils/testMode.ts
export const isE2EMode = (): boolean => {
  // Check Vite environment variable first
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const flag = import.meta.env.VITE_E2E_MODE;
    if (flag !== undefined) {
      return String(flag).toLowerCase() === "true";
    }
  }

  // Fallback to navigator.webdriver (set by Playwright)
  if (typeof navigator !== "undefined" && "webdriver" in navigator) {
    return Boolean(navigator.webdriver);
  }

  return false;
};
```

## Configuration Files

### playwright.config.ts

The Playwright configuration sets the E2E environment variable:

```typescript
webServer: {
  command: 'npm run preview',
  port: 4173,
  env: {
    VITE_E2E_MODE: 'true',  // Enables E2E mode for the test server
  },
}
```

### vite.config.ts

The Vite configuration ensures the environment variable is available at runtime:

```typescript
define: {
  // Allow runtime access to E2E mode when set via env variable
  'import.meta.env.VITE_E2E_MODE': JSON.stringify(process.env.VITE_E2E_MODE || 'false'),
}
```

## Authentication in E2E Tests

### loginTestUser Helper

The `loginTestUser` function in `e2e/utils/auth-helpers.ts` sets up mock authentication:

1. Sets `navigator.webdriver = true` to ensure E2E mode detection
2. Stores mock Supabase auth token in localStorage
3. Sets UI state to show main page

### buildSessionFromTestToken

The `AuthContext` uses `buildSessionFromTestToken()` which:

1. Only works when `isE2EMode()` returns true
2. Reads mock token from localStorage
3. Builds a valid Supabase Session object for the app

## Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test e2e/specs/persistence.spec.ts

# Run with UI mode for debugging
npm run test:e2e:ui

# Run with debug mode
npm run test:e2e:debug
```

## Test Data and Selectors

The tests use `data-testid` attributes for reliable element selection:

- `main-page`: Main application page
- `logout-button`: Logout button in header
- `whitelist-form`: Whitelist verification form
- `create-simulation`: Create new simulation button

## Debugging E2E Issues

1. **Check E2E mode detection**: Verify `navigator.webdriver` is true and `VITE_E2E_MODE` is set
2. **Check authentication flow**: Ensure mock tokens are properly set in localStorage
3. **Check element selectors**: Verify `data-testid` attributes exist in components
4. **Check console logs**: Enable dev mode logging with `import.meta.env.DEV`

## Test Environment Setup Validation

Run the setup validation script:

```bash
node test-e2e-setup.js
```

This script verifies:
- Token structure and expiration logic
- E2E mode detection
- Navigator.webdriver simulation
- localStorage behavior
- Logout cleanup

All checks should show ✅ for proper setup.