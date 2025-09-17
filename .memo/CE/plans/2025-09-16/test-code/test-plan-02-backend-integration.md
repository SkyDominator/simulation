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

