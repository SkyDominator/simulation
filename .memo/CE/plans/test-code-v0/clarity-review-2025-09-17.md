# Clarity Review – Test Code Plans (2025-09-17)

This review examines all test plan markdown files under `/.memo/CE/plans/test-code/` (excluding `examples/`) for potential clarity gaps or decision points that could cause friction during implementation. Each item lists the file, section (heading or task reference), issue, and a recommended clarification or action. Items are ordered by (1) potential to cause rework, (2) cross-layer dependency impact, (3) ease of resolution.

## Legend

* Critical: Must clarify before starting related implementation.
* Important: Should clarify soon; low risk of rework if deferred briefly.
* Minor: Nice-to-refine; does not block implementation.

## 1. Critical Clarifications

| Priority | File | Section / Reference | Issue | Recommendation |
|----------|------|---------------------|-------|----------------|
| Critical | `test-plan-01-backend-unit.md` | 4.1 Tasks 10 vs 21 | Performance threshold (<2s) in Task 10 and micro-benchmark in Task 21 overlap; boundary between unit logic verification and performance layer (`test-plan-07-performance.md`) is blurred. | Decide: (a) keep only correctness + structural assertions in Task 10 (drop timing) OR (b) retain a soft timing assert but move micro-benchmark to performance plan. Document chosen policy. |
| Critical | `test-plan-01-backend-unit.md` | Task 18 & 5.3 | Snapshot JSON version field required but schema unspecified. | Define snapshot schema and version bump rule; add to plan. |
| Critical | `test-plan-01-backend-unit.md` | 5.3 Multi-Round Snapshot | Rounds count ambiguous ("10 or 20"). | Pick canonical value (recommend 20) and fix in plan. |
| Critical | `test-code.md` | Environment Strategy | Migration tooling existence not confirmed. | Verify or create `apply.py` + `tasks.py` before integration test implementation. |
| Critical | `test-plan-02-backend-integration.md` | Flow specs 5.1–5.3 | Endpoint paths may differ from real code. | Add mapping table path→method validated against routes. |
| Critical | `test-plan-02-backend-integration.md` | OTP Flow limits | Limits need test overrides. | Document config injection points. |
| Critical | `test-plan-02-backend-integration.md` | Consent 423 test | Protected endpoint unspecified. | Select and document canonical protected endpoint. |
| Critical | `test-plan-04-frontend-unit.md` | 3.1 Enhancements | Local numbering may confuse cross-refs. | Prefix tasks (e.g., E1–E12) or clarify numbering scope. |
| Critical | `test-plan-04-frontend-unit.md` | 4.4 API Service Module | Error handling semantics undefined. | Specify contract per status code. |
| Critical | `test-plan-08-coverage-reporting.md` | 4.3 Aggregation Script | Output paths unspecified. | Add path constants table. |
| Critical | `test-plan-09-pii-policy.md` | 3. Regex Task | Prefix coverage incomplete. | Expand regex or document rationale for narrow scope. |
| Critical | `test-plan-01-backend-unit.md` | 5.8 & Task 19 | JWT negative path behavior unclear. | Define exception/return contract. |
| Critical | `test-code.md` | Goals / Coverage Gates | Ratchet policy absent. | Add explicit increment rule. |
| Critical | `test-plan-07-performance.md` | 4. Harness Design | peak_memory method not specified. | Choose tool or defer memory metric. |
| Critical | `test-plan-10-tooling-automation.md` | 4. Script Design | Threshold source unspecified. | Externalize thresholds config. |
| Critical | `test-plan-06-e2e-smoke.md` | 4. Test Design | Unstable text selector risk. | Adopt data-testid. |
| Critical | `test-plan-01-backend-unit.md` | 3. Environment | `freezegun` dependency status unclear. | Add dependency or revise approach. |

## 2. Important Clarifications

| Priority | File | Section | Issue | Recommendation |
|----------|------|---------|-------|----------------|
| Important | `test-code.md` | Environment Strategy – Nightly Schema Drift | Exit codes (0/1/2) defined in text but not repeated in tooling section; risk of drift in implementation. | Add concise table enumerating exit code semantics in main plan & tooling plan. |
| Important | `test-plan-02-backend-integration.md` | 7. Data Isolation Strategy | Dropping schema after each module blocks post-failure inspection. | Provide env flag `RETAIN_TEST_SCHEMA=1` to skip teardown on failure. |
| Important | `test-plan-01-backend-unit.md` | Task 22 Determinism Guard | Monkeypatching all RNG may inadvertently break unrelated libs later. | Narrow guard to simulation module namespace (e.g., patch `random.random` only when function imported there). Document scope. |
| Important | `test-plan-04-frontend-unit.md` | 3.1 Draft Persistence | localStorage key names not specified. | Define keys (e.g., `sim.draft` / `onboarding.state`) so tests align. |
| Important | `test-plan-05-frontend-integration.md` | 4.2 State Machine | States `whitelist` and `consent`—ensure actual implemented route names or context states match. | Add mapping table: Logical State → Route / Component ID. |
| Important | `test-plan-08-coverage-reporting.md` | 4.3 Aggregation Script | Script parsing method unspecified (regex vs XML parsing library). | Recommend using `coverage.xml` parsing via ElementTree and simple regex for lcov lines; document. |
| Important | `test-plan-09-pii-policy.md` | 5. Scan Script Behavior | Only glob exclusions; no positive allowlist for fixture folder. | Add explicit allowlist file (e.g., `tests/pii_allowlist.txt`) for edge cases. |
| Important | `test-plan-07-performance.md` | 5. Regression Logic | Using single run can be noisy. | Define number of repetitions (e.g., 5 runs median). |
| Important | `test-plan-10-tooling-automation.md` | 5. Invoke Tasks Summary | Lacks mention of forthcoming `perf.run` task referenced elsewhere. | Add stub entry or footnote. |
| Important | `test-code.md` | Risk & Mitigation Summary | JWKS fixture risk but not referencing rotation schedule for key changes. | Add note: rotate JWKS test keys quarterly or upon adding new key usages. |

## 3. Minor Clarifications

| Priority | File | Section | Issue | Recommendation |
|----------|------|---------|-------|----------------|
| Minor | `test-plan-01-backend-unit.md` | 5.2 Structural Invariants | `cumulative_profit` monotonic—name must match actual model attribute (`total_profit`?). | Verify actual field name; update wording. |
| Minor | `test-plan-02-backend-integration.md` | 8. Performance Guardrails | Mentions pytest timeout plugin but not configured location (`pytest.ini`). | Add snippet to append to `pytest.ini`. |
| Minor | `test-plan-03-contract.md` | 5.2 Comparison Logic | Breaking exit code semantics described but not tied to implementation method (pytest vs standalone script). | Clarify whether pytest asserts or separate script sets exit code. |
| Minor | `test-plan-04-frontend-unit.md` | 5. Coverage Expectations | Utility coverage target >80%: clarify if statement/branch or line. | Specify metric. |
| Minor | `test-plan-05-frontend-integration.md` | 4.3 Storage Assertions | Draft simulation edits optional—should it move to backlog to reduce scope creep? | Move to Future Enhancements if not MVP. |
| Minor | `test-plan-06-e2e-smoke.md` | 5. Tooling | Reporter `line` only—consider `list` or HTML artifact for CI debugging. | Optionally add second reporter. |
| Minor | `test-plan-07-performance.md` | 6. Invocation | `invoke perf.run` (future) unspecified args. | Define optional args: `--rounds`, `--reps`, `--output`. |
| Minor | `test-plan-08-coverage-reporting.md` | 4.1 Backend | `.coveragerc` exclusion mentioned but file schema not shown. | Provide minimal `.coveragerc` snippet. |
| Minor | `test-plan-09-pii-policy.md` | 4. Policy Outline | Hash procedure references normalization but not canonical formatting algorithm steps. | Add bullet list: strip non-digits, ensure prefix, etc. |
| Minor | `test-plan-10-tooling-automation.md` | 4. Script Design | Step order fixed—parallelization potential unmentioned. | Note future parallelization of backend & frontend with background jobs. |
| Minor | `test-plan-11-restructuring-docs.md` | 5. Acceptance Criteria | `docs/TESTING.md` cross-links PII policy & coverage badge—explicit anchor examples absent. | Add example links to confirm naming (#pii-policy). |

---

## 4. Consolidated Action List (Suggested Order)

1. Lock snapshot rounds count & schema (Backend Unit).
2. Confirm endpoint paths + produce mapping table (Backend Integration & Master).
3. Specify JWT error handling contract (Unit + Integration).
4. Decide performance assertions location & adjust tasks.
5. Expand or justify PII regex coverage.
6. Add coverage aggregation explicit paths + threshold config externalization.
7. Define API service error taxonomy (Frontend Unit) behaviors explicitly.
8. Introduce env/config for OTP limits & 423 protected endpoint selection.
9. Add freezegun (or alternative) to dependencies or reword plan.
10. Provide snapshot versioning policy & example schema.

## 5. If All Clarifications Accepted

After applying the above, plans should be implementation-ready with minimal ambiguity. No structural reorganization appears necessary.

## 6. Summary

Multiple actionable clarifications identified—none appear deeply architectural but resolving them early will prevent inconsistent test semantics (especially JWT, snapshot schema, and endpoint path mapping). Recommend addressing Critical items before writing substantial test code.

---

Prepared: 2025-09-17