---
date: 2025-09-16T00:00:00Z
researcher: automated-agent
branch: feature-update-privacy-policy
repository: simulation
topic: "Privacy Policy Consent Implementation Survey"
tags: [research, privacy-policy, consent, supabase, fastapi, react]
status: complete
---

# Research: Privacy Policy Consent Implementation

## Research Question

Identify all the current implementations related to the privacy policy consent in the codebase.

## Summary

The codebase implements a full privacy policy + consent subsystem spanning backend (FastAPI + Supabase) and frontend (React + custom routing). Core capabilities:

- Versioned, locale-aware privacy policy storage with single active (published) policy at a time.
- Admin CRUD + publish workflow enforcing publish-only via dedicated endpoint.
- Public retrieval endpoint with DB-first + static markdown fallback.
- Consent capture tied to a pre-auth whitelisting + OTP onboarding flow, stored per user hash (not user id) pre-login, with API upsert semantics to avoid duplicates.
- Frontend pre-auth flow gating (whitelist -> consent -> login) driven by live consent state fetched from backend each time (no local caching of consent flag) plus an admin UI for policy lifecycle.



## Code Map

### Backend (FastAPI)

File: `src/backend/api/routes.py`

- Admin Privacy Policy CRUD & publish
      - `create_privacy_policy` lines 89-118
      - `update_privacy_policy` lines 120-155
      - `delete_privacy_policy` lines 157-170
      - `publish_privacy_policy` lines 172-190
      - `list_privacy_policies` lines 192-203
      - `get_privacy_policy_admin` lines 205-213
- Public Policy Fetch
  - `get_privacy_policy` lines 253-315 (DB query + static fallback `docs/privacy-policy-ko.md` lines 287-315)
- Consent Management
  - `record_consent` lines 217-248
  - `get_user_consents` lines 250-263
- Supporting Admin Auth
  - `_assert_admin` lines 55-66 (used by admin endpoints)

File: `src/backend/models/schemas.py`

- Consent Schemas:
      - `ConsentRecordRequest` lines 70-75
      - `ConsentRecordResponse` lines 77-82
- Privacy Policy Schemas:
      - `PrivacyPolicyCreateRequest` lines 116-122
      - `PrivacyPolicyCreateResponse` lines 124-127
      - `PrivacyPolicyUpdateRequest` lines 129-136
      - `PrivacyPolicyUpdateResponse` lines 138-141
      - `PrivacyPolicyPublishResponse` lines 143-146
      - `PrivacyPolicy` lines 149-161
      - `PrivacyPolicyListResponse` lines 163-166
      - `PrivacyPolicyDetailResponse` lines 168-171

Migrations:

- `src/backend/migrations/create_privacy_policies_table.sql` lines 1-33 (table + triggers)
- `src/backend/migrations/create_consent_records_table.sql` lines 1-33 (table + RLS policies)

Static Fallback Asset (referenced):

- `docs/privacy-policy-ko.md` (referenced in `routes.py:get_privacy_policy` lines 287-295) – file presence assumed; content used if DB fails.

### Frontend (React / TypeScript)

File: `src/frontend/src/pages/ConsentPage.tsx`

- Component `ConsentPage` lines 21-205
      - Fetch policy (`fetchPrivacyPolicy`) lines 42-59
      - Record consent (`handleAccept`) lines 63-83 (calls `api.recordConsent` line 72)
      - Modal open state `privacyPolicyOpen` lines 33, 129, 169-195

File: `src/frontend/src/hooks/useConsentFlow.ts` lines 1-40

- Hook `useConsentFlow` lines 9-38
      - Backend check `api.getUserConsents` line 21
      - Gating logic lines 22-31 (redirect to `login` or `consent`)

File: `src/frontend/src/services/api.ts`

 (Consent + Policy section lines 377-640 excerpt)

- `getPrivacyPolicy` lines 377-393
- Admin:
      - `createPrivacyPolicy` lines 402-420
      - `updatePrivacyPolicy` lines 434-455
      - `publishPrivacyPolicy` lines 466-480
      - `listPrivacyPolicies` lines 490-500
      - `getPrivacyPolicyAdmin` lines 509-518
      - `deletePrivacyPolicy` lines 529-541
- Consent:
      - `recordConsent` lines 550-571 (payload includes `user_agent`)
      - `getUserConsents` lines 582-599

File: `src/frontend/src/pages/AdminPolicyPage.tsx`

- Admin / Public policy UX split:
      - Admin privilege detection lines 52-73
      - Policy list fetch lines 75-107
      - Public policy fetch (non-admin) lines 109-143
      - Create or Update handler `createOrUpdate` lines 145-175
      - Publish handler `publish` lines 177-190
      - Policy selection & load lines 217-254
      - Form fields / preview toggling lines 256-323

File: `src/frontend/src/types/types.ts`

- Consent Types lines 114-126
- Privacy Policy Types lines 132-169
- Page navigation type includes `"consent"` and `"admin-policy"` line 170

Dist bundle references (compiled) confirm runtime usage but are redundant for primary source mapping.

## Relationships & Interactions

### High-Level Component / API Relationships

1. Admin operations (frontend `AdminPolicyPage.tsx` lines 145-190, 217-254) -> backend admin endpoints (`routes.py` 89-190, 192-213) secured via JWT + `_assert_admin` (55-66).
2. Public policy fetch (unauthenticated) from `ConsentPage.tsx` lines 42-59 and non-admin branch of `AdminPolicyPage.tsx` lines 109-143 -> backend `get_privacy_policy` (253-315) with version/locale parameters.
3. Consent capture flow:
   - Pre-auth pages orchestrated by `useConsentFlow` (lines 9-38) calling `api.getUserConsents` (api.ts 582-599) -> backend `get_user_consents` (250-263) verifying whitelist membership, returning any existing consent records.
   - If absent, show `ConsentPage` which on accept calls `api.recordConsent` (550-571) -> backend `record_consent` (217-248) performing whitelist check, upsert, timestamping, IP/user-agent capture.
4. Version alignment: frontend stores `policyVersion` from backend response (ConsentPage lines 42-59 sets `policyVersion` line 46). This value is sent when recording consent (line 72) ensuring consent ties to specific policy version.
5. Policy publication model: Only one active published policy enforced semantically by backend publish endpoint (172-190) unpublishing others before setting target published.
6. Data fallback: If DB unreachable or no published policy, backend `get_privacy_policy` attempts static file (287-305) to preserve availability.

### Data Model Relationships

- `privacy_policies` table rows supply versioned content; only rows with `published=True` and matching `locale` are returned to public clients.
- `consent_records` logically should link user consent to a hash. NOTE: Migration schema defines `user_id` (lines 1-12 of consent migration) whereas runtime API writes `user_hash` (routes.py 228) -> potential discrepancy / technical debt (see Edge Cases / Unplanned Flows).
- `ConsentRecordRequest` design anticipates capturing `ip_address` + `user_agent`, but IP enrichment occurs server-side if omitted (routes.py 232-239).

### Sequence (Primary Consent Acquisition Flow)

1. User passes whitelist + OTP (outside scope but prerequisite) obtaining `user_hash`.
2. `useConsentFlow` queries backend consents.
3. Backend returns empty -> frontend sets page to `consent`.
4. User opens modal to view full policy (ConsentPage lines 169-195) fetched earlier.
5. User checks acknowledgment checkbox and clicks continue -> `api.recordConsent` -> `/api/consents` upsert.
6. On success `onAccept` transitions to login page (ConsentPage prop usage line 21 with handler passed from higher controller).
7. Subsequent `useConsentFlow` re-runs; finds consent record and advances to `login`.

### Admin Policy Lifecycle Sequence

1. Admin navigates to admin policy page -> verifies admin (lines 52-73) via `/api/admin/me`.
2. Policy list fetched (lines 75-107) via `/api/admin/privacy-policies`.
3. Admin selects existing or creates new (lines 217-254).
4. Admin edits and saves (lines 256-323) using POST/PATCH endpoints.
5. Admin publishes (lines 177-190) triggering backend publish logic (172-190) to mark single active policy.
6. Public fetch immediately reflects newly published policy on next request to `/api/privacy-policy`.

## Data Flow

### Backend Request/Response Flow (Consent Recording)
Client (ConsentPage) -> `POST /api/consents`:

- Input: `user_hash`, `consent_type="privacy_policy"`, `consent_version`, `user_agent`.
- Backend validates whitelist membership -> upsert into `consent_records` -> returns record including server timestamp `consent_given_at` and normalized IP.

### Backend Request/Response Flow (Policy Fetch)
Client -> `GET /api/privacy-policy?locale=ko-KR`:

- Query Supabase: published, locale match, order by effective_date desc then updated_at desc, limit 1.
- If result: return JSON with `version`, `last_updated`, `content`, `source="db"`.
- Else: read static markdown fallback; derive `last_updated` from file mtime; respond with `source="static-file"`.

### Cross-Layer Mapping

- Version consistency: `version` returned at fetch must match `consent_version` recorded later—ensures auditable linkage.
- Locale considerations: Consent currently does not store locale; potential gap if multi-locale policies introduced (only version stored in consent).

## UX Flows

### Main Intended UX Flows

1. Pre-Auth Onboarding Flow
   - States: whitelist -> consent -> login -> main
   - Triggered by `useConsentFlow` hook examining backend consents (lines 9-38).
2. Consent Page Interaction
   - Load policy (lines 42-59), view details (modal lines 169-195), acknowledge & submit (lines 63-83).
3. Admin Policy Management
   - View list, create/update, publish (AdminPolicyPage lines 145-190 & 217-323) with immediate feedback and preview toggle.
4. Public Read-Only Policy View (Non-Admin)
   - Read latest published policy (lines 109-143) with markdown rendering.

### Unplanned / Edge Case UX Flows

1. Policy / Consent Version Drift
   - If a new policy is published after a user previously consented, user path for re-consent is not explicitly enforced—`useConsentFlow` only checks existence of any `privacy_policy` consent, not version equality (hook lines 21-26). Potential gap for mandatory re-consent.
2. Missing Static Fallback
   - If DB fails AND static file missing, user gets 404 / error (routes.py 299-305) -> ConsentPage fallback content displays error message (lines 50-56). User can’t meaningfully consent to correct text.
3. Migration vs Runtime Field Mismatch
   - Migration table expects `user_id` FK; runtime code uses `user_hash`. This could cause insertion failure unless table was altered manually outside migration or Supabase has an alternate table definition. Risk of silent failure or 500 errors at `record_consent`.
4. Multiple Published Policies Race
   - Publish endpoint unpublishes others (172-182) without transactional guard; race conditions with concurrent publish requests could allow brief overlap or final state inconsistent if failure mid-way.
5. Locale Version Ambiguity
   - User consent does not record locale; if differing locale versions exist, audit may not prove which localized content user saw.
6. Upsert Overwrite
   - Upsert overwrites existing consent row for same user hash & (implied) unique key; absence of explicit unique constraint in migration (consent hash + type) prevents guaranteed idempotence unless configured externally.
7. Admin Editing Published Content
   - Admin can edit unpublished drafts freely, but cannot toggle `published` via update (guard lines 131-134). However, editing content of a previously published policy after unpublishing then re-publishing a different version might require migration-level archival for audit (currently only version & content snapshot stored).

### Additional Potential Flows (Not Implemented)

- Forced re-consent when `privacy_policies.version` changes (missing hook logic to compare stored consent version vs current version).
- Version selection UI for user to view historical policies (only current published accessible publicly now).