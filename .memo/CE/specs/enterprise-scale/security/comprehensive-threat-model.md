# Comprehensive Security & Threat Model (Enterprise Scale)

*Extracted from myapp_SSD.md - Section 17*  
*Target: 10,000+ users or public-facing applications*

## 17.1 Scope & Objectives

This appendix formalizes (a) threat model, (b) security controls, (c) service level objectives (SLOs), (d) rate limits, (e) logging & monitoring, (f) data retention. It reflects 2025 best practice for a small internal PWA (60–100 users; peak 30–60) using Supabase + FastAPI + Cloudflare Tunnel.

## 17.2 Assets (Ranked by Sensitivity)

1. Authentication tokens (Supabase JWT).
2. OTP codes (transient) / phone numbers (PII) – NOTE: only hashed OTP stored; phone stored in `phone_otps`.
3. User onboarding status (`user_onboarding` row: whitelist_passed, otp_verified, consent_version).
4. Simulation definitions & results (`simulations`).
5. Admin capabilities (publish/unpublish policies, create notices).
6. Privacy policy content (integrity concern).
7. Infrastructure secrets (Supabase service key, Solapi API keys).
8. user_hash (pseudo-identifier linking pre-auth actions).

## 17.3 Actors

| Actor | Description | Trust Level |
|-------|-------------|-------------|
| End User | Whitelisted internal participant | Low → Elevated post-auth |
| Admin User | User with admin entry in `admins` | Medium (requires server-side verification each request) |
| Attacker (External) | Unauthenticated internet client | None |
| Attacker (Internal) | Whitelisted but malicious | Low (after auth) |
| Supabase | Managed backend (DB/Auth) | High (trusted service) |
| SMS Provider (Solapi) | OTP delivery channel | Medium (assumed correct delivery, not trusted with system auth) |
| Cloudflare Tunnel | Exposure layer for frontend/backend | Medium (network edge) |
| Build / CI System | Produces container images | High (supply chain) |

## 17.4 Trust Boundaries

1. Browser ↔ Backend API (HTTPS, JWT boundary).
2. Backend ↔ Supabase REST/RPC (service key boundary).
3. Backend ↔ SMS Provider (outbound HTTP with API key).
4. Admin UI actions ↔ Admin authorization (table lookup each request).
5. Pre-auth context (user_hash only) ↔ Authenticated context (user_id mapping at onboarding link).

## 17.5 Attack Surface (Key Endpoints / Vectors)

| Surface | Risks | Core Mitigations |
|---------|------|------------------|
| /api/otp/send | Enumeration (phone discovery), abuse (SMS flooding) | Hash whitelist; generic responses; strict rate limits; IP + phone counters |
| /api/otp/verify | Brute force guessing | Attempt counter; lockout; constant-time hash compare; rate limiting |
| /api/onboarding/link | Unauthorized linking / replay | Require valid JWT; idempotent upsert; audit log (planned) |
| /api/admin/* | Privilege escalation | Server-side admin check (not client claim); deny by default; per-action audit |
| /api/simulation/run | Resource exhaustion | User-level rate limit; max rounds constraint; sane defaults |
| JWT Validation | Forged tokens / key rotation lag | Supabase JWKS fetch with caching & TTL; kid verification; audience & issuer checks |
| Cloudflare Tunnel | Exposure config drift | Restrict origins; CORS allowlist; infra change review |
| Dependency Chain | Supply chain | Pin versions; weekly vulnerability scan; lockfile integrity |

## 17.6 Threat Enumeration (STRIDE Summary)

| Category | Example Threat | Impact | Mitigation |
|----------|---------------|--------|-----------|
| Spoofing | Forged admin JWT | Unauthorized admin actions | JWKS signature check + admin table verification |
| Tampering | Modify simulation results | Incorrect analytics | Results regeneration on input change; restrict update fields |
| Repudiation | Admin denies publishing policy | Lack of accountability | Add audit log (timestamp, admin user_id, policy_id) (Planned) |
| Information Disclosure | OTP code leakage in logs | Account takeover | Never log raw codes; store hashed; redact phone except last 2 digits |
| Denial of Service | OTP flood or simulation spam | Service degradation | Layered rate limits, concurrency cap per user, exponential backoff |
| Elevation of Privilege | Normal user hits admin route | Unauthorized access | Centralized dependency `is_admin(user_id)` check each request |

## 17.7 Security Controls (Current vs Planned)

| Control | Status | Notes |
|---------|--------|-------|
| JWT (RS256) validation via JWKS | Implemented | Cache keys (TTL 5–15m) |
| RLS on user-owned tables | MUST (release blocker) | Enforce before production launch; target: before production deployment (sprint+1) |
| Admin server-side check | Implemented | Table lookup each request |
| OTP hashing (HMAC-SHA256) | MUST (release blocker) | Implement HMAC-based OTP storage & verification; target: sprint+1 cutover with dual-version validation |

**NOTE:** The two items above (RLS and OTP HMAC) are considered release blockers for production. Implementation MUST be completed and validated in staging before promotion. A minimal test matrix (RLS policy verification, OTP code lifecycle, and rate-limit behavior) MUST be added to CI.

| Rate limiting (OTP send/verify) | Partial | Add per-IP dimension + sliding window |
| Secrets in environment (vault) | Planned | Currently .env in container build context |
| Structured logging (JSON) | Planned | Add trace_id per request |
| Audit logging (admin & onboarding link) | Planned | Append-only table |
| Dependency vulnerability scanning | Planned | Enable GitHub Dependabot / pip-audit weekly |

## 17.8 Service Level Objectives (SLOs)

| Dimension | Target | Measurement | Rationale |
|----------|--------|-------------|-----------|
| API CRUD latency (non-simulation) | p50 < 300ms, p95 < 800ms | From backend timing logs | Internal user responsiveness |
| Simulation run (≤ 500 rounds) | p95 < 2s | Timed endpoint | User feedback threshold |
| Availability (Core API set) | Monthly 99.5% | (Total time - error/outage) / total | Internal stage tolerance |
| OTP send success | > 98% | Count success / attempts | Reliability of onboarding |
| Error rate (5xx) | < 1% of requests | Log aggregation | Stability indicator |
| Policy publish propagation | < 5s | Time diff publish -> visible | Cache invalidation correctness |

Error Budget: 0.5% monthly unavailability; if consumed > 50% mid-period, freeze feature deployment until budget recovers.

## 17.9 Rate Limits (Enforced / Planned)

The service MUST enforce the following rate limits. Where Status is "Planned" the control MUST be implemented before production readiness. Breaches MUST yield the specified error condition and SHOULD include a `Retry-After` header when a retry window is defined.

| Endpoint Group | Limit | Window | Scope Keys | Action on Breach | Status |
|----------------|-------|--------|------------|------------------|--------|
| OTP Send | 3 | 15 min | phone+IP | 429 + generic cooldown msg | Enforce now |
| OTP Send | 10 | 24 h | phone | 429; require manual support | Planned |
| OTP Verify | 6 | 15 min | phone | Lock OTP; require resend | Enforce now |
| OTP Verify | 15 | 24 h | phone | Throttle (fixed 60s delay) | Planned |
| Onboarding Link | 10 | 1 h | user_id | 429 | Planned |
| Simulation Run | 30 | 10 min | user_id | 429; suggest adjust rounds | Planned |
| Admin Policy Publish | 5 | 1 h | admin user_id | 429; log security event | Planned |
| Notices Create | 10 | 1 h | admin user_id | 429 | Planned |

Rate Limit Implementation Guidance: Implementation MUST use an in-memory token bucket (fast path) with a persistent (Supabase) fallback for sliding window accuracy. A `Retry-After` header MUST be returned for OTP send, OTP verify, and simulation run throttles. Limits SHOULD be configurable via environment variables with sane defaults.

## 17.10 Logging & Monitoring

| Aspect | Spec |
|--------|------|
| Log Format | JSON lines (timestamp, level, trace_id, user_id?, route, latency_ms, outcome_code) |
| Redaction | Mask phone (show last 2 digits), never log OTP code, redact Authorization header |
| Trace Correlation | Generate trace_id per request; propagate to downstream calls (Supabase via custom header if supported) |
| Metrics | request_count{route,status}; latency_histogram_ms; otp_send_attempts; otp_verify_failures; simulation_run_latency_ms; policy_publish_count; admin_action_count |
| Alerts | >5 consecutive OTP send failures (provider outage); p95 latency > target for 15m; 5xx rate >1% over 5m; unusual admin publish burst (>3 in 5m) |
| Dashboard | Onboarding funnel (verify → otp → consent → link → first simulation) |

- Logs MUST redact phone numbers except last 2 digits.
- Logs MUST NOT include raw OTP codes or Authorization headers.
- Each request MUST include a generated `trace_id` for correlation.
- Alert thresholds listed MUST trigger an operational notification.

## 17.11 Key & Secret Management

| Secret | Rotation Policy | Storage (Current) | Migration Plan |
|--------|-----------------|-------------------|----------------|
| Supabase service key | 90 days | .env | Move to managed secret store (e.g., GitHub Actions secrets + runtime injection) |
| Solapi API key | 180 days | .env | Same as above |
| OTP HMAC secret | 180 days (stagger) | .env | Use versioned secret; store secret_version in OTP rows |
| JWKS cache | 5–15 min refresh | Memory | Maintain fallback old key set for grace period |

- Secrets MUST NOT be committed to source control.
- Rotation intervals MUST be documented and scheduled.
- OTP HMAC secret MUST rotate at least every 180 days with overlap permitting validation of codes from the previous version for ≤5 minutes.

## 17.12 Data Retention & Purge

The following retention windows are mandatory; the system MUST implement automated purge for any time-bounded data. Permanent tables MUST NOT be purged except through explicit administrative archival procedures.

| Table | Retention | Purge Mechanism | Rationale |
|-------|-----------|----------------|-----------|
| phone_otps | 24h after expires_at | Daily job (DELETE) | Minimize PII exposure |
| consent_records | Indefinite (legal) | None (export on request) | Compliance trail |
| simulations | Active lifetime | User delete → hard delete (internal stage) | No legal retention requirement yet |
| user_onboarding | Until account deletion | Cascade on user removal | Re-link not required post-delete |
| notices / privacy_policies | Permanent | Never purge (archiving) | Historical reference |
| logs (app) | 30 days | Rolling retention in log store | Cost + internal needs |

- `phone_otps` rows MUST be deleted within 24h after `expires_at`.
- `logs` MUST be pruned to maintain ≤ 30 rolling days.
- Planned audit tables MUST honor specified retention (admin: 1 year; user events: 6 months).
- Purge jobs SHOULD emit a summary metric (purged_row_count).

### Privacy compliance note
The service follows a privacy-by-design posture: only collect the minimal PII required (phone E.164 and last-4 masking when possible), store transient OTP data for a maximum of 24 hours after expiry, and keep consent records as a legal audit trail. A documented Subject Access / Data Deletion process (DSAR) will be provided to product and legal teams and implemented as an administrative workflow (export + deletion) prior to production launch.

### CI / Contract test checklist (minimal)

The following checks MUST run in CI for every main/staging merge before production promotion:

- OpenAPI snapshot diff: regenerate `docs/api/openapi.snapshot.json` and fail CI on contract drift.
- Spectral (or equivalent) lint: run OpenAPI linting and fail on policy violations for error codes and response schemas.
- Security header smoke: basic HTTP check that core endpoints include HSTS and CSP response headers.
- Accessibility smoke: run a simple axe-core scan against a small set of critical pages (OTPPage, LoginPage, SimulationList) and fail on any critical violations.

## 17.13 Validation & Input Constraints (Security-Relevant Subset)

| Field | Constraint | Security Reason |
|-------|-----------|-----------------|
| phone_number | E.164, length 10–15 | Prevent injection / storage bloat |
| otp_code | 6 digits numeric | Uniform entropy; reject formatting variance |
| plan_id | Enum (A,B,C,D,K,P,R,F,E) | Prevent arbitrary plan execution |
| simulation_rounds | 1–1000 | Prevent CPU abuse |
| memo | ≤ 1000 chars UTF-8 | Avoid oversized payloads |

- All listed constraints MUST be enforced server-side; frontend validation is advisory.
- Violations MUST yield `VALIDATION_ERROR` with field-level detail where feasible.

## 17.14 Operational Security Procedures

| Procedure | Trigger | Action |
|-----------|--------|--------|
| Key Rotation | Scheduled (90d) | Generate new key, deploy, revoke old after 24h overlap |
| OTP Abuse Spike | > 20 send failures (distinct phones) in 5m | Temporarily tighten rate limits & alert |
| Policy Publish | New version published | Invalidate cache; log audit record |
| Security Incident (P1) | Confirmed data exposure | Revoke tokens, rotate keys, notify stakeholders, post-mortem in 72h |

- A confirmed P1 incident MUST trigger token revocation and key rotation within 60 minutes.
- A post-mortem MUST be published internally within 72 hours.

## 17.15 Acceptance / Verification

| Control | Verification Method |
|---------|--------------------|
| Rate Limits | Automated test hitting boundary; expect 429 and Retry-After |
| OTP Hashing | Confirm no raw code persisted (DB inspection) |
| Logging Redaction | Sample logs: ensure masked phone & no secrets |
| RLS Enforcement | Attempt cross-user simulation fetch → 0 rows |
| Latency SLO | Weekly report summarizing p50/p95 vs targets |

## 17.16 Security Headers & CSP Baseline

| Header | Value / Pattern | Rationale |
|--------|-----------------|-----------|
| Content-Security-Policy | default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; font-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' | Mitigate XSS; restrict external origins (temporary relax inline/eval) |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-Frame-Options | DENY | Clickjacking defense |
| Referrer-Policy | strict-origin-when-cross-origin | Reduce leaking path info |
| Permissions-Policy | geolocation=(), microphone=(), camera=(), payment=() | Least privilege |
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload | Enforce long-term HTTPS |
| Cross-Origin-Embedder-Policy | require-corp | Future isolation for advanced features |
| Cross-Origin-Opener-Policy | same-origin | Prevent cross-window interference |
| Cross-Origin-Resource-Policy | same-origin | Prevent resource embedding leaks |

**Validation:**
- Middleware `security_headers_mw` MUST inject headers; startup self-test MUST fetch root & assert presence.
- Playwright smoke validates CSP presence & denies inline script removed test (future when hashes in place).
- Report-Only CSP phase (2 weeks) logging violations to console (future endpoint) before strict mode.

**Debt / Follow-up:**
- Remove 'unsafe-inline' & 'unsafe-eval' by introducing build-time hashed scripts (target: within 2 sprints).
- Evaluate need for blob: after refactoring workers.

**Incident Triggers:**
- Missing HSTS or CSP for >5m on prod MUST alert ops channel
- CSP violation spike (>50/day) MUST open investigation ticket

- All non-health responses MUST include the listed security headers.
- CSP MUST transition from Report-Only to Enforce after violation rate remains below threshold for 14 consecutive days.
- 'unsafe-inline' and 'unsafe-eval' MUST be removed by the target deprecation date; extensions require explicit approval.
