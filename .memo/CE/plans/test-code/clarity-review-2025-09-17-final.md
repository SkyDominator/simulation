# Clarity Review – Test Code Plans (2025-09-17 Final Confirmation)

Purpose: Final confirmation that all previously identified Critical clarification items (see `clarity-review-2025-09-17.md` and follow‑up `clarity-review-2025-09-17b.md`) are now fully resolved.

## 1. Critical Items – Final Status

| Critical Item (Original) | Current Location / Evidence | Final Status | Notes |
|--------------------------|-----------------------------|--------------|-------|
| Task 10 vs 21 overlap (unit vs perf) | `test-plan-01-backend-unit.md` Tasks 10 & removal note for 21 | Resolved | Timing assertions removed from unit scope; perf harness owns timing. |
| Snapshot schema + version bump rule | Backend Unit §5.3 | Resolved | JSON schema + version policy + canonical rounds documented. |
| Multi-round snapshot rounds ambiguity | Backend Unit §5.3 | Resolved | Fixed at 36. |
| Migration tooling prerequisite before integration tests | `test-code.md` Goals + Integration preface | Resolved | Explicit prerequisite statement. |
| Endpoint mapping path→method | Backend Integration §5.0 table | Resolved | Table cross-checked with `routes.py`. |
| OTP flow limits override mechanism | Backend Integration §6.1 | Resolved | Monkeypatch fixture pattern provided. |
| Canonical protected endpoint (423) | Backend Integration §6.2 | Resolved | `/api/simulations` designated + rationale. |
| Frontend unit task numbering stability | Frontend Unit §3 (ID table F01–F17) | Resolved | Stable ID scheme added. |
| API service error handling semantics | Frontend Unit §4.4 | Resolved | Status code → contract table + test cases. |
| Coverage aggregation output paths | Coverage Reporting §4.3 | Resolved | `/src/test/coverage/` paths enumerated. |
| PII regex prefix coverage / rationale | PII Policy §5 Rationale Clarifications | Resolved | Prefix set + exclusions rationale + allowlist file documented. |
| JWT negative path behavior | Backend Unit §5.8 & Tasks 18–19 | Resolved | Exception classes + exact messages table. |
| Coverage ratchet policy | `test-code.md` Ratchet Policy section | Resolved (earlier) | Increment schedule & rules explicit. |
| peak_memory method selection | Performance Plan §7 Tooling Decisions | Resolved | `memory_profiler` chosen with fallback. |
| Threshold source externalization | Tooling Automation §5 | Resolved | `windows-scripts/config.json` documented with sample JSON. |
| E2E selector stability (`data-testid`) | E2E Smoke §4 | Resolved | `data-testid` mandated + example. |
| `freezegun` dependency clarity | Backend Unit §3 Environment & Conventions | Resolved | Version constraint + fallback skip fixture sketch. |

## 2. Remaining Critical Gaps

None. All previously flagged critical ambiguities have explicit resolutions in the updated plan documents.

## 3. Advisory (Non-Blocking) Follow-Ups

These are not critical for implementation start, but worth tracking:

| Topic | Advisory |
|-------|----------|
| Dependency sync | Ensure `freezegun>=1.5,<2` actually added to backend `requirements.txt` when implementing. |
| Snapshot schema evolution | Consider adding a short CHANGELOG entry per snapshot version bump to maintain traceability. |
| Performance repetitions | When implementing perf harness, finalize repetition count (median of N) if noise observed; current plan implies single baseline. |

## 4. Conclusion

All critical blockers are cleared. Test implementation can proceed immediately using the current plans as authoritative guidance.

Prepared: 2025-09-17
