# Enterprise Operations & Testing (Enterprise Scale)

*Extracted from myapp_SSD.md - Sections 19, 20, 22, 23*  
*Target: 10,000+ users or public-facing applications*

## 19. Operational Playbook (Deploy, Monitor, Rollback)

### 19.1 Deployment Workflow

| Stage | Action | Validation | Promotion Criteria |
|-------|--------|-----------|--------------------|
| Dev | Merge to feature branch | Unit & lint pass | Branch policy |
| Staging (optional) | Deploy tagged pre-release | Smoke tests + OpenAPI diff | Manual approval |
| Prod (Internal) | Deploy signed image tag | Health check, migration success | 0 blocking alerts in 15m |

**Deployment Steps:**

1. Build images with pinned dependency hashes.
2. Run DB migrations inside a transaction (idempotent).
3. Run smoke script: verify /api/health, run OTP send dry-run (provider sandbox), fetch latest policy.
4. If failure: rollback by re-deploying last known-good image + reverse unsafe migrations (forward-only design preferred; use compensating migration if needed).

### 19.2 Monitoring & Alerting Runbook

| Alert | Threshold | Immediate Action | Escalation |
|-------|-----------|------------------|------------|
| OTP provider failure spike | >30% failures 5m | Switch to fallback provider (future) / notify | Engineering lead |
| p95 CRUD latency breach | > 800ms 15m | Inspect DB (locks); check Supabase status | Infra owner |
| 5xx error rate | >1% 5m | Pull logs by trace_id; identify recent deploy | Rollback if deploy-related |
| Admin publish burst | >3 publishes 5m | Verify legitimacy; temporarily raise threshold | Security contact |

### 19.3 Audit Logging Requirements

| Event | Fields | Retention | Purpose |
|-------|--------|-----------|---------|
| policy_publish | policy_id, new_version, admin_user_id, ts, previous_published_id | 1 year | Accountability |
| policy_create | policy_id, version, admin_user_id, ts | 1 year | Change trace |
| notice_create | notice_id, admin_user_id, ts | 6 months | Content provenance |
| onboarding_link | user_id, whitelist_passed, otp_verified, consent_version, ts | 6 months | Onboarding trace |
| admin_login_check | admin_user_id, ts, ip_hash | 3 months | Security anomaly detection |
| simulation_run | simulation_id, user_id, rounds, duration_ms, engine_version, ts | 6 months | Performance & usage |

### 19.4 User Action Analytics (Privacy-Aware)

Anonymous event model (user_id pseudonymous; avoid phone or raw PII):

| Event | Fields | Note |
|-------|--------|------|
| page_view | user_id, path, ts | Path whitelist only |
| session_start | user_id, ts | Derived from first activity after inactivity (30m) |
| session_end | user_id, duration_s, pages_viewed | Calculated asynchronously |
| otp_step | user_id/hash_context, outcome, ts | outcome: sent, verified, expired |
| consent_accept | user_hash/user_id, version, ts | Pre vs post auth mapping |
| simulation_created | user_id, plan_id, ts | Usage metric |
| simulation_run | user_id, simulation_id, rounds, duration_ms | Performance + capacity |

Page dwell time: compute client-side heartbeat (every 15s) aggregated server-side; cap at 5 min per page for analytics normalization.

### 19.5 Rollback Strategy

| Scenario | Action |
|----------|--------|
| API regression | Redeploy previous image (immutably tagged) |
| Failed migration (non-destructive) | Apply down migration (only if explicitly authored) |
| Failed migration (destructive) | Restore from last snapshot backup (Supabase) + replay accepted writes (if feasible) |
| Security incident | Rotate keys (Supabase service, Solapi, OTP secret) sequentially; revoke sessions |

### 19.6 Operational Metrics Dashboard (Recommended Widgets)

- Latency heatmap (p50/p95) by endpoint group.
- OTP funnel (send -> verify success ratio).
- Simulation throughput (runs/hour) & average duration.
- Policy publish history timeline.
- Error code distribution (top 10).

## 20. Versioning & Evolution (API, Simulation Engine, Policy Content)

### 20.1 API Versioning Strategy

- Style: URL-less (implicit) minor evolution; add `X-API-Version` response header referencing current semantic version (e.g., 1.3.0).
- Backward Compatible Changes: additive fields, new endpoints.
- Breaking Changes: field removal/rename, semantic change, auth scope change → require major version bump noted in CHANGELOG and OpenAPI `info.version`.
- Deprecation Lifecycle: mark deprecated in OpenAPI + response header `Deprecation: true`; maintain for ≥1 minor version before removal.

### 20.2 Simulation Engine Versioning

- Introduce `engine_version` (semantic) recorded in `simulations.simulation_results` metadata (MUST exist for every persisted result set).
- Changes that alter numeric outcomes MUST increment minor (e.g., formula tweak). Algorithmic shift increments major.
- Historical results are immutable: MUST NOT recompute in-place under a new engine version; re-run produces a new result set.
- Determinism: same inputs + engine_version MUST yield identical results; regression snapshot tests cover canonical scenarios.
- Migration Note: initial backfill sets engine_version='1.0.0' for all existing rows; future version bumps require (a) CHANGELOG entry, (b) new regression snapshot tests, (c) adding upgrade rationale to audit log on first deploy.
- Regression Test Scaffold:
  - Directory: `backend/tests/engine_snapshots/`
  - Fixture: `{ "input": {...}, "expected": { "engine_version": "1.0.0", "results_hash": "<sha256>", "metrics": { ... } } }`
  - Hash = SHA256 of canonical JSON (sorted keys) of numeric outputs.
  - CI job `engine-snapshot` fails if hash drift occurs without engine_version bump.

### 20.3 Policy Content Versioning

- Existing `privacy_policies.version` acts as semantic version (allow patch bump for typo corrections; patch-level may allow content diff if non-material—log reason in audit).
- Publish flow ensures single active published policy per locale.
- Deprecation: superseded versions remain readable to admins (historical record) but not returned as "current".

### 20.4 Migration Governance

| Change Type | Version Impact | Required Artifacts |
|-------------|---------------|--------------------|
| Add optional response field | Patch | OpenAPI update, tests |
| Add new endpoint | Minor | OpenAPI, tests, docs entry |
| Remove field / break semantics | Major | Migration plan, comms note |
| Simulation formula adjustment | Minor (engine) | Engine version bump, fixture diffs |
| Simulation structural change | Major (engine) | Migration note, dual-run validation |

### 20.5 CHANGELOG Discipline

- Keep `CHANGELOG.md` with sections: Added, Changed, Deprecated, Removed, Fixed, Security.
- Each release tags commit; link to OpenAPI diff.

### 20.6 Backward Compatibility Testing

- Nightly job: regenerate client types from OpenAPI; diff to previous commit—if incompatible, alert engineering.
- Contract tests call critical endpoints using previous version fixtures to validate additive-only change.

## 22. Enterprise Appendices

### 22.1 Event → Outcome Code Mapping

| Event (Audit / User) | Trigger Scenario | Outcome Code | Notes |
|----------------------|------------------|--------------|-------|
| simulation_run.start | User initiates run (pre-exec) | (none) | Logged prior to execution for duration calc |
| simulation_run.complete | Successful execution | SIMULATION_RUN_COMPLETED | Add duration_ms metric |
| simulation_run.engine_mismatch | engine_version stale | ENGINE_VERSION_MISMATCH | Client MUST re-run after refresh |
| simulation_run.rate_limited | Concurrency cap hit | SIMULATION_RATE_LIMIT | Client SHOULD backoff (see 18.8) |
| otp.verify.invalid | Wrong code | OTP_INVALID | Include remaining_attempts in details |
| otp.verify.expired | Code expired | OTP_EXPIRED |  |
| otp.verify.locked | Attempts exhausted | OTP_LOCKED | Further attempts blocked until resend |
| otp.send.rate_limited | Exceeded send policy | OTP_SEND_RATE_LIMIT | 429 with Retry-After |
| consent.accept.version_mismatch | Version not current | CONSENT_VERSION_MISMATCH | Requires refresh of policy |
| policy.publish.success | Admin publishes | POLICY_PUBLISHED | Tracked for audit dashboard |
| policy.publish.conflict | Already published | POLICY_ALREADY_PUBLISHED | Admin UX surfaces prior state |
| simulation.update.conflict | Optimistic lock fail | CONFLICT_MODIFIED | Client MUST refetch |
| any.validation.failure | Payload invalid | VALIDATION_ERROR | Field list in details |
| any.rate.limit.generic | Generic rate limiting | RATE_LIMITED | Fallback throttle |
| any.internal.error | Unhandled exception | INTERNAL_ERROR | trace_id logged |

Adding a new outcome-producing event MUST: (1) update this table, (2) add/confirm error code in Section 18.3, (3) ensure logging pipeline captures event_type, outcome_code, trace_id.

### 22.2 Accessibility Requirement ↔ WCAG Mapping

| Requirement (Section 18.5) | WCAG 2.1 Success Criteria | Notes |
|---------------------------|----------------------------|-------|
| Color Contrast ≥4.5:1 | 1.4.3 Contrast (Minimum) | Use design token contrast checks in CI (optional) |
| Focus ring visible & programmatic focus | 2.4.3 Focus Order; 2.4.7 Focus Visible | Ensure no outline suppression via CSS reset |
| Keyboard navigation for interactive elements | 2.1.1 Keyboard | Include skip link at top of page |
| Semantic form labeling | 1.3.1 Info and Relationships; 3.3.2 Labels or Instructions | ARIA only where native semantics insufficient |
| Live region for errors | 4.1.3 Status Messages | aria-live="polite" region near form root |
| Stable layout (avoid shifts) | 2.2.1 Timing Adjustable (indirect), 2.3.3 Animation from Interactions | Reserve space for validation messages |
| I18n string externalization | 3.1.2 Language of Parts | Future multi-locale expansion |

Axe-core CI scan MUST report 0 critical violations; additions require justification & tracked remediation issue.

### 22.3 Performance Test Acceptance Targets

These targets inform the lightweight performance smoke (Section 23) and are distinct from production SLOs; exceeding them FAILS the perf job.

| Endpoint Group | p50 (ms) | p95 (ms) | Max Test Rounds | Concurrent Virtual Users | Notes |
|----------------|----------|----------|------------------|--------------------------|-------|
| OTP send (verify-user + send) | 120 | 400 | 200 | 5 | External SMS mocked |
| OTP verify | 80 | 300 | 200 | 5 | Includes DB read/update |
| Simulations list (GET /api/simulations) | 60 | 250 | 150 | 5 | Warm cache expectations |
| Simulation create | 90 | 350 | 150 | 5 | Insert + validation |
| Simulation run (algorithm) | 150 | 600 | 120 | 3 | CPU-bound deterministic run |
| Privacy policy fetch | 40 | 180 | 150 | 5 | Simple select + cache |

If p95 exceeds target by >10% the pipeline MUST mark build unstable and require manual approval before deploy.

## 23. Testing & CI Pipeline

### 23.1 Test Layers

| Layer | Tooling | Purpose |
|-------|---------|---------|
| Backend unit | pytest | Validate pure logic & helpers |
| Backend integration | pytest + test DB | Endpoint + DB contract |
| Simulation invariants | pytest + hypothesis | Detect algorithm edge regressions |
| Frontend unit | Vitest + RTL | Component & hook behavior |
| Contract (API) | Custom script + JSON schema + Spectral | Ensure responses match OpenAPI snapshot & style rules |
| Accessibility | axe-core (Playwright/JS) | Baseline WCAG scanning for critical flows |
| Performance smoke | k6/Locust (light) | SLO guard (p95 latency) |
| Security scanning | pip-audit, npm audit, optional Bandit | Dependency/code risk |

### 23.2 Gates & Thresholds

| Metric | Threshold |
|--------|-----------|
| Backend coverage | ≥75% lines (critical modules ≥90%) |
| Frontend coverage | ≥60% lines |
| OpenAPI drift | 0 (snapshot updated or fail) |
| Axe critical violations | 0 |
| Contract tests | 100% pass |

### 23.3 CI Job Order (Proposed)

1. Lint & Type Check (ESLint, tsc).
2. Backend tests + coverage.
3. Frontend tests + coverage.
4. Generate & diff OpenAPI snapshot (workflow: `openapi-snapshot.yml`) – pipeline MUST fail if any breaking (non-additive) change detected.
5. Spectral lint spec via `.spectral.yaml` (rules: operation-tags, no-unused-components, operationId-unique, path-kebab-case) – MUST pass with zero errors.
6. Contract tests (uses snapshot + running app where needed).
7. Accessibility scan (headless pages: OTP, Consent, Main, Admin Policy).
8. Security scans (pip-audit, npm audit) fail on HIGH.
9. Build & tag images (content digest).
10. Publish artifacts (coverage, spec, images).

### 23.4 Failure Handling

- On drift: provide unified diff; developer updates snapshot + CHANGELOG section.
- On flaky test (tagged @flaky): auto retry once; otherwise fail.
- On performance regression (p95 > budget + 10%): mark build unstable, require investigation.
- On engine snapshot drift: hash mismatch without engine_version bump -> fail; with bump -> require fixture regen.

### 23.5 Local Developer Commands (Illustrative)

| Command | Description |
|---------|-------------|
| make test-backend | Run backend unit/integration tests |
| make test-frontend | Run frontend tests |
| make openapi-snapshot | Regenerate OpenAPI snapshot file |
| make contract-test | Run contract test suite |

### 23.6 Reporting

- PR comment summarizing coverage deltas & drift status.
- Weekly trend (optional) for latency + error rate extracted from logs.

### 23.7 Security Test Checklist (Mandatory in CI)

Automated security validation step MUST execute after contract tests and BEFORE image publish. All MUST pass:

| Category | Test | Method | Expected Result |
|----------|------|--------|-----------------|
| Rate Limits | Send 4 OTP requests rapidly | Script + assertions | 4th request returns 429 |
| Auth Bypass | Access /api/simulations without token | curl/requests | 401 UNAUTHORIZED |
| Admin Privilege | Non-admin user calls admin endpoint | Auth token + requests | 403 FORBIDDEN |
| CORS Headers | Cross-origin request simulation | JS fetch test | Proper CORS response |
| Security Headers | GET /api/health | Header validation | All required headers present |

## 24. Migration & Deployment Coordination (Enterprise)

### 24.1 Safe Migration Deployment Strategy

**Coordinated Migration Steps**:

When deploying migrations that add/deprecate columns used by APIs, coordinate the following steps:

1. **Phase 1 - Additive Migration**:
   ```sql
   -- Add new columns with backward-compatible defaults
   ALTER TABLE simulations 
   ADD COLUMN new_field JSONB DEFAULT '{}',
   ADD COLUMN migration_flag BOOLEAN DEFAULT false;
   
   -- Create supporting indexes concurrently
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_simulations_new_field 
   ON simulations USING gin(new_field);
   ```

2. **Phase 2 - Application Update**:
   - Update backend to write to both old and new columns (if keeping compatibility)
   - Map field names at the API boundary for gradual transition
   - Deploy application with dual-write capability

3. **Phase 3 - Traffic Validation**:
   - Run smoke tests against new endpoints
   - Monitor error rates and performance metrics
   - Validate data consistency between old and new columns

4. **Phase 4 - Cutover and Cleanup**:
   ```sql
   -- After validation period, mark migration complete
   UPDATE simulations SET migration_flag = true WHERE migration_flag = false;
   
   -- In subsequent migration, remove legacy columns
   ALTER TABLE simulations 
   DROP COLUMN old_field CASCADE;
   ```

### 24.2 Zero-Downtime Deployment Pattern

**Application Deployment**:

1. **Blue-Green Strategy**:
   - Deploy new version alongside existing (different port/container)
   - Health check new version thoroughly
   - Switch load balancer/proxy to new version atomically
   - Keep old version running for immediate rollback capability

2. **Database Migration Coordination**:
   ```bash
   # Pre-deployment: Run additive migrations
   ./run_migrations.sh --mode=additive
   
   # Deploy application
   docker-compose up -d --scale backend=2
   
   # Health check and traffic switch
   ./health_check.sh new-backend
   ./switch_traffic.sh new-backend
   
   # Post-deployment: Run cleanup migrations after validation
   ./run_migrations.sh --mode=cleanup --delay=1h
   ```

3. **Rollback Procedures**:
   - Immediate: Switch traffic back to previous version
   - Database: Use compensating migrations rather than rollback
   - State: Preserve user data consistency during rollback

### 24.3 Migration Testing Strategy

**Pre-Production Validation**:

1. **Schema Validation**:
   ```sql
   -- Test migration on copy of production data
   CREATE DATABASE migration_test;
   -- Restore latest backup
   -- Run migration scripts
   -- Validate data integrity
   ```

2. **Application Compatibility**:
   - Run contract tests against migrated schema
   - Validate API responses match expected format
   - Test both old and new application versions during transition

3. **Performance Impact Assessment**:
   - Measure migration execution time on production-sized data
   - Validate index creation doesn't block critical operations
   - Test query performance before/after migration

### 24.4 Emergency Rollback Procedures

**Rapid Response Protocol**:

1. **Immediate Actions** (< 5 minutes):
   ```bash
   # Stop new deployments
   kubectl rollout pause deployment/backend
   
   # Revert to last known good version
   kubectl rollout undo deployment/backend
   
   # Monitor system health
   ./monitor_health.sh --alert-on-errors
   ```

2. **Data Recovery** (if needed):
   - Identify scope of data corruption/loss
   - Restore from point-in-time backup if necessary
   - Run data consistency checks
   - Communicate timeline and impact to users

3. **Root Cause Analysis**:
   - Preserve logs and metrics from failed deployment
   - Document timeline and decisions made
   - Update deployment procedures to prevent recurrence

### 24.5 Migration Governance and Approval

**Change Review Process**:

| Change Risk | Approval Required | Testing Requirements |
|-------------|------------------|---------------------|
| Low (add column) | Tech lead review | Unit tests + smoke test |
| Medium (modify constraints) | Team review + staging validation | Full integration suite |
| High (drop column/table) | Architecture review + rollback plan | Production-like testing |

**Documentation Requirements**:
- Migration impact assessment
- Rollback procedures
- Performance implications
- User communication plan (if applicable)
|----------|------|--------|-----------------|
| Headers | HSTS, CSP, X-Content-Type-Options, X-Frame-Options present | HTTP probe against running container | All headers present with configured values |
| Rate Limiting | OTP send > policy threshold | Repeated POST /api/otp/send | 429 with OTP_SEND_RATE_LIMIT + Retry-After |
| OTP Lockout | Exhaust attempts | Repeated wrong codes | 423 with OTP_LOCKED after max attempts |
| Concurrency | Parallel simulation runs >1 | Spawn 2 run requests | Second returns 429 SIMULATION_RATE_LIMIT |
| Engine Version | Run with stale engine_version | Simulate engine bump & run | 409 ENGINE_VERSION_MISMATCH |
| Authorization | Access another user's simulation | Force ID swap in token context | 403 FORBIDDEN or 404 SIMULATION_NOT_FOUND per policy |
| JWT Audience | Invalid aud claim | Forge token with wrong aud | 401 UNAUTHORIZED |
| Error Schema | Malformed request | Send invalid JSON | 400 VALIDATION_ERROR; schema matches Section 18.2 |
| Dependency Scan | pip-audit / npm audit | Tooling | No HIGH (fail otherwise) |
| CSP Violation Budget | Inject inline script in test page | Headless browser evaluation | Block execution; no 'unsafe-inline' |

Failures MUST block merge. New security-relevant endpoints MUST add at least one negative-path test here.
