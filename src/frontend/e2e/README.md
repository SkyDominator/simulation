# E2E Testing Setup

## Prerequisites

### Environment Variables

Before running E2E tests, you need to set up Supabase environment variables. Even for testing, the app requires valid URL/key formats to initialize properly.

**For E2E tests**, create a `.env` file from the example:

```bash
cd src/frontend
cp .env.example .env
```

The example file contains dummy credentials that are sufficient for E2E testing in mock mode.

**For production**, create a `.env.local` file with your actual Supabase credentials (this file is gitignored):

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-actual-publishable-key
```

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test
npm run test:e2e -- --grep "E2E-AUTH-006"

# Run with specific browser
npm run test:e2e -- --project="Google Chrome"
```

## Test Infrastructure

### Auth Helpers

The `e2e/utils/auth-helpers.ts` file provides helper functions for mocking authentication:

- `loginTestUser(page)` - Mocks a regular user login
- `loginAdminUser(page)` - Mocks an admin user login  
- `logoutTestUser(page)` - Clears auth tokens
- `isUserAuthenticated(page)` - Checks if a user is authenticated

### Logout Flow

The logout implementation uses a `__E2E_LOGGED_OUT__` flag to prevent init scripts from re-adding tokens after logout. This ensures that:

1. When `signOut()` is called, it sets `__E2E_LOGGED_OUT__ = true`
2. The init script checks this flag and skips token restoration
3. Tests can verify that logout properly clears the session

### Known Issues

- AUTH-001 and AUTH-002 have pre-existing failures related to Playwright strict mode violations with `.or()` locators (unrelated to logout functionality)
