# Test Plan – Performance / Load Scaffold

Master reference: `test-code.md`. This file independently outlines performance baseline testing.

## 1. Scope
Lightweight harness to execute simulation plans under controlled load to establish baseline latency & resource usage; non-gating early stage.

## 2. Objectives
- Capture baseline execution time for each plan (100 rounds scenario)
- Detect >20% regression (warn only)
- Provide JSON artifact consumable by future dashboards

## 3. Tasks (Verbatim from Master Plan)
1. Add `tests/perf/` (Locust or simple timing harness) running all plans at 100 rounds
2. Persist baseline metrics JSON; warn (not fail) if regression >20% until thresholds stabilized
 3. UI micro-benchmark: render OfflineResultsPage with synthetic 100-row history & measure initial render time (warn if >200ms)
 4. Policy list render benchmark: AdminPolicyPage with 100 draft + 1 published policies (warn if >200ms)

## 4. Harness Design
- Python script `tests/perf/run_baseline.py`
For each plan in [A,B,C,D,K,P,R,F,E]:
  - Run simulation service with deterministic inputs & fixed seed
  - Measure wall-clock and (optionally) process CPU time
  - Record: plan_id, rounds, duration_ms, peak_memory (collected via `memory_profiler` if installed)
- Output `output/perf/baseline.json` (if absent) else compare and produce `output/perf/delta.json`

## 5. Regression Logic

- Repetitions: run each plan 5 times (configurable via `PERF_REPS` env var, default 5) and record each duration.
- Compute median (p50) duration per plan; ignore max outlier if >2× median (logged).
- Regression condition: median_current > median_baseline * 1.2 → classify regression (warn only for now).
- Print table: plan_id | baseline_median_ms | current_median_ms | delta_pct | regress?(Y/N) | reps_used
- Exit code 0 always (early non-gating stage); CI log highlights regressions.
- Future escalation: after N (≈10) stable runs without regression, introduce gating with exit code 2 on regression.

## 6. Invocation

- `invoke perf.run` wrapper (future) or direct: `python -m tests.perf.run_baseline`
- CI optional job (non-blocking)

## 7. Tooling Decisions

Peak memory measurement: use `memory_profiler` (`pip install memory_profiler`). If module absent, skip memory metric with logged warning; not a test failure.

## 8. Acceptance Criteria

- Baseline file created on first run
- Subsequent run with artificial delay shows regression warning line
- JSON schema stable (documented fields)
- OfflineResultsPage render benchmark outputs metrics JSON (`output/perf/ui_offline_results.json`) (skipped if `UI_PERF=0`)
- AdminPolicyPage list benchmark outputs metrics JSON (`output/perf/ui_admin_policy.json`)

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Noisy local environment | Run multiple repetitions & take median |
| Drift due to unrelated system load | Document guidance: use isolated container |

## 10. Future Enhancements

- Integrate Locust for concurrent user simulation of API endpoints
- Add percentile stats & CPU/RAM sampling
- Trend upload to external monitoring store

