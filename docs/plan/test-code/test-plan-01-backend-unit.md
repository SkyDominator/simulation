# Test Plan – Backend Unit Tests (Concrete v1.1)

This supersedes the earlier abstract version. All items map to concrete code lines so implementation can proceed without ambiguity.

Source line mapping helper generated at commit time: `line_map.py` -> `line_numbers.txt` (do not import in tests; only for planning).

SSD Reference: `SSD.md` v0.2.1 (simulation §10, OTP §7.1, privacy fallback §8.2, JWT security §7.1 Core Security Controls).

--------------------------------------------------------------------------------
1. Scope & Principles
--------------------------------------------------------------------------------
Pure unit coverage of deterministic or locally controllable logic:
* Simulation math & state transition (`simulation_service.py` lines 1–400)
* Plan parameter integrity (`constants.py` lines 8–109)
* DB orchestration logic that is pure before actual network call (structure & transformation only) (`services/simulations.py` selected lines)
* JWT verification wrapper negative-path branching (`auth/jwt.py` lines 1–160)
* OTP utilities & service rate/attempt limiting ( `services/otp/utils.py` lines 1–120, `services/otp/otp_service.py` lines 1–200 ) with DB interactions mocked
* Privacy policy fallback branch (`api/routes.py` lines 438–497 approx; see generated file for exact)

Out of scope here (moved to integration): network I/O (Supabase real calls, external HTTP), SMS provider classes actual send (just minimal stub verification of call attempt), route wiring (FastAPI path operation tests) except the pure fallback branch transformation.

--------------------------------------------------------------------------------
2. Test Category Matrix
--------------------------------------------------------------------------------
Each category lists: ID, What, Why, Target Lines, How (approach), Cases.

2.1 Plan Parameter Integrity (CAT-PLAN)
* Why: Ensure constant table fidelity—typos break downstream simulation assumptions.
* Targets: `constants.py` lines 8–109.
* Cases:
    - PLAN-001: All expected plan IDs present set(A,B,C,D,K,P,R,F,E).
    - PLAN-002: Each plan dict contains required keys: max_investor_count, min_payment_new, min_payment_re, revenue_base_divisor, sales_commission, settlement_bonus, max_bonus, round_bonus_rates, sales_achievement_rates.
    - PLAN-003: min_payment_new keys monotonic starting at 1 and contiguous until the highest defined for that plan (no skipped internal round) – detect missing round.
    - PLAN-004: All numeric values > 0 except allowed zeros (none presently expected except bonus lookups default) – fail fast on negative or zero where not allowed.
    - PLAN-005: sales_achievement_rates values all == 1 (current baseline) within [0,1] inclusive (future safety).
    - PLAN-006: round_bonus_rates keys subset of range(4, 100) and values >=1.

2.2 Simulation Service Initialization & Input Validation (CAT-INIT)
* Targets: `FinancialSimulationService.__init__` lines ~59–105, invalid plan guard lines 69–73 (actual numbers per mapping), override logic lines 76–95.
* Cases:
    - INIT-001: Invalid plan id -> ValueError message contains 'Invalid plan'.
    - INIT-002: scheduled_payment override negative & zero entries sanitized to min_payment_new or min_payment_re ( `_sanitize_scheduled_payment` lines ~108–152 ). Provide dict {1:0, 2:-5, 'x':100, 99:None} assert returned keys exclude 'x', 99 uses min_payment_re fallback when 99 absent in min_payment_new.
    - INIT-003: sales_achievement_rates override rejects out-of-range values (<0.5 or >1.0) lines ~88–95.
    - INIT-004: Accepted sales_achievement_rates override stored exactly (type float) – compare to params.

2.3 Scheduled Payment Sanitization (CAT-SAN)
* Targets: `_sanitize_scheduled_payment` lines ~108–152.
* Cases:
    - SAN-001: Non-int round key string convertible ("3") accepted.
    - SAN-002: Non-numeric key 'abc' skipped (warning path) – monkeypatch logger to capture.
    - SAN-003: amount None -> replaced.
    - SAN-004: amount <=0 replaced with correct min round-specific or min_payment_re.
    - SAN-005: Valid positive amount kept unchanged.

2.4 Core Round Mechanics (CAT-RND)
* Targets: `run_single_round` lines ~178–275.
* Cases (using plan A minimal scheduled_payment prepared to equal min_payment_new):
    - RND-001: Round 1 adds one 신규 investor, investor_count==1, payment equals min_payment_new[1].
    - RND-002: Round <= max_investor_count scenario growth: run rounds = max_investor_count and assert len(last_round.investor_details)==max_investor_count.
    - RND-003: Transition to stable phase (round max_investor_count+1) adds a 재입학 investor; verify investor_type field in investor_details contains '재입학'.
    - RND-004: Graduations: after round max_investor_count ensure internal_round progression and no investor with internal_round > max_investor_count persists (graduated removed). Graduation path lines ~230–239.
    - RND-005: Settlement bonus deactivation after current_company_round >15 for all plans except Plan G. Plans A, B, C, D, E, F, K, P, R deactivate at round 16 (assert params['settlement_bonus']==0 and remains 0 future). Plan G remains active for all rounds (exception).
    - RND-006: Revenue branch coverage: internal_round 1,2 path; 3 path storing base_calc_value_r3; >=4 path using bonus + achievement rate. Force by running >=7 rounds small plan.
    - RND-007: Rounding of revenue: revenue values are int after `round()` lines ~205–210.
    - RND-008: Tax computation: after round t compute expected total_revenue_after_tax = gross - gross*0.033 lines ~246–249; tolerance 1e-9.
    - RND-009: Net profit first round negative: lines ~252–257.
    - RND-010: Subsequent net profit reference previous total_revenue_after_tax (not cumulative) lines ~258–265 – detect potential regression by crafting scenario where reuse cumulative would differ.
    - RND-011: cumulative_net_profit monotonic non-decreasing after first possible positive transition.

2.5 Multi-Round Snapshot (CAT-SNAP)
* Targets: same run logic; we snapshot selected fields from `SimulationRoundResult.to_dict` lines ~45–63.
* Canonical constant: CANONICAL_SNAPSHOT_ROUNDS=36 (Plan A) verifying late-phase stable + deactivated bonus region.
* Fields captured: company_round, investor_count, total_payment, total_revenue_after_tax, cumulative_net_profit.
* Cases:
    - SNAP-001: Generate snapshot file if missing; subsequent run diff tolerant abs<=1e-6 for numeric.
    - SNAP-002: Fails if schema missing 'version'. Maintain version string in snapshot file (test asserts key presence).
    - SNAP-003: Detect drift: modify one value artificially in snapshot copy to ensure failing assertion pattern documented.

2.6 Run Simulation High-Level (CAT-RUN)
* Targets: `run_simulation` lines ~277–314.
* Cases:
    - RUN-001: total_rounds <=0 -> ValueError message contains 'positive'.
    - RUN-002: State reset semantics: run two simulations sequentially; second start round=1 state independent (current_company_round resets, investors list empty, settlement_bonus restored at line ~293–298).
    - RUN-003: For given total_rounds N, results.history length==N.

2.7 DB Service Transformations (CAT-SIMSVC)
* Scope: Only pure transformations before network (mock client with simple object capturing call parameters).
* Targets: `SimulationService.run` lines ~42–91 for payment/rate mapping; `SimulationService.create` lines ~18–41.
* Cases:
    - SIMSVC-001: create builds investments list of dicts where each has only round & amount (order preserved from dict iteration) – confirm inserted payload.
    - SIMSVC-002: run converts percent sales_achievement_rates -> fraction (row.sales_achievement_rates percent 50 -> fraction 0.5 passed into FinancialSimulationService).
    - SIMSVC-003: run always recomputes results ignoring existing simulation_results (simulate pre-filled row).
    - SIMSVC-004: optimistic concurrency: if expected_updated_at newer than stored triggers HTTPException 409 lines ~54–63.

2.8 JWT Authentication Wrapper (CAT-JWT)
* Targets: `authenticate_jwt_token` lines ~31–74.
* We narrow unit tests to header extraction + key lookup fallback clearing cache (cache global `_jwks_cache`). We DO NOT verify cryptographic correctness (library responsibility); we stub jwt.decode.
* Cases:
    - JWT-001: Missing kid -> Unauthorized (simulate header lacking 'kid').
    - JWT-002: Missing alg -> Unauthorized.
    - JWT-003: Unknown kid first pass triggers cache clear then still missing -> Unauthorized (simulate with first keys list not containing, second also not containing).
    - JWT-004: Successful decode returns sub.
    - JWT-005: jwt.decode raises JWTError -> Unauthorized.
    - JWT-006: Audience mismatch path (simulate jwt.decode raising JWTError)
    - JWT-007: Cache reuse: same token second call does not trigger network fetch (patch JWKSClient.get_keys call count ==1).

2.9 OTP Utilities (CAT-OTP-UTIL)
* Targets: `services/otp/utils.py` lines 1–120.
* Cases:
    - OTPU-001: generate_otp length correct & digits only for digits=6.
    - OTPU-002: generate_otp digits<=0 raises ValueError lines ~10–20.
    - OTPU-003: hash_otp deterministic for same inputs; different for differing code lines ~22–33.
    - OTPU-004: verify_otp_hash True for correct / False for incorrect code lines ~35–45.
    - OTPU-005: normalize_phone valid prefixes 010..019 produce +82 formatting lines ~47–78; rejects invalid prefix; idempotent when already 82.*.
    - OTPU-006: calculate_expiry returns datetime within expected delta (minutes setting lines ~93–100).

2.10 OTP Service Rate & Attempt Limits (CAT-OTP-SVC)
* Targets: `otp_service.py` lines 1–200; focus `_check_rate_limits` lines ~20–63, `request_otp` lines ~65–133, `verify_otp` lines ~135–199.
* DB client stub contract: .table(name) -> object with chainable methods returning self until .execute() returns object with .data or .count.
* Cases:
    - OTPS-001: _check_rate_limits passes when both counts below limits.
    - OTPS-002: 15-minute limit reached returns allowed=False message includes 'Try again in a few minutes'.
    - OTPS-003: daily limit reached returns allowed=False message includes 'Daily OTP limit'.
    - OTPS-004: request_otp success path returns success True, includes expires_in_seconds == settings.otp_validity_minutes*60.
    - OTPS-005: request_otp DB insert failure (return object with empty data) -> success False message 'Internal server error'.
    - OTPS-006: verify_otp no record -> message '유효하지 않거나 만료된'.
    - OTPS-007: verify_otp attempts >= max -> marks used (verify update called) returns limit reached message.
    - OTPS-008: verify_otp correct code -> success True and mark used update executed once.
    - OTPS-009: verify_otp incorrect increments attempts and returns remaining_attempts value.

2.11 Privacy Policy Fallback (CAT-PRIV)
* Targets: `api/routes.py` fallback block lines ~438–497.
* Cases:
    - PRIV-001: Simulate DB exception -> returns source 'static-file'. Monkeypatch _supabase_client to raise when building query; patch Path.read_text to return stub content.
    - PRIV-002: File not found -> raise 404 HTTPException path lines ~468–476 (simulate FileNotFoundError).
    - PRIV-003: Permission error -> 500 path lines ~477–483.

2.12 Determinism & RNG Guard (CAT-DET)
* Simulation code currently uses no random; guard by monkeypatching secrets.randbelow (and random.random if imported later) to raise and assert running simulation unaffected (no call made). (Justification: simulation uses deterministic arithmetic only).

--------------------------------------------------------------------------------
3. Fixtures & Infrastructure
--------------------------------------------------------------------------------
Conftest additions (if not already present) with explicit example snippets. Place in `tests/unit/conftest.py` or augment existing `tests/conftest.py` with unit markers.

3.1 Plan Param Fixture
```python
import pytest
from constants import PLAN_PARAMETERS

@pytest.fixture(params=sorted(PLAN_PARAMETERS.keys()))
def plan_id(request):
        return request.param
```

3.2 Simulation Factory Fixture
```python
from simulation_service import FinancialSimulationService
from constants import PLAN_PARAMETERS

@pytest.fixture
def simulation_factory():
        def _make(plan_id: str, scheduled=None, sales_rates=None):
                # Provide default scheduled_payment mapping equal to min_payment_new for stable deterministic tests
                if scheduled is None:
                        params = PLAN_PARAMETERS[plan_id]
                        scheduled = {r: amt for r, amt in params['min_payment_new'].items()}
                return FinancialSimulationService(plan_id, scheduled_payment=scheduled, sales_achievement_rates=sales_rates)
        return _make
```

3.3 Mock Supabase Client (simplified)
```python
class MockTable:
        def __init__(self, name, state):
                self.name=name; self.state=state; self.query={}; self.count=0
        def select(self, *args, **kwargs): return self
        def insert(self, payload): self.state.setdefault(self.name, []).append(payload); return self
        def update(self, payload): self.state.setdefault(self.name, []).append(payload); return self
        def delete(self): return self
        def eq(self, *a, **k): return self
        def gte(self, *a, **k): return self
        def gt(self, *a, **k): return self
        def order(self, *a, **k): return self
        def limit(self, *a, **k): return self
        def execute(self):
                # Provide shape expected by service code
                class R: pass
                r=R(); r.data=self.state.get(self.name, []); r.count=len(r.data); return r

class MockClient:
        def __init__(self): self.state={}
        def table(self, name): return MockTable(name, self.state)
```

3.4 JWT Fixtures
Stub jwt.get_unverified_header / jwt.decode & JWKSClient.get_keys.
```python
@pytest.fixture
def jwks_single_key(monkeypatch):
        from auth import jwt as jwt_mod
        monkeypatch.setattr(jwt_mod, '_jwks_cache', {}, raising=False)
        class DummyJwks:  # returns one key with kid 'kid1'
                def get_keys(self): return {'keys':[{'kid':'kid1','kty':'RSA','use':'sig'}]}
        monkeypatch.setattr(jwt_mod, '_jwks_client', DummyJwks())
        return 'kid1'
```

--------------------------------------------------------------------------------
4. Representative Test Snippets
--------------------------------------------------------------------------------

4.1 RND-005 Settlement Bonus Deactivation

**RND-005**: Settlement bonus deactivation for non-G plans (Plans A, B, C, D, E, F, K, P, R deactivate at round 16; Plan G remains active)

```python
def test_settlement_bonus_deactivates_round_16(simulation_factory):
        svc = simulation_factory('A')
        svc.run_simulation(15)
        assert svc.params['settlement_bonus'] == 100000  # active through round 15
        svc.run_single_round()  # round 16
        assert svc.params['settlement_bonus'] == 0  # deactivated
```

**RND-005-G1**: Plan G settlement bonus persistence (remains active beyond round 15)

```python
def test_plan_g_settlement_bonus_never_deactivates(simulation_factory):
        svc = simulation_factory('G')
        svc.run_simulation(20)  # Run through round 20
        assert svc.params['settlement_bonus'] == 100000  # still active
        assert svc.settlement_bonus_active == True  # never deactivated
```

4.2 SAN-004 Scheduled Payment Replacement
```python
from simulation_service import FinancialSimulationService

def test_scheduled_payment_negative_replaced():
        raw = {1:0, 2:-10, 3:440000}
        svc = FinancialSimulationService('A', scheduled_payment=raw)
        sp = svc.params['scheduled_payment']
        assert sp[1] == 110000  # replaced by min
        assert sp[2] == 220000
        assert sp[3] == 440000
```

4.3 JWT-003 Cache Invalidate & Retry
```python
def test_jwt_unknown_kid_triggers_cache_clear(monkeypatch, jwks_single_key):
        from auth import jwt as jwt_mod
        calls={'n':0}
        class Rotating:
                def get_keys(self):
                        calls['n']+=1
                        # First call has no kid match; second also none -> unauthorized
                        return {'keys':[{'kid':'other'+str(calls['n'])}]}
        monkeypatch.setattr(jwt_mod, '_jwks_client', Rotating())
        monkeypatch.setattr(jwt_mod.jwt, 'get_unverified_header', lambda t: {'kid':'kid1','alg':'RS256'})
        monkeypatch.setattr(jwt_mod.jwt, 'decode', lambda *a, **k: {'sub':'user'})
        from fastapi import HTTPException
        cred = type('C', (), {'credentials':'token'})
        with pytest.raises(HTTPException):
                jwt_mod.authenticate_jwt_token(cred)
        assert calls['n'] == 2
```

4.4 OTP Attempt Exhaustion OTPS-007
```python
def test_verify_otp_attempts_exhausted(monkeypatch):
        from services.otp.otp_service import OTPService
        attempts_record={'attempts':6,'id':'row1','code_hash':'h','phone':'010','expires_at':'2999-01-01T00:00:00'}
        latest=[attempts_record]
        class Table:
                def select(self,*a,**k): return self
                def eq(self,*a,**k): return self
                def gt(self,*a,**k): return self
                def order(self,*a,**k): return self
                def limit(self,*a,**k): return self
                def update(self,*a,**k): return self
                def execute(self):
                        class R: pass
                        r=R(); r.data=latest; return r
        class Client: 
                def table(self,name): return Table()
        svc=OTPService(Client())
        res=svc.verify_otp('010','123456')
        assert res['success'] is False and '횟수를 초과' in res['message']
```

4.5 Privacy Policy Fallback PRIV-001 (async test uses anyio)
```python
import pytest, anyio
from api import routes

@pytest.mark.anyio
async def test_privacy_policy_fallback(monkeypatch, tmp_path):
        monkeypatch.setattr(routes, '_supabase_client', lambda: (_ for _ in ()).throw(Exception('db fail')))
        # Patch file discovery path to tmp file
        project_root = tmp_path
        md = project_root / 'docs'
        md.mkdir()
        f = md / 'privacy-policy-ko.md'
        f.write_text('# content', encoding='utf-8')
        # Monkeypatch Path resolution
        def fake_resolve():
                class P: 
                        def __init__(self, root): self._root=root
                        def parents(self): return [self._root]*4
                return f
        resp = await routes.get_privacy_policy()
        assert resp['source'] == 'static-file'
```

--------------------------------------------------------------------------------
5. Snapshot Strategy Details
--------------------------------------------------------------------------------
File: `tests/unit/simulation/__snapshots__/plan_a_rounds_36.json`
Schema:
```json
{"version":"1.0","plan_id":"A","rounds":36,"fields":["company_round","investor_count","total_payment","total_revenue_after_tax","cumulative_net_profit"],"history":[{"company_round":1, "investor_count":1, "total_payment":110000, "total_revenue_after_tax":0.0, "cumulative_net_profit":-110000}]}
```
Comparison procedure:
1. Load JSON (strip comments if any – avoid comments in committed snapshot).
2. Assert keys superset of required.
3. For each i in 1..rounds: compare numeric fields vs freshly produced values using abs(expected-actual)<=1e-6.
4. If mismatch: produce diff dictionary {round: {field: [expected, actual]}} limited to first 5 diffs for readability.
5. If missing 'version' -> fail with instruction to add and possibly bump following semantic change rules:
     - MAJOR: change meaning of existing field.
     - MINOR: add/remove field.

--------------------------------------------------------------------------------
6. Naming Convention & Markers
--------------------------------------------------------------------------------
Test file folders mirror categories: `tests/unit/simulation/`, `tests/unit/auth/`, `tests/unit/otp/`, `tests/unit/privacy/`, `tests/unit/services/`.
Test IDs included in function name prefix (e.g., test_RND_005_settlement_bonus_deactivates) for quick trace.

--------------------------------------------------------------------------------
7. Coverage Targets & Exit Criteria
--------------------------------------------------------------------------------
* Minimum initial coverage: 40% of backend lines (goal 70%+ incremental).
* All CAT-* categories implemented except PRIV error permutations optional for 1.1 (but included above).
* No external HTTP invoked: patch requests.get, requests.post to raise if reached outside JWT fetch tests; JWT tests stub get_keys to avoid network.

--------------------------------------------------------------------------------
8. Deferred / Out-of-Scope
--------------------------------------------------------------------------------
* Full FastAPI endpoint tests -> integration layer.
* Real SMS provider success/failure semantics (Solapi/NHN). Only minimal invocation shape in unit.
* Database concurrency race conditions – require integration with real Supabase.

--------------------------------------------------------------------------------
9. Implementation Checklist Mapping
--------------------------------------------------------------------------------
| Category | Cases Count | Priority |
|----------|-------------|----------|
| PLAN | 6 | High |
| INIT | 4 | High |
| SAN | 5 | High |
| RND | 11 | High |
| SNAP | 3 | High |
| RUN | 3 | High |
| SIMSVC | 4 | Medium |
| JWT | 7 | High |
| OTP-UTIL | 6 | High |
| OTP-SVC | 9 | High |
| PRIV | 3 | Medium |
| DET | 1 | Medium |

--------------------------------------------------------------------------------
10. Risks & Mitigations
--------------------------------------------------------------------------------
| Risk | Mitigation |
|------|------------|
| Snapshot fragility | Restrict field set, numeric tolerance, diff reporting |
| Logging noise | Use caplog fixture, assert on warnings deliberately |
| Flaky time-based tests | Avoid real sleep, patch datetime.now / use freezegun only where necessary |

--------------------------------------------------------------------------------
11. Next Steps After Plan Approval
--------------------------------------------------------------------------------
1. Create fixtures & helpers (Section 3).
2. Implement categories in order PLAN -> INIT -> SAN -> RND -> SNAP -> RUN -> remaining.
3. Add coverage config if not present; run baseline.
4. Introduce property-based tests later (Hypothesis) once deterministic baseline stabilized.

End of Plan.

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
6. Achievement rates override injection (if not implemented treat assertions as `xfail` / Deferred without adding new sections)
7. Add static JWKS fixture `src/backend/tests/fixtures/jwks.json` + loader test (key rotation simulation)
8. Per-plan invariants: assert each defined `max_investor_count` never exceeded across representative high round run (e.g. rounds == max_investor_count + 10).
9. Round boundary transitions: explicit tests for rounds 1, 15, 16, and highest configured bonus round per plan verifying bonus activation/deactivation.
10. Large rounds stress: run high round count (e.g. 200) asserting monotonic cumulative values ONLY (skip via `@pytest.mark.unit_slow` if needed).
11. Monetary magnitude extremes: very large scheduled payment / investment overrides; assert no overflow, negative tax, or precision drift (tolerance 1e-6).
12. `sales_achievement_rates` variants: None, empty, shorter, longer, non-sequential; service pads/truncates/ignores gracefully.
13. Input sanitation: plan id validation (no implicit normalization). Lowercase or whitespace-variant IDs are rejected with `ValueError` (explicit—backend performs no normalization).
14. Invalid numeric inputs: negative payment values, non-int (float / string) overrides → ValueError/type guard path.
15. Scheduled payment mapping: conversion to internal `investments` (scheduled_payment → investments jsonb) preserves ordering, disallows negatives, forbids duplicate keys (duplicate round entries cause test failure / explicit rejection expectation), and validates all referenced rounds are numeric integers.
16. Tax rounding & accumulation: sum of per-round net_after_tax approx cumulative (<= 1 unit diff) catching double-tax or rounding drift.
17. Investor growth ceiling: fabricate scenario where growth would exceed `max_investor_count`; assert clamped.
18. Snapshot versioning: snapshot includes `version`; fail with guidance if missing (ROUNDS constant 36 canonical).
19. JWT helper negative paths: missing `kid`, duplicated `kid`, unsupported `alg`, `aud` mismatch, malformed segments, invalid base64, expired, not-yet-valid.
20. Hash/normalization utility: idempotence, trimming, rejection of invalid prefixes, preservation of canonical hyphenated form, and formatting support for prefixes 010/011/016/017/018/019 (multi-prefix coverage per SSD onboarding rules).
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
- Overall backend line coverage >= 40% post-implementation (initial gate) progressing toward 70% target.
- No network calls executed (validated by monkeypatching outbound socket creation to raise during tests).
- Temporary `xfail` items annotated with rationale and removal condition.
- Improper inputs raise clear exceptions (messages include fault keyword).
- Determinism guard (task 21) prevents unintended RNG usage.
- Introduce test-local constant `CANONICAL_SNAPSHOT_ROUNDS = 36` for snapshot test clarity (not a production constant).

### 7.1 Pending Decisions (NEED_DECISION)

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
