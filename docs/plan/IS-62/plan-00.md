# Implementation Plan: Test Infrastructure Realignment (IS-62)

## Overview

Modernize the frontend testing infrastructure highlighted in `docs/analysis/IS-62/IS-92/analysis-00.md` ("Test Infrastructure") so the IS-62 test pyramid reshaping can proceed safely. Existing helpers, fixtures, and Playwright configuration are considered untrusted. The rebuilt stack should preserve the working abstractions called out in §4.1 of the analysis while aligning with Google SRE *Testing for Reliability* guidance (2025-10 review) and Playwright fixture best practices.

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
- Add temporary smoke script `pnpm test:e2e --grep "E2E-JOURNEY"` ensuring parity while infra transitions.
- Record metrics: total runtime, worker count, retry frequency, artifact sizes; use as success benchmark.

### Phase 1 — Playwright Fixture Architecture

- Create `src/frontend/e2e/fixtures/base.ts` exposing `test = base.extend({...})` following Playwright fixture guidance.
- Implement fixtures:
  - `memberSession`: loads storageState derived from Supabase stub (member.json) to mimic whitelisted member login.
  - `adminSession`: creates separate browser context with admin storageState (admin.json) containing admin claims, then layers admin API mocks on top.
  - `simulationSeed`: injects deterministic simulation API responses and localStorage drafts, composing with `memberSession`.
  - `mockedApis`: centralizes request interception with typed payloads for OTP, simulation, and admin endpoints.
- Refactor journey specs to consume fixtures via dependency injection; supply transitional re-exports for untouched specs.

### Phase 2 — Helper & Mock Consolidation

- Split `TestHelpers` into `journeyActions.ts` (user flows) and `stateSetup.ts` (environment prep) under `src/frontend/e2e/utils/`.
- Separate `APIHelpers` into `apiMocks/playwright.ts` and `apiMocks/node.ts` so Playwright and Vitest pull from identical factories.
- Introduce shared DTO types in `src/frontend/test/shared/types.ts` and factories in `src/frontend/test/shared/fixtures.ts`.
- Update unit/integration suites (auth, dashboard, results) to use shared factories instead of bespoke JSON fixtures.
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
