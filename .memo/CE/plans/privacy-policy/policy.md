# Privacy Policy Consent Flow Implementation / Update Plan

## Overview

Implement and align the privacy policy & consent system with the SSD (v0.2.0, 2025-09-09). Replace any static fallback usage for primary flows, add authenticated consent + enforcement (423 Locked) middleware, unify pre-auth and post-auth consent records, and ensure version-based re-consent when a new policy is published.

## Current State Summary (From Research Snapshot)

- Pre-auth consent implemented (user_hash based) with `/api/consents` and `/api/consents/{user_hash}`.
- Privacy policy CRUD + publish endpoints exist; public fetch endpoint still has static markdown fallback.
- No authenticated endpoints for: `GET /api/user/consent-status`, `POST /api/user/consents`.
- No middleware enforcing latest consent (no 423 responses) across protected endpoints.
- Frontend flow: `useConsentFlow` only checks existence (not version) of any `privacy_policy` consent; no handling of re-consent after version update; ConsentPage only supports pre-auth (user_hash) flow.
- `consent_records` stores only `user_hash`, lacks `user_id` linkage mandated by SSD for post-auth linking; enforcement logic absent.

## SSD Feature Requirements Mapping & Gaps

| SSD Section | Requirement | Current State | Gap / Action |
|-------------|------------|---------------|--------------|
| 6 Data Models | `consent_records` includes `user_hash`, `user_id`, `consent_type`, `consent_version`, timestamps & metadata | Only `user_hash` path used; `user_id` path not implemented (schema in DB uncertain) | Add `user_id` column if missing; extend API to write both pre & post auth; add linking logic |
| 7 Security | Consent enforcement middleware returning 423 if latest not consented | Missing | Implement middleware applied to all authenticated routes |
| 8.2 Privacy Policy & Consent | Endpoints: GET /api/privacy-policy, POST /api/consents, GET /api/consents/{user_hash}, GET /api/user/consent-status, POST /api/user/consents | Last two missing | Implement two authenticated endpoints |
| 8.2 | Zero grace period re-consent on update | Not enforced | Compare user consent_version vs latest published version in middleware |
| 8.2 | Post-auth consent recording with user_id | Missing | Add endpoint + persistence |
| 8.2 | Force redirect via 423 Locked | Missing | Add standardized error body |
| 9 API Contracts | Standard response shapes | Partially divergent (static fallback adds `source`) | Align contracts; allow `source` but primary path DB |
| 13.2 ConsentPage Multi-context | Single component handles pre-auth & authenticated contexts | Current component only handles pre-auth user_hash | Refactor component to support authenticated flow & resume context |
| 13.3 423 Handling | Frontend redirects on 423 to consent | No 423 generated yet | Add global fetch intercept & controller logic |
| 23 Workflow | Admin publish triggers immediate enforcement | Not currently enforced | Hook publish action -> nothing needed backend beyond middleware reading latest |
| Static fallback removal | SSD states "No optional static fallback" in architecture | Static file fallback remains | Remove fallback or restrict to emergency (NEED_VERIFICATION) |

## Design Decisions & Clarifications

1. Static fallback removal: Remove fallback entirely (DB is sole source of truth).
2. Re-consent strategy on publish: immediate; user must be blocked with 423 until consenting. Implement single middleware query per request with in-memory + short TTL cache for latest published policy version to reduce DB load.
3. Linking pre-auth consent to authenticated user: On first authenticated request after login (or during consent-status check), backfill existing consent row by setting `user_id` where `user_hash` matches and `user_id` is NULL.
4. Upsert semantics: Insert-only model (one row per user per version); retain full audit history.
5. Locale handling: SSD current scope ko-KR only; omit locale in consent record; future extension may add locale column. Accept current minimal approach.

## Implementation Phases

### Phase 1: Database & Migration Adjustments

Tasks:

- Verify existing `consent_records` table structure; ensure `user_id` column present (already in production schema) and nullable.
- Add composite unique constraint `(user_hash, consent_type, consent_version)` (and optionally `(user_id, consent_type, consent_version)` to prevent duplicates after linking).
- Create index on `(user_id, consent_type, consent_version)` for post-auth lookups.
- Remove or deprecate any triggers conflicting with multi-version storage (none currently).

Artifacts:

- New migration: `migrations/alter_consent_records_constraints.sql` to add unique constraints/indexes.

### Phase 2: Backend Middleware & Utilities

Tasks:

- Implement `consent_enforcer.py` with dependency that:
  1. Fetches latest published policy version (cache 60s in-memory).
  2. Queries `consent_records` for either matching `user_id` OR (fallback) existing user_hash link (if linking not yet applied) with same latest version.
  3. If missing, raise HTTPException 423 with body per SSD spec.
- Apply dependency to all protected simulation/admin endpoints (wrap router include or dependency list). Ensure health & privacy-policy endpoints excluded.
- Provide utility function `get_latest_privacy_policy_version()` centralizing query & caching.

Edge Cases:

- If no published policy exists: block progression beyond whitelist; surface explicit error to user; log critical alert.

### Phase 3: New Authenticated Endpoints

Endpoints:

1. `GET /api/user/consent-status` (auth)

  Returns: `{ requires_consent: bool, latest_version: str, user_consented_version?: str }`

  Logic: Determine latest version; fetch user latest consent_version; compare.

1. `POST /api/user/consents` (auth)

  Body: `{ consent_type: 'privacy_policy', consent_version: string }`

  Behavior: Inserts new consent row with user_id (and optionally user_hash if can be resolved). Do not upsert—insert new record.

  Returns: record snapshot with timestamp.

Linking Logic:

- Provide explicit endpoint `POST /api/user/link-consent { user_hash }` (auth) to associate pre-auth records to user_id (one-time per login as needed). `GET /api/user/consent-status` does not implicitly link.

### Phase 4: Adjust Existing Consent Endpoints

Changes:

- Modify `/api/consents` pre-auth route to INSERT (not upsert) unless duplicate (same user_hash, type, version) exists; return existing on conflict.
- Ensure it does not overwrite prior versions.
- Keep `/api/consents/{user_hash}` unchanged except ordering results by `consent_given_at` desc.

### Phase 5: Remove Static Fallback (or Gate It)

Options:

Remove static fallback code entirely (chosen). DB outage will surface error; users blocked until restored.

Implementation:

- Delete static-file branch in `get_privacy_policy` (no feature flag required per decision).

### Phase 6: Frontend Updates

Tasks:

- Update `ConsentPage` to support both contexts (preauth/auth):
  - Accept props: `mode: 'preauth' | 'auth'`, `userHash?`, `onComplete()`.
  - If `auth` mode: call authenticated endpoints (need new `api.postUserConsent`).
- Create new API methods:
  - `getUserConsentStatus()` -> `/api/user/consent-status`.
  - `postUserConsent(consent_version)` -> `/api/user/consents`.
- Add global fetch interceptor (wrapper) to detect 423 status and redirect to consent flow, preserving intended route / action state (store in e.g. `sessionStorage.pendingAction`).
- Enhance `useConsentFlow` logic:
  - Pre-auth flow unchanged except now also check version equality once we expose latest version pre-auth (GET policy returns it; consider adding `/api/privacy-policy` call).
  - Authenticated path: On app init call `getUserConsentStatus`; if `requires_consent`, route to consent page in `auth` mode.
- Provide re-consent UX trigger if version mismatch mid-session via 423 response.

### Phase 7: Testing Strategy Additions

Backend Tests:

- Middleware returns 423 when user missing latest consent version.
- New endpoints contract tests.
- Publishing a new policy triggers 423 for previously consented user.
- Multiple consent versions stored; history intact.

Frontend Tests (Vitest + RTL):

- ConsentPage auth mode submission calls authenticated endpoint.
- 423 response triggers navigation to consent page and after accepting returns.
- Version mismatch prompts re-consent.

### Phase 8: Performance & Caching

- Cache latest policy version (key: `latest_policy_version`) with TTL 60s; warm on first access.
- Use ETag / If-None-Match for `/api/privacy-policy` (optional improvement). Defer if time.

### Phase 9: Documentation & Migration Notes

- Update `docs/README.md` or dedicated `pwa_distribution_guide.md` with new consent enforcement description.
- Add admin note: publishing policy immediately revokes access until re-consent.
- Provide rollback guidance: re-publish previous version; middleware will accept prior consents again.

## Detailed Task Checklist

Backend:

- [ ] Migration for consent_records (add unique constraints & indexes)
- [ ] Add consent enforcement middleware
- [ ] Implement `/api/user/consent-status`
- [ ] Implement `/api/user/consents`
- [ ] Adjust `/api/consents` to insert not overwrite
- [ ] Remove static fallback (delete code path & file reference)
- [ ] Add version caching utility
- [ ] Add tests (unit + integration) for middleware & endpoints

Frontend:

- [ ] Extend API service (new methods + 423 handling wrapper)
- [ ] Refactor ConsentPage multi-context
- [ ] Add authenticated consent flow integration
- [ ] Add re-consent handling on 423
- [ ] Update useConsentFlow for version checks
- [ ] Add tests for consent flows & 423 redirect

Docs & Ops:

- [ ] Update documentation for new endpoints & flow (including link-consent)
- [ ] Provide migration runbook & rollback steps

## Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Removing static fallback could block users during DB outage | Medium | Keep feature flag to re-enable fallback quickly |
| Incorrect middleware scope locks out users (false positives) | High | Add health log & bypass if latest version query fails |
| Race condition publishing policy while users consenting | Low | Use transaction or at least sequential updates; treat version fetch as authoritative |
| Duplicate consent records causing confusion | Low | Unique constraint per (user_hash,user_id,consent_type,consent_version) |
| Lost linking between user_hash and user_id | Medium | Add explicit linking endpoint if needed NEED_VERIFICATION |

## Open Items Remaining (No further verification needed for resolved decisions)

All previously flagged NEED_VERIFICATION points in this plan have been resolved per decision log. No outstanding ambiguities.

## Acceptance Criteria (Derived)

- Authenticated users accessing protected endpoints without latest consent receive 423 with `CONSENT_REQUIRED` body.
- Publishing new privacy policy forces all subsequent protected calls for users with old consent version to return 423 until they consent again.
- Pre-auth and post-auth consents recorded separately but both preserved with version history.
- Consent linking ensures a user's previous pre-auth consent is associated with authenticated identity (if mapping provided).
- Static fallback no longer used in normal operation (unless feature flag enabled) aligning with SSD statement.

## Rollback Plan

- Disable middleware (feature flag) to restore access if systemic issue.
- Re-publish prior policy version to restore previous consent validity.
- Re-enable static fallback (if implemented) for temporary reading of policy text during DB issues.
- Database: revert migration adding user_id (column can remain nullable; safe rollback by ignoring usage).

## Next Steps

Proceed with Phase 1 migration creation after verifying current DB schema (export or describe). Then iterate phases sequentially; middleware can be feature-flagged until frontend changes deployed.
