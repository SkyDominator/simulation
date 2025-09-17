# Test Plan – Coverage & Reporting

Master doc: `test-code.md`. This file independently describes coverage & reporting layer.

## 1. Scope
Establish consistent multi-language coverage collection (Python + TypeScript), threshold gating, Codecov upload, and documentation/badge publication.

## 2. Objectives
- Backend initial gate ≥40%; path to 75%
- Frontend initial gate ≥25%; path to 60%
- Unified summary surfaced in CI & local PowerShell script

## 3. Tasks (Verbatim from Master Plan)
1. Pytest coverage: `--cov=src/backend --cov-report=xml`
2. Vitest coverage: V8 provider
3. Codecov workflow: merge status checks (backend 40% / frontend 25% initial)
4. Coverage badge in root `README.md`
5. Add acceptance gating line for thresholds
6. CI step executes PII scan before upload (fails on matches)

## 4. Implementation Details
### 4.1 Backend
- Command: `pytest --cov=src/backend --cov-report=xml:coverage-backend.xml`
- Exclude migrations & tests via `.coveragerc`

### 4.2 Frontend
- `vitest.config.ts` include `coverage: { provider: 'v8', reporter: ['text','lcov'] }`
- Output `lcov.info` stored under `coverage/`

### 4.3 Aggregation Script
- PowerShell `windows-scripts/run_tests.ps1`:
  - Run backend tests
  - Run frontend tests
  - Parse XML & lcov to extract line coverage percentages
  - Print unified table
  - Enforce thresholds (exit non-zero if below)

### 4.4 CI Workflow
- Separate jobs for backend & frontend (parallel) produce artifacts
- Aggregator / Codecov upload job downloads artifacts, uploads to Codecov with flags `backend` & `frontend`
- Codecov status checks configured with gates (project + patch levels)

### 4.5 README Badge
- Markdown badge referencing Codecov project main branch

## 5. Acceptance Criteria
- Local script prints summary with both percentages
- CI fails if coverage below thresholds
- Badge renders after first successful upload

## 6. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Coverage fluctuation from flaky tests | Stabilize tests; rerun on failure before fail |
| Slow collection due to full instrumentation | Optionally parallelize pytest (`-n auto`) later |

## 7. Future Enhancements
- Per-layer (unit/integration) differentiated coverage metrics
- Historical trend graph (Codecov or custom)
- Mutation score integration once stable baseline set

