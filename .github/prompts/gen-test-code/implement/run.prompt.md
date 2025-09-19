$TEST_REPORT_DIR = "c:\Users\raykim\Documents\workspace\partnerclub\simulation\.memo\CE\implement\test-code\01-backend-unit\run-report"
$TEST_REPORT_FILE = "test-01-backend-unit"

# Running Tests and Generating Reports

Follow the instructions below to run the unit tests, generate coverage reports, and save the results.

## 0. Activate virtual environment

```powershell
cd c:\Users\raykim\Documents\workspace\partnerclub\simulation\src\backend
.\venv\Scripts\activate.ps1
```

## 1. Run tests with full reporting

```powershell
python -m pytest tests/unit/ --cov=. --cov-report=term-missing --cov-report=html --junitxml=test-results.xml -v > test-output.txt 2>&1
```

## 2. View coverage report in browser

```powershell
start htmlcov/index.html
```

## 3. Create test report directory

```powershell
mkdir -p $TEST_REPORT_DIR
```

## 4. Copy results
```powershell
copy test-results.xml $TEST_REPORT_DIR
copy test-output.txt $TEST_REPORT_DIR
```

## 5. Write custom report

Reorganize the test-results and test-output into the following markdown format, and save as $TEST_REPORT_FILE in the same directory.

```markdown
# Backend Unit Test Execution Report

**Date**: 2025-09-19  
**Environment**: Python 3.11.x, Windows  
**Test Suite**: backend-unit-tests (test-plan-01-backend-unit)  
**Branch**: impl-backend-unit-test  

## Test Execution Summary

- **Total Tests**: [X] 
- **Passed**: [X]
- **Failed**: [X]
- **Skipped**: [X]
- **Duration**: [X.XX seconds]
- **Coverage**: [XX%]

## Test Categories Results

### Core Infrastructure (Tests 1-3)
- ✅ conftest.py fixtures: [X/X] passed
- ✅ simulation service factory: [X/X] passed  
- ✅ edge case handling: [X/X] passed

### Financial Logic (Tests 4-6)
- ✅ revenue logic: [X/X] passed
- ✅ tax computation: [X/X] passed
- ✅ achievement rates: [X/X] passed

### Security & Infrastructure (Test 7)
- ✅ JWKS handling: [X/X] passed

### Boundary & Stress (Tests 8-11)
- ✅ plan invariants: [X/X] passed
- ✅ round transitions: [X/X] passed
- ✅ stress tests: [X/X] passed
- ✅ monetary extremes: [X/X] passed

### Input Validation (Tests 12-15)
- ✅ achievement rates: [X/X] passed
- ✅ input sanitation: [X/X] passed
- ✅ numeric validation: [X/X] passed
- ✅ payment mapping: [X/X] passed

### Advanced Validation (Tests 16-21)
- ✅ tax accumulation: [X/X] passed
- ✅ investor ceiling: [X/X] passed
- ✅ snapshot versioning: [X/X] passed
- ✅ JWT negative paths: [X/X] passed
- ✅ phone normalization: [X/X] passed
- ✅ determinism guard: [X/X] passed

### Service Utilities (Tests 22-30)
- ✅ policy fallback: [X/X] passed
- ✅ error envelopes: [X/X] passed
- ✅ OTP limits: [X/X] passed
- ✅ rate limiting: [X/X] passed
- ✅ JWKS caching: [X/X] passed

## Coverage Analysis

- **Lines Covered**: [XXX/XXX] ([XX%])
- **Branches Covered**: [XXX/XXX] ([XX%])
- **Functions Covered**: [XXX/XXX] ([XX%])

### Coverage by Module
- `simulation_service.py`: [XX%]
- `auth/jwt.py`: [XX%]
- `services/otp/`: [XX%]
- `config/settings.py`: [XX%]

## Issues Encountered

[List any failures, import errors, or configuration issues]

## Recommendations

1. **Coverage Target**: Current [XX%] vs target 40% minimum
2. **Performance**: Longest test duration [X.XX]s 
3. **Next Actions**: [Based on results]

## Conclusion

[Overall assessment of test suite health and readiness]
```

## 5. Clean up intermediate files

```powershell
remove test-results.xml
remove test-output.txt
remove -r htmlcov
```