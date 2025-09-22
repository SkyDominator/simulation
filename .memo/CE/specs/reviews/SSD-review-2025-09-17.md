# SSD Review – 2025-09-17

Source SSD: `/.memo/CE/specs/SSD.md` (v0.2.0)  
Scope of this review: Two sections requested by author – (1) Implementation vs SSD Gap Analysis, (2) Edge Cases to Handle.

---
## 1. Implementation vs SSD – Gap Analysis

| Area | SSD Expectation | Current Implementation | Gap / Impact | Recommended Action | Priority |
|------|-----------------|------------------------|--------------|--------------------|----------|
| Privacy Policy Retrieval | DB is sole source of truth; no static fallback | Endpoint still attempts static markdown fallback when DB query fails | Divergence risks serving outdated content; compliance risk | Remove static fallback; return 404 or explicit error if no published policy | High |
| Consent Enforcement | All protected endpoints enforce latest-policy consent (423 on missing) | No consent middleware; protected routes ignore consent | Users bypass consent; policy updates not enforced | Implement consent middleware + status cache | High |
| Consent Endpoints | `/api/user/consent-status`, `/api/user/consents (POST)`, `/api/user/link-consent` | None exist | Cannot link pre-auth consent to user; frontend must guess | Add endpoints + service module | High |
| Consent Record Linking | Store both `user_hash` and `user_id`; link post-auth | Only pre-auth `/api/consents` with `user_hash` | Incomplete audit trail; re-consent logic impossible | Add linking logic & migration/backfill script | High |
| Error Model | Structured `{ error: { code, message, details } }` with 423/429, etc. | Ad-hoc FastAPI exceptions; OTP responses use success flag; rate limit returns 200 | Inconsistent client handling; harder internationalization & telemetry | Centralize error factory + exception handlers; map to spec codes | Medium |
| OTP Attempt Limits | 6 verify attempts per code; 3 sends / 15m; proper HTTP codes (429) | Send limit (3) enforced; verify attempts default 3; returns 200 with success=false | Weaker brute-force resistance; ambiguous rate-limit semantics | Increase `otp_max_verification_attempts` to 6; return 429 on rate-limit; adjust responses | Medium |
| OTP Daily Limit | Optional but spec implies early basic rate limiting | Daily limit commented out | Potential abuse via many daily sends | Re-enable daily limit (configurable) | Low |
| Simulations List Empty | Return empty array gracefully | Returns 404 when none | Breaks typical REST contract; complicates UI edge handling | Return `[]` with 200 | Medium |
| Admin Publish Side-Effects | Publish triggers consent invalidation (subsequent 423) | Only unpublishes others; no consent cascade | Existing sessions not forced to re-consent | Middleware will inherently cover if implemented; optionally broadcast event | Medium |
| Policy Version Cache | Cached latest version for fast consent check | No cache; every request queries DB | Performance overhead as usage grows | Add in-process cache with TTL + manual bust on publish | Low (current scale) |
| RLS & Security Hooks | RLS assumed; consent middleware in auth chain | JWT check only (details of jwt module not reviewed) | Missing layered defense for consent | Add middleware; verify RLS separately | High |
| Response Uniformity | Success + error shapes consistent | Mixed shapes (simulation, OTP, notices differ) | Harder generic error handling in frontend | Incremental refactor after consent middleware | Low |
| Testing Coverage | Pytest + Vitest baseline, critical paths | Little/no implemented tests | Risk of regressions adding consent logic | Add minimal unit & integration tests for new consent + OTP + simulation | High |
| Performance Instrumentation | p95 targets defined; basic telemetry advised | No timing or metrics instrumentation | Blind to latency regressions | Add simple logging/timing decorator first | Low |
| Backfill / Migration Scripts | Link historical consent on rollout | None present | Historical records orphaned | Prepare one-off link script | Medium |
| Simulation Concurrency | Optional optimistic concurrency used where relevant | Run endpoint supports `expected_updated_at`; others ignore | Acceptable (spec not strict here) | No action | — |
| Error Codes (OTP) | 429 for rate limit, 400 for invalid, 400/410 for expired | All merged into success=false 200 | Harder for frontend to branch logic | Adopt structured codes; preserve backward compatibility temporarily | Medium |
| Publish Rollback | Admin can republish older version; system handles gracefully | Mechanism present (unpublish others) | No explicit rollback/testing harness | Add test to confirm re-consent logic | Low |

### Summary of Critical Gaps
1. Missing consent enforcement & related endpoints.
2. Incorrect privacy policy fallback behavior.
3. Lack of structured error/response model & OTP spec alignment.
4. Absence of tests before adding compliance logic.

---
## 2. Edge Cases to Handle

| Edge Case | Scenario Details | Risk if Unhandled | Mitigation Strategy |
|-----------|------------------|-------------------|---------------------|
| No Published Policy Yet | First deployment before policy created | Middleware could block all progress or serve fallback (non-compliant) | Allow whitelist/OTP + admin policy endpoints to bypass until first publish OR return explicit `POLICY_UNAVAILABLE` with guidance |
| Policy Published Mid-Session | User active when new version published | User continues without re-consent | Middleware checks latest version on each protected request; first subsequent call returns 423 |
| Rapid Successive Publishes | Admin mistakenly double-publishes versions | Consent churn; users stuck in loop | Debounce publish (require draft status) or log audit and only enforce last version |
| Stale Version Cache | Cached latest version after a publish event | Users erroneously blocked or allowed | Cache bust explicitly inside publish endpoint; fallback to short TTL |
| Missing/Corrupt Consent Record | DB inconsistency or partial failure | Users locked out incorrectly | Treat missing record as not consented; allow re-record; log anomaly |
| Duplicate Consent Submission | User double-clicks accept | Integrity violation or 500 on unique constraint | Use upsert-on (user_id, type, version) or catch uniqueness error and treat as success |
| Whitelist Hash Collision (extremely unlikely) | Different users produce same SHA256 hash | Cross-user consent leakage | Accept negligible risk; if critical switch to HMAC(name-phone) with server secret |
| OTP Race Conditions | Multiple OTP requests before previous DB update finishes | Older valid code lingering | Invalidate previous unused codes before insert (already implemented) |
| OTP Clock Skew | Server time vs expected expiration | Premature expiry or extended validity | Use single trusted server time (already) and short buffer (<5s) if user-facing messaging |
| OTP Attempt Counter Desync | Failure during increment | Attempts not persisted, more brute force tries | Wrap increment in atomic update; if partial failure treat as fail + log |
| Simulation Run After Inputs Update | User updates plan while running simulation concurrently | Stale results or confusing concurrency errors | Use optimistic `expected_updated_at` (already) and clear results on update (done) |
| Empty Simulation List | New user sees 404 | Poor UX; frontend error path | Return 200 with empty list |
| Consent Linking After Login | User logs in before linking pre-auth consent | Future enforcement wrongly demands duplicate consent | Provide `/api/user/link-consent` early post-auth; idempotent |
| Orphaned Pre-auth Consents | User never logs in | Data clutter | Periodic cleanup job (age-based) optional (future) |
| Admin Deletes Published Policy | System left with zero policy | Users blocked unexpectedly | Prevent delete of currently published OR force publish of another version first |
| Publish Without Effective Date | Missing date semantics | Ambiguity in audits | Default effective_date = publish date if null |
| Large Privacy Policy Content | Very large markdown payload | Latency / size issues | Enforce size threshold & compress over CDN (future) |
| SMS Provider Outage | Solapi fails to send OTP | Onboarding stall | Fail fast with clear message; allow retry; optionally switch provider (future multi-provider) |
| Network Intermittency During Consent | Request times out after user accepts | User believes accepted but server missing record | Frontend refetch `/api/user/consent-status` after success; show confirmation state |
| Replay of Old JWT After Consent Revocation (future scenario) | Edge if future revocation logic appears | Unauthorized access continuation | Not in current scope; would need revocation list or short JWT TTL |
| Privacy Policy Locale Expansion | Future locales added | Hard-coded locale fallback breaks | Normalize locale, default `ko-KR` server-side; ensure unique(version, locale) | 
| High Latency Supabase Moment | Spike in DB response times | User perceives app down | Health endpoint + exponential backoff; graceful degraded messaging |
| Partial Migration Rollout | Code expects new columns before migration | Runtime errors | Guard new fields; feature flag consent enforcement until migration confirmed |

### Priority Edge Cases (Address Early)
- No published policy
- Mid-session policy publish
- Stale version cache
- Duplicate consent submission
- OTP race & attempt consistency

---
## 3. Recommended Immediate Action Set (Concise)
1. Implement consent service + middleware + endpoints (status, record (auth), link) and integrate.
2. Remove privacy policy static fallback.
3. Return empty list (200) for `/api/simulations` when no rows.
4. Standardize error envelope + adopt 423/429 paths (introduce without breaking existing responses—transitional period).
5. Adjust OTP attempt limit to 6 & map rate limit to HTTP 429.
6. Add unit tests (consent logic, OTP limits, publish workflow, simulation list empty).

---
## 4. Notes
- Keep changes backward compatible where frontend currently expects `success: false` pattern—introduce error envelope behind feature flag (e.g., `X-Error-Envelope: 1`).
- Add a small in-memory cache (structure: `{version:str, fetched_at:float}`) invalidated on publish.
- Document migration steps before deploying consent enforcement to production.

---
Reviewer: Automated assistant audit (internal).  
Next Review Due: 2025-09-24 or after consent middleware PR merged.
