# Implementation Plan: E2E Pre-Authentication Flow (IS-62)

> Web research: External web access is unavailable in this workspace; proceeding with internal PRD/UXD/coding guides only.

## Scope

- Rebuild Playwright journey coverage for the six pre-authentication steps (whitelist → OTP → consent → login redirect) under `E2E-JOURNEY` naming.
- Consolidate the happy-path flow into a single test while retaining targeted error-case tests for critical user-facing failures.
- Align production UI test ids with the new tests; no backend changes.
- Decommission legacy onboarding tests that overlap with the new coverage.

## Dependencies & Inputs

- UX sequence: `docs/spec/ux-flow.md` (Section 1).
- Test fixtures & mocks: `src/frontend/e2e/fixtures/*.ts`, `src/frontend/e2e/utils/apiMocks/playwright.ts`.
- UI components: `src/frontend/src/pages/WhitelistCheckPage.tsx`, `OtpVerificationPage.tsx`, `ConsentPage.tsx`, `LoginPage.tsx`.
- Helper utilities: `src/frontend/e2e/utils/journey-actions.ts`, `TestHelpers`, `loginTestUser`.

## Phase 0 – Surface Audit & Test Id Harmonization

- [ ] Inventory existing `data-testid` hooks on the four pre-auth pages; add missing ids (e.g., whitelist validation alert, OTP resend button disabled states) while keeping naming consistent with `journey-actions` helpers.
- [ ] Ensure alert elements expose either role `alert` with deterministic text or a dedicated `data-testid` for assertion stability.
- [ ] Update `journey-actions.ts` selectors if new ids replace role-based fallbacks (keep accessibility-first strategy per guidelines).

## Phase 1 – Positive Journey (Single Flow Test)

- [ ] Create new spec `src/frontend/e2e/specs/pre-auth-flow.spec.ts` (or repurpose `onboarding.spec.ts` by renaming) using `test` from `../fixtures/base` only.
- [ ] Inside `test.describe("Pre-Authentication Journey")`, implement one test (`E2E-JOURNEY-PREAUTH-001`) that drives all six steps sequentially:
  - Initialize mocked APIs: `mockedApis(page).mockOTPSuccess()`, `.mockConsentSuccess()`, `.mockNoticesAPI()`, `.mockSimulationAPI()`.
  - Use helper actions (after possible refactor) to submit whitelist, enter OTP, accept consent, perform OAuth click with `loginTestUser` hook, and expect landing on dashboard.
  - Capture intermediate expectations: form visibility toggles, countdown presence after OTP request, consent policy fetch, login banner state when not embedded.
- [ ] Consider adding a `completePreAuthJourney` helper (in `journey-actions.ts`) that wraps the sequential actions and accepts hooks for assertions between steps to keep the test concise and reusable.

## Phase 2 – Critical Error Scenario Coverage

Implement focused tests in the same spec (order by flow step) using shared mocks:

- [ ] **Whitelist rejection** (`E2E-PREAUTH-ERR-001`): mock `mockOTPFailure("whitelist")`, submit invalid user, assert alert text and that flow does not advance to OTP form.
- [ ] **OTP invalid code** (`E2E-PREAUTH-ERR-002`): allow send success but `mockOTPFailure("invalid_code")`, confirm error message stays on OTP screen and timer remains.
- [ ] **OTP expired** (`E2E-PREAUTH-ERR-003`): reuse expired scenario, ensure UI shows expiry message and re-exposes resend button once countdown completes (use Playwright `page.waitForTimeout` with Mock countdown override or adjust component to expose timer state via prop for tests if needed).
- [ ] **Consent submission failure** (`E2E-PREAUTH-ERR-004`): start from successful OTP, then apply `mockNetworkError("/api/consents")`, verify toast/alert messaging and that user remains on consent page with retry path.
- [ ] **Embedded browser login block** (`E2E-PREAUTH-ERR-005`): set user agent before navigation to simulate Kakao in-app browser; confirm banner text, disabled OAuth buttons, and modal triggered on manual click (if logic still allows) without progressing.

## Phase 3 – Helper & Fixture Enhancements

- [ ] Extend `journey-actions.ts` with `completePreAuthFlow` (or update existing `completeOnboardingFlow`) to return step handles so tests can assert between actions; ensure default OTP code uses fixture constant.
- [ ] Update `loginTestUser` or add inline handler so the journey test can intercept `e2e:oauth-click` before expecting dashboard.
- [ ] If timer assertions need deterministic values, expose helper in mocks to control `expires_in_seconds`; adjust `mockOTPSuccess` or add wrapper method on `MockedApisController` that accepts overrides.
- [ ] Document any new helper in code comments sparingly, explaining non-obvious sequencing per repo rules.

## Phase 4 – Cleanup & Migration

- [ ] Remove legacy `base.describe` block from `src/frontend/e2e/specs/onboarding.spec.ts` once new spec covers the cases; keep only shared utilities if still needed.
- [ ] Delete redundant helper usage that is no longer referenced after migration and run TypeScript build to catch unused exports.
- [ ] Update `docs/plan/IS-62/next-step-summary.md` later if follow-up phases require it (not part of this change set).

## Validation

- [ ] `pnpm --filter frontend lint:tests` (or `npm run lint:tests --workspace frontend`).
- [ ] `pnpm --filter frontend test:e2e:journeys -- --grep "PREAUTH"` to scope runs while iterating.
- [ ] Full suite smoke: `pnpm --filter frontend test:e2e` across Chrome + Mobile projects before merge.
- [ ] Optional: record trace for positive journey (`PWDEBUG=1 pnpm --filter frontend test:e2e --project="Google Chrome" --grep "PREAUTH-001"`).

## Risks & Mitigations

- Countdown-based assertions may flake; mitigate by mocking `expires_in_seconds` to a small deterministic value and waiting for specific UI states instead of raw time.
- Embedded-browser simulation relies on UA mutation; ensure tests reset UA between cases (use `context.newPage` or `page.addInitScript`).
- Removing legacy tests without full parity could create gaps; cross-check coverage matrix before deletion.
