# Test Code Reviewer

The Test Code Reviewer is an automated tool that analyzes test results and intelligently classifies issues as either test code problems (which it fixes automatically) or codebase problems (for which it creates GitHub issues).

## Overview

Based on the instructions in `.github/prompts/code-review/test-code-reviewer.prompt.md`, this tool:

1. **Analyzes test result markdown files** to identify test failures
2. **Classifies issues** into categories:
   - Test code issues (assertion mismatches, mock configuration problems)
   - Codebase issues (authentication logic, missing dependencies) 
   - Configuration issues (missing environment variables)
   - Dependency issues (missing modules, version conflicts)
   - Unclear issues (require manual investigation)
3. **Automatically fixes** test code issues where possible
4. **Generates GitHub issue descriptions** for codebase problems
5. **Provides detailed reporting** and summaries

## Installation & Usage

### Prerequisites

- Python 3.11+
- Project dependencies installed (see `requirements.txt`)

### Basic Usage

```bash
# Analyze test results and apply fixes
cd /path/to/simulation/src/backend
python test_code_reviewer.py test_results.md

# Dry run (analyze only, no fixes)
python test_code_reviewer.py test_results.md --dry-run

# Save detailed results to JSON
python test_code_reviewer.py test_results.md --output analysis_results.json

# Specify custom project root
python test_code_reviewer.py test_results.md --project-root /path/to/simulation
```

### Example Workflow

1. **Run tests and capture results:**
   ```bash
   pytest --tb=short -v > test_results.md 2>&1
   ```

2. **Review and fix issues:**
   ```bash
   python test_code_reviewer.py test_results.md
   ```

3. **Check the summary output:**
   ```
   ============================================================
   TEST CODE REVIEW SUMMARY
   ============================================================
   Total failures analyzed: 5
   Fixes applied automatically: 2

   🔧 TEST CODE ISSUES (2)
      ✅ FIXED test_JWT_001_missing_kid_raises_unauthorized - Test assertion message mismatch
      ✅ FIXED test_JWT_002_duplicated_kid_raises_error - Test expectation error

   🐛 CODEBASE ISSUES (2)  
      The following GitHub issues should be created:
      1. test_supabase_connection - Missing Supabase configuration
      2. test_otp_service_integration - Database connection failure

   ❓ UNCLEAR ISSUES (1)
      The following issues require manual investigation:
      • test_complex_scenario - Complex failure requiring analysis
   ```

4. **Create GitHub issues** for codebase problems (manual step)

## Issue Classification Logic

The reviewer uses pattern matching to classify failures:

### Test Code Issues (Auto-fixed)
- Assertion message format mismatches
- Test expectation vs. actual behavior differences  
- Mock configuration problems
- Test fixture issues

**Example:** Test expects error message "Missing 'kid' in JWT header" but code returns "Could not validate credentials"

### Codebase Issues (GitHub Issues)
- Authentication/authorization logic problems
- Missing configuration or environment variables
- Database connection issues
- API signature changes

**Example:** `supabase.SupabaseException: supabase_url is required`

### Configuration Issues
- Missing environment variables
- Incorrect configuration files
- Settings not found

### Dependency Issues  
- Missing Python modules
- Version conflicts
- Import errors

## Automatic Fixes

The tool can automatically fix common test code issues:

1. **Assertion Message Updates:** Updates test assertions to match actual error messages
2. **Test Expectation Corrections:** Adjusts test expectations to match current implementation
3. **Mock Configuration Fixes:** Corrects mock setup issues

### Example Fix

**Before:**
```python
assert "Missing 'kid' in JWT header" in str(exc_info.value.detail)
```

**After:**
```python  
assert "Could not validate credentials" in str(exc_info.value.detail)
```

## GitHub Issue Generation

For codebase issues, the tool generates comprehensive GitHub issue descriptions:

```markdown
## Problem Description
A test failure indicates a problem in the codebase that needs to be addressed.

**Test:** `test_JWT_001_missing_kid_raises_unauthorized`
**File:** `tests/unit/auth/test_jwt.py`
**Error Type:** `SupabaseException`

## Error Details
```
supabase_url is required
```

## Issue Classification
- **Type:** codebase_issue
- **Confidence:** 80.0%
- **Description:** Codebase issue affecting test: missing configuration

## Suggested Actions
Add missing configuration values or environment variables
```

## Configuration

The reviewer can be configured by modifying the classification patterns in `IssueClassifier._build_classification_patterns()`:

```python
patterns = {
    IssueType.TEST_CODE_ISSUE: [
        r"assert.*in.*str\(.*\)",     # Custom assertion patterns
        r"Expected.*but got",          # Add your patterns here
    ],
    IssueType.CODEBASE_ISSUE: [
        r"Could not validate",         # Authentication issues
        r"database.*connection",       # DB issues
    ]
}
```

## Integration with CI/CD

The tool can be integrated into your CI/CD pipeline:

```yaml
# .github/workflows/test-review.yml
- name: Run Tests
  run: |
    cd src/backend
    pytest --tb=short -v > test_results.md 2>&1 || true

- name: Review Test Results  
  run: |
    cd src/backend
    python test_code_reviewer.py test_results.md --output analysis.json

- name: Upload Results
  uses: actions/upload-artifact@v3
  with:
    name: test-analysis
    path: src/backend/analysis.json
```

## Output Formats

### Console Output
- Color-coded summary by issue type
- Clear indication of fixes applied
- List of GitHub issues to create

### JSON Output
Detailed machine-readable results including:
- All failures with classifications
- Confidence scores
- Fix success/failure status
- GitHub issue templates

### Example JSON Structure
```json
{
  "total_failures": 5,
  "test_code_issues": [
    {
      "test_name": "test_JWT_001_missing_kid",
      "error_type": "AssertionError", 
      "description": "Test expectation mismatch",
      "confidence": 0.8,
      "fixed": true
    }
  ],
  "codebase_issues": [...],
  "github_issues": [
    {
      "title": "Fix SupabaseException in test_connection",
      "body": "## Problem Description\n...",
      "labels": ["bug", "test-failure", "codebase_issue"]
    }
  ]
}
```

## Limitations & Future Enhancements

### Current Limitations
- Pattern-based classification (may miss complex issues)
- Limited fix types (mostly assertion updates)
- No integration with GitHub API (manual issue creation)

### Planned Enhancements
- Machine learning-based classification
- More sophisticated automatic fixes
- Direct GitHub integration
- Support for frontend test frameworks (Vitest, Jest)
- Integration with test coverage reports

## Troubleshooting

### Common Issues

**File encoding problems:**
```bash
# Use --encoding flag or check file encoding
file -bi test_results.md
```

**Permission errors:**
```bash
# Ensure write permissions for test files
chmod u+w tests/unit/auth/test_jwt.py
```

**Pattern matching issues:**
- Review and customize classification patterns
- Use `--dry-run` to debug without making changes
- Check JSON output for detailed analysis

### Debug Mode
```bash
# Enable verbose logging
python -v test_code_reviewer.py test_results.md --dry-run
```

## Contributing

To contribute new classification patterns or fix types:

1. Add patterns to `IssueClassifier._build_classification_patterns()`
2. Implement fix logic in `TestCodeFixer._apply_fixes()`
3. Add test cases for new patterns
4. Update this documentation

## Related Files

- `.github/prompts/code-review/test-code-reviewer.prompt.md` - Original requirements
- `src/backend/test_code_reviewer.py` - Main implementation
- `src/backend/tests/` - Test files that can be automatically fixed
- `test_results.md`, `test_unit_results.md` - Example input files