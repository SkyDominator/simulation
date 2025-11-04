# Implementation Plan: E2E Pre-Authentication Flow (IS-62)

## Scope

- Rebuild Playwright journey coverage for the six pre-authentication steps (whitelist → OTP → consent → login redirect) under `E2E-JOURNEY` naming.
- Consolidate the happy-path flow into a single test while retaining targeted error-case tests for critical user-facing failures.
- Align production UI test ids with the new tests; no backend changes.
- Decommission legacy onboarding tests that overlap with the new coverage.

## Dependencies & Inputs

- UX sequence: `docs/spec/ux-flow.md` (Section 1).
- Test fixtures & mocks: `src/frontend/e2e/fixtures/*.ts`, `src/frontend/e2e/utils/apiMocks/playwright.ts`.
- Shared fixtures: `src/frontend/test/shared/fixtures.ts`, `types.ts` (used by API mocks for consistent data).
- UI components: `src/frontend/src/pages/WhitelistCheckPage.tsx`, `OtpVerificationPage.tsx`, `ConsentPage.tsx`, `LoginPage.tsx`.
- Helper utilities: `src/frontend/e2e/utils/journey-actions.ts`, `TestHelpers`, `loginTestUser`.

## Phase 0 – Test Data Consolidation 1

- [ ] Refactor `TEST_SIMULATIONS` constants to leverage `createSimulationData()` factory from shared fixtures with appropriate overrides for plan-specific parameters.
- [ ] Refactor `MOCK_RESULTS` constants to use `createSimulationResults()` and `createSimulationRoundResult()` factories from shared fixtures.
- [ ] Keep E2E-specific constants in `test-data.ts` that have no shared equivalent: `TEST_USERS`, `TEST_OTP_CODES`, `VIEWPORT_SIZES`, `TEST_CONSTANTS`, `TEST_MESSAGES`, `TEST_TIMEOUTS`.
- [ ] Update `generateTestSimulation()` helper to wrap `createSimulationData()` rather than reimplementing structure.
<!-- - [ ] Replace `createErrorResponse()`  with `createAPIErrorResponse()` from shared fixtures where applicable.
- [ ] Create `createSuccessResponse()` in shared fixtures if not already present, to standardize success response structures, and replace `createSuccessResponse()` in `test-data.ts`. -->


## Phase 1 – Test Data Consolidation 2

- [ ] Audit `e2e/fixtures/test-data.ts` for overlap with `test/shared/fixtures.ts` to identify redundant data definitions. If redundancies exist, refactor `e2e/fixtures/test-data.ts` to use shared factories under `test/shared`.
- [ ] Search for remaining redundancy in the test infrastructures under `e2e` that could be replaced with shared fixture factories under `test/shared`.
- [ ] Document in `test-data.ts` header comment that shared fixtures should be preferred for API response structures to maintain consistency with Vitest unit tests.
- [ ] Update all helpers under `src/frontend/e2e/utils` to use the shared fixture factories through the mockedApis controller instead of hardcoded values.

## Phase 2 – Surface Audit & Test Id Harmonization

- [ ] Inventory existing `data-testid` hooks on the four pre-auth pages; add missing ids (e.g., whitelist validation alert, OTP resend button disabled states) while keeping naming consistent with `journey-actions` helpers. Check the existing `data-testid`s against the planned test ids in the pre-auth flow tests in `journey-actions`; harmonize names to avoid duplication or confusion.
- [ ] Ensure alert elements expose both role `alert` with deterministic text.
- [ ] Update `journey-actions.ts` selectors if new ids replace role-based fallbacks (keep accessibility-first strategy per guidelines).

## Phase 3 – Positive Journey (Single Flow Test)

- [ ] Create new spec `src/frontend/e2e/specs/pre-auth-flow.spec.ts` using `test` from `../fixtures/base`. 
    - [ ] Inside `test.describe("Pre-Authentication Journey")`, implement one test (`E2E-JOURNEY-PREAUTH-001`) that drives all six steps sequentially: Use helper actions from `journey-actions.ts` to submit whitelist, enter OTP, accept consent, perform OAuth click with `loginTestUser` hook, and expect landing on dashboard.
    - [ ] Initialize mocked APIs: `mockedApis(page).mockOTPSuccess()`, `.mockConsentSuccess()`, `.mockNoticesAPI()`, `.mockSimulationAPI()`.
    - [ ] Capture intermediate expectations: form visibility toggles, countdown presence after OTP request, consent policy fetch, login banner state when not embedded.
- [ ] Add a `completePreAuthJourney` helper in `journey-actions.ts` that wraps the sequential actions and accepts hooks for assertions between steps to keep the test concise and reusable.

## Phase 4 – Critical Error Scenario Coverage

Implement focused tests in the same spec (order by flow step) using shared mocks:

- [ ] **Whitelist rejection** (`E2E-PREAUTH-ERR-001`): mock `mockOTPFailure("whitelist")`, submit invalid user, assert alert text and that flow does not advance to OTP form.
- [ ] **OTP invalid code** (`E2E-PREAUTH-ERR-002`): allow send success but `mockOTPFailure("invalid_code")`, confirm error message stays on OTP screen and timer remains.
- [ ] **OTP expired** (`E2E-PREAUTH-ERR-003`): reuse expired scenario, ensure UI shows expiry message and re-exposes resend button once countdown completes (use Playwright `page.waitForTimeout` with Mock countdown override or adjust component to expose timer state via prop for tests if needed).
- [ ] **Consent submission failure** (`E2E-PREAUTH-ERR-004`): start from successful OTP, then apply `mockNetworkError("/api/consents")`, verify toast/alert messaging and that user remains on consent page with retry path.
- [ ] **Embedded browser login block** (`E2E-PREAUTH-ERR-005`): set user agent before navigation to simulate Kakao in-app browser; confirm banner text, disabled OAuth buttons, and modal triggered on manual click (if logic still allows) without progressing.

## Phase 5 – Helper & Fixture Enhancements

- [ ] Implement `completePreAuthFlow` helper in `journey-actions.ts` to return step handles so tests can assert between actions; ensure default OTP code uses fixture constant.
- [ ] Update `loginTestUser` or add inline handler so the journey test can intercept `e2e:oauth-click` before expecting dashboard.
- [ ] Expose helper in mocks to control `expires_in_seconds` for deterministic timer assertions; adjust `mockOTPSuccess` or add wrapper method on `MockedApisController` that accepts overrides.
- [ ] Document any new helper in code comments sparingly, explaining non-obvious sequencing per repo rules.

## Phase 6 – Cleanup & Migration

- [ ] Delete redundant helper usage that is no longer referenced after migration and run TypeScript build to catch unused exports.
- [ ] Update `docs/plan/IS-62/next-step-summary.md` later if follow-up phases require it (not part of this change set).
- [ ] Remove any legacy pre-auth test data constants from `test-data.ts` that are no longer referenced.
- [ ] Remove any legacy pre-auth test codes that overlaps with the tests implemented in the past Phases so far. 

## Validation

- [ ] `pnpm --filter frontend lint:tests` (or `npm run lint:tests --workspace frontend`).
- [ ] `pnpm --filter frontend test:e2e:journeys -- --grep "PREAUTH"` to scope runs while iterating.
- [ ] Full suite smoke: `pnpm --filter frontend test:e2e` across Chrome + Mobile projects before merge.
- [ ] Optional: record trace for positive journey (`PWDEBUG=1 pnpm --filter frontend test:e2e --project="Google Chrome" --grep "PREAUTH-001"`).

## Risks & Mitigations

- **Countdown-based assertions may flake**: Mitigate by mocking `expires_in_seconds` to a small deterministic value and waiting for specific UI states instead of raw time.
- **Embedded-browser simulation relies on UA mutation**: Ensure tests reset UA between cases (use `context.newPage` or `page.addInitScript`).
- **Removing legacy tests without full parity could create gaps**: Cross-check coverage matrix before deletion to ensure all scenarios are covered in new tests.
