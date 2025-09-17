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
- Use `freezegun` (or datetime injection) to freeze time where expiry matters
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
