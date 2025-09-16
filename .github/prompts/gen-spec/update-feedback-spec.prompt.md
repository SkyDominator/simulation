Here are my decision and clarifications for `NEED_VERIFICATION`s in SSD.md

# Decisions and Clarifications

1. Modify existing table: Use consent_records table.
2. Zero Grace Period: Users must consent to the latest version or he can't use my app no more.
3. Apply Consent Enforcement: Use 423 (Locked) status.
4. Scope of Consent: active users.
5. Consent Context: If an authenticated user refuses consenting, he is logged out and redirected to the whitelist check page.
6. No Background Monitoring: Only gracefully handles 423 responses by redirecting to consent page. Maintain user's current task context through consent flow.
7. App checks consent status on load (app initialization): redirects to consent page if required. No need for Access Blocking.
8. No need for Consent Status Validation for authenticated user: If a user required consent update, he should have been went through the cosent page on pre-auth stage. If the privacy policy had been updated after a user already logged in, he is redirected to the consent page by receiving 423 responses. The Context Preservation is required, so an authenticated user can resume his task after conseting to the latest policy.
9. Consent Status Migration: required. Retroactive Consent Linking is also required.
10. Technical Implementation Details: Required and should follow the clarifed details discussed so far.
11. Rollback Procedures: handled by admin. Using Supabase DB `privacy_policy` tables.

# Next Step

Apply the clarifications and decisions above in the SSD. Remove `NEED_VERIFICATION` on clarified elements.

# Note

* DO NOT REMOVE `NEED_VERIFICATION` on the elements that you think they are not clarified yet for sure. 
