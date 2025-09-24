# Test Plan – Restructuring & Documentation Layer

Master file: `test-code.md`. This plan independently covers restructuring & documentation tasks supporting test implementation.

## 1. Scope
Organize test directories, add missing fixtures & JWKS, relocate ad-hoc scripts, and produce documentation enabling developers to understand and extend the test suite.

## 2. Objectives
- Predictable test directory taxonomy
- Deterministic JWT key fixture presence
- Clear procedural docs for migrations, OpenAPI snapshot, PII handling

## 3. Tasks (Verbatim from Master Plan)
1. Move any manual Solapi test script to `scripts/manual/send_sms_example.py` with safety guard
2. Create `src/backend/tests/unit/simulation/` directory
3. Add fixtures: OTP code factory, consent record factory, simulation input factory
4. Ensure `__init__.py` in new test package dirs
5. Add JWKS fixture file `src/backend/tests/fixtures/jwks.json`
6. Add frontend test fixtures: `src/frontend/tests/fixtures/offline_result.json` & `admin_policies.json`
7. Create `src/frontend/tests/utils/renderWithProviders.tsx` including convenience helpers for injecting `ui.page` state (per-test helper)

## 4. Documentation Tasks
1. Create `docs/TESTING.md` (layers, commands, env vars, coverage, PII policy)
2. README updates: how to run tests, coverage badge, PII scan note
3. Document OpenAPI snapshot update workflow & `ALLOW_SCHEMA_UPDATE=1` usage
4. Document DB migration & schema isolation approach
5. Document PII scan remediation steps

## 5. Acceptance Criteria
- All directories present & importable (`pytest --collect-only` shows new tests)
- JWKS fixture consumed by at least one unit & one integration test
- `docs/TESTING.md` cross-links PII policy & coverage badge
- New frontend fixture files loadable & imported without TS errors

## 6. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Stale docs after refactors | Add doc update checklist to PR template |
| Fixture sprawl | Central index in `tests/fixtures/__init__.py` |

## 7. Future Enhancements
- Automated doc generation of coverage summary (post CI)
- Developer guide for adding new simulation plan tests

