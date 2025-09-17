# Test Plan – Backend Unit Tests

Canonical master overview: see `test-code.md` in this directory (unchanged). This file is a self-contained plan for implementing backend unit tests.

## 1. Scope & Purpose
Focus on pure, deterministic Python logic in the FastAPI backend codebase: simulation engine math, helpers, validation, JWT decoding wrapper, hashing utilities, and parameter transformations. No external I/O (DB, network, Supabase HTTP, SMS providers).

## 2. Objectives
- Fast feedback (<5s typical layer runtime once warm)
- High logic branch & edge coverage for financial simulation plans A B C D K P R F E
- Deterministic snapshots for selected multi‑round outputs (avoid floating drift)
- Guardrails for tax calculation, achievement rate overrides, settlement bonus rules
- Stable fixtures enabling later property / mutation testing

## 3. Environment & Conventions
- Runner: `pytest`
- File pattern: `src/backend/tests/unit/**/test_*.py`
- Global flags: `TEST_MODE=1`
- Use `freezegun` (install and use the latest version)(use datetime injection if freezegun can't be used) to freeze time where expiry matters
- Faker for synthetic PII; never embed raw phone numbers
- Static JWKS fixture for JWT decode tests: `src/backend/tests/fixtures/jwks.json`

## 4. Tasks (Verbatim from Master Plan)
1. Add `conftest.py` with global fixtures (settings override, fake Supabase client, JWKS loader)
2. `simulation_service.py` tests: per-plan parameter ingestion; 1-round structural invariants; full Plan A multi-round snapshot
3. Edge cases: invalid plan (ValueError); zero/negative rounds error
4. Revenue logic: settlement bonus deactivation after round > 15 (SSD financial logic alignment)
5. Tax computation correctness first vs subsequent rounds
6. Achievement rates override injection
7. Add static JWKS fixture `src/backend/tests/fixtures/jwks.json` + loader test (key rotation simulation)

### 4.1 Additional Edge / Negative / Boundary Tasks (Enhanced Unit Scope)
The following extend coverage breadth (still pure unit level; no network/DB):
8. Per-plan invariants: assert each defined `max_investor_count` never exceeded across representative high round run (e.g. rounds == max_investor_count + 10).
9. Round boundary transitions: explicit tests for rounds 1, 15, 16 (settlement bonus threshold), and highest configured bonus round per plan (e.g. 18 for D/K/P/R/F/E) verifying bonus activation/deactivation.
10. Large rounds stress: run a high but acceptable round count (e.g. 200) and assert performance (< 2s) & monotonic cumulative values; skip if marked slow via `@pytest.mark.unit_slow` (still unit boundary—no I/O).
11. Monetary magnitude extremes: inject very large scheduled payment / investment override values and assert no overflow, negative tax, or precision drift (compare recomputed cumulative vs sum of per-round nets within tolerance 1e-6).
12. `sales_achievement_rates` variants: None, empty dict, shorter than needed, longer than used, and containing non-sequential keys; service should pad/truncate/ignore gracefully (assert documented behavior).
13. Input sanitation: plan id with lowercase / surrounding whitespace → normalized or raises ValueError (document current expected behavior; lock with test).
14. Invalid numeric inputs: negative payment values, non-int (float / string) in overrides; expect ValueError or type guard path.
15. Scheduled payment mapping: verify conversion to internal `investments` structure preserves ordering, disallows negative entries, and aggregates duplicates if logic applies.
16. Tax rounding & accumulation: assert sum(round.net_after_tax) approximates cumulative figure (<= 1 unit difference) to catch double-tax or rounding drift.
17. Investor growth ceiling: fabricate scenario where growth logic would exceed `max_investor_count`; assert clamped.
18. Snapshot versioning: include a `version` field in snapshot fixture; test fails with helpful message if snapshot missing version (forces regeneration procedure discipline).
19. JWT helper negative paths: missing `kid`, duplicated `kid`, unsupported `alg`, `aud` mismatch, malformed token segments, invalid base64, expired (`exp` past) and not-yet-valid (`nbf` future) tokens.
20. Hash/normalization utility: idempotence (normalizing twice unchanged), trimming whitespace, rejecting invalid country/prefix patterns, preserving already hyphenated canonical form.
21. Performance micro-benchmark (optional unit): assert Plan A 100 rounds executes under configurable threshold (e.g. 50 ms median of 5 runs) to detect algorithmic regressions early (skip on CI if too flaky—guarded by marker).
22. Determinism guard: if RNG ever introduced later, proactively assert no `random` or `numpy.random` calls during simulation by monkeypatching to raise (locks deterministic design).

## 5. Detailed Test Design
### 5.1 Fixtures
- `simulation_service_factory(plan_id, overrides=None)` → returns configured service instance
- `jwks_keys()` → loads JSON keys; variant fixture rotates order to ensure robust selection logic
- `plan_parameters()` → parametrize across plan IDs A,B,C,D,K,P,R,F,E

### 5.2 Simulation Structural Invariants (Round 1)
For each plan:
- investor_count >= 1
- total_payment >= 0
- total_revenue_after_tax >= 0
- cumulative_profit monotonic non-decreasing

### 5.3 Multi-Round Snapshot (Plan A)
- Run canonical input (documented in test) for N rounds (e.g. 10 or 20) and snapshot selected metrics (rounded to 2–4 decimals)
- Snapshot file stored under `tests/unit/simulation/__snapshots__/plan_a_rounds_20.json` (commit for regression detection)

### 5.4 Edge Cases
- Invalid plan_id → `ValueError`
- rounds <= 0 → `ValueError`
- Extremely high rounds (stress upper bound chosen e.g. 200) executes within performance envelope (<2s) and remains stable (no negative revenue)

### 5.5 Tax Logic
- First round tax application equals `gross * 0.033` (tolerance 1e-6)
- Subsequent rounds aggregate correctly; ensure no double-taxing cumulative values

### 5.6 Achievement Rate Overrides
- Provide custom `sales_achievement_rates` array shorter / longer than default — service truncates or pads as specified in implementation (assert documented behavior)

### 5.7 Settlement Bonus Rule
- After round > 15 settlement bonus disabled (assert metric discontinuity exactly at threshold)

### 5.8 JWT Decoding Wrapper
- Valid token with matching kid from fixture JWKS
- Rotated JWKS (kid removed) → verification failure path
- Expired token → raises / returns structured error

### 5.9 Extended Validation & Boundary Set (Added)
Maps to enhanced tasks 8–22; each remains isolated pure function/service invocation:
- Boundary rounds & threshold transitions (tasks 8–10, 11 partly performance) with assertions on bonus flags & cumulative monotonicity.
- Achievement rate irregular structures (task 12) verifying defensive normalization.
- Input sanitation & numeric validation (tasks 13–15) asserting explicit exceptions.
- Tax accumulation drift (task 16) verifying acceptable epsilon.
- Investor growth ceiling (task 17) using crafted state injection if needed.
- Snapshot versioning (task 18) ensuring snapshot includes explicit schema version string.
- Comprehensive JWT negative cases (task 19) using pre-built malformed token fixtures.
- Phone / hash normalization behaviors (task 20).
- Performance micro-benchmark harness (task 21) skipped by default marker.
- Determinism guard (task 22) monkeypatching random sources to raise if accessed.

## 6. Tooling
- `pytest -m unit --maxfail=1 -q`
- Add marker `@pytest.mark.unit` (optional) for targeted run
- Coverage collected via `--cov=src/backend --cov-report=term-missing:skip-covered`

## 7. Acceptance Criteria (Layer-Specific)
- All tasks 1–7 implemented
- Each plan ID covered by at least one assertion
- Snapshot test stable across two consecutive runs (no churn)
- Coverage contribution from unit tests drives backend subtotal toward ≥40% (initial gate) en route to 75%
- No network calls executed (validate by monkeypatching HTTP clients if necessary)
 - Enhanced tasks 8–22 implemented or explicitly marked skipped with justification in code comments
 - Validation tests confirm improper inputs raise clear exceptions (message contains keyword specifying fault)
 - Determinism guard ensures no unintended randomness (tests would fail if introduced)

## 8. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Floating point drift | Round selected snapshot fields |
| Time-sensitive logic creeping in | Freeze time or inject clock |
| Overfitting snapshots | Snapshot only aggregate & key round metrics |

## 9. Future Enhancements
- Property-based tests (Hypothesis) for parameter ranges
- Mutation testing (mutmut) once baseline green

## 10. Appendix
Example snapshot assertion (Plan A):
```python
def test_plan_a_round_1_structure(simulation_service_factory):
    svc = simulation_service_factory('A')
    result = svc.run_simulation(1)
    r1 = result.history[0]
    assert r1.investor_count >= 1
    assert r1.total_payment >= 0
    assert r1.total_revenue_after_tax >= 0
```
