# Test Plan – Tooling & Automation

Master overview: `test-code.md`. This file independently enumerates tooling & automation tasks.

## 1. Scope
Provide scripts, invoke tasks, PowerShell orchestration, nightly routines, and developer ergonomics supporting the other test layers.

## 2. Objectives
- Unified local `run_tests.ps1` entrypoint
- Deterministic migration & schema drift workflows
- Automated OpenAPI snapshot management & PII scan gating

## 3. Tasks (Verbatim from Master Plan)
1. Add PowerShell script `windows-scripts/run_tests.ps1` orchestrating backend (pytest + coverage) + frontend (vitest + coverage) + contract + PII scan; aggregates coverage then prints summary.
2. Optional Makefile (Unix contributors) with phony targets delegating to `invoke` (non-blocking if absent on Windows).
3. Pre-commit doc: fast unit subset marker (`pytest -m fast`) — markers introduced gradually; initial config adds marker placeholder to `pytest.ini`.
4. Migration automation implemented: `scripts/migrations/apply.py`, `tasks.py` exposing `db.apply`, `db.new`, `schema.snapshot`, `schema.diff`.
5. `openapi.snapshot`: implemented as `invoke openapi.snapshot` (requires running app OR uses FastAPI app import) guarded by `ALLOW_SCHEMA_UPDATE=1`.
6. `pii-scan`: `invoke pii.scan` wrapper executes ripgrep command; fails on first match outside allowlist.
7. Nightly schema drift GitHub Action scheduled (non-blocking on additive changes, blocking on destructive changes).
8. Coverage upload GitHub Action includes conditional Codecov step (skipped on draft PRs).
9. Extend `run_tests.ps1` to parse per-component coverage (OfflineResultsPage, AdminPolicyPage) from lcov & print dedicated row (JSON schema for summary extension)
10. Add optional `--focus-ui` flag to `run_tests.ps1` to run only frontend unit + integration tests touching these components (filename pattern) (flag name)

## 4. Script Design – `run_tests.ps1`
Steps:
1. Set strict mode & capture start time
2. Run backend tests with coverage
3. Run frontend tests with coverage
4. Run contract test (OpenAPI)
5. Run PII scan (invoke)
6. Parse coverage outputs & compute summary table
7. Enforce thresholds; exit code >0 if failing

## 5. Threshold & Config Source
Thresholds externalized to `windows-scripts/config.json`:
```json
{
	"successThreshold": 90,
	"errorThreshold": 5,
	"rationale": "Success threshold based on industry standards; error threshold prevents false positives."
}
```
Script loads JSON; fallback to baked-in defaults with warning if missing.

## 6. Invoke Tasks Summary
| Command | Purpose |
|---------|---------|
| `invoke db.apply` | Apply migrations (schema aware) |
| `invoke db.new` | Create timestamped migration file |
| `invoke schema.snapshot` | Regenerate DB schema snapshot (guarded) |
| `invoke schema.diff` | Diff current vs snapshot (exit codes) |
| `invoke openapi.snapshot` | Refresh OpenAPI snapshot (guarded) |
| `invoke pii.scan` | Run PII regex scan |
| `perf.run` | Forthcoming: Run performance benchmarks |

### 6.1 Exit Code Semantics

| Command | Code | Meaning |
|---------|------|---------|
| invoke schema.diff | 0 | No drift |
| invoke schema.diff | 1 | Additive drift only (warning) |
| invoke schema.diff | 2 | Destructive / incompatible drift (fail) |
| invoke openapi.snapshot (generate) | 0 | Snapshot regenerated (requires ALLOW_SCHEMA_UPDATE=1) |
| invoke openapi.check (future) | 0 | No contract break |
| invoke openapi.check (future) | 1 | Additive (non-breaking) change |
| invoke openapi.check (future) | 2 | Breaking change |
| invoke pii.scan | 0 | Passed (no matches) |
| invoke pii.scan | 1 | Forbidden pattern encountered |
| invoke perf.run | 0 | Completed; any regressions logged only |
| invoke coverage.merge (future) | 0 | Thresholds met |
| invoke coverage.merge (future) | 2 | Thresholds not met (fail) |

Design Principle: 0 success, 1 informational/non-breaking, 2 gating failure. Keeps simple mental model early.

## 6. Nightly Drift Action

- Cron triggers job
- Spins up Postgres service
- Runs diff; classifies additive vs destructive (failure on destructive)
- Uploads diff artifact

## 7. Acceptance Criteria

- `run_tests.ps1` exits 0 when all layers pass & coverage above gates
- Any PII violation or contract break exits non-zero
- Nightly drift action produces artifact on additive change
- `run_tests.ps1` prints component coverage table when components present; otherwise clearly states "No component coverage data".

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Script divergence between OSes | Keep Python invoke as single source & PS wrapper thin |
| Secret exposure in logs | Redact env variables in script output |

## 9. Future Enhancements

- Pre-commit hook auto-runs fast unit subset
- Add `invoke quality.all` meta task chaining lint, type, tests, scan

