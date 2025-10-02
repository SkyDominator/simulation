# E2E Test Fix Summary: Playwright Strict Mode Violation

## Problem

Tests **E2E-AUTH-001** and **E2E-AUTH-002** in `auth-session.spec.ts` were failing with:

```
Error: strict mode violation: getByTestId('login-form').or(locator('text=/로그인|login/i')) resolved to 4 elements
```

## Root Cause

The tests used a union locator with `.or()`:

```typescript
page.getByTestId("login-form").or(page.locator("text=/로그인|login/i"))
```

This locator matched **4 different elements**:
1. `<Paper data-testid="login-form">` - matches the first part
2. `<Typography>로그인</Typography>` - matches the text pattern
3. `<Button>Google로 로그인</Button>` - matches the text pattern
4. `<Button>Kakao로 로그인</Button>` - matches the text pattern

Playwright's strict mode (enabled by default) requires locators to resolve to **exactly one element** when performing visibility checks.

## Solution

Removed the `.or()` clause and used only the unique `data-testid`:

```typescript
// Before (incorrect - matches 4 elements)
await expect(
  page.getByTestId("login-form").or(page.locator("text=/로그인|login/i"))
).toBeVisible({ timeout: 5000 });

// After (correct - matches 1 element)
await expect(page.getByTestId("login-form")).toBeVisible({
  timeout: 5000,
});
```

## Why This Works

1. **Unique identifier**: `data-testid="login-form"` uniquely identifies the login page container
2. **Playwright best practice**: Prefer `data-testid` over text-based selectors for reliability
3. **Strict mode compliant**: Locator now matches exactly one element
4. **Semantic correctness**: We're verifying the login form is visible, not searching for text

## Implementation Note

The `data-testid="login-form"` already exists in `LoginPage.tsx` (line 68), so no component changes were needed. This demonstrates good testability architecture - components already had proper test IDs.

## Files Changed

- `src/frontend/e2e/specs/auth-session.spec.ts` (lines 65-67 and 101-103)

## Playwright Best Practices Applied

✅ Use `data-testid` for unique, stable element identification  
✅ Avoid text-based locators that match multiple elements  
✅ Respect strict mode by ensuring locators match exactly one element  
✅ Keep test selectors simple and maintainable
