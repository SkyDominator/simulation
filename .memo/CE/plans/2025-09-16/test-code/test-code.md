# Test Code Implementation Plan

## Overview
Comprehensive multi-layer automated testing for LOLClub Simulation (FastAPI backend + React/Vite PWA) aligned with SSD v0.2.0. Initial coverage targets: backend ≥40% (path to 75%), frontend ≥25% (path to 60%). Enforce quality gates (lint, type, contract, PII) and establish scalable foundations.

## Goals
- Structured unit, integration, contract, shallow frontend integration, and smoke scaffolds
- Cover all simulation plans A B C D K P R F E (SSD Section 10)
- Mock OTP/SMS + external calls in CI by default
- Enforce PII masking (no raw user phone numbers)
- Integrate Codecov with gating thresholds
- Provide performance/load benchmark scaffold

## Out of Scope (Now)
- Full browser E2E across all user flows
- Chaos / fuzz / mutation testing (backlog)
- Multi-region latency simulation

## Environment Strategy
- Local: Real dependencies except Solapi (require `ALLOW_REAL_SMS=1` to enable)
- CI: Mock Supabase HTTP (where feasible), Solapi, JWT JWKS (static fixture) unless running contract snapshot validation
- Test DB Strategy:
      - Primary: Local Postgres (Supabase local) with migrations applied via `invoke db.apply` (wraps `scripts/migrations/apply.py`).
      - Nightly: Ephemeral schema in CI (schema name `drift_<YYYYMMDD>`) on a Postgres service container; diff against committed snapshot (`docs/schema/schema.snapshot.sql`).
      - Fallback: Temporary schema `test_temp_<timestamp>` then drop (used by per-module isolation fixture).
      - Migration command: `invoke db.apply [--schema custom_schema] [--dry-run]` (idempotent, checksum guard, transactional per file).
      - Isolation: Pytest fixture creates a fresh schema per integration test module (`test_mod_<random>`), applies migrations once, drops on teardown. Heavy suites can opt into shared schema via marker.

## Global Conventions
- Python tests: `test_*.py` (pytest)
- Frontend tests: `*.test.ts(x)` (Vitest + RTL)
- Fixtures: `src/backend/tests/fixtures/`
- PII: Use Faker / placeholders; never commit real phone numbers
- Env flags: `TEST_MODE=1`, `CI=1`, optional `ALLOW_SCHEMA_UPDATE=1`, `ALLOW_REAL_SMS=1`

## Risk & Mitigation Summary

| Risk | Impact | Mitigation |
|------|--------|-----------|
| External SMS cost / noise | Cost & clutter | Mock Solapi; opt-in flag `ALLOW_REAL_SMS=1` |
| Flaky OTP expiry timing | CI instability | Time-freezing (`freezegun`) + deterministic timestamps |
| Floating precision drift in simulations | Brittle assertions | Round & snapshot selected metrics |
| Consent race conditions | False negatives | Isolated consent repo / DB fixture per test |
| JWKS network dependency | Test flakiness | Static JWKS fixture file (offline validation) |

## Resolved Previously Pending Decisions

1. Migration Tooling: Adopt lightweight Python runner (`scripts/migrations/apply.py`) using `psycopg` (v3) + checksum tracking table `migration_history` (filename, checksum, applied_at). Driven via Invoke tasks (`tasks.py`). Chosen over Alembic to keep existing raw SQL workflow; can transition later if autogenerate becomes valuable.
2. Command Surface:
      - `invoke db.apply` (args: `--schema`, `--dry-run`, `--verbose`).
      - `invoke db.new name="add_new_table"` creates timestamped stub file under `src/backend/migrations/` with comment header + transactional template.
      - `invoke schema.snapshot` regenerates `docs/schema/schema.snapshot.sql` from a pristine temp schema (requires `ALLOW_SCHEMA_UPDATE=1`).
      - `invoke schema.diff` runs apply in temp schema then diffs vs snapshot (exit code 2 on destructive changes, 1 on additive, 0 no diff).
3. Nightly Schema Drift: GitHub Action `nightly-schema-drift.yml` (cron) spins up Postgres service, runs `invoke schema.diff`. Additive drift: warning + artifact; destructive drift: fail. Developers update snapshot intentionally via `ALLOW_SCHEMA_UPDATE=1 invoke schema.snapshot`.
4. Makefile: Provided only as thin wrapper for non-Windows contributors; Invoke remains single source of truth (cross-platform, explicit Python env usage).
5. Supabase Direct Drift Check: Deferred (secrets & risk). Local container diffing is cheaper & deterministic. Revisit when production divergence risk increases.
6. Fabric / Alembic: Deferred for now; complexity not justified. Criteria to adopt: >30 migrations with conditional branching or frequent column renames.
7. Rollback Strategy: For failed production migration, create compensating migration (forward-only approach) — keeps tooling simple.

## Command Summary

| Command | Purpose | Notes |
|---------|---------|-------|
| invoke db.apply | Apply migrations | `--schema`, `--dry-run`, checksum guard |
| invoke db.new | Create migration stub | Timestamped SQL template |
| invoke schema.snapshot | Regenerate schema snapshot | Requires `ALLOW_SCHEMA_UPDATE=1` |
| invoke schema.diff | Diff current vs snapshot | Exit codes 0/1 additive/2 destructive |
| invoke openapi.snapshot | Refresh OpenAPI snapshot | Guarded by env flag |
| invoke pii.scan | Run PII regex scan | Fails on first match |
| invoke perf.run (future) | Run performance harness | Non-gating baseline |

## Glossary

- JWKS: JSON Web Key Set for JWT signature validation
- RLS: Row Level Security (referenced in SSD security controls)
- Plan IDs: A,B,C,D,K,P,R,F,E simulation configurations
- PII: Personally Identifiable Information (phone numbers, names)
- ALLOW_SCHEMA_UPDATE: Env flag permitting OpenAPI snapshot regeneration

## Test Layers & Tasks

### 1. Backend Unit Tests
 
Focus: Pure logic (simulation engine, helpers, parameter validation, JWT decode wrapper, hashing).
Tasks:

1. Add `conftest.py` with global fixtures (settings override, fake Supabase client, JWKS loader)
2. `simulation_service.py` tests: per-plan parameter ingestion; 1-round structural invariants; full Plan A multi-round snapshot
3. Edge cases: invalid plan (ValueError); zero/negative rounds error
4. Revenue logic: settlement bonus deactivation after round > 15 (SSD financial logic alignment)
5. Tax computation correctness first vs subsequent rounds
6. Achievement rates override injection
7. Add static JWKS fixture `src/backend/tests/fixtures/jwks.json` + loader test (key rotation simulation)

 
### 2. Backend Integration Tests

Focus: FastAPI endpoints (OTP, consent, simulation CRUD/run, notices, policies, health) using real app with dependency overrides + isolated DB schema.
Tasks:

1. App fixture with dependency overrides (DB session, SMS provider, JWKS provider)
2. OTP Flow: send (whitelist pass), verify success, exceed attempt limit (6), send rate limit (4th send within 15m → 429)
3. Consent Flow: publish policy fixture, record pre-auth consent, link after auth, latest vs current version status (423 Locked path)
4. Simulation CRUD: create → run → update (assert `simulation_results` cleared) → re-run produces new history → memo patch → delete
5. Notices & Admin: create, list (published filter), update, pin/unpin, delete; unauthorized (non-admin) → 403; publish privacy policy toggles previous
6. Health endpoint: structure contains Supabase status & latency field
7. Unauthorized / forbidden tests: admin endpoints with normal user token (403); protected endpoint without latest consent (423)

#### Repository Boundary Checklist

1. Identify repository interfaces
2. Service layer depends only on interfaces (no direct global DB)
3. Provide test doubles for unit tests
4. Use real test DB (isolated schema) for integration tests

### 3. Contract Tests

Tasks:

1. Generate (if missing) and snapshot OpenAPI to `docs/api/openapi.snapshot.json`
2. Compare live schema to snapshot; fail on removed path/fields unless `ALLOW_SCHEMA_UPDATE=1`
3. Add invoke task `openapi.snapshot` guarded by `ALLOW_SCHEMA_UPDATE=1`

### 4. Frontend Unit / Component Tests

Tasks:

1. Add Vitest + RTL dependencies & `test` script (if absent)
2. Add `vitest.config.ts` & `src/setupTests.ts` (jest-dom setup)
3. Components: `App` shell render; plan editor step progression; orientation enforcer overlay toggle
4. Utilities: phone normalization / formatting logic
5. API service module: privacy policy fetch (success + 423 Locked path handling)

### 5. Frontend Integration (Shallow Flow) Tests

Tasks:

1. Mock API module to simulate OTP → consent → main page transitions
2. Assert localStorage/sessionStorage keys (onboarding state, consent version)
3. Abstract navigation controller (refactor if needed) and test navigation state machine

### 6. E2E Smoke (Deferred Minimal)

Tasks:

1. Scaffold Playwright config + single health-page smoke (placeholder) — no gating yet

### 7. Performance / Load Scaffold

Tasks:

1. Add `tests/perf/` (Locust or simple timing harness) running all plans at 100 rounds
2. Persist baseline metrics JSON; warn (not fail) if regression >20% until thresholds stabilized

#### Performance Threshold Targets (Informational Baseline)

- UI request latency: p50 < 100ms, p95 < 300ms, p99 < 1s
- API latency: p95 < 500ms, p99 < 1s (aligns with SSD non-functional requirement)
- Simulation execution typical run < 2s (SSD)
- Timeouts: UI 15s, long-running 30s
- Concurrency headroom test at 60 concurrent (≈2× peak)
- CPU < 70% at peak, error rate < 1%

### 8. Coverage & Reporting

Tasks:

1. Pytest coverage: `--cov=src/backend --cov-report=xml`
2. Vitest coverage: V8 provider
3. Codecov workflow: merge status checks (backend 40% / frontend 25% initial)
4. Coverage badge in root `README.md`
5. Add acceptance gating line for thresholds
6. CI step executes PII scan before upload (fails on matches)

### 9. PII Masking & Test Data Policy

Tasks:

1. Create `tests/PII_POLICY.md` with masking rules & examples
2. Phone hash helper test (matches production hashing logic)
3. Regex scan script to block raw phone patterns outside allowed paths
4. Ripgrep command (document + CI):
    `rg -n --no-heading -e '(010[- ]?\d{3,4}[- ]?\d{4})' -g '!src/backend/tests/fixtures/**' -g '!**/PII_POLICY.md' -g '!**/README*' . && echo FAIL && exit 1 || echo 'PII scan passed'`

### 10. Tooling & Automation

Tasks:

1. Add PowerShell script `windows-scripts/run_tests.ps1` orchestrating backend (pytest + coverage) + frontend (vitest + coverage) + contract + PII scan; aggregates coverage then prints summary.
2. Optional Makefile (Unix contributors) with phony targets delegating to `invoke` (non-blocking if absent on Windows).
3. Pre-commit doc: fast unit subset marker (`pytest -m fast`) — markers introduced gradually; initial config adds marker placeholder to `pytest.ini`.
4. Migration automation implemented: `scripts/migrations/apply.py`, `tasks.py` exposing `db.apply`, `db.new`, `schema.snapshot`, `schema.diff`.
5. `openapi.snapshot`: implemented as `invoke openapi.snapshot` (requires running app OR uses FastAPI app import) guarded by `ALLOW_SCHEMA_UPDATE=1`.
6. `pii-scan`: `invoke pii.scan` wrapper executes ripgrep command; fails on first match outside allowlist.
7. Nightly schema drift GitHub Action scheduled (non-blocking on additive changes, blocking on destructive changes).
8. Coverage upload GitHub Action includes conditional Codecov step (skipped on draft PRs).

### 11. Restructuring / Cleanup

Tasks:

1. Move any manual Solapi test script to `scripts/manual/send_sms_example.py` with safety guard
2. Create `src/backend/tests/unit/simulation/` directory
3. Add fixtures: OTP code factory, consent record factory, simulation input factory
4. Ensure `__init__.py` in new test package dirs
5. Add JWKS fixture file `src/backend/tests/fixtures/jwks.json`

### 12. Documentation

Tasks:

1. Create `docs/TESTING.md` (layers, commands, env vars, coverage, PII policy)
2. README updates: how to run tests, coverage badge, PII scan note
3. Document OpenAPI snapshot update workflow & `ALLOW_SCHEMA_UPDATE=1` usage
4. Document DB migration & schema isolation approach
5. Document PII scan remediation steps

## Detailed Task Breakdown (Chronological)

1. Backend scaffolding (conftest, fixtures, JWKS) & Solapi script move
2. Simulation unit tests (all plans basic rounds + Plan A full run) & edge cases
3. Core API integration tests (OTP, consent, simulation CRUD/run, notices/policies, health, negative cases)
4. Contract test + snapshot script
5. Frontend unit/component tests
6. Frontend shallow integration flow tests
7. Coverage tooling + Codecov workflow + badge
8. PII masking enforcement (policy + scan script) & integrate into CI
9. Performance benchmark scaffold + baseline capture
10. Documentation updates

## Dependencies & Prerequisites

| Task | Depends On |
|------|------------|
| Integration tests | Unit fixtures & DB migration script |
| Contract tests | Running FastAPI app & schema generation util |
| Frontend integration tests | API mock utilities |
| Coverage upload | Completion of backend & frontend test jobs |
| Performance baseline | Stable simulation logic & unit test pass |

## Acceptance Criteria

- All listed tasks implemented or any intentionally deferred items explicitly marked Deferred (none currently)
- Tests green locally and in CI; Codecov reports uploaded
- Simulation plans A B C D K P R F E each covered by at least one test
- OTP, consent, simulation CRUD/run (including memo), notices CRUD, policy publish flows validated
- Negative tests: unauthorized admin access (403) and missing latest consent (423) present
- Simulation update clears prior `simulation_results` (asserted)
- Coverage thresholds met: backend ≥40%, frontend ≥25% (CI gate)
- Contract snapshot test passes or snapshot regenerated only with `ALLOW_SCHEMA_UPDATE=1`
- PII scan passes (no disallowed phone patterns)
- Documentation (README + TESTING.md + PII_POLICY) present and linked
- JWKS static fixture used for deterministic JWT validation

## Future Enhancements (Backlog)

- Full Playwright E2E flows
- Synthetic monitoring (cron health + key endpoints)
- Mutation testing (mutmut / Stryker) after baseline stability
- Property-based testing (Hypothesis / fast-check) for parameter ranges
- Visual regression snapshots (key pages)

## Rollout Plan

1. Feature branch incremental commits; early PR after unit + core integration tests stable
2. Merge with initial coverage gates; ratchet thresholds upward per schedule
3. Monitor Codecov trends; enforce higher failing threshold when stable

## Risk of Not Implementing

- Financial logic regressions undetected
- Consent/privacy compliance gaps
- Elevated external SMS costs due to accidental real sends
- Slower confidence in releases blocking iteration speed

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
