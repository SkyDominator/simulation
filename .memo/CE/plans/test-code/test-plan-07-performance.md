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

## 4. Harness Design
- Python script `tests/perf/run_baseline.py`
- For each plan in [A,B,C,D,K,P,R,F,E]:
  - Run simulation service with deterministic inputs & fixed seed
  - Measure wall-clock and (optionally) process CPU time
  - Record: plan_id, rounds, duration_ms, peak_memory(optional)
- Output `output/perf/baseline.json` (if absent) else compare and produce `output/perf/delta.json`

## 5. Regression Logic
- If current_duration > baseline_duration * 1.2: classify regression
- Print summary table; exit code 0 (warn only)
- Future: escalate after stabilization period

## 6. Invocation
- `invoke perf.run` wrapper (future) or direct: `python -m tests.perf.run_baseline`
- CI optional job (non-blocking)

## 7. Acceptance Criteria
- Baseline file created on first run
- Subsequent run with artificial delay shows regression warning line
- JSON schema stable (documented fields)

## 8. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Noisy local environment | Run multiple repetitions & take median |
| Drift due to unrelated system load | Document guidance: use isolated container | 

## 9. Future Enhancements
- Integrate Locust for concurrent user simulation of API endpoints
- Add percentile stats & CPU/RAM sampling
- Trend upload to external monitoring store

