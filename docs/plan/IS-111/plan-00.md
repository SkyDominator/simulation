# Implementation Plan: Enable Settlement Bonus for All Rounds for Plan G

## Overview

Enable `settlement_bonus` for ALL simulation rounds specifically for Plan G by implementing plan-specific settlement bonus deactivation logic (Issue #111). Currently, `settlement_bonus` is automatically deactivated when `current_company_round > 15` for all plans without distinction. This feature will make settlement_bonus behavior configurable per plan.

**Approach**: Option A - Add `settlement_bonus_deactivation_round` parameter to plan configurations (Recommended)

## Current State Analysis

The application enforces a global rule that deactivates `settlement_bonus` after round 15 for **all plans** without any plan-specific logic:

1. **Global Deactivation**: `_check_settlement_bonus_condition()` in `simulation_service.py` (lines 222-233) deactivates settlement_bonus when `current_company_round > 15`
2. **No Plan Distinction**: The deactivation logic applies uniformly to all plans (A, B, C, D, E, F, G, K, P, R)
3. **Revenue Impact**: Settlement bonus is used in:
   - Internal Round 3: `revenue = (base_calc_value × 0.32) + settlement_bonus`
   - Internal Round ≥ 4: `base_revenue_r3 = (base_calc_value_r3 × 0.32) + settlement_bonus`
4. **Plan G Characteristics**: Shortest plan with `max_investor_count = 12`, uniform payments of 110,000, `settlement_bonus = 100,000`

**Key Code Locations**:
- Settlement Bonus Deactivation: `src/backend/simulation_service.py:222-233`
- Revenue Calculation: `src/backend/simulation_service.py:232-266`
- Plan G Configuration: `src/backend/constants.py:106-116`
- Related Tests: `src/backend/tests/unit/simulation/test_simulation_service.py:164-181, 593-609`

## What We're NOT Doing

- Changing settlement_bonus amount (stays 100,000)
- Modifying revenue calculation formulas
- Changing behavior of other plans (A, B, C, D, E, F, K, P, R)
- Adding UI changes (settlement_bonus is internal calculation parameter)
- Modifying frontend logic (no user-facing changes)

## Implementation Approach

Implement a configuration-driven solution following strict TDD methodology:

1. **Test Layer (FIRST)**: Define and implement all test cases before any production code changes
2. **Configuration Layer**: Add `settlement_bonus_deactivation_round` parameter to each plan in `constants.py`
3. **Logic Layer**: Update `_check_settlement_bonus_condition()` to make tests pass

This maintains backward compatibility (other plans unchanged), provides flexibility (any plan can customize deactivation round), and follows clean architecture principles (configuration-driven, not hardcoded).

**TDD Flow**: Write failing tests → Implement minimal code to pass tests → Refactor if needed

---

## Phase 1: Define Test Cases (TDD: RED Phase Preparation)

### Overview
Define comprehensive test cases for Plan G settlement bonus behavior and regression tests for other plans BEFORE implementing any production code. Following TDD principles: define tests first, understand requirements through tests.

### Test Case Definitions

#### Test Category 1: Plan G Settlement Bonus Persistence

**TC-G-001: Plan G Settlement Bonus Never Deactivates (Round 16)**
- **Purpose**: Verify Plan G maintains settlement_bonus at round 16 (where other plans deactivate)
- **Setup**: Create Plan G simulation with starting_round=1, current_round=16, simulation_rounds=5
- **Action**: Run simulation
- **Expected**:
  - `settlement_bonus_active == True` after simulation
  - `params['settlement_bonus'] == 100000` (unchanged)
  - Revenue calculations include settlement_bonus for all rounds

**TC-G-002: Plan G Settlement Bonus Never Deactivates (Round 20)**
- **Purpose**: Verify Plan G maintains settlement_bonus well beyond round 15
- **Setup**: Create Plan G simulation with starting_round=1, current_round=20, simulation_rounds=5
- **Action**: Run simulation
- **Expected**:
  - `settlement_bonus_active == True` after simulation
  - `params['settlement_bonus'] == 100000` (unchanged)
  - All investors receive settlement_bonus in revenue calculations

**TC-G-003: Plan G Revenue Consistency After Round 15**
- **Purpose**: Verify revenue calculations remain consistent with settlement_bonus after round 15
- **Setup**: Create Plan G simulation with starting_round=1, current_round=10, simulation_rounds=10
- **Action**: Run simulation, examine revenue at rounds 14, 15, 16, 17
- **Expected**:
  - Revenue at round 16+ includes settlement_bonus
  - Revenue formula: `(base_calc_value × 0.32) + 100000` at internal round 3
  - No drop in revenue at round 16 compared to round 15

**TC-G-004: Plan G Settlement Bonus with Multiple Investors**
- **Purpose**: Verify all investors receive settlement_bonus regardless of round
- **Setup**: Create Plan G simulation with multiple start rounds (1, 10, 16, 20)
- **Action**: Run simulation through 25 rounds
- **Expected**:
  - All investors receive settlement_bonus at internal round 3
  - No deactivation occurs at any company round
  - Settlement bonus state remains active throughout

#### Test Category 2: Other Plans Regression (No Behavior Change)

**TC-REG-001: Plan A Settlement Bonus Deactivates at Round 16**
- **Purpose**: Verify Plan A maintains current deactivation behavior
- **Setup**: Create Plan A simulation with starting_round=1, current_round=16, simulation_rounds=5
- **Action**: Run simulation
- **Expected**:
  - `settlement_bonus_active == False` after round 16
  - `params['settlement_bonus'] == 0` at round 16
  - Revenue calculations exclude settlement_bonus from round 16 onward

**TC-REG-002: All Non-G Plans Deactivate at Round 16**
- **Purpose**: Regression test for Plans B, C, D, E, F, K, P, R
- **Setup**: Parameterized test for each plan type
- **Action**: Run simulation starting at round 15, progressing to round 16
- **Expected**:
  - All plans show deactivation at round 16
  - Settlement bonus state changes from True to False
  - Settlement bonus value changes to 0

**TC-REG-003: Settlement Bonus Deactivates Only Once**
- **Purpose**: Verify deactivation is idempotent (doesn't trigger multiple times)
- **Setup**: Create Plan A simulation running from round 14 to round 20
- **Action**: Count deactivation log messages
- **Expected**:
  - Deactivation log appears exactly once at round 16
  - Settlement bonus state remains False for rounds 17-20
  - No repeated deactivation attempts

#### Test Category 3: Edge Cases

**TC-EDGE-001: Missing Configuration Parameter (Backward Compatibility)**
- **Purpose**: Verify system handles missing `settlement_bonus_deactivation_round` parameter
- **Setup**: Create simulation with plan params missing the new parameter
- **Action**: Run simulation through round 16
- **Expected**:
  - Default value of 15 is used
  - Settlement bonus deactivates at round 16 (current behavior)
  - No errors or exceptions raised

**TC-EDGE-002: Custom Deactivation Round**
- **Purpose**: Verify custom deactivation rounds work correctly
- **Setup**: Create test plan with `settlement_bonus_deactivation_round: 20`
- **Action**: Run simulation from round 18 to round 22
- **Expected**:
  - Settlement bonus active through round 20
  - Settlement bonus deactivates at round 21
  - Behavior matches configured round

**TC-EDGE-003: Plan G Starting After Round 15**
- **Purpose**: Verify Plan G works correctly when starting beyond typical deactivation round
- **Setup**: Create Plan G simulation with starting_round=18
- **Action**: Run simulation for 5 rounds
- **Expected**:
  - Settlement bonus remains active throughout
  - No deactivation occurs despite starting after round 15
  - Revenue calculations include settlement_bonus

#### Test Category 4: Integration Tests

**TC-INT-001: Plan G Full Simulation End-to-End**
- **Purpose**: Verify complete Plan G simulation with settlement_bonus throughout
- **Setup**: Create Plan G simulation with realistic parameters (starting_round=1, 20 simulation rounds)
- **Action**: Run full simulation, verify all round results
- **Expected**:
  - All 20 rounds complete successfully
  - Settlement bonus active throughout all rounds
  - Total revenue reflects settlement_bonus in all calculations
  - No deactivation log messages

**TC-INT-002: Mixed Plans in Same Test Session**
- **Purpose**: Verify plan isolation (Plan G doesn't affect Plan A behavior)
- **Setup**: Run Plan G simulation, then Plan A simulation in same test
- **Action**: Execute both simulations sequentially
- **Expected**:
  - Plan G maintains settlement_bonus throughout
  - Plan A deactivates settlement_bonus at round 16
  - Plans don't interfere with each other's state

### Test Implementation Locations

Based on project test structure:

- **Unit Tests**: `src/backend/tests/unit/simulation/test_simulation_service.py`
  - Add TC-G-001, TC-G-002, TC-G-003, TC-G-004
  - Update existing tests: `test_RND_005_settlement_bonus_deactivates_round_16` (line 164-181)
  - Update existing tests: `test_settlement_bonus_deactivation_after_round_15` (line 593-609)
  - Add TC-REG-001, TC-REG-002, TC-REG-003
  - Add TC-EDGE-001, TC-EDGE-002, TC-EDGE-003
  - Add TC-INT-001, TC-INT-002

### Success Criteria

#### Automated Verification:
- [ ] All test case definitions are clear and unambiguous
- [ ] Expected results are specific and measurable
- [ ] Test cases cover all code paths
- [ ] Regression tests cover all non-G plans

#### Manual Verification:
- [ ] Review test case definitions with stakeholders
- [ ] Confirm expected behavior matches requirements
- [ ] Verify edge cases are comprehensive
- [ ] Ensure no test cases are redundant

---

## Phase 2: Implement Test Code (TDD: Write Failing Tests)

### Overview
Implement all test cases defined in Phase 1 BEFORE making any production code changes. These tests will initially FAIL, which is expected in TDD's RED phase.

### Changes Required

#### 1. Add Parameter to Plan G
**File**: `src/backend/constants.py`
**Lines**: 106-116 (Plan G configuration)
**Changes**: Add `settlement_bonus_deactivation_round` parameter

**Before**:
```python
"G": {
    'max_investor_count': 12,
    'min_payment_new': {1: 110000, 2: 110000, 3:110000, 4: 110000, 5: 110000, 6: 110000, 7: 110000, 8: 110000, 9: 110000, 10: 110000, 11: 110000, 12: 110000,},
    'min_payment_re': 110000,
    'revenue_base_divisor': 1.1,
    'sales_commission': 0.32,
    'settlement_bonus': 100000,
    'max_bonus': 30000000,
    'round_bonus_rates': {4: 1, 5: 1, 6: 2, 7: 2, 8: 3, 9: 3, 10: 5, 11: 5, 12:10},
    'sales_achievement_rates': {4: 1, 5:1, 6:1, 7:1, 8:1, 9:1, 10:1, 11:1, 12:1}
},
```

**After**:
```python
"G": {
    'max_investor_count': 12,
    'min_payment_new': {1: 110000, 2: 110000, 3:110000, 4: 110000, 5: 110000, 6: 110000, 7: 110000, 8: 110000, 9: 110000, 10: 110000, 11: 110000, 12: 110000,},
    'min_payment_re': 110000,
    'revenue_base_divisor': 1.1,
    'sales_commission': 0.32,
    'settlement_bonus': 100000,
    'settlement_bonus_deactivation_round': None,  # Never deactivate for Plan G
    'max_bonus': 30000000,
    'round_bonus_rates': {4: 1, 5: 1, 6: 2, 7: 2, 8: 3, 9: 3, 10: 5, 11: 5, 12:10},
    'sales_achievement_rates': {4: 1, 5:1, 6:1, 7:1, 8:1, 9:1, 10:1, 11:1, 12:1}
},
```

**Rationale**:
- `None` value explicitly indicates settlement_bonus should never deactivate
- Clear intent for Plan G's unique behavior
- Self-documenting configuration

#### 2. Add Parameter to Other Plans
**File**: `src/backend/constants.py`
**Lines**: 6-105 (Plans A, B, C, D, E, F, K, P, R)
**Changes**: Add `settlement_bonus_deactivation_round: 15` to maintain current behavior

**For each plan (A, B, C, D, E, F, K, P, R)**, add after `settlement_bonus`:
```python
'settlement_bonus_deactivation_round': 15,  # Maintain current behavior
```

**Example for Plan A**:
```python
"A": {
    'max_investor_count': 15,
    'min_payment_new': {...},
    'min_payment_re': 100000,
    'revenue_base_divisor': 1,
    'sales_commission': 0.32,
    'settlement_bonus': 100000,
    'settlement_bonus_deactivation_round': 15,  # Maintain current behavior
    'max_bonus': 100000000,
    'round_bonus_rates': {...},
    'sales_achievement_rates': {...}
},
```

**Rationale**:
- Explicit configuration for all plans (consistency)
- Default value of 15 maintains current behavior
- No behavioral changes for existing plans
- Future plans can easily customize deactivation round

### Success Criteria

#### Automated Verification:
- [ ] Python syntax is valid: `python -m py_compile src/backend/constants.py`
- [ ] Import succeeds: `python -c "from src.backend.constants import PLAN_PARAMETERS; print(PLAN_PARAMETERS['G']['settlement_bonus_deactivation_round'])"`
- [ ] Plan G has `settlement_bonus_deactivation_round: None`
- [ ] All other plans have `settlement_bonus_deactivation_round: 15`

#### Manual Verification:
- [ ] Open `constants.py` and verify all plans have new parameter
- [ ] Verify Plan G parameter is `None`
- [ ] Verify other plans parameter is `15`
- [ ] No other changes to existing parameters

---

## Phase 2: Implement Test Code (TDD: Write Failing Tests)

### Overview
Implement all test cases defined in Phase 1 BEFORE making any production code changes. These tests will initially FAIL, which is expected in TDD's RED phase.

### Changes Required

#### 1. Add Plan G Settlement Bonus Tests
**File**: `src/backend/tests/unit/simulation/test_simulation_service.py`
**Changes**: Add new test functions after existing tests

**Before**:
```python
def _check_settlement_bonus_condition(self, investor: Investor) -> None:
    """
    Check if settlement bonus should be deactivated based on investor status.
    """
    if (self.settlement_bonus_active and 
            self.current_company_round > 15):
        self.settlement_bonus_active = False
        self.params['settlement_bonus'] = 0
        logger.info("Settlement bonus deactivated: First investor reached 16th or higher current_company_round")
```

**After**:
```python
def _check_settlement_bonus_condition(self, investor: Investor) -> None:
    """
    Check if settlement bonus should be deactivated based on plan configuration.
    
    The deactivation round is controlled by the 'settlement_bonus_deactivation_round' 
    parameter in the plan configuration. If set to None, settlement bonus never deactivates.
    """
    # Get deactivation round from plan config (default to 15 for backward compatibility)
    deactivation_round = self.params.get('settlement_bonus_deactivation_round', 15)
    
    # If deactivation_round is None, never deactivate settlement bonus
    if deactivation_round is None:
        return
    
    # Check if current round exceeds deactivation threshold
    if (self.settlement_bonus_active and 
            self.current_company_round > deactivation_round):
        self.settlement_bonus_active = False
        self.params['settlement_bonus'] = 0
        logger.info(
            f"Settlement bonus deactivated: company_round {self.current_company_round} > "
            f"deactivation_round {deactivation_round} (plan: {self.params.get('plan_type', 'unknown')})"
        )
```

**Rationale**:
- Uses `params.get('settlement_bonus_deactivation_round', 15)` for backward compatibility
- Explicit check for `None` value (clear intent)
- Early return when deactivation is disabled (clean code)
- Enhanced logging with plan type and actual rounds (debugging)
- Improved docstring explains configuration-driven behavior

#### 2. No Other Changes Required
**Files**: No changes to other methods
- `_calculate_revenue()` (lines 232-266): Already uses `self.params['settlement_bonus']`, no changes needed
- `__init__()` (lines 149-150): Initialization logic stays the same
- `run_simulation()` (lines 407-410): State reset logic stays the same

**Rationale**:
- Settlement bonus deactivation is encapsulated in one method
- Revenue calculation logic remains unchanged
- Clean separation of concerns

### Success Criteria

#### Automated Verification:
- [ ] Python syntax is valid: `python -m py_compile src/backend/simulation_service.py`
- [ ] No syntax errors in updated method
- [ ] Logger import exists at top of file
- [ ] Method signature unchanged (no breaking changes)

#### Manual Verification:
- [ ] Review updated `_check_settlement_bonus_condition()` method
- [ ] Verify `None` check exists before deactivation
- [ ] Verify enhanced logging includes plan type and rounds
- [ ] Verify default value of 15 for backward compatibility
- [ ] Verify docstring updated

---

## Phase 3: Run Failing Tests (TDD: RED Phase)

### Overview
Execute all newly written tests to verify they FAIL as expected. This confirms the tests are testing the right behavior and that current implementation doesn't already pass them.

### Test Execution Steps

#### Step 1: Run New Plan G Tests (Should FAIL)



```python
# Add at end of file or in appropriate section

def test_plan_g_settlement_bonus_never_deactivates_round_16(simulation_service_factory):
    """
    TC-G-001: Plan G Settlement Bonus Never Deactivates (Round 16)
    Verify Plan G maintains settlement_bonus at round 16 where other plans deactivate.
    """
    svc = simulation_service_factory('G')
    
    # Setup: Start at round 1, current at 16, run 5 simulation rounds
    svc.starting_company_round = 1
    svc.current_company_round = 16
    result = svc.run_simulation(5)
    
    # Verify settlement bonus remains active
    assert svc.settlement_bonus_active == True, "Plan G settlement_bonus should remain active after round 15"
    assert svc.params['settlement_bonus'] == 100000, "Plan G settlement_bonus value should be unchanged"
    
    # Verify revenue includes settlement_bonus
    assert len(result.history) == 5, "Should have 5 round results"
    for round_result in result.history:
        assert round_result.total_revenue_before_tax > 0, "Revenue should include settlement_bonus"


def test_plan_g_settlement_bonus_never_deactivates_round_20(simulation_service_factory):
    """
    TC-G-002: Plan G Settlement Bonus Never Deactivates (Round 20)
    Verify Plan G maintains settlement_bonus well beyond round 15.
    """
    svc = simulation_service_factory('G')
    
    # Setup: Start at round 1, current at 20, run 5 simulation rounds
    svc.starting_company_round = 1
    svc.current_company_round = 20
    result = svc.run_simulation(5)
    
    # Verify settlement bonus remains active
    assert svc.settlement_bonus_active == True, "Plan G settlement_bonus should remain active at round 20+"
    assert svc.params['settlement_bonus'] == 100000, "Plan G settlement_bonus value should be 100000"


def test_plan_g_revenue_consistency_after_round_15(simulation_service_factory):
    """
    TC-G-003: Plan G Revenue Consistency After Round 15
    Verify revenue calculations remain consistent with settlement_bonus after round 15.
    """
    svc = simulation_service_factory('G')
    
    # Setup: Start at round 1, current at 10, run 10 simulation rounds (covers rounds 10-19)
    svc.starting_company_round = 1
    svc.current_company_round = 10
    result = svc.run_simulation(10)
    
    # Extract results for rounds 14, 15, 16, 17
    rounds_14_to_17 = [r for r in result.history if 14 <= r.company_round <= 17]
    assert len(rounds_14_to_17) == 4, "Should have results for rounds 14-17"
    
    # Verify no revenue drop at round 16
    revenue_15 = next(r for r in result.history if r.company_round == 15).total_revenue_before_tax
    revenue_16 = next(r for r in result.history if r.company_round == 16).total_revenue_before_tax
    
    # Revenue at round 16 should not drop due to settlement_bonus deactivation
    assert revenue_16 > 0, "Revenue at round 16 should be positive"
    # Note: Exact comparison depends on investor count, but revenue should not become negative
    
    # Verify settlement bonus is still active after all rounds
    assert svc.settlement_bonus_active == True, "Settlement bonus should remain active throughout"


def test_plan_g_settlement_bonus_multiple_investors(simulation_service_factory):
    """
    TC-G-004: Plan G Settlement Bonus with Multiple Investors
    Verify all investors receive settlement_bonus regardless of round.
    """
    svc = simulation_service_factory('G')
    
    # Setup: Multiple investors starting at different rounds
    svc.starting_company_round = 1
    svc.current_company_round = 1
    
    # Run simulation through 25 rounds
    result = svc.run_simulation(25)
    
    # Verify settlement bonus never deactivated
    assert svc.settlement_bonus_active == True, "Settlement bonus should remain active throughout 25 rounds"
    assert svc.params['settlement_bonus'] == 100000, "Settlement bonus value should be unchanged"
    
    # Verify revenue generated for all rounds
    assert len(result.history) == 25, "Should have 25 round results"
    for round_result in result.history:
        assert round_result.total_revenue_before_tax >= 0, f"Round {round_result.company_round} revenue should be non-negative"


def test_plan_g_settlement_bonus_starting_after_round_15(simulation_service_factory):
    """
    TC-EDGE-003: Plan G Starting After Round 15
    Verify Plan G works correctly when starting beyond typical deactivation round.
    """
    svc = simulation_service_factory('G')
    
    # Setup: Start at round 18 (well after typical deactivation round 15)
    svc.starting_company_round = 18
    svc.current_company_round = 18
    result = svc.run_simulation(5)
    
    # Verify settlement bonus remains active
    assert svc.settlement_bonus_active == True, "Settlement bonus should be active even when starting after round 15"
    assert svc.params['settlement_bonus'] == 100000, "Settlement bonus value should be 100000"
    
    # Verify revenue calculations include settlement_bonus
    assert len(result.history) == 5, "Should have 5 round results"
```

**Rationale**:
- Follows existing test patterns in the file
- Uses `simulation_service_factory` fixture
- Clear assertions with descriptive messages
- Tests cover main scenarios and edge cases
- Docstrings map to test case IDs from Phase 3

#### 2. Update Existing Deactivation Tests
**File**: `src/backend/tests/unit/simulation/test_simulation_service.py`
**Lines**: 164-181, 593-609
**Changes**: Update to exclude Plan G or add Plan G variants

**Test 1: `test_RND_005_settlement_bonus_deactivates_round_16` (lines 164-181)**

**Option A - Skip Plan G**:
```python
@pytest.mark.parametrize("plan_type", ["A", "B", "C", "D", "E", "F", "K", "P", "R"])
def test_RND_005_settlement_bonus_deactivates_round_16(simulation_service_factory, plan_type):
    """
    RND-005: Settlement bonus should deactivate at round 16 for all plans except Plan G.
    """
    svc = simulation_service_factory(plan_type)
    # ... existing test logic ...
```

**Option B - Add conditional assertion**:
```python
def test_RND_005_settlement_bonus_deactivates_round_16(simulation_service_factory):
    """
    RND-005: Settlement bonus should deactivate at round 16 for non-G plans.
    """
    # ... existing setup ...
    
    if plan_type == 'G':
        # Plan G should NOT deactivate
        assert svc.settlement_bonus_active == True
        assert svc.params['settlement_bonus'] == 100000
    else:
        # Other plans should deactivate
        assert svc.settlement_bonus_active == False
        assert svc.params['settlement_bonus'] == 0
```

**Test 2: `test_settlement_bonus_deactivation_after_round_15` (lines 593-609)**

Similar update to skip Plan G or add conditional logic:
```python
@pytest.mark.parametrize("plan_type", ["A", "B", "C", "D", "E", "F", "K", "P", "R"])
def test_settlement_bonus_deactivation_after_round_15(simulation_service_factory, plan_type):
    """
    Test settlement bonus deactivation after round 15 for non-G plans.
    """
    # ... existing test logic ...
```

**Rationale**:
- Maintains test coverage for existing plans
- Explicitly excludes Plan G from deactivation tests
- No breaking changes to test suite
- Clear documentation of Plan G exception

#### 3. Add Regression Tests for Other Plans
**File**: `src/backend/tests/unit/simulation/test_simulation_service.py`
**Changes**: Add comprehensive regression test

```python
@pytest.mark.parametrize("plan_type", ["A", "B", "C", "D", "E", "F", "K", "P", "R"])
def test_non_g_plans_settlement_bonus_deactivates_at_round_16(simulation_service_factory, plan_type):
    """
    TC-REG-002: All Non-G Plans Deactivate at Round 16
    Regression test to ensure all plans except G maintain current deactivation behavior.
    """
    svc = simulation_service_factory(plan_type)
    
    # Setup: Start at round 15, progress to round 16
    svc.starting_company_round = 1
    svc.current_company_round = 15
    
    # Verify settlement bonus is active at round 15
    result_15 = svc.run_simulation(1)
    assert svc.current_company_round == 15, "Should be at round 15"
    # Note: Deactivation check happens DURING round processing, so check after next round
    
    # Run one more round to trigger deactivation
    svc.current_company_round = 16
    result_16 = svc.run_simulation(1)
    
    # Verify settlement bonus is deactivated at round 16
    assert svc.settlement_bonus_active == False, f"Plan {plan_type} should deactivate settlement_bonus at round 16"
    assert svc.params['settlement_bonus'] == 0, f"Plan {plan_type} settlement_bonus should be 0 at round 16"


def test_settlement_bonus_deactivation_idempotent(simulation_service_factory):
    """
    TC-REG-003: Settlement Bonus Deactivates Only Once
    Verify deactivation is idempotent and doesn't trigger multiple times.
    """
    svc = simulation_service_factory('A')
    
    # Setup: Run from round 14 to round 20
    svc.starting_company_round = 1
    svc.current_company_round = 14
    result = svc.run_simulation(7)  # Rounds 14-20
    
    # Verify deactivation state remains False after round 16
    assert svc.settlement_bonus_active == False, "Settlement bonus should be deactivated after round 15"
    
    # Run additional rounds - deactivation should not be repeated
    svc.current_company_round = 21
    result_continued = svc.run_simulation(3)  # Rounds 21-23
    
    # Verify state remains False
    assert svc.settlement_bonus_active == False, "Settlement bonus should remain deactivated"
    assert svc.params['settlement_bonus'] == 0, "Settlement bonus value should remain 0"
```

**Rationale**:
- Parameterized test covers all non-G plans efficiently
- Regression test ensures no unintended behavior changes
- Idempotent test verifies clean state management
- Comprehensive coverage for backward compatibility

#### 4. Add Edge Case Tests
**File**: `src/backend/tests/unit/simulation/test_simulation_service.py`
**Changes**: Add edge case tests

```python
def test_missing_deactivation_round_parameter_defaults_to_15(simulation_service_factory):
    """
    TC-EDGE-001: Missing Configuration Parameter (Backward Compatibility)
    Verify system handles missing settlement_bonus_deactivation_round parameter.
    """
    svc = simulation_service_factory('A')
    
    # Manually remove the parameter to simulate missing config
    if 'settlement_bonus_deactivation_round' in svc.params:
        del svc.params['settlement_bonus_deactivation_round']
    
    # Setup: Run through round 16
    svc.starting_company_round = 1
    svc.current_company_round = 16
    result = svc.run_simulation(2)
    
    # Verify default behavior (deactivation at round 16)
    assert svc.settlement_bonus_active == False, "Should default to deactivation at round 16"
    assert svc.params['settlement_bonus'] == 0, "Settlement bonus should be 0 with missing parameter"


def test_custom_deactivation_round(simulation_service_factory):
    """
    TC-EDGE-002: Custom Deactivation Round
    Verify custom deactivation rounds work correctly.
    """
    svc = simulation_service_factory('A')
    
    # Set custom deactivation round to 20
    svc.params['settlement_bonus_deactivation_round'] = 20
    
    # Setup: Run from round 18 to round 22
    svc.starting_company_round = 1
    svc.current_company_round = 18
    svc.run_simulation(1)  # Round 18
    assert svc.settlement_bonus_active == True, "Should be active at round 18"
    
    svc.current_company_round = 19
    svc.run_simulation(1)  # Round 19
    assert svc.settlement_bonus_active == True, "Should be active at round 19"
    
    svc.current_company_round = 20
    svc.run_simulation(1)  # Round 20
    assert svc.settlement_bonus_active == True, "Should be active at round 20"
    
    svc.current_company_round = 21
    svc.run_simulation(1)  # Round 21
    assert svc.settlement_bonus_active == False, "Should deactivate at round 21"
```

**Rationale**:
- Tests backward compatibility explicitly
- Verifies custom deactivation rounds work as designed
- Edge cases ensure robustness of implementation

#### 5. Add Integration Test
**File**: `src/backend/tests/unit/simulation/test_simulation_service.py` or create new integration test file
**Changes**: Add integration test for plan isolation

```python
def test_plan_g_and_plan_a_isolation(simulation_service_factory):
    """
    TC-INT-002: Mixed Plans in Same Test Session
    Verify plan isolation - Plan G doesn't affect Plan A behavior.
    """
    # Run Plan G simulation
    svc_g = simulation_service_factory('G')
    svc_g.starting_company_round = 1
    svc_g.current_company_round = 16
    result_g = svc_g.run_simulation(5)
    
    # Verify Plan G maintains settlement bonus
    assert svc_g.settlement_bonus_active == True, "Plan G should maintain settlement_bonus"
    assert svc_g.params['settlement_bonus'] == 100000, "Plan G settlement_bonus should be 100000"
    
    # Run Plan A simulation in same session
    svc_a = simulation_service_factory('A')
    svc_a.starting_company_round = 1
    svc_a.current_company_round = 16
    result_a = svc_a.run_simulation(5)
    
    # Verify Plan A deactivates settlement bonus
    assert svc_a.settlement_bonus_active == False, "Plan A should deactivate settlement_bonus"
    assert svc_a.params['settlement_bonus'] == 0, "Plan A settlement_bonus should be 0"
    
    # Verify plans didn't interfere with each other
    assert svc_g.settlement_bonus_active == True, "Plan G state should be unchanged"
    assert svc_a.settlement_bonus_active == False, "Plan A state should be unchanged"
```

**Rationale**:
- Tests that plan configurations are properly isolated
- Verifies no shared state issues between simulations
- Important for multi-tenant or concurrent usage scenarios

**Expected**: Tests should FAIL because production code hasn't been changed yet

```bash
# Run all new Plan G tests - SHOULD FAIL
pytest src/backend/tests/unit/simulation/test_simulation_service.py -k "test_plan_g" -v

# Expected: FAILED - settlement_bonus_active == False (expected True)
```

**Verification**:
- [ ] All new Plan G tests FAIL as expected
- [ ] Failure messages indicate settlement_bonus is deactivated at round 16
- [ ] Test infrastructure works correctly (no import errors, fixture issues)
- [ ] Failure reasons match expected behavior (tests are testing the right thing)

#### Step 2: Verify Regression Tests Still Pass

```bash
# Run existing tests - SHOULD STILL PASS
pytest src/backend/tests/unit/simulation/test_simulation_service.py -k "not test_plan_g and not test_non_g_plans and not test_missing_deactivation and not test_custom_deactivation" -v
```

**Verification**:
- [ ] Existing tests still pass (no accidental breakage from new tests)
- [ ] Test file syntax is valid
- [ ] No conflicts between new and existing tests

### Success Criteria

#### Automated Verification:
- [ ] New Plan G tests FAIL with expected error messages
- [ ] Existing tests continue to PASS
- [ ] Test syntax is valid: `python -m py_compile src/backend/tests/unit/simulation/test_simulation_service.py`
- [ ] No import errors or fixture issues

#### Manual Verification:
- [ ] Review test failure output confirms tests are checking the right behavior
- [ ] Failure messages are clear and helpful
- [ ] Test code is readable and follows project patterns

---

## Phase 4: Update Plan Configuration (TDD: Make Tests Pass - Part 1)

### Overview
Add `settlement_bonus_deactivation_round` parameter to all plan configurations. This is the first step in making the tests pass.

### Changes Required

#### 1. Add Parameter to Plan G
**File**: `src/backend/constants.py`
**Lines**: 106-116 (Plan G configuration)
**Changes**: Add `settlement_bonus_deactivation_round` parameter

**Before**:
```python
"G": {
    'max_investor_count': 12,
    'min_payment_new': {1: 110000, 2: 110000, 3:110000, 4: 110000, 5: 110000, 6: 110000, 7: 110000, 8: 110000, 9: 110000, 10: 110000, 11: 110000, 12: 110000,},
    'min_payment_re': 110000,
    'revenue_base_divisor': 1.1,
    'sales_commission': 0.32,
    'settlement_bonus': 100000,
    'max_bonus': 30000000,
    'round_bonus_rates': {4: 1, 5: 1, 6: 2, 7: 2, 8: 3, 9: 3, 10: 5, 11: 5, 12:10},
    'sales_achievement_rates': {4: 1, 5:1, 6:1, 7:1, 8:1, 9:1, 10:1, 11:1, 12:1}
},
```

**After**:
```python
"G": {
    'max_investor_count': 12,
    'min_payment_new': {1: 110000, 2: 110000, 3:110000, 4: 110000, 5: 110000, 6: 110000, 7: 110000, 8: 110000, 9: 110000, 10: 110000, 11: 110000, 12: 110000,},
    'min_payment_re': 110000,
    'revenue_base_divisor': 1.1,
    'sales_commission': 0.32,
    'settlement_bonus': 100000,
    'settlement_bonus_deactivation_round': None,  # Never deactivate for Plan G
    'max_bonus': 30000000,
    'round_bonus_rates': {4: 1, 5: 1, 6: 2, 7: 2, 8: 3, 9: 3, 10: 5, 11: 5, 12:10},
    'sales_achievement_rates': {4: 1, 5:1, 6:1, 7:1, 8:1, 9:1, 10:1, 11:1, 12:1}
},
```

**Rationale**:
- `None` value explicitly indicates settlement_bonus should never deactivate
- Clear intent for Plan G's unique behavior
- Self-documenting configuration

#### 2. Add Parameter to Other Plans
**File**: `src/backend/constants.py`
**Lines**: 6-105 (Plans A, B, C, D, E, F, K, P, R)
**Changes**: Add `settlement_bonus_deactivation_round: 15` to maintain current behavior

**For each plan (A, B, C, D, E, F, K, P, R)**, add after `settlement_bonus`:
```python
'settlement_bonus_deactivation_round': 15,  # Maintain current behavior
```

**Example for Plan A**:
```python
"A": {
    'max_investor_count': 15,
    'min_payment_new': {...},
    'min_payment_re': 100000,
    'revenue_base_divisor': 1,
    'sales_commission': 0.32,
    'settlement_bonus': 100000,
    'settlement_bonus_deactivation_round': 15,  # Maintain current behavior
    'max_bonus': 100000000,
    'round_bonus_rates': {...},
    'sales_achievement_rates': {...}
},
```

**Rationale**:
- Explicit configuration for all plans (consistency)
- Default value of 15 maintains current behavior
- No behavioral changes for existing plans
- Future plans can easily customize deactivation round

### Success Criteria

#### Automated Verification:
- [ ] Python syntax is valid: `python -m py_compile src/backend/constants.py`
- [ ] Import succeeds: `python -c "from src.backend.constants import PLAN_PARAMETERS; print(PLAN_PARAMETERS['G']['settlement_bonus_deactivation_round'])"`
- [ ] Plan G has `settlement_bonus_deactivation_round: None`
- [ ] All other plans have `settlement_bonus_deactivation_round: 15`

#### Manual Verification:
- [ ] Open `constants.py` and verify all plans have new parameter
- [ ] Verify Plan G parameter is `None`
- [ ] Verify other plans parameter is `15`
- [ ] No other changes to existing parameters

---

## Phase 5: Update Settlement Bonus Deactivation Logic (TDD: Make Tests Pass - Part 2)

### Overview
Modify `_check_settlement_bonus_condition()` method to use plan-specific `settlement_bonus_deactivation_round` parameter. This completes the implementation to make all tests pass.

### Changes Required

#### 1. Update Deactivation Logic
**File**: `src/backend/simulation_service.py`
**Lines**: 222-233
**Changes**: Make deactivation logic plan-aware

**Before**:
```python
def _check_settlement_bonus_condition(self, investor: Investor) -> None:
    """
    Check if settlement bonus should be deactivated based on investor status.
    """
    if (self.settlement_bonus_active and 
            self.current_company_round > 15):
        self.settlement_bonus_active = False
        self.params['settlement_bonus'] = 0
        logger.info("Settlement bonus deactivated: First investor reached 16th or higher current_company_round")
```

**After**:
```python
def _check_settlement_bonus_condition(self, investor: Investor) -> None:
    """
    Check if settlement bonus should be deactivated based on plan configuration.
    
    The deactivation round is controlled by the 'settlement_bonus_deactivation_round' 
    parameter in the plan configuration. If set to None, settlement bonus never deactivates.
    """
    # Get deactivation round from plan config (default to 15 for backward compatibility)
    deactivation_round = self.params.get('settlement_bonus_deactivation_round', 15)
    
    # If deactivation_round is None, never deactivate settlement bonus
    if deactivation_round is None:
        return
    
    # Check if current round exceeds deactivation threshold
    if (self.settlement_bonus_active and 
            self.current_company_round > deactivation_round):
        self.settlement_bonus_active = False
        self.params['settlement_bonus'] = 0
        logger.info(
            f"Settlement bonus deactivated: company_round {self.current_company_round} > "
            f"deactivation_round {deactivation_round} (plan: {self.params.get('plan_type', 'unknown')})"
        )
```

**Rationale**:
- Uses `params.get('settlement_bonus_deactivation_round', 15)` for backward compatibility
- Explicit check for `None` value (clear intent)
- Early return when deactivation is disabled (clean code)
- Enhanced logging with plan type and actual rounds (debugging)
- Improved docstring explains configuration-driven behavior

#### 2. No Other Changes Required
**Files**: No changes to other methods
- `_calculate_revenue()` (lines 232-266): Already uses `self.params['settlement_bonus']`, no changes needed
- `__init__()` (lines 149-150): Initialization logic stays the same
- `run_simulation()` (lines 407-410): State reset logic stays the same

**Rationale**:
- Settlement bonus deactivation is encapsulated in one method
- Revenue calculation logic remains unchanged
- Clean separation of concerns

### Success Criteria

#### Automated Verification:
- [ ] Python syntax is valid: `python -m py_compile src/backend/simulation_service.py`
- [ ] No syntax errors in updated method
- [ ] Logger import exists at top of file
- [ ] Method signature unchanged (no breaking changes)

#### Manual Verification:
- [ ] Review updated `_check_settlement_bonus_condition()` method
- [ ] Verify `None` check exists before deactivation
- [ ] Verify enhanced logging includes plan type and rounds
- [ ] Verify default value of 15 for backward compatibility
- [ ] Verify docstring updated

---

## Phase 6: Run Tests and Verify (TDD: GREEN Phase)

### Overview
Execute all tests to verify they now PASS after implementing the production code changes.

### Test Execution Steps

#### Step 1: Run All Tests (Should PASS Now)

```bash
# Run all new Plan G tests - SHOULD NOW PASS
pytest src/backend/tests/unit/simulation/test_simulation_service.py -k "test_plan_g" -v

# Run regression tests - SHOULD PASS
pytest src/backend/tests/unit/simulation/test_simulation_service.py -k "test_non_g_plans" -v

# Run edge case tests - SHOULD PASS
pytest src/backend/tests/unit/simulation/test_simulation_service.py -k "missing_deactivation_round or custom_deactivation_round" -v

# Run ALL simulation service tests - SHOULD PASS
pytest src/backend/tests/unit/simulation/test_simulation_service.py -v
```

**Verification**:
- [ ] All new Plan G tests PASS
- [ ] All regression tests PASS (other plans unchanged)
- [ ] All edge case tests PASS
- [ ] No existing tests break

#### Step 2: Run Full Backend Test Suite

```bash
# Run all backend unit tests
pytest src/backend/tests/unit/ -v

# Run with coverage report
pytest src/backend/tests/unit/ --cov=src.backend --cov-report=term-missing --cov-report=html
```

**Verification**:
- [ ] All unit tests pass
- [ ] Code coverage ≥80% for modified files
- [ ] No unexpected test failures
- [ ] Coverage report shows new code is tested

#### Step 3: Validate Constants Schema

```bash
# Run constants validation tests
pytest src/backend/tests/unit/test_constants.py -v
```

**Verification**:
- [ ] Constants validation passes
- [ ] New parameter is accepted by schema (if schema validation exists)
- [ ] All plan configurations are valid

### Manual Testing Scenarios

#### Manual Test 1: Plan G Beyond Round 15
**Setup**:
```python
from src.backend.simulation_service import SimulationService
from src.backend.constants import PLAN_PARAMETERS

# Create Plan G simulation
svc = SimulationService('G', starting_company_round=1, current_company_round=16)
result = svc.run_simulation(10)

# Verify settlement bonus active
print(f"Settlement bonus active: {svc.settlement_bonus_active}")  # Should be True
print(f"Settlement bonus value: {svc.params['settlement_bonus']}")  # Should be 100000
```

**Expected**:
- `settlement_bonus_active == True`
- `settlement_bonus == 100000`
- Revenue for all rounds includes settlement_bonus

#### Manual Test 2: Plan A Deactivation (Regression)
**Setup**:
```python
# Create Plan A simulation
svc = SimulationService('A', starting_company_round=1, current_company_round=16)
result = svc.run_simulation(5)

# Verify settlement bonus deactivated
print(f"Settlement bonus active: {svc.settlement_bonus_active}")  # Should be False
print(f"Settlement bonus value: {svc.params['settlement_bonus']}")  # Should be 0
```

**Expected**:
- `settlement_bonus_active == False`
- `settlement_bonus == 0`
- Behavior unchanged from before

#### Manual Test 3: Log Message Verification
**Setup**: Run simulation and check logs

```bash
# Run with debug logging
PYTHONPATH=src/backend python -c "
import logging
logging.basicConfig(level=logging.INFO)
from simulation_service import SimulationService

svc_g = SimulationService('G', starting_company_round=1, current_company_round=16)
svc_g.run_simulation(2)

svc_a = SimulationService('A', starting_company_round=1, current_company_round=16)
svc_a.run_simulation(2)
"
```

**Expected Logs**:
- Plan G: No "Settlement bonus deactivated" message
- Plan A: "Settlement bonus deactivated: company_round 16 > deactivation_round 15 (plan: A)"

### Success Criteria

#### Automated Verification:
- [ ] All Plan G tests pass
- [ ] All regression tests pass
- [ ] All edge case tests pass
- [ ] All existing tests still pass
- [ ] Code coverage ≥80% for modified code
- [ ] No lint errors: `flake8 src/backend/simulation_service.py src/backend/constants.py`
- [ ] No type errors: `mypy src/backend/simulation_service.py` (if mypy is configured)

#### Manual Verification:
- [ ] Plan G maintains settlement_bonus beyond round 15
- [ ] Other plans still deactivate at round 16
- [ ] Log messages are clear and include plan context
- [ ] No performance degradation
- [ ] Configuration is readable and maintainable

---

## Phase 7: Update Documentation

### Overview
Update technical documentation to reflect the new plan-specific settlement bonus behavior.

### Changes Required

#### 1. Update System Specification Document (SSD)
**File**: `docs/spec/ssd.md`
**Line**: 204
**Changes**: Clarify settlement bonus deactivation behavior

**Before**:
```markdown
- Settlement bonus: Rounds 1–15 only (auto-deactivated ≥16)
```

**After**:
```markdown
- Settlement bonus: Configurable per plan
  - Plans A, B, C, D, E, F, K, P, R: Rounds 1–15 only (auto-deactivated ≥16)
  - Plan G: Active for all rounds (never deactivated)
```

**File**: `docs/spec/ssd.md`
**Lines**: 219-226 (Plan Variations section)
**Changes**: Add note about Plan G's unique settlement_bonus behavior

**Add to Plan G section**:
```markdown
#### Plan G

- **Unique Characteristics**:
  - Shortest plan: max 12 investors (vs 15-18 for other plans)
  - Uniform payments: 110,000 for all rounds
  - **Settlement bonus behavior**: Active for all rounds (never deactivated)
    - Unlike other plans, Plan G maintains settlement_bonus beyond company round 15
    - Ensures consistent revenue calculations throughout the plan lifecycle
```

**Rationale**:
- Clear documentation of exception to general rule
- Helps developers understand Plan G's unique behavior
- Provides context for why this design decision was made

#### 2. Update Technical Details Document
**File**: `docs/spec/tech-details.md`
**Changes**: Document new plan parameter

**Add to Plan Parameters section**:
```markdown
### Settlement Bonus Configuration

Plans can configure when settlement bonus should be deactivated using the `settlement_bonus_deactivation_round` parameter:

- **Type**: `int | None`
- **Purpose**: Controls at which company round the settlement bonus should be deactivated
- **Values**:
  - `15`: Deactivate after round 15 (default for most plans)
  - `None`: Never deactivate (used by Plan G)
  - Custom integer: Deactivate after specified round

**Example**:
```python
"G": {
    'settlement_bonus': 100000,
    'settlement_bonus_deactivation_round': None,  # Never deactivate
    # ... other parameters
}

"A": {
    'settlement_bonus': 100000,
    'settlement_bonus_deactivation_round': 15,  # Deactivate after round 15
    # ... other parameters
}
```

**Backward Compatibility**: If parameter is missing, defaults to 15 (current behavior).
```

**Rationale**:
- Provides clear technical documentation for developers
- Explains parameter purpose and usage
- Documents backward compatibility

#### 3. Update Test Plan Documentation
**File**: `docs/plan/test-code/test-plan-01-backend-unit.md`
**Line**: 62 (RND-005 specification)
**Changes**: Update test case description to exclude Plan G

**Before**:
```markdown
**RND-005**: Settlement bonus should deactivate at round 16
```

**After**:
```markdown
**RND-005**: Settlement bonus should deactivate at round 16 for all plans except Plan G

- Plans A, B, C, D, E, F, K, P, R: Settlement bonus deactivates when current_company_round > 15
- Plan G: Settlement bonus remains active for all rounds (exception to this rule)
```

**Add new test cases**:
```markdown
**RND-005-G1**: Plan G settlement bonus persistence
- Verify Plan G maintains settlement_bonus at round 16 and beyond
- Test coverage: TC-G-001, TC-G-002, TC-G-003, TC-G-004

**RND-005-G2**: Plan G edge cases
- Verify Plan G works correctly when starting after round 15
- Test coverage: TC-EDGE-003
```

**Rationale**:
- Updates test documentation to match implementation
- Documents new test cases for Plan G
- Maintains traceability between tests and requirements

#### 4. Add Implementation Notes
**File**: Create `docs/plan/IS-111/implementation-notes.md` (NEW)
**Changes**: Document implementation decisions and rationale

```markdown
# Implementation Notes: IS-111 - Enable Settlement Bonus for All Rounds for Plan G

## Overview
This document captures key implementation decisions and rationale for enabling perpetual settlement_bonus for Plan G.

## Design Decisions

### 1. Configuration-Driven Approach
**Decision**: Add `settlement_bonus_deactivation_round` parameter to plan configurations
**Rationale**: 
- Flexible: Any plan can customize deactivation round
- Maintainable: Changes don't require code modifications
- Extensible: Future plans can easily specify custom behavior
- Clean: Avoids hardcoded plan-specific logic in business code

**Alternatives Considered**:
- Hardcode Plan G check in `_check_settlement_bonus_condition()`: Less flexible, harder to maintain
- Boolean flag `disable_settlement_bonus_deactivation`: Less flexible than specifying exact round

### 2. `None` Value for Never Deactivate
**Decision**: Use `None` to indicate settlement_bonus should never deactivate
**Rationale**:
- Explicit intent (vs high integer value like 999)
- Type-safe (Python None is unambiguous)
- Self-documenting in configuration

### 3. Default Value of 15
**Decision**: Default to round 15 if parameter is missing
**Rationale**:
- Backward compatibility with existing simulations
- Defensive programming (handles missing config gracefully)
- Maintains current behavior for all existing plans

### 4. Enhanced Logging
**Decision**: Include plan type and specific rounds in deactivation log
**Rationale**:
- Easier debugging and monitoring
- Clear audit trail for deactivation events
- Helps identify issues in production

## Testing Strategy

### TDD Approach
1. Define test cases first (Phase 3)
2. Implement tests (Phase 4)
3. Run tests - verify failure (RED)
4. Implement code (Phases 1-2)
5. Run tests - verify success (GREEN)

### Test Coverage
- **Plan G Specific**: 5 tests covering rounds 16, 20, multiple investors, edge cases
- **Regression**: 2 tests ensuring other plans unchanged
- **Edge Cases**: 2 tests for missing config and custom rounds
- **Integration**: 1 test for plan isolation

## Rollout Plan

### Phase 1: Deploy to Staging
1. Deploy code changes to staging environment
2. Run automated test suite
3. Manual smoke testing for Plan G and Plan A

### Phase 2: Monitor Staging
1. Monitor logs for deactivation events
2. Verify Plan G simulations maintain settlement_bonus
3. Verify other plans still deactivate at round 16

### Phase 3: Deploy to Production
1. Deploy during low-traffic window
2. Monitor logs for any errors
3. Verify first Plan G simulation after deployment

## Rollback Plan
If issues occur:
1. Revert `constants.py` and `simulation_service.py` to previous version
2. Redeploy previous version
3. Verify system returns to previous behavior
4. Investigate and fix issues in development environment

## Future Enhancements
- UI indication of settlement bonus status (if needed)
- Plan comparison tool showing settlement bonus differences
- Analytics on Plan G usage with perpetual settlement_bonus
```

**Rationale**:
- Captures context for future maintainers
- Documents decisions and alternatives considered
- Provides rollout and rollback guidance

### Success Criteria

#### Automated Verification:
- [ ] All documentation files compile/render without errors
- [ ] No broken links in documentation
- [ ] Markdown syntax is valid

#### Manual Verification:
- [ ] Review SSD updates for clarity and accuracy
- [ ] Verify technical details are comprehensive
- [ ] Check test plan updates match implementation
- [ ] Ensure implementation notes capture key decisions
- [ ] Confirm all changed behaviors are documented

---

## Implementation Checklist

### Phase 1: Define Test Cases (TDD: RED Phase Preparation)
- [ ] Review Phase 1 test case definitions
- [ ] Ensure all test cases are clear and unambiguous
- [ ] Verify expected results are specific and measurable
- [ ] Confirm test cases cover all code paths
- [ ] Document test case IDs: TC-G-001 through TC-INT-002

### Phase 2: Implement Test Code (TDD: Write Failing Tests)
### Phase 5: Update Settlement Bonus Deactivation Logic (TDD: Make Tests Pass - Part 2)lation_service.py`
- [ ] Add `test_plan_g_settlement_bonus_never_deactivates_round_16()`
- [ ] Add `test_plan_g_settlement_bonus_never_deactivates_round_20()`
- [ ] Add `test_plan_g_revenue_consistency_after_round_15()`
- [ ] Add `test_plan_g_settlement_bonus_multiple_investors()`
- [ ] Add `test_plan_g_settlement_bonus_starting_after_round_15()`
- [ ] Update `test_RND_005_settlement_bonus_deactivates_round_16` to exclude Plan G
- [ ] Update `test_settlement_bonus_deactivation_after_round_15` to exclude Plan G
- [ ] Add `test_non_g_plans_settlement_bonus_deactivates_at_round_16()`
- [ ] Add `test_settlement_bonus_deactivation_idempotent()`
- [ ] Add `test_missing_deactivation_round_parameter_defaults_to_15()`
- [ ] Add `test_custom_deactivation_round()`
- [ ] Add `test_plan_g_and_plan_a_isolation()`
- [ ] Verify syntax: `python -m py_compile src/backend/tests/unit/simulation/test_simulation_service.py`
- [ ] Commit test code: `git add src/backend/tests/unit/simulation/test_simulation_service.py && git commit -m "test: Add Plan G settlement bonus persistence tests (failing)"`

### Phase 3: Run Failing Tests (TDD: RED Phase)
- [ ] Run tests BEFORE implementation (should fail): `pytest src/backend/tests/unit/simulation/test_simulation_service.py -k "test_plan_g" -v`
- [ ] Verify expected failures (settlement_bonus deactivates at round 16)
- [ ] Verify test infrastructure works (no import/fixture errors)
- [ ] Verify existing tests still pass
- [ ] Document failure output for reference

### Phase 4: Update Plan Configuration (TDD: Make Tests Pass - Part 1)
- [ ] Open `src/backend/constants.py`
- [ ] Add `settlement_bonus_deactivation_round: None` to Plan G (after line 111)
- [ ] Add `settlement_bonus_deactivation_round: 15` to Plans A, B, C, D, E, F, K, P, R
- [ ] Verify syntax: `python -m py_compile src/backend/constants.py`
- [ ] Test import: `python -c "from src.backend.constants import PLAN_PARAMETERS; print(PLAN_PARAMETERS['G'])"`
- [ ] Commit changes: `git add src/backend/constants.py && git commit -m "feat: Add settlement_bonus_deactivation_round parameter to all plans"`

### Phase 2: Update Settlement Bonus Deactivation Logic
- [ ] Open `src/backend/simulation_service.py`
- [ ] Update `_check_settlement_bonus_condition()` method (lines 222-233)
- [ ] Add parameter retrieval: `deactivation_round = self.params.get('settlement_bonus_deactivation_round', 15)`
- [ ] Add None check: `if deactivation_round is None: return`
- [ ] Update deactivation condition to use `deactivation_round` instead of hardcoded 15
- [ ] Update log message to include plan type and rounds
- [ ] Update docstring to explain configuration-driven behavior
- [ ] Verify syntax: `python -m py_compile src/backend/simulation_service.py`
- [ ] Commit changes: `git add src/backend/simulation_service.py && git commit -m "feat: Make settlement bonus deactivation plan-aware"`

### Phase 6: Run Tests and Verify (TDD: GREEN Phase)
- [ ] Run all new Plan G tests (should NOW PASS): `pytest src/backend/tests/unit/simulation/test_simulation_service.py -k "test_plan_g" -v`
- [ ] Run regression tests: `pytest src/backend/tests/unit/simulation/test_simulation_service.py -k "test_non_g_plans" -v`
- [ ] Run edge case tests: `pytest src/backend/tests/unit/simulation/test_simulation_service.py -k "missing_deactivation_round or custom_deactivation_round" -v`
- [ ] Run ALL simulation service tests: `pytest src/backend/tests/unit/simulation/test_simulation_service.py -v`
- [ ] Run full backend test suite: `pytest src/backend/tests/unit/ -v`
- [ ] Run with coverage: `pytest src/backend/tests/unit/ --cov=src.backend.simulation_service --cov=src.backend.constants --cov-report=term-missing`
- [ ] Verify coverage ≥80% for modified code
- [ ] Run constants tests: `pytest src/backend/tests/unit/test_constants.py -v`
- [ ] Manual Test 1: Plan G beyond round 15
- [ ] Manual Test 2: Plan A deactivation (regression)
- [ ] Manual Test 3: Log message verification
- [ ] Commit test passing evidence: `git add . && git commit -m "test: All Plan G tests passing"`

### Phase 6: Update Documentation
- [ ] Open `docs/spec/ssd.md`
- [ ] Update line 204 to clarify settlement bonus deactivation behavior
- [ ] Update Plan G section (lines 219-226) with unique settlement_bonus behavior
- [ ] Open `docs/spec/tech-details.md`
- [ ] Add Settlement Bonus Configuration section documenting new parameter
- [ ] Open `docs/plan/test-code/test-plan-01-backend-unit.md`
- [ ] Update RND-005 specification (line 62) to exclude Plan G
- [ ] Add RND-005-G1 and RND-005-G2 test cases
- [ ] Create `docs/plan/IS-111/implementation-notes.md`
- [ ] Document design decisions, testing strategy, rollout plan
- [ ] Verify markdown syntax: Check all updated .md files render correctly
- [ ] Commit documentation: `git add docs/ && git commit -m "docs: Update settlement bonus documentation for Plan G"`

### Final Verification
- [ ] All code changes committed
- [ ] All tests passing
- [ ] All documentation updated
- [ ] No lint errors: `flake8 src/backend/simulation_service.py src/backend/constants.py`
- [ ] No type errors (if mypy configured): `mypy src/backend/`
- [ ] Code review ready: Push branch and create PR
- [ ] PR description includes summary of changes and test results

## Overall Success Metrics

- [ ] Verify all tests pass with no failures
- [ ] Commit final implementation: `git add . && git commit -m "feat: Enable settlement_bonus for all rounds for Plan G - all tests passing"`

### Phase 7: Update Documentationcode: ≥80%
- [ ] No existing tests break: 100%
- [ ] All new tests pass: 100%
- [ ] Documentation reflects implementation: 100%
- [ ] No performance degradation: <5% increase in simulation time
- [ ] Clean code review: 0 critical issues

## Rollout and Monitoring

### Deployment Steps
1. **Staging Deployment**:
   - Deploy to staging environment
   - Run full test suite
   - Manual smoke tests for Plan G and Plan A
   - Monitor logs for 24 hours

2. **Production Deployment**:
   - Deploy during low-traffic window
   - Monitor logs for errors
   - Verify first Plan G simulation post-deployment
   - Keep rollback script ready

### Monitoring Checklist
- [ ] Monitor settlement bonus deactivation logs
- [ ] Track Plan G simulation executions
- [ ] Verify no errors in Plan G revenue calculations
- [ ] Confirm other plans unchanged
- [ ] Monitor performance metrics
- [ ] Check for any unexpected log patterns

### Rollback Plan
**If issues detected**:
1. Revert commits: `git revert <commit-hash>`
2. Redeploy previous version
3. Verify system returns to previous behavior
4. Investigate issues in development
5. Fix and retest before next deployment attempt

## Future Enhancements

### Potential Improvements
- **UI Enhancement**: Show settlement bonus status in results view
  - Badge or indicator showing "Settlement Bonus Active" for Plan G
  - Tooltip explaining Plan G's unique behavior
  
- **Analytics Dashboard**: Track Plan G usage patterns
  - Number of Plan G simulations beyond round 15
  - Revenue comparison with/without perpetual settlement_bonus
  
- **Plan Comparison Tool**: Compare plans side-by-side
  - Highlight settlement bonus differences
  - Show revenue impact of perpetual settlement_bonus

- **Configuration Validation**: Add schema validation
  - Ensure `settlement_bonus_deactivation_round` is int or None
  - Validate value is reasonable (e.g., > 0 if not None)

### Non-Goals (Out of Scope)
- Changing settlement_bonus amounts per plan
- Making settlement_bonus configurable per simulation (not per plan)
- UI changes to display settlement bonus in frontend
- Modifying revenue calculation formulas
- Adding settlement bonus configuration to user-facing UI

---
## Summary

This implementation plan enables Plan G to maintain settlement_bonus for all simulation rounds while preserving current behavior for all other plans. The approach follows strict TDD methodology:

**TDD Flow**:
1. **Phase 1**: Define test cases (understand requirements through tests)
2. **Phase 2**: Implement test code (write failing tests)
3. **Phase 3**: Run tests and verify they FAIL (RED phase)
4. **Phase 4**: Add configuration parameter (make tests pass - part 1)
5. **Phase 5**: Update business logic (make tests pass - part 2)
6. **Phase 6**: Run tests and verify they PASS (GREEN phase)
7. **Phase 7**: Update documentation (complete the feature)

**Key Principles**:
1. **Test-First**: All tests written BEFORE production code changes
2. **Configuration-Driven**: Uses `settlement_bonus_deactivation_round` parameter per plan
3. **Backward Compatible**: Defaults to 15 if parameter missing
4. **Well-Tested**: Comprehensive test coverage with unit, regression, edge case, and integration tests
5. **Well-Documented**: Updates all relevant documentation
6. **Low Risk**: Isolated changes with extensive regression testing
7. **No E2E Changes**: Backend-only changes, no E2E test modifications
5. **Low Risk**: Isolated changes with extensive regression testing

**Key Changes**:
- `constants.py`: Add `settlement_bonus_deactivation_round` to all plans
- `simulation_service.py`: Update `_check_settlement_bonus_condition()` to be plan-aware
- `test_simulation_service.py`: Add Plan G tests and update existing tests
- Documentation: Update SSD, technical details, and test plans

**Expected Outcome**:
- Plan G: Settlement bonus active for all rounds (no deactivation)
- Other Plans: Settlement bonus deactivates at round 16 (unchanged)
- 100% test pass rate
- ≥80% code coverage
- Clean deployment with monitoring
