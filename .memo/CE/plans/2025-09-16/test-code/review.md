---
date: 2025-09-16T00:00:00Z
reviewer: GitHub Copilot
topic: test-code-plan-review
status: complete
---

# Review: Test Code Implementation Plan (2025-09-16)

## 1. Format Consistency

### Strengths

- Headings follow a logical hierarchy (Overview → Goals → Layers → Acceptance Criteria → Appendices).
- Bullet list style is consistent (hyphen-prefixed; nested numbering used appropriately under Tasks).
- Terminology for test layers (unit, integration, contract, E2E, performance) is consistently capitalized where used as section titles.
- Risk table formatting consistent with Markdown table syntax.

### Detected Inconsistencies / Issues

1. Environment Strategy line: "Test DB: Use ephemeral Supabase schema clone." conflicts later with integration guidance referencing an *ephemeral* clone but without detailed clone steps; needs clarity or fallback (e.g., local Postgres).
2. Section 2 (Backend Integration Tests) embeds a four-item checklist beneath Health endpoint; stylistically different from earlier task bullet formatting—suggest converting to a labeled subsection "Repository Boundary Checklist" for clarity.
3. Mixed punctuation in bullet endings: Some bullets end with periods, others do not (e.g., in Goals vs Unit Tests tasks). Recommend standardizing (no trailing periods for short bullets; periods only for full sentences >1 clause).
4. In Performance / Load Scaffold, parenthetical performance thresholds appear inside the section; consider moving to a dedicated "Performance Threshold Targets" subsection for readability.
5. Frontend Integration (Shallow Flow) Tests section includes a parenthetical note: "(abstract navigation controller for easier testing.)" — missing capitalization and appears as an action item; convert into a task or NEED_VERIFICATION item.
6. Coverage & Reporting: Badge destination path `/.memo/CE/implementations/2025-09-16/sample-readme.md` is unconventional; badges are typically placed in root `README.md`—potential confusion (NEED_VERIFICATION if intentional).
7. PII Masking section references ripgrep one-liner but doesn’t show the command. Provide explicit example for reproducibility.
8. Documentation tasks mention updating SSD but do not specify the exact section anchor—could add reference: "Update SSD section 16 (Testing Strategy)."
9. Table in Risk & Mitigation has consistent style, but Coverage thresholds (backend 40%, frontend 25%) not cross-referenced in Acceptance Criteria; add explicit acceptance item for coverage.
10. "NEED_VERIFICATION" keyword used earlier (original draft) is removed except in narrative; consider reintroducing standardized tag for unresolved clarifications or remove entirely if all resolved.

### Suggested Formatting Improvements

- Introduce a consistent tag block for open decisions: `OPEN_DECISION:` or `PENDING:`.
- Add a short glossary section (Plan IDs, RLS, JWKS) for new contributors.
- Group Appendices under a single heading with subheadings.

## 2. Content Consistency

### Alignment With SSD

- Simulation plan coverage requirement aligns with SSD Section 10 (Plans A,B,C,D,K,P,R,F,E).
- Consent, OTP, policy publish, and simulation CRUD flows included—matches SSD Sections 8.1–8.5.
- Health endpoint test listed—aligns with SSD Section 8.6.
- Performance thresholds partially defined; SSD lists latency targets (<500ms typical APIs), plan expands with p50/p95 breakdown (extend or note derivation source).

### Logical Coherence

- Layer progression (unit → integration → contract → frontend → coverage) is logical.
- PII policy integration complements privacy & consent requirements.
- Performance scaffold defers gating—clearly framed as optional CI stage.

### Gaps / Potential Contradictions

1. Test DB strategy currently assumes ephemeral Supabase clone but does not define tooling or migration application command; may become a blocker—recommend clarifying fallback to local Postgres container.
2. Admin notice CRUD tests mention only publish toggle; missing explicit tests for create/update/delete notices → add tasks.
3. JWT validation: Plan says "provide static JWKS fixture" but no task enumerated to create fixture file location (e.g., `tests/fixtures/jwks.json`). Add explicit task.
4. OpenAPI snapshot: test assumes existing snapshot path `docs/api/openapi.snapshot.json`; need task for regeneration command when schema legitimately changes.
5. Simulation update invalidation test references clearing results logic—verify actual implementation resets `simulation_results` field (NEED_VERIFICATION: confirm code path or add TODO).
6. No explicit negative tests for unauthorized / forbidden endpoints (admin endpoints with non-admin token). Should add.
7. OTP rate limiting tests mention exceeding attempts but not send-rate limit (3 per 15 min) — add scenario.
8. PII masking scan enforcement not tied into CI in tasks—add step to Coverage & Reporting or Tooling section.
9. Performance test acceptance numbers not reflected in Acceptance Criteria—add or mark as informational baseline.
10. Badge file path inconsistency (see Format issue #6) may confuse contributors about where to look for coverage status.

### Recommended Additions

- Add task: "Add JWKS fixture file and dependency override to inject local keyset."
- Add task: "Notice CRUD create/update/delete integration tests."
- Add task: "Unauthorized / Forbidden access tests (admin endpoints with regular user token)."
- Add task: "OTP send rate limit test (fourth send within window returns 429)."
- Add task: "Document migration command for test schema setup (script or Make target)."
- Add task: "Add explicit coverage acceptance line (backend >=40%, frontend >=25% initial)."
- Add task: "OpenAPI snapshot update script guarded by ALLOW_SCHEMA_UPDATE flag."
- Add task: "Add CI job step: PII scan script execution."
- Add task: "Add simulation results invalidation verification (state diff before/after update)."

## Summary Assessment

The plan is strong and comprehensive but needs clarifications on database strategy, coverage acceptance linkage, badge placement, and a few missing negative/edge test cases. Formatting can be improved by normalizing bullet punctuation and isolating checklists into subsections.

## Actionable Change List

1. Clarify Test DB approach (local Postgres + optional Supabase schema clone; add fallback).
2. Normalize bullet punctuation; remove mixed terminal periods.
3. Convert embedded repository boundary checklist to a subheading.
4. Add missing CRUD & negative tests (admin, rate limiting).
5. Add JWKS fixture task & file path.
6. Provide explicit ripgrep PII scan command.
7. Move performance thresholds to dedicated subsection; reference SSD baseline.
8. Add coverage thresholds to Acceptance Criteria explicitly.
9. Decide and fix badge target path (root README recommended) or mark NEED_VERIFICATION if undecided.
10. Add OpenAPI snapshot update instructions & flag usage.

## Optional Enhancements

- Introduce mutation testing backlog note earlier near Risks to highlight future robustness goals. 
- Provide sample Make/PowerShell commands for common test runs in Documentation section. 
- Add caching strategy for test performance (pytest cache, pip cache). 

## Final Verdict

Improvements recommended (see list). No blocking contradictions, but refinements will increase clarity and executability.
