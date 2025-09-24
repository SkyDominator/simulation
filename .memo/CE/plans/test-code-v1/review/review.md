# Test Code Plan Review

Review Date: 2025-09-16  
Target Document: `test-code.md`  
Scope: Format Consistency, Contents Consistency

---
## 1. Format Consistency

Observations:

- Headings: Use of `##` and `###` is structurally coherent; new section **Resolved Previously Pending Decisions** appears mid-document. Consider relocating nearer to top or renaming to **Decisions & Rationale** for flow.
- Bullets & numbering: Consistent. Enumerated lists used where ordering matters.
- Dash / punctuation consistency: Mix of en dashes (–) and hyphens (-). Standardize (recommend plain hyphen in Markdown for diff friendliness).
- Inline code formatting: Consistent for commands, flags, and file paths. Multi-line ripgrep command shown inline; a fenced block would improve readability.
- Environment variables: Consistent casing and formatting. Could benefit from a consolidated summary table.
- Section cross-references: Migration decisions appear in multiple sections; add a pointer at first mention to avoid duplication drift.
- Acceptance Criteria retains phrase “explicitly marked PENDING” though PENDING markers were removed—update to “Deferred” or delete.
- Capitalization of recurring terms (Nightly Schema Drift vs nightly schema drift) varies—normalize.
- Command naming: Mixed references (`update-openapi-snapshot` vs `invoke openapi.snapshot`). Unify.

Suggested Format Improvements:

1. Add optional mini TOC (document is long).
2. Convert ripgrep command to fenced block.
3. Normalize hyphen usage.
4. Remove/replace “PENDING” phrasing in Acceptance Criteria.
5. Introduce a concise commands summary table.

---
## 2. Contents Consistency

Strengths:

- Migration tooling rationale (Invoke + custom runner) matches scale & SSD scope.
- Clear exit code semantics for schema diff (0/1/2) without contradiction elsewhere.
- Test layers align with SSD Functional & Security requirements (OTP, consent, simulation CRUD, admin).
- PII masking practices coherent with privacy approach in SSD.
- Coverage thresholds realistic for initial baseline gating.

Minor Inconsistencies / Clarification Needs:

1. Schema naming pattern: Use `<YYYYMMDD>` consistently (sometimes `<date>` appears).
2. OpenAPI snapshot naming inconsistency (Make target vs `invoke openapi.snapshot`).
3. Performance scaffold marked informational but not reflected in Acceptance Criteria—clarify gating vs non-gating nature.
4. Schema isolation method not explicit (fresh migrations vs cloning). Clarify implementation approach.
5. JWT rotation: Fixture mentions static JWKS but no explicit rotation test scenario—add guidance (e.g., add second key, change `kid`).
6. PII scan allowlist narrow; may cause false positives in docs or examples—add dummy number allowlist guidance.
7. Integration tests rely on a published privacy policy; ensure a fixture publishes one early to avoid order dependence.
8. Sequence of CI tasks (PII scan before coverage upload) is implied only; make explicit in tooling section.
9. Rollback strategy (forward-only) lacks remediation steps for checksum mismatch or destructive diff outcomes—add remedial procedure.
10. Simulation plan coverage claim lacks traceability table—add mapping (Plan → test file).
11. OTP expiry & error code coverage not explicitly listed in tests though defined in SSD error codes—consider adding.
12. `simulation_results` invalidation mechanism (NULL vs deletion) not described in earlier sections—add short note for expectations.
13. Performance target (<2s typical run) lacks baseline scenario definition (plan + rounds + input sizes)—clarify.

Suggested Additions:

- Commands Summary Table:

  | Command | Purpose | Notes |
  |---------|---------|-------|
  | invoke db.apply | Apply migrations | `--schema`, `--dry-run`, checksum guard |
  | invoke db.new | Create migration stub | Timestamped SQL template |
  | invoke schema.snapshot | Regenerate schema snapshot | Requires `ALLOW_SCHEMA_UPDATE=1` |
  | invoke schema.diff | Diff current vs snapshot | Exit codes 0/1 additive/2 destructive |
  | invoke openapi.snapshot | Refresh OpenAPI snapshot | Guarded by env flag |
  | invoke pii.scan | Run PII regex scan | Fails on first match |
  | invoke perf.run (future) | Run performance harness | Non-gating baseline |

- Migration Integrity Remediation: On checksum mismatch, do not edit applied file; create new corrective migration with forward adjustments; if unintended destructive change detected (exit code 2) require explicit architectural review + snapshot update commit.
- JWT Rotation Test: Add test adding new JWK with new `kid`, ensure old tokens still validate until key removed.
- Performance Baseline Definition: e.g., Plan A, 100 rounds, default schedule, measure total execution wall time under single-process run.

Risk Enhancements:

- Add “False positives in PII scan” → Mitigation: maintain dummy number allowlist & documented suppression patterns.
- Add “Drift fatigue” → Mitigation: batch additive schema changes; weekly snapshot review ritual.

---
## 3. Actionable Change List

1. Replace Acceptance Criteria wording referencing PENDING.
2. Standardize OpenAPI command naming.
3. Add commands summary table.
4. Clarify per-module schema isolation implementation.
5. Add JWT rotation fixture/test note.
6. Expand PII scan allowlist guidance.
7. Document remediation for checksum mismatch & destructive diff.
8. Add simulation plan → test file mapping (placeholder now).
9. Clarify performance scaffold as non-gating (or include in Acceptance Criteria).
10. Add OTP expiry negative test to integration list.

---
## 4. Conclusion

No blocking contradictions. Document is strong; above refinements will reduce ambiguity and onboarding friction.

Overall Assessment: Ready for implementation after minor clarity edits.

---
## 5. If No Further Changes Needed

If you intentionally prefer leaner documentation, at minimum adjust Acceptance Criteria wording and unify command names to avoid confusion during onboarding.
topic: test-code-plan-review
