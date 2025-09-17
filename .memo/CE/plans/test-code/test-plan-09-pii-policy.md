# Test Plan – PII Masking & Test Data Policy

Master plan: `test-code.md`. This file independently governs PII handling in tests.

## 1. Scope
Prevent accidental leakage / committing of real phone numbers or other PII through rigorous policy, scanning, and fixtures.

## 2. Objectives
- Enforce masking & synthetic data usage
- Automated regex scan gating CI
- Clear remediation workflow

## 3. Tasks (Verbatim from Master Plan)
1. Create `tests/PII_POLICY.md` with masking rules & examples
2. Phone hash helper test (matches production hashing logic)
3. Regex scan script to block raw phone patterns outside allowed paths
4. Ripgrep command (document + CI):
`rg -n --no-heading -e '(01[0-9][- ]?\d{3,4}[- ]?\d{4})' -e '[가-힣]{3,100}' -g '!src/backend/tests/fixtures/**' -g '!**/PII_POLICY.md' -g '!**/README*' . && echo FAIL && exit 1 || echo 'PII scan passed'`

## 4. Policy Content Outline (`tests/PII_POLICY.md`)
- Purpose & scope
- Allowed synthetic patterns (e.g., 010-0000-0000 reserved dummy)
- Disallowed examples & why
- Hashing procedure for phone normalization + SHA256 pattern
- Exception process (add to allowlist file with justification)

## 5. Scan Script Behavior
- Exit code 1 on first match
- Print offending line path & surrounding context
- Allowlist implemented by glob exclusions and explicit safe fixture directories

## 6. Acceptance Criteria
- CI fails when introducing forbidden number pattern in non-allowed file
- Hash helper test confirms deterministic output for sample inputs
- Policy file referenced in `docs/TESTING.md`

## 7. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| False positives from numeric strings | Tighten regex; restrict to Korean mobile prefixes |
| Developer attempts to bypass | Education + code review checklist |

## 8. Future Enhancements
- Extend scanner to names / email patterns
- Secret scanning integration (git hooks)

