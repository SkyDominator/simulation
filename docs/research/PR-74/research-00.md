---
date: 2025-10-02T11:15:00+09:00
researcher: GitHub Copilot
git_commit: 48f73f02f7941a4921c1f1c6cfd05b306470b457
branch: copilot/fix-f6c08c90-81a3-452c-920e-a4e949c9a985
topic: "PR-74 Playwright Auth Session flaky failure analysis"
tags: [research, frontend, e2e, playwright, authentication]
status: complete
last_updated: 2025-10-02
last_updated_by: GitHub Copilot
---

# Research: Playwright Auth Session Failures (PR-74)

## Research Question

Investigate why `E2E-AUTH-001` in `src/frontend/e2e/specs/auth-session.spec.ts` intermittently fails while `E2E-AUTH-002` passes, map all related frontend code, describe data/execution flow, and assess sequencing/oauth-provider consolidation options per `docs/plans/test-code/test-plan-08-frontend-e2e.md` and `.github/prompts/research/pr-74-research.prompt.md`.

## Summary

- The login flow under test transitions through `WhitelistCheckPage → OtpVerificationPage → ConsentPage → LoginPage` managed by `AppController` and `useConsentFlow`, with Supabase mocked via `AuthContext`.
- `APIHelpers.mockConsentSuccess` returns an empty consent list (`consents: []`), so `useConsentFlow` (lines 9-38) immediately forces the app back to the consent page after `accept-consent`, causing `await expect(page.getByTestId("login-form"))` at line 59 to race and time out in `E2E-AUTH-001`.
- `E2E-AUTH-001` is more sensitive because it sets up an additional route spy and waits for the OAuth redirect, lengthening the window where `useConsentFlow` reverts the page.
- Parallel execution remains enabled via `fullyParallel: true` in `playwright.config.ts` (lines 9-24), but tests in this file currently run sequentially on a single worker; serializing is still possible if needed.

## Code Map

### Test layer

- `src/frontend/e2e/specs/auth-session.spec.ts:1-154` – Suite definition, shared `beforeEach`, and the eight CAT-AUTH scenarios. The failing expectation sits at line 59 for `E2E-AUTH-001`; the Kakao parity check is at line 83.
- `src/frontend/e2e/utils/test-helpers.ts:1-198` – UI helpers (`fillWhitelistForm`, `fillOTPForm`) used by both tests; `initE2EMode` ensures `window.__E2E_MODE__` is set before app scripts load.
- `src/frontend/e2e/utils/test-helpers.ts:352-460` – `APIHelpers.mockConsentSuccess` / `mockSimulationAPI` / OTP mocks that intercept `/api/*` during the onboarding path; consent GET always returns an empty array at lines 420-434.
- `src/frontend/e2e/utils/auth-helpers.ts:1-120` – Provides `loginTestUser`, `logoutTestUser`, `completeOnboardingFlow`, and `isUserAuthenticated` invoked by later CAT-AUTH cases.

### UI flow components

- `src/frontend/src/pages/WhitelistCheckPage.tsx:1-208` – Collects name/phone, dispatches `apiService.sendOtp`, and renders `OtpVerificationPage` (lines 120-207) when `showOtpVerification` flips. Data-testids `whitelist-form`, `name-input`, `phone-input`, `submit-whitelist` are aligned with the helpers.
- `src/frontend/src/pages/OtpVerificationPage.tsx:1-200` – Posts to `/otp/verify` and transitions to consent via `onVerified(userHash)` (lines 130-167).
- `src/frontend/src/pages/ConsentPage.tsx:1-212` – Fetches privacy policy on mount (lines 33-70), requires checkbox acknowledgement (line 120), records consent through `apiService.recordConsent` (lines 134-154), and calls `onAccept()` or `onDecline()`.
- `src/frontend/src/pages/LoginPage.tsx:1-150` – Renders the login CTA (data-testid `login-form`) and triggers Supabase OAuth through `handleSocialLogin` (lines 28-57). In E2E mode it emits `window.dispatchEvent("e2e:oauth-click")`.
- `src/frontend/src/AppController.tsx:1-270` – Governs page state (`page`, `userHash`) and memoizes `whitelist`, `consent`, and `login` screens; `renderPage()` (lines 142-190) switches between them based on auth state.

### Auth & state management

- `src/frontend/src/hooks/useConsentFlow.ts:1-40` – Polls `/api/consents/{userHash}`; when `consents` is empty it enforces `page === "consent"`, otherwise `page === "login"`.
- `src/frontend/src/context/AuthContext.tsx:1-204` – Builds Supabase sessions from test tokens (lines 9-61), listens for the `e2e:oauth-click` event (lines 94-118), and exposes `user`/`session` to `AppController`.
- `src/frontend/src/utils/testMode.ts:1-22` – Detects E2E mode for `LoginPage`/`AuthContext` logic.

### Config & guidance

- `docs/plans/test-code/test-plan-08-frontend-e2e.md:61-132` – Defines CAT-AUTH objectives, mirroring the Playwright cases.
- `src/frontend/playwright.config.ts:9-34` – Enables `fullyParallel: true`, configures five device projects, and reuses the Vite preview server.

## Data Flow (Whitelist → Login)

1. `TestHelpers.fillWhitelistForm` (helpers.ts:22-33) inputs name/phone and triggers `/api/otp/send`, mocked by `APIHelpers.mockOTPSuccess` (helpers.ts:266-295) to yield `{ user_hash: "test-hash-123" }`.
2. `WhitelistCheckPage` receives `onVerified(userHash)` (WhitelistCheckPage.tsx:117-137), stores the hash in `AppController` state, and renders `OtpVerificationPage`.
3. `helpers.fillOTPForm` (helpers.ts:41-50) posts to `/api/otp/verify`, intercepted at helpers.ts:296-318 to respond success, which calls `onVerified(userHash)` in the OTP page (OtpVerificationPage.tsx:128-150).
4. `AppController` updates `userHash` and `useConsentFlow` (useConsentFlow.ts:9-38) fetches `/api/consents/{userHash}`, mocked to return `{ consents: [], success: true }` (helpers.ts:420-434). Because the array is empty, `setPage("consent")` fires.
5. `ConsentPage` fetches the policy (helpers.ts:358-402) and renders the accept checkbox. On confirm, `handleAccept` posts `/api/consents` (ConsentPage.tsx:134-154), which the mock fulfills with a success payload (helpers.ts:402-419), then calls `onAccept()` → `setPage("login")` (AppController.tsx:64-90).
6. `renderPage()` now evaluates `page === "login"`; `LoginPage` renders (LoginPage.tsx:58-147), and when a button is clicked in E2E mode it dispatches `e2e:oauth-click`. `AuthContext` listens to that event to synthesize a Supabase session (AuthContext.tsx:94-118).
7. Subsequent expectations in `auth-session.spec.ts` assert DOM visibility or session state.

## Execution Flow Trace (E2E-AUTH-001)

1. `beforeEach` (auth-session.spec.ts:17-30) configures mocks and instantiates `TestHelpers`.
2. Test-specific route spy (`page.route("**/auth/v1/authorize**")`) is set up (lines 34-47) before `page.goto("/")`.
3. Whitelist + OTP + consent path runs via helpers, backed by mocks (lines 50-71).
4. After `accept-consent`, the test waits for `login-form` (line 59); during this await, `useConsentFlow` triggers again, finds zero consents, and flips `page` back to `"consent"` before the expectation resolves.
5. Because `login-form` disappears, Playwright times out, failing the assertion. The subsequent OAuth click never executes, leaving `oauthTriggered === false`.

## Issue Analysis

### Primary cause: consent mock never reflects the recorded consent

- `APIHelpers.mockConsentSuccess` fulfils `GET **/api/consents/*` with `{ consents: [] }` (helpers.ts:420-434).
- `useConsentFlow` treats `consents.length === 0` as "no consent" and hard-resets `page` to `"consent"` whenever the hook runs (useConsentFlow.ts:21-32).
- After `handleAccept` resolves, `AppController` temporarily switches to `"login"`, but the hook immediately overrides it, making the login form transient. This explains both the intermittent visibility and why `E2E-AUTH-001` (which adds an extra await for the route spy) fails while `E2E-AUTH-002` often sneaks through.

### Parallelism/race considerations

- `playwright.config.ts` keeps `fullyParallel: true` (line 9), so different spec files can execute concurrently. Inside this file, tests still share the describe’s `beforeEach` and run sequentially on the same worker, so inter-test leakage is limited.
- However, the absence of `test.describe.configure({ mode: "serial" })` means future refactors could parallelize the cases; if consent state or mocks become shared, races will surface quickly.

### Additional contributing factors

- `page.route("**/auth/v1/authorize**")` responds with a synthetic 302 (auth-session.spec.ts:36-44). If the redirect lands before the login DOM stabilizes, React re-renders the consent flow, increasing the chance of missing the `login-form` visibility window.
- `TestHelpers` clear storage in `afterEach` via `page.evaluate` (auth-session.spec.ts:23-30), but if a test aborts early the storage clearing step may not run, leaving residual `ui.page` state for retries.

## Advanced Questions

### Can we force the two tests to run sequentially?

Yes. Options include:

1. Set `test.describe.configure({ mode: "serial" })` inside `auth-session.spec.ts` so all enclosed tests run serially regardless of global settings.
2. Lower global parallelism by switching `fullyParallel: false` in `playwright.config.ts:9-24`, or by setting `workers: 1` locally when needed.
3. Use tagged CLI invocations (`npx playwright test e2e/specs/auth-session.spec.ts --workers=1`).

Serial execution mitigates shared-mock races but does not address the underlying consent-state bug; fixing the mock remains necessary.

### Can both tests reuse the same OAuth provider?

Technically yes: pointing both cases to Google (or Kakao) would reduce duplication by reusing `LoginPage`'s E2E branch (LoginPage.tsx:28-56). However, CAT-AUTH explicitly validates that both provider buttons invoke `handleSocialLogin` with distinct `provider` values, so consolidating would reduce coverage. If stability is the priority, you could parameterize the test over `["google", "kakao"]` to ensure identical setup logic while still asserting both buttons.

### Other plausible failure modes

- If the Supabase auth script makes a network call before `initE2EMode` runs, `isE2EMode()` would return false and real OAuth redirects could break the flow. `initE2EMode` mitigates this by using `page.addInitScript`, but any regression there would resurface the issue.
- Future changes to `ConsentPage` could introduce debounce/async loading states; without updating the mocks to reflect persisted consent, the login page flicker would become deterministic failures across both tests.
- Using multiple Playwright projects (mobile/desktop) against the same preview server concurrently could reuse the same OTP/consent mocks; ensure each project hits unique worker contexts or move mocks into `test.use({ storageState: ... })` for better isolation.

## Recommended Follow-ups

- Extend `APIHelpers.mockConsentSuccess` to append a consent record (e.g., return `{ consents: [{ consent_type: "privacy_policy", ... }] }`) so `useConsentFlow` keeps the app on the login screen.
- Add an assertion in `E2E-AUTH-001` that the consent GET mock was called twice to document the expected polling behaviour.
- Consider toggling `test.describe.configure({ mode: "serial" })` until the consent mock is fixed to avoid hidden flakiness during CI runs.
