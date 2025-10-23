# Implementation Plan: Test Infrastructure Realignment (IS-62)

## Context

- Target scope: "Test Infrastructure" findings in docs/analysis/IS-62/IS-92/analysis-00.md.
- Goal: unblock the IS-62 pyramid shift by modernizing fixtures, helpers, mocks, and Playwright config.
- References: Google Testing Blog (test pyramid) and Microsoft Playwright fixture guidance.

## Goals

- Provide reusable fixtures covering whitelist, authenticated user, admin, and seeded simulation states.
- Standardize mocking strategy for API, OTP, and Supabase across test layers.
- Reduce Playwright runtime cost while keeping debug assets on failure.
- Make helper APIs layer-appropriate and type-safe for React, Vitest, and Playwright suites.

## Non-Goals

- No functional code changes outside testing utilities.
- No rewrite of individual test cases beyond smoke checks validating infra refactor.
- No backend schema or service changes.

## Constraints & Assumptions

- Solo maintainer, 60-100 ko-KR users, Playwright + Vitest stack.
- Tests must run on Windows CI agents and local dev machines.
- Keep existing helper conventions (data-testids, naming) to avoid cascade regressions.
- Preserve ability to run offline journeys for PWA requirements.

## Current Infra Gaps (from analysis)

1. Helpers (`TestHelpers`, `APIHelpers`) couple E2E flows and low-level checks, blocking reuse (analysis §4.1).
2. No typed fixture modules for authenticated or seeded states; every spec recreates setup (analysis §5 bullet 5).
3. Playwright config runs four device projects with CI workers=1, extending runtime (~20 min) (analysis §4.2).
4. API mocking lives in browser-context scripts; unit/integration suites reimplement mocks differently.
5. Logging, tracing, and storageState assets are inconsistent, hampering flake triage.

## Implementation Strategy

### Phase 0: Inventory & Safety Net (0.5 day)

- Snapshot current helper APIs and their call sites; document signatures in `docs/plan/IS-62/appendix.md`.
- Add temporary smoke job running `pnpm test:e2e --grep "E2E-JOURNEY"` to ensure infra parity during migration.
- Capture baseline metrics: total runtime, flake rate, and artifact size.

### Phase 1: Playwright Fixture Rework (1.5 days)

- Create `src/frontend/e2e/fixtures/base.ts` exporting `test = base.extend({})` per Microsoft Playwright guidance.
- Implement fixtures:
  - `e2eAuth`: uses storageState for whitelisted member; derives from Supabase stub response.
  - `e2eAdmin`: extends `e2eAuth` with admin claims.
  - `e2eSimulation`: seeds simulation API mock & localStorage drafts; composes with `e2eAuth`.
  - `mockedApis`: wraps `APIHelpers` with deterministic, typed mock payloads.
- Replace direct helper imports in journey specs with fixture injection.
- Update `playwright.config.ts`:
  - Projects: keep `mobile-chromium`, `desktop-chromium` only.
  - Set `workers = process.env.CI ? 3 : undefined`.
  - Enable `screenshot: "only-on-failure"`, `video: "retain-on-failure"`, `trace: "retain-on-failure"`.
  - Move shared options into `use` block with typed options for fixture overrides.
- Verify locally with targeted specs (`onboarding`, `simulation-lifecycle`) before touching rest.

### Phase 2: Cross-Layer Helper Consolidation (2 days)

- Split existing helper classes:
  - `TestHelpers` → `journeyActions` (UI flows) and `setupActions` (pre-test state).
  - `APIHelpers` → `apiMocks/playwright.ts` and `apiMocks/node.ts` for Vitest compatibility.
- Introduce `src/frontend/test/shared/fixtures.ts` exporting Vitest/RTL-friendly factories (whitelist user, simulations, admin policy data).
- Refactor unit/integration suites to import shared factories instead of bespoke mocks (focus on auth, dashboard, results modules).
- Ensure TypeScript types shared via `@/test/types/testState.ts` to avoid drift.
- Add lint rule override (eslint `no-restricted-imports`) to prevent direct Supabase client usage in tests; force mock layer.

### Phase 3: Observability & CI Integration (1 day)

- Extend `package.json` scripts:
  - `test:e2e:journeys` uses new fixture entrypoint.
  - `test:integration` loads shared factories.
  - `test:lint:tests` runs eslint with test-focused config.
- Update CI workflow:
  - Parallel jobs for `journey-e2e` (Playwright) and `unit+integration` (Vitest) with artifact uploads for trace/video on failure.
  - Cache `playwright/.auth` storageState per branch.
- Add `docs/cicd/ci-cd.md` appendix describing new jobs and debug artifact locations.
- Instrument `mockedApis` to emit console marks (start/end) for flaky test investigation.

## Risks & Mitigations

- **Fixture drift between layers** → add type-shared DTOs and lint guard; schedule monthly review.
- **Increased CI cost from videos** → gate `retain-on-failure` to CI only; clean artifacts after 14 days.
- **Hidden dependencies in legacy tests** → migrate specs incrementally, keep fallback helper exports until final cleanup.
- **StorageState staleness** → regenerate via script `pnpm test:e2e --update-auth-state` when Supabase schema changes.

## Success Metrics & Exit Criteria

- CI Playwright journey suite ≤ 4 minutes (down from ~15).
- Flake rate < 2% over 10 consecutive runs.
- All test layers reference shared helper/fixture modules (no direct Supabase/mock duplication).
- Documentation updated and linked from repo README testing section.
- Post-migration smoke job passes for three consecutive days; old helper aliases removed.
