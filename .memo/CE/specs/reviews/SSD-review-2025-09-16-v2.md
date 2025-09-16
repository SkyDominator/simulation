# SSD Review – 2025-09-16 (Re-run After Updates)

## Summary

Updates applied since prior review have addressed previously flagged inconsistencies (session check removal, user_consent_status reference removal, section renumbering, acceptance criteria additions, glossary term, consent middleware). Remaining items are minor polish suggestions only.

## 1. Format Consistency

| Aspect | Status | Notes / Suggestions |
|--------|--------|---------------------|
| Section numbering | Fixed (23 replaces prior 24; Glossary now 24) | Consider adding a brief note if 23 inserted retroactively (optional). |
| Lists & indentation | Mostly consistent | Acceptance criteria block now uniform. |
| Tables | Consistent formatting | OK. |
| API examples | Mixed `javascript` fences containing JSON-like structures | Could switch pure responses to `json` for clarity. |
| Terminology | "Pre-auth user" now in glossary | Good; usage consistent. |
| Capitalization | Uniform (Supabase, FastAPI, PWA) | OK. |
| New security control row | Present & aligned | OK. |
| Consistent tense | Predominantly present tense | Minor past/future forms acceptable. |

## 2. Content Consistency

| Topic | Result | Comment |
|-------|--------|---------|
| Consent enforcement flow | Consistent (login check + middleware 423) | Matches decisions. |
| Migration section | Updated but still references only high-level script instruction missing concrete example | Option: add SQL snippet for backfill. |
| Acceptance criteria | Decline scenarios now covered | Complete. |
| Constraints vs workflow | Source-of-truth statement aligned with workflow | OK. |
| Schema alignment | `consent_records` change reflected in SSD and schema | OK. |
| Rollback strategy | Minimal but coherent | Could add note on invalidating cached policy clients (optional). |
| Glossary coverage | New term added | Complete. |

## 3. Minor Improvement Suggestions

1. Add a short SQL example under Data Migration for consent backfill (already described conceptually):

```sql
-- One-off: backfill consent for existing authenticated users (only if policy version V not present)
insert into consent_records (consent_type, consent_version, user_id, consent_given_at)
select 'privacy_policy', '<latest_version>', u.id, now()
from auth.users u
where not exists (
  select 1 from consent_records c
  where c.user_id = u.id and c.consent_version = '<latest_version>'
);
```

* In API Contracts, optionally clarify that `/api/user/consent-status` isn’t polled—called only at login/app init; enforcement relies on 423 responses.
* Add a brief note in Privacy Policy Update Workflow about expected client UX after 423 (e.g., preserving route + replaying action optionally after consent).
* Consider marking whether consent enforcement middleware runs before or after auth (ordering note in Security section).
* Add performance non-functional note for consent check overhead target (e.g., <5ms lookup with cached latest version).

## 4. Potential Clarifications (Optional)

* Whether multiple consents per user/version are prevented (uniqueness recommendation).
* Whether declining while authenticated purges local cached simulation drafts (explicitly state no, to reassure data retention).

## 5. Conclusion

No contradictions found. Document is implementation-ready. Only optional refinements remain.

Outcome: No blocking issues. Optional enhancements listed above.
