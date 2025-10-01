# Smart Mock Implementation for Integration Tests

## Summary

This document describes the implementation of smart mocks with validation logic for backend integration tests, addressing a critical issue where tests were providing false confidence by not validating API contracts correctly.

## Problem Statement

### Critical Issue Identified

The integration tests in `src/backend/tests/integration/api/test_simulation_endpoints.py` had **4 tests** (SIM-010, SIM-012, SIM-013, SIM-016) that were incorrectly expecting `200` status codes for invalid scenarios:

1. **SIM-010**: Running simulation with non-existent ID
2. **SIM-012**: Updating simulation with non-existent ID  
3. **SIM-013**: Updating another user's simulation
4. **SIM-016**: Deleting simulation with non-existent ID

### Root Cause

The `MockSimulationService` fixture in `conftest.py` **bypassed all validation logic**, returning success responses unconditionally. This meant:

- Tests passed while testing wrong behavior
- Integration tests failed their primary purpose (validating API contracts)
- Production bugs could slip through undetected
- API consumers would receive incorrect expectations

### Impact

- **Severity**: 🔴 **HIGH** - Integration tests provided false confidence
- **Risk**: Actual implementation correctly returns 404, but tests expected 200
- **False Positives**: 4 tests passing despite testing incorrect behavior

## Solution: Smart Mocks with Validation Logic

### Implementation Approach

Implemented a "smart mock" that accurately reflects real implementation behavior by:

1. **Tracking test simulations** with ownership information
2. **Validating existence** before operations
3. **Validating ownership** (user_id matching)
4. **Raising appropriate exceptions** (`SimulationNotFoundError` for 404)

### Code Changes

#### 1. Smart MockSimulationService (conftest.py)

```python
class MockSimulationService:
    def __init__(self):
        # Track "existing" simulations with ownership
        self.test_simulations = {
            "sim-1": {
                "id": "sim-1",
                "user_id": "test-user-123",
                "plan_id": "A"
            },
            "sim-123": {
                "id": "sim-123", 
                "user_id": "test-user-123",
                "plan_id": "A"
            },
            "other-user-sim": {
                "id": "other-user-sim",
                "user_id": "different-user-456",
                "plan_id": "B"
            }
        }
    
    def run(self, request, user_id):
        """Validates existence and ownership like real implementation."""
        from exceptions import SimulationNotFoundError
        
        sim = self.test_simulations.get(request.simulation_id)
        
        # Real implementation: db.select("*").eq("id", id).eq("user_id", user_id)
        # Returns 404 if not found OR owned by different user
        if not sim or sim["user_id"] != user_id:
            raise SimulationNotFoundError(request.simulation_id)
        
        return {"simulation_id": request.simulation_id, "success": True, ...}
```

**Key Pattern**: Validates both existence AND ownership in single check, matching SQL:
```sql
WHERE id = ? AND user_id = ?
```

This ensures:
- Non-existent simulations return 404
- Other users' simulations return 404 (not 403)
- Only valid owned simulations succeed

#### 2. Updated Test Assertions

**Before (Incorrect)**:
```python
def test_SIM_010_run_simulation_nonexistent_returns_404(...):
    response = client.post("/api/simulation/run", json=data, headers=valid_auth_headers)
    
    # Our mock always succeeds, but real implementation should check existence
    assert response.status_code == 200  # Mock behavior ❌ WRONG
```

**After (Correct)**:
```python
def test_SIM_010_run_simulation_nonexistent_returns_404(...):
    """POST /api/simulation/run with non-existent simulation returns 404."""
    data = {"simulation_id": "nonexistent-sim-that-does-not-exist"}
    
    response = client.post("/api/simulation/run", json=data, headers=valid_auth_headers)
    
    # Smart mock validates - returns 404 for non-existent simulation
    assert response.status_code == 404  # ✓ CORRECT
    result = response.json()
    assert "detail" in result
    assert "not found" in result["detail"].lower()
```

## Test Results

### All Tests Pass ✅

```bash
# Simulation endpoint tests
$ pytest tests/integration/api/test_simulation_endpoints.py -v
14 passed in 0.10s

# Full integration test suite
$ pytest tests/integration/ -v
87 passed in 1.51s
```

### Fixed Test Cases

| Test ID | Description | Before | After | Status |
|---------|-------------|--------|-------|--------|
| SIM-010 | Run non-existent simulation | Expected 200 ❌ | Expects 404 ✓ | ✅ FIXED |
| SIM-012 | Update non-existent simulation | Expected 200 ❌ | Expects 404 ✓ | ✅ FIXED |
| SIM-013 | Update other user's simulation | Expected 200 ❌ | Expects 404 ✓ | ✅ FIXED |
| SIM-016 | Delete non-existent simulation | Expected 200 ❌ | Expects 404 ✓ | ✅ FIXED |

## Benefits of Smart Mocks

### 1. Accurate API Contract Validation ✅

Tests now verify the actual API behavior, not a simplified mock behavior.

### 2. Catches Real Bugs 🐛

If the real implementation changes to return a different status code, tests will fail immediately.

### 3. Security Pattern Validation 🔒

Validates the security pattern of returning 404 (not 403) for other users' resources to prevent information disclosure.

### 4. Maintainability 🔧

Smart mocks mirror real implementation logic, making it easier to understand what's being tested.

### 5. Documentation Value 📚

Tests serve as accurate documentation of API behavior for developers and API consumers.

## pytest-mock Integration

While our smart mock doesn't strictly require pytest-mock, the library is now installed and available for future use cases:

```python
def test_example_using_mocker_fixture(mocker):
    """Example using pytest-mock's mocker fixture."""
    # Automatic cleanup, no manual patching required
    mock_func = mocker.patch('module.function', return_value="mocked")
    
    result = module.function()
    
    assert result == "mocked"
    mock_func.assert_called_once()
```

**Benefits of pytest-mock**:
- Automatic cleanup (no manual `monkeypatch` management)
- Simpler syntax for common mocking patterns
- Built-in spy functionality
- Integration with pytest fixtures

## Real Implementation Reference

The smart mock accurately reflects these real implementation patterns:

### SimulationService.run()
```python
def run(self, req: SimulationRunRequest, user_id: str) -> SimulationRunResponse:
    db_response = self.db_client.table("simulations")\
        .select("*")\
        .eq("id", req.simulation_id)\
        .eq("user_id", user_id)\
        .execute()
        
    if not db_response.data:
        raise SimulationNotFoundError(req.simulation_id)  # Returns 404
```

### SimulationService.update()
```python
def update(self, simulation_id: str, req: SimulationUpdateRequest, user_id: str):
    existing = self.db_client.table("simulations")\
        .select("id")\
        .eq("id", simulation_id)\
        .eq("user_id", user_id)\
        .execute()
        
    if not existing.data:
        raise SimulationNotFoundError(simulation_id)  # Returns 404
```

### SimulationService.delete()
```python
def delete(self, simulation_id: str, user_id: str):
    check = self.db_client.table("simulations")\
        .select("id")\
        .eq("id", simulation_id)\
        .eq("user_id", user_id)\
        .execute()
        
    if not check.data:
        raise SimulationNotFoundError(simulation_id)  # Returns 404
```

## Documentation Updates

Updated `docs/plans/test-code/test-plan-02-backend-integration.md`:

1. **Section 3.5**: Added Smart Mock Simulation Service fixture documentation
2. **Section 2.4**: Marked validated tests with ✓ 
3. **Section 4.6**: Added representative test snippets showing smart mock validation
4. **Key Notes**: Explained security pattern (404 vs 403 for ownership violations)

## Lessons Learned

### 1. Mock Complexity Trade-offs

**Simple Mocks**: Easy to write but may not catch integration issues.
**Smart Mocks**: More complex but provide accurate validation.

**Recommendation**: Use smart mocks for critical paths, simple mocks for happy paths.

### 2. Test-First Mock Design

Design mocks based on real implementation contracts, not convenience.

### 3. Security in Tests

Tests should validate security patterns (e.g., 404 vs 403 for information disclosure prevention).

### 4. Documentation as Tests

Integration tests serve as executable documentation of API contracts.

## Future Improvements

### 1. Expand Smart Mock Coverage

Consider adding smart mocks for:
- OTPService with rate limiting validation
- AdminService with privilege checking
- NoticeService with publication status validation

### 2. Test Data Builders

Implement builder pattern for complex test data:
```python
class SimulationBuilder:
    def with_owner(self, user_id: str):
        self.data["user_id"] = user_id
        return self
    
    def build(self):
        return self.data
```

### 3. Real Database for Integration Tests

Consider using a real test database for even more accurate integration testing.

### 4. Contract Testing

Add contract tests to validate API responses match OpenAPI schema.

## Conclusion

The implementation of smart mocks with validation logic has:

✅ Fixed 4 critical test failures that were providing false confidence
✅ Ensured integration tests accurately validate API contracts  
✅ Improved test maintainability and documentation value
✅ Validated security patterns (404 vs 403)
✅ Installed pytest-mock for future use cases

All 87 integration tests now pass with accurate behavior validation, providing genuine confidence in the API implementation.

---

**Author**: GitHub Copilot Agent  
**Date**: January 2025  
**Status**: ✅ Complete and Verified
