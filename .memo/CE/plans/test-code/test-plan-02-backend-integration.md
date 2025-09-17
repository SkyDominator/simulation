# Test Plan – Backend Integration Tests

Canonical overview & orchestration: see `test-code.md`. This file stands alone to implement backend integration tests.

## 1. Scope
Exercise FastAPI application endpoints with realistic request/response cycles while isolating side effects (DB schema per suite, mocked external SMS/JWKS as needed). Validate cross-entity flows: OTP, consent, simulation lifecycle, notices/policies, health, authorization failures.

## 2. Objectives
- Prove endpoint contracts (status codes, payload shapes, side-effect semantics)
- Ensure onboarding gating (423) & admin authorization (403) work
- Verify simulation CRUD invalidates & regenerates `simulation_results`
- Assert OTP & consent flows respect rate / attempt limits
- Keep runtime moderate (<30s full layer)

## 3. Environment
- Runner: `pytest`
- Test DB: Postgres (Supabase local) with isolated schema per module (fixture creates `test_mod_<random>`)
- Migrations applied via `invoke db.apply --schema <schema>` once per schema
- SMS provider mocked (no Solapi calls) unless `ALLOW_REAL_SMS=1`
- JWKS: static fixture (avoid network dependency)
- Mark tests: `@pytest.mark.integration`

## 4. Tasks (Verbatim from Master Plan)
1. App fixture with dependency overrides (DB session, SMS provider, JWKS provider)
2. OTP Flow: send (whitelist pass), verify success, exceed attempt limit (6), send rate limit (4th send within 15m → 429)
3. Consent Flow: publish policy fixture, record pre-auth consent, link after auth, latest vs current version status (423 Locked path)
4. Simulation CRUD: create → run → update (assert `simulation_results` cleared) → re-run produces new history → memo patch → delete
5. Notices & Admin: create, list (published filter), update, pin/unpin, delete; unauthorized (non-admin) → 403; publish privacy policy toggles previous
6. Health endpoint: structure contains Supabase status & latency field
7. Unauthorized / forbidden tests: admin endpoints with normal user token (403); protected endpoint without latest consent (423)

## 5. Detailed Flow Specifications
### 5.0 Endpoint Mapping (Validated Against `src/backend/api/routes.py`)
| Path | Method | Purpose | Auth Required | Notes |
|------|--------|---------|---------------|-------|
| / | GET | Root sanity | No | Returns message |
| /api/otp/send | POST | Request OTP | No | Whitelist gate inside handler |
| /api/otp/verify | POST | Verify OTP | No | Attempts & rate limiting in service |
| /api/notices | GET | List published notices | No | Public list |
| /api/notices/{id} | GET | Get single published notice | No | 404 if not published |
| /api/admin/me | GET | Admin self-check | Yes (admin) | 403 if not admin |
| /api/admin/notices | POST | Create notice | Yes (admin) | |
| /api/admin/notices/{id} | PATCH | Update notice | Yes (admin) | |
| /api/admin/notices/{id} | DELETE | Delete notice | Yes (admin) | |
| /api/admin/privacy-policies | POST | Create policy | Yes (admin) | Cannot set published directly |
| /api/admin/privacy-policies/{id} | PATCH | Update policy | Yes (admin) | Publishing blocked here |
| /api/admin/privacy-policies/{id} | DELETE | Delete policy | Yes (admin) | |
| /api/admin/privacy-policies/{id}/publish | POST | Publish policy | Yes (admin) | Unpublishes others |
| /api/admin/privacy-policies | GET | List policies (admin) | Yes (admin) | Ordered desc |
| /api/admin/privacy-policies/{id} | GET | Get policy (admin) | Yes (admin) | |
| /api/simulations | GET | List simulations | Yes | User scoped |
| /api/simulations/{id} | GET | Get simulation details | Yes | 404 if not owned |
| /api/simulation/create | POST | Create simulation | Yes | |
| /api/simulation/run | POST | Run simulation | Yes | Persists results |
| /api/simulations/{id} | PATCH | Update simulation | Yes | Clears results |
| /api/simulations/{id}/memo | PATCH | Update memo | Yes | Memo only |
| /api/simulations/{id} | DELETE | Delete simulation | Yes | |
| /api/simulation/delete | POST | Delete simulation (alt) | Yes | Accepts body |
| /api/health | GET | Health check | No | Includes supabase status |
| /api/consents | POST | Record consent | No (pre-auth) | Links whitelist user_hash |

All above table entries confirmed against `routes.py` at edit time.
### 5.1 OTP Flow
- Pre-seed whitelist hash or simulate via helper
- POST /api/otp/send → 200 JSON includes user_hash + expiry seconds
- 4th send within rate window → 429 with code `OTP_SEND_RATE_LIMIT`
- POST /api/otp/verify success path returns remaining_attempts
- Exceed 6 attempts → remaining_attempts=0; subsequent verify -> 400 error

### 5.2 Consent Flow
- Publish policy (admin endpoint)
- Pre-auth record consent (user_hash)
- Link consent after auth: POST /api/user/link-consent
- Simulate new policy version publish → prior consent triggers 423 on protected endpoint
- User POST /api/user/consents with latest version → 200 then access succeeds

### 5.3 Simulation Lifecycle
- Create: capture returned simulation_id
- Run: ensure results persisted (non-empty history length > 0)
- Update: PATCH changing plan param clears stored `simulation_results` (GET reflects null/empty)
- Re-run: new results history; optionally compare timestamp monotonicity
- Memo patch: separate endpoint modifies only memo field
- Delete: 204/200; subsequent GET returns 404

### 5.4 Notices & Policies
- Admin create notice (unpublished by default)
- Publish notice → appears in public list
- Pin/unpin toggle persists
- Delete removes from list
- Publish new privacy policy automatically unpublishes previous (assert previous now unpublished)

### 5.5 Health Endpoint
- GET /api/health returns JSON with top-level status and nested `services.supabase.ok` boolean & latency numeric

### 5.6 Authorization Cases
- Non-admin hitting admin route → 403
- Missing consent for latest policy → 423 on normal protected route
- Missing/invalid JWT → 401

## 6. Fixtures & Helpers
- `app_client(schema)` returns TestClient bound to schema-specific dependencies
- `create_user_token(is_admin=False, consented_version=None)` produces JWT claims & optionally seeds admin/consent rows
- `publish_policy(version)` seeds DB row & toggles published flag while unpublishing previous

### 6.1 Config Injection / Overrides
Override OTP related limits by monkeypatching `config.settings.settings` attributes in a fixture to widen attempt counts or validity for deterministic tests. Example:
```python
@pytest.fixture
def otp_limits(monkeypatch):
	from config import settings as settings_mod
	monkeypatch.setattr(settings_mod.settings, 'otp_max_attempts', 6)
	monkeypatch.setattr(settings_mod.settings, 'otp_resend_limit_per_15min', 4)
	return settings_mod.settings
```

### 6.2 Canonical Protected Endpoint for 423
Use `GET /api/simulations` as canonical protected endpoint to assert 423 Locked when latest consent not granted. Flow: initial consent → publish newer policy → request protected endpoint (expect 423) → submit updated consent → retry (200).

## 7. Data Isolation Strategy
- Module scope fixture creates unique schema name → apply migrations → yield → drop schema
- Use transaction rollbacks inside tests for extra speed if practical (nested transactions) else rely on schema teardown

## 8. Performance Guardrails
- Fail test if single integration test >5s (pytest timeout plugin configuration) except simulation run stress path (<10s)

## 9. Acceptance Criteria
- All tasks 1–7 covered by explicit tests
- Each listed endpoint invoked at least once
- Introduced failures (e.g., force 423) reproducible deterministically
- No external network (assert mocks captured 0 outbound calls)

## 10. Risks
| Risk | Mitigation |
|------|------------|
| Schema creation overhead | Cache migration application / reuse within module |
| Flaky timing around OTP expiry | Freeze time or configure extended expiry in test settings |
| State leakage | Per-schema isolation + teardown |

## 11. Future Enhancements
- Contract test integration: automatically compare response models vs OpenAPI
- Add load-focused integration subset (parallel simulation runs)

