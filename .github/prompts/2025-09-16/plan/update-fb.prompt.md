Here are my decision and clarifications for `NEED_VERIFICATION`s

# Decisions and Clarifications

1. Static fallback removal: Remove fallback.
2. Upsert semantics: Allow inserting new row per version (allow multiple versions) (Need to check the necessity of updating SSD.md). 
3. New migration: The `/.memo/CE/specs/schema/schema.md` is the current production database schema. Refer to it for creating the new migration.
4. If no published policy exists: Make sure all users are routed to the whitelist check page and make sure they cannot proceed to the next step with appropriate error message.
5. how to map phone OTP or user_hash to user after login: Use explicit linking endpoint `POST /api/user/link-consent { user_hash }` (Need to check the necessity of updating SSD.md).
6. Migration for consent_records: Redirect any active user to the consent page on next request if no record exists for the latest version. (Need to check the necessity of updating SSD.md)

## Decisions and clarifications for open questions

1. Should we keep an emergency static fallback behind a flag for catastrophic DB outages? (Default off per SSD)
-> No

2. Do we require immutable audit trail (insert-only) for consents vs current upsert replacement? (Assuming yes)
-> Yes, allow multiple versions (insert new row per version).

3. Mechanism to securely link user_hash to authenticated user_id after Supabase OAuth (store user_hash client-side and send to new linking endpoint vs server deriving from phone number—currently not stored).
-> Use explicit linking endpoint `POST /api/user/link-consent { user_hash }`.

4. Behavior if no published policy exists (allow or block?).
-> Block all users from proceeding beyond whitelist check with appropriate error message.

5. Required retention of IP/user_agent for privacy compliance (currently stored).
-> Store them.

# Next Step

1. Apply the clarifications and decisions above in the `/.memo/CE/specs/SSD.md` and `/.memo/CE/specs/schema/schema.md` if necessary. Note that SSD.md is written in more abstract way, so fit the clarifications and decisions to the level of abstraction of SSD.md.
2. Apply the clarifications and decisions `/.memo/CE/plans/2025-09-16/policy-plan.md`. Remove `NEED_VERIFICATION` on the clarified elements in the `/.memo/CE/plans/2025-09-16/policy-plan.md`

# Note

* DO NOT REMOVE `NEED_VERIFICATION` on the elements that you think they are not clarified enough yet for sure. 
