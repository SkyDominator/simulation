# Clarity Review – Test Code Plans (2025-09-17 Confirmation Pass)

Purpose: Confirm resolution status of previously identified Critical clarification items from `clarity-review-2025-09-17.md` after recent edits.

## Legend
- Resolved: Clear, specific, actionable; no further blocker.
- Partially Resolved: Progress made but a gap remains (described).
- Unresolved: Still ambiguous for implementation.

## 1. Critical Items Resolution Status

| Original Critical Item | File / Section (current) | Status | Notes / Remaining Action |
|------------------------|--------------------------|--------|--------------------------|
| Task 10 vs 21 overlap (performance vs unit) | backend unit – Tasks list (10 & removed 21) | Resolved | Timing assertion removed; micro-benchmark explicitly removed (Task 21). Boundary now clear. |
| Snapshot schema + version bump rule | backend unit – 5.3 | Resolved | Canonical rounds=36, schema JSON fields, version bump policy defined. |
| Multi-Round Snapshot rounds ambiguous | backend unit – 5.3 | Resolved | Fixed to 36 (documented). |
| Migration tooling existence before integration tests | master `test-code.md` – Goals + Integration section preface | Resolved | Explicit prerequisite line added. |
| Endpoint mapping path→method validation | backend integration – 5.0 Endpoint Mapping | Resolved | Comprehensive table inserted referencing `routes.py`. |
| OTP Flow limits override point | backend integration – 6.1 Config Injection | Resolved | Monkeypatch fixture pattern provided. |
| Canonical protected endpoint for 423 | backend integration – 6.2 | Resolved | `/api/simulations` chosen & rationale. |
| Frontend unit task numbering ambiguity (3.1 Enhancements) | frontend unit – Section 3 tasks | Unresolved | Numbering unchanged; no E-prefixed labels or scope clarification added. Add note or prefix for cross-ref stability. |
| API service error handling semantics | frontend unit – 4.4 | Resolved | Detailed status code contract table + test cases. |
| Coverage aggregation output paths unspecified | coverage reporting – 4.3 | Resolved | Explicit `/src/test/coverage/` paths enumerated. |
| PII regex prefix coverage incomplete | PII policy – Tasks / regex | Unresolved | Regex unchanged; no explanation of scope or expansion of prefixes (e.g., international formats) added. Need either rationale or expanded pattern + allowlist strategy. |
| JWT negative path behavior | backend unit – 5.8 & Task 19 | Resolved | Exception table with exact classes/messages added. |
| Ratchet policy absent | master `test-code.md` – Ratchet Policy | Resolved (previous) | Detailed incremental coverage gate section present. |
| peak_memory method not specified | performance – Tooling Decisions | Resolved | `memory_profiler` selected with fallback behavior. |
| Threshold source unspecified | tooling automation – 5. Threshold & Config Source | Resolved | `windows-scripts/config.json` documented with sample JSON. |
| Unstable text selector risk (E2E) | e2e smoke – 4. Test Design | Resolved | Mandated `data-testid` usage with example. |
| `freezegun` dependency clarity | backend unit – Environment & Conventions | Partially Resolved | Mentions install ("use latest version"), but no confirmation of inclusion in `requirements.txt` or fallback strategy details beyond brief parenthetical. Add explicit note to add `freezegun` to backend test dependencies OR detail alternate clock injection approach if excluded. |

## 2. Summary of Critical Items Still Requiring Action
1. Frontend unit task numbering clarification (add prefix or scope note).
2. PII regex coverage rationale or expansion (document allowed prefixes & intentional exclusions; possibly add allowlist file mention).
3. `freezegun` dependency finalization: ensure dependency list update or explicit alternative path in plan.

## 3. Recommended Next Edits
| Priority | Action | Suggested Location | Sketch |
|----------|--------|--------------------|--------|
| High | Clarify enhancement task numbering | `test-plan-04-frontend-unit.md` after Section 3 heading | "Note: Task numbers are local to this file; cross-references use F-<n> (e.g., F5)." or rename tasks. |
| High | Add regex rationale / expansion | `test-plan-09-pii-policy.md` Section 3 & 5 | Bullet list enumerating prefixes (010,011,016,017,018,019) & why others excluded; mention future international support. |
| Medium | Finalize `freezegun` dependency note | `test-plan-01-backend-unit.md` Section 3 | Add line: "Dependency: add `freezegun>=1.5` to `requirements.txt`; fallback: custom clock fixture if import fails (skips time-freeze tests)." |

## 4. Conclusion
Most critical blockers are resolved. Only three small clarifications remain; addressing them will fully clear the plans for implementation.

Prepared: 2025-09-17 (confirmation pass)
