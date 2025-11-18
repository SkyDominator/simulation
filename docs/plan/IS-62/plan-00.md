# Implementation Plan: Test Infrastructure Realignment (IS-62)

## Overview

Modernize the frontend testing infrastructure highlighted in `docs/analysis/IS-62/IS-92/analysis-00.md` ("Test Infrastructure") so the IS-62 test pyramid reshaping can proceed safely. Existing helpers, fixtures, and Playwright configuration are considered untrusted. The rebuilt stack should preserve the working abstractions called out in §4.1 of the analysis—specifically the `TestHelpers` and `APIHelpers` contracts—while aligning with Google SRE *Testing for Reliability* guidance (2025-10 review) and Playwright fixture best practices.

## Goals

- Provide reusable, typed fixtures delivering whitelist, authenticated member, admin, and seeded simulation states for Playwright.
- Unify mocking layers across Vitest and Playwright so OTP, API, and Supabase doubles share contracts and payload factories.
- Reduce E2E runtime by pruning excess projects, enabling CI parallelism, and capturing actionable failure artifacts.
- Deliver guardrails (smoke jobs, lint rules, docs) that keep contributors on the new infrastructure without regressions.

## Non-Goals

- No application feature changes or backend schema/service adjustments.
- No wholesale rewrite of existing test cases (migration handled in separate suite plan).
- No changes to production Supabase configuration or OAuth provider wiring.

## Constraints & Assumptions

- Solo maintainer; workflows must succeed on Windows-based CI with PowerShell shell.
- Existing `data-testid` usage remains stable during infra rollout to avoid cascading failures.
- Offline/PWA flows must stay reachable after fixture refactor, supporting ko-KR mobile users.
- Storage state artifacts must remain free of real credentials; rely on Supabase stub payloads.

## Baseline Issues (Analysis References)

1. `TestHelpers` and `APIHelpers` mix browser actions with setup logic, limiting reuse (§4.1).
2. Lack of typed fixture modules forces each spec to recreate auth/admin state (§5 bullet 5).
3. `playwright.config.ts` runs four device projects with `workers=1`, causing 15–20 minute runtime (§4.2).
4. Playwright and Vitest maintain distinct mock implementations, drifting over time (§4.1, conclusion).
5. Debug artifacts (trace/video/screenshot) are inconsistent, slowing flake triage (§4.2 observations).

## Implementation Strategy

### Phase 0 — Baseline & Safety Net

- Snapshot current helper signatures and usage sites; store inventory in `docs/plan/IS-62/appendix.md` for backward-reference.
- Keep the existing `pnpm test:e2e:journeys` smoke script as the gating parity check before and after each infrastructure change.
- Record metrics: total runtime, worker count, retry frequency, artifact sizes; use as success benchmark.

### Phase 1 — Playwright Fixture Architecture

- Create `src/frontend/e2e/fixtures/base.ts` exposing `test = base.extend({...})` following Playwright fixture guidance and re-exporting helper-friendly types.
- Introduce scoped fixture modules called out in the analysis:
  - `src/frontend/e2e/fixtures/authenticated.ts` provides `memberSession` and `initE2EMode` orchestration by reusing the existing `playwright/.auth/member.json` storage state generated with Supabase stubs.
  - `src/frontend/e2e/fixtures/admin-user.ts` layers the existing `playwright/.auth/admin.json` storage state plus admin API doubles on top of `memberSession`.
  - `src/frontend/e2e/fixtures/with-simulation.ts` composes deterministic simulation payloads, localStorage drafts, and offline state to support dashboard/results specs.
  - `src/frontend/e2e/fixtures/mocked-apis.ts` centralizes request interception with typed payload factories for OTP, simulation, notices, and policy endpoints.
- Refactor journey specs to consume fixtures via dependency injection; supply transitional re-exports for untouched specs so adopters can continue calling `test` from a single module.

### Phase 2 — Helper & Mock Consolidation

- Retain the public `TestHelpers` class while refactoring its internals to delegate to functional helpers in `src/frontend/e2e/utils/journey-actions.ts`; ensure method signatures remain stable for existing specs.
- Keep the `APIHelpers` static interface but move implementation details into `src/frontend/e2e/utils/api-mocks/playwright.ts`, backed by shared factories, so both Playwright and Vitest consume a single contract.
- Preserve `auth-helpers.ts` entry points by wrapping them with fixture-aware adapters so existing login utilities flow through the new storage-state fixtures without breaking consumers.
- Introduce shared DTO types in `src/frontend/test/shared/types.ts` and payload factories in `src/frontend/test/shared/fixtures.ts`, re-used by `APIHelpers` and Vitest suites alike.
- Update unit/integration suites (auth, dashboard, results) to source data from the shared factories, eliminating drift between browser and node contexts.
- Add ESLint guard (`no-restricted-imports`) preventing direct Supabase client usage within tests, enforcing mock layer adoption.

### Phase 3 — Playwright Configuration Realignment

- Update `playwright.config.ts`:
  - Reduce projects to `mobile-chromium` and `desktop-chromium` with landscape viewport to satisfy LandscapeEnforcer.
  - Set `workers = process.env.CI ? 3 : undefined` to unlock parallelism while respecting container quotas.
  - Configure `screenshot: "only-on-failure"`, `video: "retain-on-failure"`, `trace: "retain-on-failure"` per Google SRE MTTR guidance.
  - Move fixture-tunable options into the `use` block so tests can override defaults cleanly.
- Validate updated config locally on onboarding and simulation journeys before enabling CI rollout.

### Phase 4 — Observability, Tooling

- Modify `package.json` scripts:
  - `test:e2e:journeys` targeting fixture entrypoint.
  - `test:integration` bootstrapping shared factories.
  - `lint:tests` applying test-specific ESLint rules.
- Update CI workflow (`.github/workflows/ci-cd.yml`):
  - Split jobs into `journey-e2e` (Playwright) and `unit-integration` (Vitest) with artifact uploads on failure.
  - Cache `playwright/.auth` storageState per branch and purge nightly to prevent staleness.
- Instrument `mockedApis` to emit console marks for request start/end to improve flaky test investigation.
