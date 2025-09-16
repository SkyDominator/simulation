# Test Code Implementation Plan

## Overview
Establish a comprehensive multi-layer automated testing system for the LOLClub Simulation project (backend FastAPI + frontend React PWA) aligned with SSD v0.2.0 and research findings. Target: meaningful initial coverage with foundations for growth (backend ≥40% rising to 75%, frontend ≥25% rising to 60%) while enforcing quality gates (lint, type, contract validation) and safe handling of PII and external services.

## Goals
- Introduce structured unit, integration, contract, and basic E2E smoke tests.
- Ensure all simulation plans (A, B, C, D, K, P, R, F, E) in `simulation_service.py` are covered.
- Mock OTP/SMS flows under CI flag.
- Enforce PII masking in test data.
- Integrate Codecov for coverage reporting.
- Add performance/load testing scaffold for simulation engine.

## Out of Scope (Now)
- Full browser automation across all user flows (advanced E2E) — deferred.
- Chaos/security fuzz testing — future enhancement.
- Multi-region latency simulation.

## Environment Strategy
- Local: Real dependencies except Solapi (optional real mode with explicit flag).
- CI: All external services mocked (Supabase HTTP + Solapi + JWT JWKS) unless contract snapshots executed.
- Test DB: Use ephemeral Supabase schema clone or local SQLite/pg substitute (NEED_VERIFICATION: chosen approach for integration tests – specify).

## Global Conventions
- Python test naming: `test_*.py` with `pytest`.
- Frontend test naming: `*.test.ts(x)` with `Vitest` + RTL.
- Fixtures directory: `src/backend/tests/fixtures/` for common factories.
- PII Masking: Use Faker; never embed real phone numbers except pattern placeholders (e.g., `01012345678`).
- Environment flag: `TEST_MODE=1` and `CI=1` for deterministic mocking.

## Risk & Mitigation Summary
| Risk | Impact | Mitigation |
|------|--------|-----------|
| External SMS costs | Financial / noisy logs | Mock Solapi by default (flag `ALLOW_REAL_SMS=1`) |
| Flaky time-based OTP expiry tests | Unstable CI | Use `freezegun` & deterministic timestamps |
| Simulation floating discrepancies | Assertion fragility | Round values & snapshot key metrics |
| Privacy consent race conditions | False negatives | Isolate consent logic with in-memory repo |
| JWT validation reliance on network | CI failures | Provide static JWKS file fixture |

## Test Layers & Tasks

### 1. Backend Unit Tests
Focus: Pure logic (simulation, helpers, parameter validation, JWT decode wrapper, hashing).
Tasks:
1. Add `conftest.py` with global fixtures: settings override, fake Supabase client, JWKS loader.
2. Tests for `simulation_service.py`:
   - Validate per-plan parameter ingestion.
   - Run 1 round per plan and assert structure invariants (non-negative payments, correct investor count logic growth vs stable phase).
   - Full multi-round run for representative plan (e.g., Plan A 18 rounds) and snapshot selected metrics.
3. Edge cases:
   - Invalid plan raises ValueError.
   - Zero/negative rounds error.
4. Revenue logic tests: settlement bonus deactivation after round >15.
5. Tax computation: net profit formula first vs subsequent rounds.
6. Achievement rates override injection test.

### 2. Backend Integration Tests
Focus: API endpoints contract & flow (OTP/consent/simulation lifecycle) with FastAPI test client.
Tasks:
1. Create test app fixture (dependency overrides for DB access layer & SMS provider).
2. OTP Flow:
   - Send OTP (mock whitelist pass) → verify OTP success.
   - Exceed attempt limits → expect error codes.
3. Consent Flow:
   - Publish policy fixture → pre-auth consent record creation.
   - Link consent after auth (mock JWT identity) → consent status transitions.
4. Simulation CRUD:
   - Create → Run → Update (invalidate results) → Run again (new history) → Delete.
   - Memo patch test.
5. Notices & Admin:
   - Admin auth fixture returns admin True.
   - Publish policy toggles previous policies.
6. Health endpoint returns service structure.
(NEED_VERIFICATION: actual DB abstraction layer to override — confirm repository/service boundaries.)

### 3. Contract Tests
Tasks:
1. Snapshot OpenAPI (generate if not present) into `docs/api/openapi.snapshot.json` (already exists) – write test to compare live schema.
2. Fail if breaking change (missing path/response schema property) unless `ALLOW_SCHEMA_UPDATE=1`.

### 4. Frontend Unit / Component Tests
Tasks:
1. Install Vitest + RTL deps (if absent) and add `test` script.
2. Add `vitest.config.ts` (jsdom env, setup file) & `src/setupTests.ts` with jest-dom import.
3. Component tests:
   - `App` renders shell elements.
   - Plan editor step progression logic (mock state, test validation gating).
   - Orientation enforcement (LandscapeEnforcer) toggles overlay.
4. Utility tests: phone normalization / formatting logic from PlanEditor components.
5. API service mock: test privacy policy fetch handling (happy + 423 redirect path).

### 5. Frontend Integration (Shallow Flow) Tests
Tasks:
1. Simulate minimal OTP → consent → main page state transitions with mocked API module.
2. Ensure storage interactions (localStorage/sessionStorage) set expected keys.
(NEED_VERIFICATION: abstract navigation controller for easier testing.)

### 6. E2E Smoke (Deferred Minimal)
Tasks:
1. Placeholder Playwright/Happy DOM scaffold (no full flows yet). Document future plan.

### 7. Performance / Load Scaffold
Tasks:
1. Add `tests/perf/` with a Locust or simple Python time benchmark for running simulations across all plans at 100 rounds each (stress variant).
2. Record baseline metrics JSON output; compare within tolerance ±20% in CI optional stage.
(NEED_VERIFICATION: Acceptable runtime threshold.)

### 8. Coverage & Reporting
Tasks:
1. Enable pytest coverage (`--cov=src/backend --cov-report=xml`).
2. Vitest coverage via `--coverage` V8 provider.
3. Add Codecov GitHub Action workflow (upload after both jobs) with status checks thresholds (initial: backend 40%, frontend 25%).
4. Badge insertion in `docs/README.md` (NEED_VERIFICATION: file target for badges).

### 9. PII Masking & Test Data Policy
Tasks:
1. Add `tests/PII_POLICY.md` describing masking rules.
2. Implement phone hash helper test ensuring hash format matches production logic using placeholder numbers.
3. Lint rule (simple regex scan script) to fail on raw 010- patterns outside fixtures (NEED_VERIFICATION: performance acceptability in CI).

### 10. Tooling & Automation
Tasks:
1. Add `Makefile` or Windows PowerShell script `windows-scripts/run_tests.ps1` to orchestrate backend + frontend tests.
2. Pre-commit hook suggestion (doc) for running fast unit subset locally.
3. Optional watch mode instructions.

### 11. Restructuring / Cleanup
Tasks:
1. Move `test_solapi.py` → `scripts/manual/send_sms_example.py` with safety guard.
2. Create `src/backend/tests/unit/simulation/` folder.
3. Populate `fixtures` with factory utilities (OTP code, consent record, simulation input set).
4. Add `__init__.py` to new test package dirs where needed.

### 12. Documentation
Tasks:
1. Create `docs/TESTING.md` summarizing strategy, layers, commands, env vars.
2. Update SSD Testing Strategy section reference to new coverage staging.
3. Add section in README for running tests locally.

## Detailed Task Breakdown (Chronological)
1. Backend scaffolding: conftest, fixtures, move Solapi script.
2. Simulation unit tests (all plans basic round + one full run).
3. Core API integration tests (OTP, consent, simulation lifecycle, admin, health).
4. OpenAPI contract test.
5. Frontend test environment setup + initial component tests.
6. Frontend integration state flow test.
7. Coverage tooling + Codecov workflow.
8. PII masking enforcement & policy doc.
9. Performance test scaffold.
10. Documentation & cleanup.

## Dependencies & Prerequisites
| Task | Depends On |
|------|------------|
| Integration tests | Unit fixtures & conftest |
| Contract tests | Running FastAPI app / schema export util |
| Frontend integration tests | API mock utilities |
| Coverage upload | Individual test jobs completion |
| Performance baseline | Simulation tests & service stability |

## Acceptance Criteria
- All tasks executed without blocking NEED_VERIFICATION items unresolved or clearly flagged.
- Tests pass locally & in CI; Codecov report uploaded.
- Simulation service plans A,B,C,D,K,P,R,F,E each exercised in at least one test.
- OTP, Consent, Simulation CRUD, Notices, Policy publish flows validated.
- No unmasked PII literals in repo (scan passes).
- Documentation present and linked.

## Open NEED_VERIFICATION Items
1. Choice of integration test DB backend (Supabase test schema vs local substitute).
2. Navigation abstraction for frontend flow tests.
3. Runtime performance threshold for load test gate.
4. Badge target file for Codecov & where to display.
5. Lint scan performance constraints for PII rule.

## Future Enhancements (Backlog)
- Full Playwright E2E with real browser.
- Synthetic monitoring script (cron) hitting health & critical endpoints.
- Mutation testing (e.g., mutmut / Stryker) for simulation logic robustness.
- Property-based testing for plan parameter ranges (Hypothesis / fast-check).
- Visual regression snapshots for key pages.

## Rollout Plan
1. Create feature branch tasks incrementally; open PR after simulation + core API tests stable.
2. Merge with incremental coverage gates raised over time (document schedule).
3. Monitor Codecov trends; add failing threshold once stable.

## Risk of Not Implementing
- Undetected regressions in financial logic & compliance (consent enforcement).
- Elevated cost exposure due to accidental SMS dispatches.
- Inability to scale responsibly or assure stakeholders of reliability.

## Appendix: Example Pytest Fixture Sketch
```python
# src/backend/tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture(scope="session")
def client():
    return TestClient(app)
```

## Appendix: Example Simulation Snapshot Assertion
```python
def test_plan_a_round_1_structure(simulation_service_factory):
    svc = simulation_service_factory('A')
    results = svc.run_simulation(1)
    hist = results.history[0]
    assert hist.investor_count == 1
    assert hist.total_payment >= 0
    assert hist.total_revenue_after_tax >= 0
```
