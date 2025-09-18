Here are my decision and clarifications for inconsistencies in SSD.md

# Decisions and Clarifications

1. Format Consistency: Apply your suggestions.
2. Contents Consistency
 - Consent Flow Enforcement: Section 7 is right. Remove "Session Check" from 24.2. "Periodic validation during active sessions" will be removed.
 - Consent Data Migration: Update to reflect only consent_records retroactive population; remove reference to user_consent_status.
 - API Contract vs. Functional Requirements: Optionally add explicit acceptance criteria for pre-auth refusal → logout + redirect.
 - Post-auth Decline Behavior: Add AC: "Given an authenticated user declines consent, user session ends and whitelist page shown."
 - Privacy Policy Update Workflow: Remove all "Periodic validation during active sessions" contents from SSD.md
 - Constraints Section: No static fallback used; consent must reference published DB version.
 - Migration Strategy: Add brief procedure under 20.2 (explicit step for generating retroactive consent records (script/one-off job)).
 - 	Security Controls Table: Add row: “Consent enforcement middleware – Planned/Implemented (choose) – 423 gating on policy version.”
   

# Next Step

Apply the clarifications and decisions above in the SSD.md and schema.md files.
