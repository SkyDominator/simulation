# Fix: Frontend Unit Tests GitHub Actions Error

## Problem

Frontend Unit Suites job in GitHub Actions was failing with the error:

```text
TypeError: Cannot read properties of undefined (reading 'get')
 ❯ Object.<anonymous> node_modules/jsdom/node_modules/webidl-conversions/lib/index.js:325:94
```

## Root Cause

The external Node.js polyfill script (`vitest-node-polyfill.cjs`) loaded via `NODE_OPTIONS="--require"` was interfering with jsdom's initialization. The polyfill was attempting to set up globals before jsdom loaded, but this caused conflicts with jsdom's internal `webidl-conversions` module which expected certain object descriptors to be in their native state.

## Solution

**Removed the external polyfill approach** from the GitHub Actions workflow. The polyfills for `crypto` and `SharedArrayBuffer` are already handled in vitest's setup file (`src/frontend/src/test/setup.ts`), which executes at the correct time in the test lifecycle.

### Changes Made

1. **Updated `.github/workflows/ci-cd.yml`**:
   - Removed `POLYFILL_PATH` variable and `NODE_OPTIONS` from Frontend Unit Suites job
   - Removed verification check for SharedArrayBuffer
   - Simplified the test commands to just run vitest directly
   - Applied the same fix to Frontend Security Tests job

2. **Kept `vitest-node-polyfill.cjs`**:
   - File remains for potential future use or local development
   - Updated with better primordials polyfill (though not currently used in CI)

### Before

```yaml
- name: Frontend Unit Suites
  working-directory: src/frontend
  run: |
      npm ci
      POLYFILL_PATH="$(pwd)/scripts/vitest-node-polyfill.cjs"
      echo "Using polyfill at $POLYFILL_PATH"
      NODE_OPTIONS="--require $POLYFILL_PATH" node -p "..."
      NODE_OPTIONS="--require $POLYFILL_PATH" npx vitest run src/test/pages --reporter=verbose
      NODE_OPTIONS="--require $POLYFILL_PATH" npx vitest run src/test/components --reporter=verbose
      NODE_OPTIONS="--require $POLYFILL_PATH" npx vitest run src/test/smoke.test.tsx --reporter=verbose
```

### After

```yaml
- name: Frontend Unit Suites
  working-directory: src/frontend
  run: |
      npm ci
      npx vitest run src/test/pages --reporter=verbose
      npx vitest run src/test/components --reporter=verbose
      npx vitest run src/test/smoke.test.tsx --reporter=verbose
```

## Verification

Tested locally and confirmed:

- `npx vitest run src/test/smoke.test.tsx` passes without external polyfill
- All 8 smoke tests pass successfully
- No SharedArrayBuffer or crypto errors occur

## Technical Notes

- Vitest's setup file (`src/test/setup.ts`) handles crypto and SharedArrayBuffer polyfills
- These polyfills execute at the correct time in vitest's lifecycle (after vitest initializes but before tests run)
- jsdom environment is properly initialized without conflicts
- The external polyfill approach was causing race conditions and object descriptor conflicts

## Next Steps

When the GitHub Actions workflow runs next, the Frontend Unit Suites job should complete successfully without the webidl-conversions error.
