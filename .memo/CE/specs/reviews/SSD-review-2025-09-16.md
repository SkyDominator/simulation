# SSD Review – 2025-09-16

Scope: Format Consistency & Content Consistency across `.memo/CE/specs/SSD.md` and `.memo/CE/specs/schema/schema.md` after recent privacy policy consent feature additions.

## Summary

Overall the SSD is well-structured and internally consistent in most sections. A few inconsistencies, residual mismatches, and improvement opportunities were identified—particularly around the consent feature flow alignment and schema representation. No blocking contradictions, but several clarifications would reduce future implementation ambiguity.

## 1. Format Consistency Findings

| Area | Observation | Impact | Recommendation |
|------|-------------|--------|----------------|
| Heading Numbering | Sections jump from 22 → 24 (no Section 23). Glossary renumbered to 25 accordingly. | Minor cognitive friction. | Either (a) reintroduce Section 23 placeholder (e.g., "Operational Monitoring") or renumber 24→23 and 25→24. |
| Table / List Style | Consistent use of hyphen lists and code fences. | None | Keep. |
| API Blocks | Some requests/responses show `req:`/`res:` pseudo-objects; others only show `res:`. | Minor inconsistency. | Standardize: either include both `req` & `res` (preferred) or only show explicit body shapes. |
| Terminology | Uses both "pre-auth" and "pre-auth user" vs. "unauthenticated". | Low ambiguity. | Add glossary entry for "pre-auth" or consistently use one term. |
| Capitalization | "Supabase" consistent; occasional lowercase for "auth" vs. uppercase elsewhere. | Low | Standardize capitalization in security/auth contexts. |
| Code Fence Languages | JavaScript blocks use ```javascript but responses are pure JSON objects. | Cosmetic | For response-only examples use ```json. |
| Consistency of Consent Terms | Uses: "consent page", "ConsentPage", "consent flow" interchangeably. | Moderate | Use component-style naming (ConsentPage) when referring to UI component; plain language elsewhere. |
| Error Code Table | All upper-case codes; consistent. | Good | No change. |
| Mixed tense | Some future tense ("will") vs present ("returns"). | Minor | Prefer present tense ("returns", "redirects"). |
| Schema in SSD | Section 6 states core tables with explanatory notes; matches style. | OK | No change unless removing schema duplication is desired. |

## 2. Content Consistency Findings

| Topic | Observation | Consistency Status | Recommendation |
|-------|------------|-------------------|----------------|
| Consent Flow Enforcement | Section 7 (Security) states zero grace + middleware check per request. Section 24.2 still lists “Periodic validation during active sessions” (Session Check) which contradicts removal of background polling decision. | Inconsistent | Remove "Session Check" bullet or clarify it's passive (only on login + 423 handling). |
| Consent Data Migration | Section 20.2 lists creating `user_consent_status` records (obsolete since table removed) and retroactive linking. | Inconsistent | Update to reflect only `consent_records` retroactive population; remove reference to `user_consent_status`. |
| API Contract vs. Functional Requirements | Functional req 8.2 lists endpoints; API section includes `/api/user/consent-status` & `/api/user/consents` though not explicitly enumerated in acceptance criteria 17.2 beyond general behavior. | Mostly consistent | Optionally add explicit acceptance criteria for pre-auth refusal → logout + redirect. |
| Post-auth Decline Behavior | UI flow (13.2) states logout on decline (authenticated). Acceptance criteria (17.2) does not validate this scenario. | Partially covered | Add AC: “Given an authenticated user declines consent, user session ends and whitelist page shown.” |
| Data Model vs Schema | SSD Section 6 shows `consent_records` with fields matching updated schema (id, user_hash, user_id). Schema file matches. | Consistent | No change. |
| Privacy Policy Update Workflow | Section 24.2 still mentions "Periodic validation during active sessions" which conflicts with the adopted no-background-monitoring decision. | Inconsistent | Remove or reword. |
| Constraints Section | Mentions static fallback at `docs/privacy-policy-ko.md`; functional flow enforces dynamic DB version for consent. No contradiction, but could clarify that fallback cannot satisfy consent logic. | Ambiguous | Add note: static fallback only for display; consent must reference published DB version. |
| Error Handling | 423 code described in multiple places consistently. | Consistent | No change. |
| Simulation Engine | Independent; no conflict with added consent logic. | Consistent | No change. |
| Migration Strategy | Lacks explicit step for generating retroactive consent records (script/one-off job). | Incomplete | Add brief procedure under 20.2. |
| RLS Policies | Schema shows many placeholder/duplicated policies (e.g., repeated “Enable read access” & “Stories are live...” for notices). | Potential confusion | Clean duplicates or annotate as scaffolding examples. |
| Security Controls Table | No row for consent enforcement middleware. | Omission | Add row: “Consent enforcement middleware – Planned/Implemented (choose) – 423 gating on policy version.” |

## 3. Suggested Edits (Non-blocking)

1. Numbering: Either add missing Section 23 (e.g., “Operational Monitoring (Reserved)”) or renumber sections 24→23 and 25→24.
2. Remove outdated references:
   - Section 20.2: Delete `user_consent_status` mention.
   - Section 24.2: Remove “Periodic validation during active sessions”.
3. Add Acceptance Criterion:
   - "Given an authenticated user declines updated privacy policy, then user is logged out and redirected to whitelist page."
4. Clarify Consent Status endpoint usage: Note it's used only at app init + post-login (not polled).
5. Add note to Constraints (Section 14): “Static policy file cannot be used as authoritative source for consent version tracking.”
6. Add security control row for consent middleware enforcement.
7. Normalize API examples: Convert pure response examples to JSON code fences.
1. Add migration playbook snippet under 20.2:

```sql
-- Backfill authenticated user consents to new schema
insert into consent_records (consent_type, consent_version, user_id, consent_given_at)
select 'privacy_policy', '<current_version>', id, now()
from auth.users u
where not exists (
   select 1 from consent_records c 
   where c.user_id = u.id and c.consent_version = '<current_version>'
);
```

1. Remove duplicate RLS policy blocks in `schema.md` or mark them as sample templates.

1. Glossary: Add entry for "Pre-auth user".

## 4. Potential Risks if Not Clarified

- Ambiguity in consent enforcement timing could lead to unnecessary network calls or missed gating.
- Migration confusion if legacy users lack explicit mapping of pre-auth consent to user_id.
- Operational monitoring gap (missing Section 23) may delay future observability planning.

## 5. No Issues Areas

- Simulation engine description
- Performance baselines
- Error code definitions
- PWA requirements

## 6. Conclusion

Document is solid and implementable after minor cleanups. Addressing the listed inconsistencies will improve maintainability and reduce developer uncertainty.

---
Generated automatically as per review instructions.
