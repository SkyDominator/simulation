# Test Plan – API Contract Tests

Master orchestration: `test-code.md`. This file is a standalone blueprint for contract testing.

## 1. Scope
Validate FastAPI-generated OpenAPI schema stability against a committed snapshot, detecting breaking interface changes early (removed paths/fields, type changes) while allowing additive evolution under control.

## 2. Objectives
- Prevent accidental breaking changes to public API consumed by frontend PWA
- Provide explicit workflow for intentional updates via `ALLOW_SCHEMA_UPDATE=1`
- Surface diff context in CI logs (human friendly)

## 3. Artifacts
- Snapshot file: `docs/api/openapi.snapshot.json`
- Generated temp file: `output/openapi.generated.json` (gitignored)
- Diff report: emitted to stdout + optional `output/openapi.diff.txt`

## 4. Tasks (Verbatim from Master Plan)
1. Generate (if missing) and snapshot OpenAPI to `docs/api/openapi.snapshot.json`
2. Compare live schema to snapshot; fail on removed path/fields unless `ALLOW_SCHEMA_UPDATE=1`
3. Add invoke task `openapi.snapshot` guarded by `ALLOW_SCHEMA_UPDATE=1`

## 5. Test Design
### 5.1 Schema Generation
- Import FastAPI app directly (avoid running server) to call `app.openapi()`
- Serialize canonical JSON with stable key ordering (`json.dumps(obj, sort_keys=True, separators=(",", ":"))`)

### 5.2 Comparison Logic
Classification:
- REMOVED path / operation → breaking → exit code 2
- REMOVED required field in schema → breaking → exit code 2
- Type change of a property → breaking → exit code 2
- Added path / optional field → non-breaking → exit code 0 (log summary)
- Added required field to existing request body / response → potentially breaking → treat as breaking (exit 2) unless flagged with allow env (future enhancement)

### 5.3 Pytest Integration
- Single test `test_openapi_contract.py`
- Generates live spec & loads snapshot
- Uses helper `diff_specs(old, new)` returning structured list of changes (type, location, severity)
- Asserts no `severity == 'breaking'`
- If snapshot missing & `ALLOW_SCHEMA_UPDATE=1`, writes snapshot then skips test with reason

### 5.4 Invoke Task
- `invoke openapi.snapshot`: regenerates snapshot only when `ALLOW_SCHEMA_UPDATE=1`; otherwise abort with explanation

## 6. CI Workflow
- Run after backend unit/integration pass (ensures app importable)
- On breaking diff → fail job
- On additive diff only → pass but echo guidance to update snapshot in follow-up PR if desired

## 7. Acceptance Criteria
- Test fails on intentional simulated removal during local experiment
- Running with `ALLOW_SCHEMA_UPDATE=1` refreshes snapshot deterministically
- Snapshot stable across two runs (byte-identical, ignoring trailing newline)

## 8. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Non-determinism in schema (timestamps, ordering) | Force ordering, strip volatile extensions |
| Overly strict on additive required fields | Manual allow flag or future rule refinement |
| Large diff noise | Summarize & cap per-category entries |

## 9. Future Enhancements
- JSON Schema semantic compat checker (using `openapi-diff` style rules)
- Contract tests for error responses (standardized structure)
- Generate TypeScript API client from snapshot to detect TS compile regressions

