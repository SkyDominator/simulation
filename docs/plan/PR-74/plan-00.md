---
pr: 74
author: GitHub Copilot
date: 2025-10-02
title: "Stabilize auth-session Playwright suite by fixing consent mocks"
status: draft
---

## Problem recap

- `E2E-AUTH-001` in `src/frontend/e2e/specs/auth-session.spec.ts` intermittently times out while waiting for `data-testid="login-form"`.
- Root cause: `APIHelpers.mockConsentSuccess` always serves `{ consents: [] }` for `GET /api/consents/{user_hash}`, so `useConsentFlow` forces the UI back to the consent page immediately after the acceptance POST succeeds.
- Side effects: OAuth spy never triggers, onboarding flow becomes flickery, and regression risk increases when tests run in parallel workers.

## Objectives

1. Make the consent mocks behave like the production API: once consent is recorded, subsequent GET requests must return the persisted consent data.
2. Ensure auth-session specs have reliable synchronization after consent acceptance so login DOM assertions never race with background polling.
3. Provide observability hooks to confirm consent polling is exercised, keeping future debugging straightforward.
4. Re-run the relevant Playwright projects to confirm the flake is resolved and guard against regressions.

## Out of scope

- Changing real backend consent behaviour or database schema.
- Consolidating Google/Kakao OAuth tests into a single parametrised case (kept separate per CAT-AUTH coverage requirements).
- Global Playwright parallelism changes beyond what is needed for this fix.

## Implementation steps

### 1. Upgrade consent mocks to store state

- Inside `APIHelpers.mockConsentSuccess` (`src/frontend/e2e/utils/test-helpers.ts`):
  - Introduce an in-memory `Map<string, ConsentRecord[]>` scoped to the helper so each Playwright test maintains isolated state.
  - On POST `/api/consents`:
    - Parse `route.request().postDataJSON()` to capture `user_hash`, `consent_type`, and `consent_version`.
    - Build a consent payload mirroring the API (`consent_given_at`, `ip_address`, `user_agent`).
    - Push the record into the map under the provided hash (defaulting to `test-hash-123` if omitted to preserve current flow).
    - Return the existing success response body.
  - On GET `/api/consents/{user_hash}`:
    - Extract the hash from the URL, look up the map, and return `consents: [...]` when a record exists; otherwise fall back to `[]`.
  - Ensure `page.unroute` calls remain so reruns do not leak handlers.

### 2. Expose lightweight diagnostics

- Add an optional `APIHelpers.getConsentMockState(page)` helper (or return value from `mockConsentSuccess`) that exposes:
  - the number of POST calls handled;
  - the list of consents per hash.
- This is purely for assertions/logging under `import.meta.env.VITE_TEST_MODE`; keep it tree-shakeable in prod builds.

### 3. Stabilise onboarding waits in auth-session spec

- In `E2E-AUTH-001` and `E2E-AUTH-002`:
  - After clicking `accept-consent`, wait for a response confirming consent persistence, e.g. `await page.waitForResponse((res) => res.url().includes("/api/consents/") && res.request().method() === "GET" && res.status() === 200 && res.json().consents.length > 0);` (wrap in helper to avoid duplicated logic).
  - Alternatively, leverage the diagnostics helper to poll until the consent map contains the expected record before asserting `login-form` visibility.
  - Keep the Google/Kakao button assertions unchanged.
- Optionally document the expected polling behaviour with `expect(apiHelpers.getConsentReadCount()).toBeGreaterThanOrEqual(1)` to catch regressions quickly.

### 4. (Optional) Serialise suite only if instability persists

- If end-to-end reruns still reveal races (unlikely after steps 1-3), add `test.describe.configure({ mode: "serial" });` at the top of `auth-session.spec.ts`.
- This change is deferred unless we observe residual flakiness during verification.

## Testing & verification

1. From `src/frontend` run the targeted suite across desktop & mobile projects:
   - `npx playwright test e2e/specs/auth-session.spec.ts`
2. Run the previously failing shard for confidence:
   - `npx playwright test e2e/specs/auth-session.spec.ts --project="Mobile Chrome" -g "E2E-AUTH-001"`
3. If diagnostics were added, assert they report at least one consent POST and a non-empty GET payload.
4. Capture run logs in PR description to document the fix.

## Risks & mitigations

- **Map lifecycle leaks:** Ensure the consent map lives within the helper invocation scope; provide a cleanup (e.g., `page.once("close", ...)` or rely on closure) so workers do not share state across tests.
- **Schema drift:** Mocked consent structure must stay aligned with backend contract; pin keys (`consent_type`, `consent_version`, timestamps) and add comments referencing the API spec.
- **Await deadlocks:** Response-based waits in tests must include timeouts and friendly error messages. Wrap in helper with descriptive assertion failure text.

## Follow-up ideas (not required for this PR)

- Add unit coverage for `useConsentFlow` using mocked API service responses toggling between empty and populated lists.
- Extend Playwright helper suite to share a common mock state manager, reducing duplication across other API mocks.
- Evaluate moving consent polling to a push-based mechanism to reduce reliance on periodic GETs during onboarding.
