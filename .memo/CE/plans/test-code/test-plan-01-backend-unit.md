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
10. Large rounds stress: run a high but acceptable round count (e.g. 200) and assert monotonic cumulative values ONLY (timing assertion removed—performance concerns moved to performance harness). Skip if marked slow via `@pytest.mark.unit_slow` (still unit boundary—no I/O).
11. Monetary magnitude extremes: inject very large scheduled payment / investment override values and assert no overflow, negative tax, or precision drift (compare recomputed cumulative vs sum of per-round nets within tolerance 1e-6).
12. `sales_achievement_rates` variants: None, empty dict, shorter than needed, longer than used, and containing non-sequential keys; service should pad/truncate/ignore gracefully (assert documented behavior).
13. Input sanitation: plan id with lowercase / surrounding whitespace → normalized or raises ValueError (document current expected behavior; lock with test).
14. Invalid numeric inputs: negative payment values, non-int (float / string) in overrides; expect ValueError or type guard path.
15. Scheduled payment mapping: verify conversion to internal `investments` structure preserves ordering, disallows negative entries, and aggregates duplicates if logic applies.
16. Tax rounding & accumulation: assert sum(round.net_after_tax) approximates cumulative figure (<= 1 unit difference) to catch double-tax or rounding drift.
17. Investor growth ceiling: fabricate scenario where growth logic would exceed `max_investor_count`; assert clamped.
18. Snapshot versioning: include a `version` field in snapshot fixture; test fails with helpful message if snapshot missing version (forces regeneration procedure discipline). Snapshot ROUNDS constant set to 36 (canonical) and stored with schema version.
19. JWT helper negative paths: missing `kid`, duplicated `kid`, unsupported `alg`, `aud` mismatch, malformed token segments, invalid base64, expired (`exp` past) and not-yet-valid (`nbf` future) tokens.
20. Hash/normalization utility: idempotence (normalizing twice unchanged), trimming whitespace, rejecting invalid country/prefix patterns, preserving already hyphenated canonical form.
21. Determinism guard: if RNG ever introduced later, proactively assert no `random` or `numpy.random` calls during simulation by monkeypatching to raise (locks deterministic design).
    - Scope Narrowing: Only patch RNG inside the simulation module namespace to avoid breaking libraries like Faker.
    - Implementation sketch:
      ```python
      @pytest.fixture
      def rng_guard(monkeypatch):
          import services.simulations as sim_mod
          import random as _r
          if 'random' in dir(sim_mod):
              def _blocked():
                  raise RuntimeError('Unexpected RNG use in simulation path')
              monkeypatch.setattr(sim_mod.random, 'random', _blocked, raising=True)
          # Optional: patch numpy if later adopted
          yield
      ```
    - Do NOT globally patch `random.random` for the entire test session.

### 4.2 Gap-Driven Pre-Feature Tasks (Continuous Numbering)
The following tasks extend the numbering above (no renumbering of existing items) and will be added BEFORE implementing new features identified in `SSD-review-2025-09-17.md`.

NOTE: For markdown lint compliance the ordered list below restarts at 1; in parent task index these correspond logically to tasks 22–28.

1. (22) Consent version cache helper: pure function tests for TTL expiry vs manual bust (ensures future middleware can rely on deterministic cache behavior).
2. (23) Privacy policy loader (DB only) rejects static file fallback: test asserts `PolicyNotFoundError` when no published policy (prevents silent fallback to markdown).
3. (24) Structured error envelope builder: `build_error(code, message, details=None)` idempotence + shape guard (ensures consistent future API error responses).
4. (25) OTP verify attempt constant guard: assert `MAX_OTP_VERIFY_ATTEMPTS == 6` (initially added with `xfail(strict=True)` until config updated from current value).
5. (26) Simulation list normalization utility: given `None` / empty → returns empty list (used by future integration handlers for 200 + []).
6. (27) Exception hierarchy presence: domain base (e.g. `DomainError`) and specific subclasses (`ConsentError`, `PolicyError`, `OTPError`, `SimulationError`, `JWTError`); tests assert inheritance only.
7. (28) Policy publish side-effect contract: helper returns structure containing `invalidate_cache=True` (future middleware hook to force consent re-check).

NOTE: Snapshot version semantics (Task 18) and phone/hash normalization (Task 20) already covered—excluded here to avoid redundancy.

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

- Canonical rounds count N = 36 (decision applied from clarity review) ensuring broader coverage of late-round logic while remaining fast.
- Run canonical input (documented in test) for N rounds and snapshot selected metrics (rounded to 2–4 decimals)
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

Comparison logic ignores `generated_at` and performs tolerant float comparison (absolute diff <=1e-6 after rounding). Version bump rule: increment minor when adding/removing a field inside `fields`; increment major when changing semantic meaning of existing fields.

### 5.4 Edge Cases

- Invalid plan_id → `ValueError`
- rounds <= 0 → `ValueError`
- Extremely high rounds (stress upper bound chosen e.g. 200) remains stable (no negative revenue) (timing not asserted at unit layer)

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

Maps to enhanced tasks 8–22; each remains isolated pure function/service invocation:

- Boundary rounds & threshold transitions (tasks 8–10) with assertions on bonus flags & cumulative monotonicity.
- Achievement rate irregular structures (task 12) verifying defensive normalization.
- Input sanitation & numeric validation (tasks 13–15) asserting explicit exceptions.
- Tax accumulation drift (task 16) verifying acceptable epsilon.
- Investor growth ceiling (task 17) using crafted state injection if needed.
- Snapshot versioning (task 18) ensuring snapshot includes explicit schema version string.
- Comprehensive JWT negative cases (task 19) using pre-built malformed token fixtures.
- Phone / hash normalization behaviors (task 20).
- Determinism guard (task 21) monkeypatching random sources to raise if accessed.
    (Gap tasks 22–28 are non-simulation infrastructure; covered separately.)

## 6. Tooling

- `pytest -m unit --maxfail=1 -q`
- Add marker `@pytest.mark.unit` (optional) for targeted run
- Coverage collected via `--cov=src/backend --cov-report=term-missing:skip-covered`

## 7. Acceptance Criteria (Layer-Specific)

- Tasks 1–21 implemented (or explicitly skipped with justification where marked) plus gap tasks 22–28 added (25 may be `xfail(strict=True)` until constant updated).
- Each plan ID covered by at least one assertion.
- Snapshot test stable across two consecutive runs (no churn).
- Coverage contribution from unit tests drives backend subtotal toward ≥40% (initial gate) en route to 75%.
- No network calls executed (validated by monkeypatching / absence of network fixtures).
- Gap tasks 22–28: all present; any intentional temporary `xfail` annotated with rationale comment.
- Validation tests confirm improper inputs raise clear exceptions (message contains keyword specifying fault).
- Determinism guard (task 21) ensures no unintended randomness.

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
