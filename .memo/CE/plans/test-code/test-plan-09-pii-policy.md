# Test Plan – PII Masking & Test Data Policy

Master plan: `test-code.md`. This file independently governs PII handling in tests.

## 1. Scope
Prevent accidental leakage / committing of real phone numbers or other PII through rigorous policy, scanning, and fixtures.

## 2. Objectives
- Enforce masking & synthetic data usage
- Automated regex scan gating CI
- Clear remediation workflow

## 3. Tasks (Verbatim from Master Plan + Clarified Scope)
1. Create `tests/PII_POLICY.md` with masking rules & examples
2. Phone hash helper test (matches production hashing logic)
3. Regex scan script to block Korean mobile numbers & long Korean names outside allowed paths
4. Ripgrep command (document + CI):
	```bash
	rg -n --no-heading \
		-e '(01[016-9][- ]?\d{3,4}[- ]?\d{4})' \
		-e '[가-힣]{2,100}' \
		-g '!src/backend/tests/fixtures/**' -g '!**/PII_POLICY.md' -g '!**/README*' . \
		&& echo FAIL && exit 1 || echo 'PII scan passed'
	```
5. Optional allowlist file `tests/pii_allowlist.txt` (initially empty). Only explicit full-string entries prefixed with `ALLOW:` are exempt; there are NO pattern wildcards permitted. Any absence from this file = failure if matched by regex.

## 4. Policy Content Outline (`tests/PII_POLICY.md`)
- Purpose & scope
- Rationale (see Section 5)
- Disallowed examples & why
- Hashing procedure for phone normalization + SHA256 pattern
- Allowlist usage
- Exception process (review + PR approval)

## 5. Scan Script Behavior & Rationale
- Exit code 1 on first match (fast fail)
- Prints offending line path & surrounding context (a few lines) for remediation
- Allowlist mechanism: strictly explicit single-line entries OR directory glob exclusions for known safe synthetic fixture dirs; no partial or wildcard matching beyond globbed fixture directory paths.

### Rationale Clarifications
- International phone formats are NOT used (app is Korea-only) – patterns like `+82-10-1234-5678` intentionally excluded to reduce false positives.
- Exposed PII surface is restricted to Korean mobile numbers and Korean names only.
- No default dummy numbers allowed because OTP auth uses real-format numbers; introducing a shared dummy risks logic branches diverging from production behavior.
- Dot or mixed separator formats (`010.1234.5678`) excluded to keep initial regex narrow; can be added later if real usage appears.
- Covered prefixes: `010, 011, 016, 017, 018, 019` (legacy + current). Regex uses class `[016-9]` to encapsulate these.
- Korean name pattern `[가-힣]{2,100}` chosen (2–100 chars) – shorter single-character names usually initials or noise; extends from previous `{3,100}` to catch valid 2‑char names.
- `tests/pii_allowlist.txt` enables explicit, auditable exceptions (e.g., educational examples) without broadening regex.

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

