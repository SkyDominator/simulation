# Fix for E2E-AUTH-001 Test Failure

## Problem Statement
The Playwright test "E2E-AUTH-001: Login button triggers Supabase OAuth (Google)" was failing with:

```
Error: expect(locator).toBeVisible() failed

Locator:  getByTestId('consent-page')
Expected: visible
Received: <element(s) not found>
```

The page remained on the OTP verification form instead of transitioning to the ConsentPage after successful OTP verification.

## Root Cause Analysis

### Expected Flow
1. User fills whitelist form → OTP sent
2. User fills OTP form → OTP verified successfully
3. `onVerified(userHash)` callback sets `userHash` in AppController
4. `useConsentFlow` hook detects `userHash` change
5. Hook calls `api.getUserConsents(userHash)` → GET `/api/consents/{userHash}`
6. Mock returns empty consents array
7. Hook calls `setPage("consent")` to show ConsentPage

### Actual Behavior (Bug)
At step 5, the API call to `GET /api/consents/test-hash-123` was **not being mocked** because:

- Mock route pattern: `**/api/consents`
- Actual API call: `/api/consents/test-hash-123`
- **Mismatch**: Playwright glob `**/api/consents` does NOT match paths with additional segments

This caused the `getUserConsents` call to either:
- Fail with a network error
- Hang/timeout waiting for a response
- Return an unexpected response

As a result, the `useConsentFlow` hook couldn't determine consent status, and the page never transitioned to ConsentPage.

## The Fix

**File**: `src/frontend/e2e/utils/test-helpers.ts`

```diff
- await page.route("**/api/consents", async (route) => {
+ await page.route("**/api/consents**", async (route) => {
```

**Explanation**: Adding `**` suffix to the route pattern makes it match:
- `POST /api/consents` (recording consent)
- `GET /api/consents/{user_hash}` (retrieving consents)

### Playwright Route Pattern Rules

| Pattern | Matches | Does NOT Match |
|---------|---------|----------------|
| `**/api/consents` | `/api/consents` (exact) | `/api/consents/test-hash-123` |
| `**/api/consents**` | `/api/consents`<br>`/api/consents/test-hash-123`<br>`/api/consents?query=param` | (matches all) |
| `**/api/consents/**` | `/api/consents/test-hash-123` | `/api/consents` (no trailing slash) |

## Verification

The fix aligns with existing patterns in the codebase:
- `**/api/simulations**` - handles `/api/simulations` and `/api/simulations/{id}`
- `**/api/privacy-policy**` - handles query parameters
- `**/api/notices**` - handles `/api/notices` and `/api/notices/{id}`

Other tests in `onboarding.spec.ts` use the same mock setup and expect the consent page to appear after OTP verification, confirming this is the expected behavior.

## Impact

This fix ensures:
1. ✅ ConsentPage appears after successful OTP verification
2. ✅ `useConsentFlow` hook can check existing consent records
3. ✅ Pre-auth flow works correctly: Whitelist → OTP → Consent → Login
4. ✅ Test E2E-AUTH-001 and E2E-AUTH-002 should now pass

## Best Practices

When mocking APIs with Playwright:
- Use `**/api/endpoint**` (double asterisk suffix) for endpoints that may have path parameters or query strings
- Use `**/api/endpoint` (no suffix) only for exact fixed endpoints
- Always test the mock pattern matches the actual API calls your code makes
