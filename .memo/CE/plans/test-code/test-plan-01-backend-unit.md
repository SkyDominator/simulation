# Test Plan – Backend Unit Tests

Canonical master overview: see `test-code.md` in this directory (unchanged). This file is a self-contained plan for implementing backend unit tests.

## 1. Scope & Purpose
Focus on pure, deterministic Python logic in the FastAPI backend codebase: simulation engine math, helpers, validation, JWT decoding wrapper, hashing utilities, and parameter transformations. No external I/O (DB, network, Supabase HTTP, SMS providers).
Unit tests MUST NOT perform DB or external network I/O; such cases belong to integration tests.

## 2. Objectives
- Fast feedback (<5s typical layer runtime once warm)
- High logic branch & edge coverage for financial simulation plans A, B, C, D, K, P, R, F, E
- Deterministic snapshots for selected multi‑round outputs using stable snapshot comparison (raw float absolute diff <= 1e-6; stored values rounded for readability only)
- Guardrails for tax calculation, achievement rate overrides, settlement bonus rules
- Stable fixtures enabling later property / mutation testing

## 3. Environment & Conventions
- Runner: `pytest`
- File pattern: `src/backend/tests/unit/**/test_*.py`
- Global flags: `TEST_MODE=1`
- Time control: `freezegun>=1.5,<2` added to test dependencies; ONLY use freezing for expiry / TTL validation and snapshot determinism tests—do NOT freeze during core simulation performance or numeric logic tests. Fallback: if `freezegun` import fails, a clock fixture will skip time-freeze tests with `pytest.skip('freezegun missing')`.
- Clock fallback sketch:
  ```python
  import pytest
  try:
      from freezegun import freeze_time as _freeze
  except ImportError:  # pragma: no cover
      _freeze = None

  @pytest.fixture
  def freeze_jan_1_2025():
      if _freeze is None:
          pytest.skip('freezegun missing')
      with _freeze('2025-01-01T00:00:00Z'):
          yield
  ```
- Faker for synthetic PII; never embed raw phone numbers
- Static JWKS fixture for JWT decode tests: `src/backend/tests/fixtures/jwks.json`

## 4. Tasks

1. Add `conftest.py` with global fixtures (settings override, fake Supabase client, JWKS loader)
2. `simulation_service.py` tests: per-plan parameter ingestion; 1-round structural invariants; full Plan A multi-round snapshot
3. Edge cases: invalid plan (ValueError); zero/negative rounds error
4. Revenue logic: settlement bonus deactivation after round > 15 (SSD financial logic alignment)
5. Tax computation correctness first vs subsequent rounds
6. Achievement rates override injection
7. Add static JWKS fixture `src/backend/tests/fixtures/jwks.json` + loader test (key rotation simulation)
8. Per-plan invariants: assert each defined `max_investor_count` never exceeded across representative high round run (e.g. rounds == max_investor_count + 10).
9. Round boundary transitions: explicit tests for rounds 1, 15, 16, and highest configured bonus round per plan verifying bonus activation/deactivation.
10. Large rounds stress: run high round count (e.g. 200) asserting monotonic cumulative values ONLY (skip via `@pytest.mark.unit_slow` if needed).
11. Monetary magnitude extremes: very large scheduled payment / investment overrides; assert no overflow, negative tax, or precision drift (tolerance 1e-6).
12. `sales_achievement_rates` variants: None, empty, shorter, longer, non-sequential; service pads/truncates/ignores gracefully.
13. Input sanitation: plan id validation (no implicit normalization). Lowercase or whitespace-variant IDs are rejected with `ValueError` (explicit—backend performs no normalization).
14. Invalid numeric inputs: negative payment values, non-int (float / string) overrides → ValueError/type guard path.
15. Scheduled payment mapping: conversion to internal `investments` preserves ordering, disallows negatives, and forbids duplicate keys (duplicate round entries cause test failure / explicit rejection expectation).
16. Tax rounding & accumulation: sum of per-round net_after_tax approx cumulative (<= 1 unit diff) catching double-tax or rounding drift.
17. Investor growth ceiling: fabricate scenario where growth would exceed `max_investor_count`; assert clamped.
18. Snapshot versioning: snapshot includes `version`; fail with guidance if missing (ROUNDS constant 36 canonical).
19. JWT helper negative paths: missing `kid`, duplicated `kid`, unsupported `alg`, `aud` mismatch, malformed segments, invalid base64, expired, not-yet-valid.
20. Hash/normalization utility: idempotence, trimming, rejection of invalid prefixes, preservation of canonical hyphenated form.
21. Determinism guard: assert no RNG use in simulation path (patch module-local random/optional numpy only; never global).
22. (Removed – consent version cache helper not in SSD; no tests.)
23. Privacy policy fallback: simulate DB retrieval failure -> static markdown fallback returned (validate `source == 'static-file'`).
24. Structured error envelope builder: `build_error(code, message, details=None)` idempotence + shape contract.
25. OTP verify attempt limits: (a) constant guard `MAX_OTP_VERIFY_ATTEMPTS == 6` (`xfail(strict=True)` until config updated if mismatch) and (b) behavior test exercising attempt boundary then limit rejection path.
26. OTP send limiter helper logic: rolling window of 15 minutes—3 sends allowed; 4th within window rejected. Use time-freeze / manual clock advancing.
27. JWKS caching TTL validation: follow SSD (current range 5–15m) without enforcing a single fixed duration—test ensures key reuse within early portion (e.g., <5m) and forced refresh after upper bound (>15m simulated). Prioritize SSD wording.
28. (Out-of-scope) Simulation list normalization utility belongs to integration layer—omit unit coverage.
29. (Deferred) Exception hierarchy tests skipped—current codebase lacks dedicated domain exception classes (weak error handling acknowledged). Add later when hierarchy introduced.
30. (Deferred) Policy publish side-effect contract not implemented—placeholder test omitted until feature lands.

Note: Tasks 18 and 20 already cover snapshot version semantics and phone/hash normalization respectively; tasks 22–28 focus on upcoming consent & error model features.

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

- Canonical rounds count N = 36 (test-level canonical snapshot rounds; not a runtime constant—the application user selects rounds; used here to exercise late-round logic while remaining fast).
- Run canonical input (documented in test) for N rounds and snapshot selected metrics (values stored rounded to 2–4 decimals purely for human diff; comparison uses raw floats with absolute diff <= 1e-6 ignoring `generated_at`).
- Snapshot file stored under `tests/unit/simulation/__snapshots__/plan_a_rounds_36.json` (commit for regression detection)
- Snapshot JSON schema example:

```json
{
    "version": "1.0",              // snapshot schema version – bump on structural field changes
    "generated_at": "<iso8601>",   // optional informational (ignored in comparison)
    "plan_id": "A",                // constant for this snapshot
    "rounds": 36,                   // canonical rounds count
    "fields": ["investor_count","total_payment","total_revenue_after_tax","cumulative_profit"],
    "history": [                    // length == rounds
         {"round":1,"investor_count":1,"total_payment":1000.0,"total_revenue_after_tax":970.0,"cumulative_profit":10.0},
         {"round":2, ...}
    ]
}
```

Comparison logic ignores `generated_at` and performs tolerant float comparison on raw values (absolute diff <= 1e-6). Version bump rule: increment minor when adding/removing a field inside `fields`; increment major when changing semantic meaning of existing fields.

### 5.4 Edge Cases

- Invalid plan_id → `ValueError`
- rounds <= 0 → `ValueError`
- Extremely high rounds (stress upper bound chosen e.g. 200) remains stable (no negative revenue) (timing not asserted at unit layer)

### 5.5 Tax Logic

- Per-round tax: `per_round_tax = round_gross * 0.033` (tolerance 1e-6)
- Cumulative tax: `cumulative_tax_n = sum(per_round_tax_i for i <= n)`
- Assert no tax is applied twice (no double-taxing net values) and cumulative profit calculations do not reuse already net amounts.

### 5.6 Achievement Rate Overrides

- Custom `sales_achievement_rates` handling rule (decided):
    - Longer than internal expected length → truncated to expected length.
    - Shorter than internal expected length → padded by repeating the last provided value until length satisfied.
- Tests: one happy-path override; one shorter (padding) case; one longer (truncation) case; one malformed value outside allowed fraction range (ignored by service). No longer NEED_DECISION.

### 5.7 Settlement Bonus Rule

- Confirmed: Rounds 1–15 inclusive the settlement bonus is active; rounds >=16 it is inactive. Aligns with implementation where deactivation occurs after company_round > 15.

### 5.8 JWT Decoding Wrapper

- Valid token with matching kid from fixture JWKS
- Rotated JWKS (kid removed) → verification failure path
- Expired token → raises `TokenExpiredException`

Negative path contracts (each test asserts exact exception class + message):

| Negative Path | Exception/Return Contract |
|---------------|--------------------------|
| Missing `kid` | Raise `InvalidTokenException` with message "Missing 'kid' in JWT header." |
| Duplicated `kid` | Raise `InvalidTokenException` with message "Duplicated 'kid' values in JWT header." |
| Unsupported `alg` | Raise `UnsupportedAlgorithmException` with message "Unsupported algorithm: {alg}." |
| `aud` mismatch | Raise `AudienceMismatchException` with message "Audience mismatch: expected {expected_aud}, got {actual_aud}." |
| Malformed token segments | Raise `MalformedTokenException` with message "Malformed JWT token segments." |
| Invalid base64 | Raise `InvalidBase64Exception` with message "Invalid base64 encoding in JWT." |
| Expired (`exp` past) | Raise `TokenExpiredException` with message "JWT token has expired." |
| Not-yet-valid (`nbf` future) | Raise `TokenNotYetValidException` with message "JWT token is not yet valid." |

Tests generate minimal tokens or manipulate headers/payload segments to trigger each branch.

### 5.9 Extended Validation & Boundary Set (Added)

Maps to tasks 8–21 (simulation & core utility scope); each remains isolated pure function/service invocation. Tasks 22–28 are infrastructure / domain service helpers validated separately.

- Boundary rounds & threshold transitions (tasks 8–10) with assertions on bonus flags & cumulative monotonicity.
- Achievement rate irregular structures (task 12) verifying defensive normalization (now locked: padding/truncation behavior above; remove xfail once implemented if not already).
- Input sanitation & numeric validation (tasks 13–15) asserting explicit exceptions.
- Tax accumulation drift (task 16) verifying acceptable epsilon.
- Investor growth ceiling (task 17) using crafted state injection if needed.
- Snapshot versioning (task 18) ensuring snapshot includes explicit schema version string.
- Comprehensive JWT negative cases (task 19) using pre-built malformed token fixtures.
- Phone / hash normalization behaviors (task 20) including multi-prefix formatting support for 010/011/016/017/018/019 ensuring normalization & rejection rules.
- Determinism guard (task 21) monkeypatching random sources to raise if accessed.
    (Gap tasks 22–28 are non-simulation infrastructure; covered separately.)

## 6. Tooling

- `pytest -m unit --maxfail=1 -q`
- Discovery relies on test file pattern; marker `@pytest.mark.unit` is optional and used only for grouping or selective runs.
- Coverage collected via `--cov=src/backend --cov-report=term-missing:skip-covered`

## 7. Acceptance Criteria (Layer-Specific)

- Tasks 1–28 present (task 25 may start as `xfail(strict=True)` until config updated).
- Each plan ID covered by at least one assertion.
- Snapshot test stable across two consecutive runs (no churn).
- Overall backend line coverage >= 40% post-implementation (initial gate) en route to 75%.
- No network calls executed (validated by monkeypatching outbound socket creation to raise during tests).
- Temporary `xfail` items annotated with rationale and removal condition.
- Improper inputs raise clear exceptions (messages include fault keyword).
- Determinism guard (task 21) prevents unintended RNG usage.
- Introduce test-local constant `CANONICAL_SNAPSHOT_ROUNDS = 36` for snapshot test clarity (not a production constant).

## 7.1 Pending Decisions (NEED_DECISION)

All prior decision items have been resolved or explicitly deferred/removed. No active NEED_DECISION entries remain.

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
    # Monotonic cumulative profit checked in dedicated multi-round test
```
