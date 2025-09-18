# Test Code Implementation Plan

## Overview

Comprehensive multi-layer automated testing for LOLClub Simulation (FastAPI backend + React/Vite PWA) aligned strictly with SSD v0.2.1. Initial coverage thresholds: backend ≥40%, frontend ≥25%. Long-term progression targets: backend toward 70%, frontend toward 60%. Quality gates focus on linting, type safety, current API contract stability, and PII hygiene.



## Test Layer Index & Cross-Links

Each test layer below links to a dedicated, self-contained plan file. This master document orchestrates the full strategy while individual files guide day-to-day implementation.

| # | Layer | Plan File | One-Line Purpose |
|---|-------|-----------|------------------|
| 1 | Backend Unit | [test-plan-01-backend-unit](./test-plan-01-backend-unit.md) | Validate financial & helper logic deterministically |
| 2 | Backend Integration | [test-plan-02-backend-integration](./test-plan-02-backend-integration.md) | Exercise implemented FastAPI endpoints (SSD §8) |
| 3 | Contract (OpenAPI) | [test-plan-03-contract](./test-plan-03-contract.md) | Guard current API surface against regressions |
| 4 | Frontend Unit / Component | [test-plan-04-frontend-unit](./test-plan-04-frontend-unit.md) | Assert component & utility correctness |
| 5 | Frontend Shallow Integration | [test-plan-05-frontend-integration](./test-plan-05-frontend-integration.md) | Onboarding/navigation without full browser stack |
| 6 | E2E Smoke | [test-plan-06-e2e-smoke](./test-plan-06-e2e-smoke.md) | Minimal deployed sanity check (PWA + health) |
| 7 | Performance / Load Scaffold | [test-plan-07-performance](./test-plan-07-performance.md) | Baseline SSD §11 latency & execution timing |
| 8 | Coverage & Reporting | [test-plan-08-coverage-reporting](./test-plan-08-coverage-reporting.md) | Aggregate metrics & enforce gates |
| 9 | PII Masking & Test Data Policy | [test-plan-09-pii-policy](./test-plan-09-pii-policy.md) | Prevent leakage of real personal data |
| 10 | Tooling & Automation | [test-plan-10-tooling-automation](./test-plan-10-tooling-automation.md) | Scripts & CI tasks (current scope) |
| 11 | Restructuring & Documentation | [test-plan-11-restructuring-docs](./test-plan-11-restructuring-docs.md) | Keep repo & docs aligned |

## Rationale: Why Each Layer Exists

Short justifications tying each layer to risk reduction per SSD scope (small internal PWA with financial simulation logic & consent workflow):

### 1. Backend Unit

Focuses on deterministic simulation math (plans A,B,C,D,K,P,R,F,E), tax (3.3% deduction), achievement rate handling (if implemented), whitelist hashing, and JWT validation helpers. Fast feedback for core financial integrity.

### 2. Backend Integration

Validates SSD §8 endpoints: OTP send/verify (with whitelist), privacy policy retrieval (including static fallback), consent record creation & retrieval (pre-auth), simulations CRUD/run (with parameter conversion from scheduled_payment to investments), notices public & admin, comprehensive admin privacy policy management (create/update/delete/publish/list), health.

### 3. Contract (OpenAPI)

Ensures documented API (SSD §8 + representative §9 examples) remains stable; snapshot diff surfaces accidental breaking changes.

### 4. Frontend Unit / Component

Ensures UI primitives (orientation enforcement, plan editor steps, formatting utilities, offline results display, admin policy management) behave predictably—critical for a PWA that must guide users through a multi-step onboarding funnel and provide comprehensive admin capabilities.

### 5. Frontend Shallow Integration

Exercises onboarding flow (Whitelist/OTP → Consent → OAuth hand-off placeholder → MainPage), offline results navigation, admin policy management, and state persistence (local/session storage).

### 6. E2E Smoke

Minimal deployed safety net: root PWA loads (manifest available) and `/api/health` returns expected structure.

### 7. Performance / Load Scaffold

Captures baseline simulation execution (<2s typical) and API latency (p95 <500ms) per SSD §11; informational early stage.

### 8. Coverage & Reporting

Creates quantitative visibility (initially modest gates) to ensure incremental improvement and discourage untested growth in critical paths.

### 9. PII Masking & Test Data Policy

Protects against accidental exposure of real phone numbers / user info in a workflow heavily centered on phone-based OTP verification.

### 10. Tooling & Automation

Unifies tasks (migrations, contract, coverage, PII scan) so contributors have a single entrypoint; reduces friction and divergence across OS environments (notably Windows primary dev context).

### 11. Restructuring & Documentation

Keeps structure coherent (fixtures, JWKS, snapshot storage) and ensures procedural knowledge (updating snapshots, handling drift) is captured—lowering onboarding time for new contributors.


## Goals

- Structured unit, integration, contract, shallow frontend integration, and smoke scaffolds
- Cover simulation plans A B C D K P R F E (SSD §10)
- Mock SMS provider & JWKS in CI
- Enforce PII masking (no raw phone numbers)
- Integrate Codecov gating
- Provide performance baseline (non-gating)

## Out of Scope (Current Release)

- Full browser E2E across all user flows
- Consent 423 enforcement scenarios (not yet implemented in SSD)
- Migration / schema drift automation
- Offline-only simulation execution
- Chaos / fuzz / mutation testing
- Multi-region latency simulation

## Deferred Items (Implementation Dependent)

Items marked for implementation only if the corresponding features exist in the codebase:

- Achievement rate override functionality testing (if implemented in simulation service)
- Simulation result cache invalidation testing (if update clears results is implemented)
- User-auth consent linking endpoints (if post-auth consent linking is implemented)

## Environment Strategy

- **Local Development**: Supabase connection with test schema; mocked SMS provider (default); real SMS only with `ALLOW_REAL_SMS=1`
- **CI Environment**: Mock SMS provider (enforced); static JWKS fixture; isolated test database schema
- **Database Strategy**: Use existing SSD §6 schema with test data isolation; no custom migration tooling required

## Global Conventions

- Python tests: `test_*.py` (pytest)
- Frontend tests: `*.test.ts(x)` (Vitest + RTL)
- Fixtures: `src/backend/tests/fixtures/`
- PII: Faker / placeholders only; approved test phone patterns (010-0000-XXXX format)
- Env flags: `TEST_MODE=1`, `CI=1`, optional `ALLOW_OPENAPI_UPDATE=1`, `ALLOW_REAL_SMS=1` (local only)

## Test Data Strategy

### Test Users & Authentication

- Test JWT tokens generated using static JWKS fixture
- Admin test users: create via test-specific admin table entries
- Regular test users: mock user_id values following UUID format

### Test Phone Numbers & OTP

- Approved test phone patterns: 010-0000-XXXX where X = test-specific digits
- Whitelist test entries: SHA256 hash of approved test name+phone combinations
- OTP test codes: deterministic generation for CI environments

### Simulation Test Data

- Standard test scenarios for each plan type (A, B, C, D, K, P, R, F, E)
- Edge case data: zero investments, maximum rounds, boundary conditions
- Result validation data: pre-calculated expected outcomes for regression testing

## Risk & Mitigation Summary

| Risk | Impact | Mitigation |
|------|--------|-----------|
| External SMS cost / noise | Cost & clutter | Mock SMS provider; opt-in via `ALLOW_REAL_SMS=1` |
| OTP timing flakiness | CI instability | Freeze time / deterministic timestamps |
| Simulation numeric drift | Brittle assertions | Rounding / tolerance on key metrics |
| JWKS network dependency | Flaky tests | Static JWKS fixture & cache tests |
| PII leakage | Compliance risk | Regex scan + masked fixtures |

## Command Summary

| Command | Purpose | Notes |
|---------|---------|-------|
| openapi.snapshot | Refresh OpenAPI snapshot | Requires `ALLOW_OPENAPI_UPDATE=1` |
| openapi.check | Compare live vs snapshot | Fail on breaking removal/type change |
| pii.scan | Regex scan for disallowed phone patterns | Fails fast |
| perf.run | Performance baseline measurement | Informational warnings only (scaffold) |

### Command Exit Codes

| Command | Exit Code | Meaning |
|---------|-----------|---------|
| openapi.check | 0 | No contract break |
| openapi.check | 1 | Additive (non-breaking) change |
| openapi.check | 2 | Breaking removal/type change |
| pii.scan | 0 | Passed |
| pii.scan | 1 | Forbidden pattern found |
| perf.run | 0 | Completed (regressions logged) |
| coverage.merge | 0 | Coverage thresholds met (future) |
| coverage.merge | 2 | Coverage thresholds not met (future) |

Implementation Note: Codes chosen so that 0 always success, 1 non-breaking informational change, 2 breaking/gating failure. Avoids overloading >2 early for simplicity; can extend later.

## Glossary

- JWKS: JSON Web Key Set for JWT signature validation
- RLS: Row Level Security
- Plan IDs: A,B,C,D,K,P,R,F,E simulation configurations
- PII: Personally Identifiable Information (phone numbers, names)
- ALLOW_OPENAPI_UPDATE: Env flag permitting OpenAPI snapshot regeneration

## Test Layers & Tasks

### 1. Backend Unit Tests
 
Focus: Pure logic (simulation engine, helpers, parameter validation, JWT decode wrapper, hashing).
Tasks:

1. Fixtures (`conftest.py`): settings override, static JWKS loader, fake SMS provider
2. `simulation_service.py`: per-plan (A,B,C,D,K,P,R,F,E) 1-round invariants
3. Multi-round snapshot (Plan A) verifying non-negative cumulative metrics
4. Edge cases: invalid plan id; rounds <= 0
5. Tax computation (3.3%) correctness first vs later rounds
6. Achievement rate override path (if implemented) else mark Deferred
7. Static JWKS parse + key selection test
8. Privacy policy fallback: simulated DB failure → static markdown returned
9. OTP verify attempt limit validation: 6 attempts per code (per SSD §7.1)
10. OTP send limiter (3 sends / 15m) helper logic
11. Simulation input normalization (scheduled_payment → internal investments jsonb conversion) validation
12. Error response structure validation: standard `{ success: boolean, message: string, ... }` format consistency
13. JWKS caching behavior with TTL validation (5-15m cache lifetime)
14. Enhanced phone input formatting for multiple prefixes (010/011/016/017/018/019)

 
### 2. Backend Integration Tests

Focus: FastAPI endpoints (SSD §8). No consent 423 lock tests.
Tasks:

1. Test client fixture (mock SMS, static JWKS)
2. OTP: send success (whitelist pass) returns expiry + user_hash; exceed send limit (4th send) → 429; verify success; exceed verify attempts (attempt beyond limit) → 429 (remaining_attempts reflected)
3. Consent: create pre-auth consent; retrieve consents list via GET /api/consents/{user_hash}; link to authenticated user if endpoint available (else Deferred)
4. Privacy policy: normal fetch; simulate DB failure → fallback content served; verify complete response structure with version, last_updated, content, source fields
5. Simulations: create with scheduled_payment parameter → run → detail → list; verify scheduled_payment conversion to investments jsonb; update clears previous results (if implemented) → re-run repopulates; memo patch; delete removes entry
6. Notices public: unpublished not listed; publish then appears; detail accessible
7. Admin privacy policies: unauthorized → 403; admin create/update/delete policy; list all policies; get policy details; publish policy (unpublishes others); verify complete CRUD lifecycle
8. Health: structure includes status and supabase service field(s) with ok, latency_ms, and error fields
9. Empty list cases (simulations, notices) return []
10. JWT invalid → 401 on protected simulations list
11. Rate limit responses include standard error envelope (if implemented)
12. Parameter conversion validation: scheduled_payment in API requests properly converted to investments jsonb in database
13. Enhanced consent API: GET /api/consents/{user_hash} returns proper structure with consents array and success boolean
14. Static fallback mechanism: privacy policy serves static file when database unavailable, includes source field indicating "static-file"

#### Repository Boundary Checklist

1. Identify repository interfaces
2. Service layer depends only on interfaces (no direct global DB)
3. Provide test doubles for unit tests
4. Use real test DB (isolated schema) for integration tests

### 3. Contract Tests

Tasks:

1. Snapshot OpenAPI (OTP, consents, privacy-policy, simulations, notices, admin, health)
2. Diff & fail on breaking removal/type change
3. Snapshot refresh only with `ALLOW_OPENAPI_UPDATE=1`
4. Validate API contract alignment with SSD §9 examples
5. Test parameter conversion documentation: scheduled_payment → investments jsonb
6. Validate enhanced admin privacy policy endpoints structure
7. Verify consent API response format with consents array and success boolean
8. Confirm health endpoint response includes complete structure with services.supabase fields

### 4. Frontend Unit / Component Tests

Tasks:

1. Ensure Vitest + RTL dependencies & test script
2. `vitest.config.ts` & `src/setupTests.ts` (jest-dom)
3. Components: `App` shell render; plan editor step progression; orientation enforcer overlay toggle; LandscapeEnforcer component with portrait detection and blocking behavior
4. Utilities: phone normalization / hashing parity with backend; enhanced phone formatting for multiple prefixes (010/011/016/017/018/019)
5. API service: privacy policy fetch (success + simulated fallback with source field validation)
6. OfflineResultsPage: component renders properly; populated & empty states; back-to-main navigation
7. AdminPolicyPage: list display; create draft policy; edit policy; publish policy controls; unauthorized (mock 403) handling; policy version management
8. App state management: localStorage/sessionStorage persistence; state restoration with diff checking; session recovery patterns

### 5. Frontend Integration (Shallow Flow) Tests

Tasks:

1. Mock API: OTP send/verify success + rate limit error scenarios
2. Storage assertions: user_hash & consent captured in sessionStorage
3. Navigation: WhitelistCheck → OtpVerification → Consent → (OAuth placeholder) → MainPage
4. Offline results navigation: state preservation and proper back-to-main functionality
5. Admin policy lifecycle: draft creation → editing → publishing without consent lock redirects
6. App state restoration: localStorage persistence across page transitions; session recovery on visibility change
7. Landscape enforcer integration: orientation detection triggers and overlay behavior
8. Enhanced phone input: formatting validation and prefix support integration

### 6. E2E Smoke (Minimal)

Tasks:

1. Playwright (or similar) test: load root PWA (title, manifest link, proper manifest structure)
2. GET `/api/health` returns status ok with complete structure (status, services.supabase fields)
3. Protected endpoint (simulations list) → 401 without JWT
4. PWA installability: manifest accessible, proper icons, HTTPS requirement validation

<!-- markdownlint-disable-next-line MD024 -->
### 7. Performance / Load Scaffold (Baseline Measurement)

Focus: Establish baseline performance metrics aligned with SSD §22 targets. No gating thresholds in initial implementation.
Tasks:

1. `tests/perf/` timing harness runs each plan (100 rounds) capturing duration
2. Sample API latency: simulations create+run, notices list, health
3. Warn (log) if simulation >2s or p95 latency >500ms (informational only)

#### Performance Threshold Targets (Aligned with SSD §22)

- OTP send: p95 < 2000ms, p99 < 4000ms
- OTP verify: p95 < 300ms, p99 < 500ms  
- Simulation create: p95 < 400ms, p99 < 600ms
- Simulation run: p95 < 1500ms, p99 < 3000ms
- Simulations list: p95 < 200ms, p99 < 400ms
- Health endpoint: p95 < 100ms, p99 < 200ms
- Peak concurrency ≤60 active users (SSD) – optional stress sample
- Error rate <1% (informational)

<!-- markdownlint-disable-next-line MD024 -->
### 8. Coverage & Reporting

Tasks:

1. Pytest coverage: `--cov=src/backend --cov-report=xml`
2. Vitest coverage (V8 provider)
3. Codecov workflow (backend 40% / frontend 25% initial gates)
4. Coverage badge in root `README.md`
5. CI gating
6. PII scan prior to coverage upload

<!-- markdownlint-disable-next-line MD024 -->
### 9. PII Masking & Test Data Policy

Focus: Prevent exposure of real personal data in test environments.
Tasks:

1. `tests/PII_POLICY.md` with masking rules & examples of allowed test phone patterns (e.g., 010-0000-XXXX format)
2. Phone hash helper parity test using approved test numbers only
3. Regex scan script blocking real phone patterns; allowlist for test fixtures with clearly fake numbers
4. Document ripgrep invocation in policy & TESTING docs

<!-- markdownlint-disable-next-line MD024 -->
### 10. Tooling & Automation

Tasks:

1. PowerShell script `windows-scripts/run_tests.ps1` orchestrates backend + frontend + contract + PII scan
2. Optional Makefile (Unix) delegating to scripts
3. Pre-commit guidance (fast marker subset placeholder)
4. `openapi.snapshot` & `openapi.check` scripts (env gate)
5. `pii.scan` wrapper (ripgrep) failing fast
6. Coverage upload workflow (skip on draft PRs)

### 11. Restructuring / Cleanup

Tasks:

1. Organize simulation tests under `src/backend/tests/unit/simulation/`
2. Fixtures: OTP code factory, consent record factory, simulation input factory
3. Ensure `__init__.py` in new test package dirs
4. JWKS fixture file `src/backend/tests/fixtures/jwks.json`
5. Manual SMS example script relocated with safety guard

### 12. Documentation

Tasks:

1. `docs/TESTING.md` (layers, commands, env vars, coverage, PII policy)
2. README updates: test running, coverage badge, PII scan note
3. OpenAPI snapshot workflow (`ALLOW_OPENAPI_UPDATE=1`)
4. PII masking rules & fallback privacy policy test explanation
5. Note on OTP attempt discrepancy (3 vs 6) and chosen approach

## Detailed Task Breakdown (Chronological)

1. Backend scaffolding (conftest, fixtures, JWKS with caching, SMS mock)
2. Simulation unit tests (all plans + multi-round Plan A) & edge cases; parameter conversion logic validation
3. Core API integration tests (OTP limits, consent with user_hash retrieval, simulations CRUD/run with scheduled_payment conversion, comprehensive admin privacy policy management, notices/policies, health with complete structure, auth failures)
4. Contract snapshot & diff script with enhanced API validation
5. Frontend unit/component tests (including OfflineResultsPage, AdminPolicyPage, LandscapeEnforcer, enhanced phone formatting)
6. Frontend shallow integration tests (including state management, offline results navigation, admin policy lifecycle)
7. E2E smoke tests with PWA validation (manifest, installability)
8. Coverage tooling + Codecov + badge
9. PII masking enforcement (policy + scan + CI)
10. Performance baseline harness & capture with SSD-aligned thresholds
11. Documentation updates reflecting enhanced coverage

## Dependencies & Prerequisites

| Task | Depends On |
|------|------------|
| Integration tests | Unit fixtures (JWKS, SMS mock) |
| Contract tests | FastAPI app import |
| Frontend integration tests | API mock utilities |
| Coverage upload | Backend & frontend tests complete |
| Performance baseline | Stable simulation logic & unit tests green |

## Acceptance Criteria

- All listed tasks implemented; deferred items clearly marked
- Tests green locally and in CI; Codecov reports uploaded
- Simulation plans A B C D K P R F E each covered by one or more tests
- OTP limits (3 sends / 6 attempts) verified
- Consent creation + retrieval verified (no 423 lock tests); GET /api/consents/{user_hash} endpoint validated
- Simulation CRUD/run (including memo) validated; scheduled_payment to investments jsonb conversion tested; update clears prior results (if implemented)
- Notices CRUD & privacy policy admin flows validated; comprehensive admin privacy policy management (create/update/delete/publish/list) covered
- Offline results page component and navigation tested
- Admin policy page management interface tested  
- Enhanced phone input formatting with multiple prefix support validated
- LandscapeEnforcer component orientation detection and blocking behavior tested
- App state persistence and restoration patterns validated
- Privacy policy static fallback mechanism with source field validation tested
- Health endpoint complete response structure validated (status, services.supabase.ok, latency_ms fields)
- PWA manifest structure and installability requirements validated
- Unauthorized admin access (403) and rate limit (429) negative paths covered
- Coverage thresholds met: backend ≥40%, frontend ≥25%
- Contract snapshot stable or regenerated only with `ALLOW_OPENAPI_UPDATE=1`
- PII scan passes (no disallowed phone patterns)
- Documentation (README + TESTING.md + PII_POLICY) updated
- JWKS static fixture used for deterministic JWT validation with caching behavior tests

## Future Enhancements (Backlog)

- Consent enforcement (423) test suite once implemented
- Full Playwright E2E flows (multi-step onboarding, simulation scenarios) beyond smoke tests
- Synthetic monitoring (cron health + key endpoint probes)
- Mutation testing (mutmut / Stryker)
- Property-based simulation parameter tests (Hypothesis / fast-check)
- Visual regression snapshots (key pages)
- Migration drift tooling & associated tests (if introduced)
- Enhanced offline simulation execution tests (frontend-only mode)
- Advanced PWA testing (service worker, offline capabilities, push notifications)
- Performance regression detection and alerting
- Load testing with realistic user scenarios
- Cross-browser compatibility testing matrix

## Rollout Plan

1. Feature branch incremental commits; early PR after unit + core integration tests stable
2. Merge with initial coverage gates; ratchet thresholds upward per schedule
3. Monitor Codecov trends; enforce higher failing threshold when stable

### Ratchet Policy for Coverage Thresholds (Codecov)

- Backend: start 40% initial threshold → +5% every 2 months until 60%, then +3% toward 70% final target
- Frontend: start 25% initial threshold → +5% every 2 months until 45%, then +3% toward 60% final target
- Thresholds only increase; exceptions documented with justification

## Risk of Not Implementing

- Financial logic regressions undetected
- Parameter conversion bugs (scheduled_payment → investments) causing data integrity issues
- Consent/privacy compliance gaps (future enforcement harder)
- Admin policy management failures affecting compliance workflows
- PWA installability regressions impacting user experience
- State management bugs causing user data loss
- Elevated external SMS costs (no mock enforcement)
- Performance degradation undetected affecting user satisfaction
- Reduced release confidence & slower iteration

## Appendix

### A. Example Pytest Fixture Sketch

```python
import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture(scope="session")
def client():
      return TestClient(app)
```

### B. Example Simulation Snapshot Assertion

```python
def test_plan_a_round_1_structure(simulation_service_factory):
      svc = simulation_service_factory('A')
      results = svc.run_simulation(1)
      hist = results.history[0]
      assert hist.investor_count == 1
      assert hist.total_payment >= 0
      assert hist.total_revenue_after_tax >= 0
```
