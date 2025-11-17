# Analysis Report: IS-111 - Enable settlement_bonus for All Rounds for Plan G

## Issue Summary

**Issue ID**: IS-111  
**Issue Title**: [Feature] Enable settlement_bonus for all rounds for G Plan  
**Request Type**: Feature Enhancement  
**Plan Type**: G  
**Current Behavior**: Settlement bonus is automatically deactivated when `current_company_round > 15` for all plans  
**Requested Behavior**: Enable `settlement_bonus` for ALL simulation rounds specifically for Plan G

---

## 1. Root Cause Codes

The current implementation enforces a global rule that deactivates `settlement_bonus` after round 15 for **all plans** without distinction.

### 1.1 Settlement Bonus Deactivation Logic

**File**: `src/backend/simulation_service.py`  
**Lines**: 222-233

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

**Behavior**:

- This method is called in `_calculate_revenue()` before every revenue calculation
- When `current_company_round > 15`, it permanently sets:
  - `self.settlement_bonus_active = False`
  - `self.params['settlement_bonus'] = 0`
- **No plan-specific logic**: Applies uniformly to all plans (A, B, C, D, E, F, G, K, P, R)

**Code Map**:

- `src/backend/simulation_service.py:222-233` - Settlement bonus deactivation logic
- `src/backend/simulation_service.py:149-150` - Settlement bonus state initialization

### 1.2 Revenue Calculation Using settlement_bonus

**File**: `src/backend/simulation_service.py`  
**Lines**: 232-266

```python
def _calculate_revenue(self, investor: Investor, actual_payment: float) -> float:
    """
    Calculate the revenue for an investor based on their payment and internal round.
    """
    # Check if we need to deactivate settlement bonus
    self._check_settlement_bonus_condition(investor)
    
    internal_round = investor.internal_round
    p = self.params
    
    base_calc_value = actual_payment / p['revenue_base_divisor']

    if internal_round <= 2:
        return base_calc_value * p['sales_commission']
    
    elif internal_round == 3:
        investor.set_base_calc_value(base_calc_value)
        return (base_calc_value * p['sales_commission']) + p['settlement_bonus']
    
    else:  # internal_round >= 4
        # Get the bonus rate for this round, default to 0 if not specified
        bonus_rate = p['round_bonus_rates'].get(internal_round, 0)
        
        # Calculate potential bonus but cap it at max_bonus
        bonus_amount = min(
            base_calc_value * bonus_rate,
            p['max_bonus']
        )
        
        # Apply the achievement rate for the current round
        achievement_rate = p['sales_achievement_rates'].get(self.current_company_round, 0)
        additional_revenue = bonus_amount * achievement_rate
        
        base_revenue_r3 = (investor.base_calc_value_r3 * p['sales_commission']) + p['settlement_bonus'] 
        return base_revenue_r3 + additional_revenue
```

**Revenue Formula Impact**:

- **Internal Round 3**: `revenue = (base_calc_value × 0.32) + settlement_bonus`
- **Internal Round ≥ 4**: `revenue = base_revenue_r3 + additional_revenue`
  - Where `base_revenue_r3 = (base_calc_value_r3 × 0.32) + settlement_bonus`
- After round 15: `settlement_bonus = 0`, reducing revenue for all investors at rounds 3 and 4+

**Code Map**:

- `src/backend/simulation_service.py:232-266` - Revenue calculation with settlement_bonus
- `src/backend/simulation_service.py:246` - Internal round 3 calculation (line uses `settlement_bonus`)
- `src/backend/simulation_service.py:265` - Internal round 4+ calculation (line uses `settlement_bonus`)

### 1.3 Plan G Configuration

**File**: `src/backend/constants.py`  
**Lines**: 106-116

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

**Plan G Characteristics**:

- Shortest plan: `max_investor_count = 12` (vs 15-18 for other plans)
- Uniform payments: All rounds use 110,000 (simplest payment structure)
- `settlement_bonus = 100,000` (same as other plans)
- Currently **no plan-specific flag** to control settlement_bonus deactivation

**Code Map**:

- `src/backend/constants.py:106-116` - Plan G parameter definition

### 1.4 Data Flow

```text
Simulation Round Execution (run_single_round)
    ↓
For each investor:
    ↓
_calculate_revenue(investor, payment)
    ↓
_check_settlement_bonus_condition(investor)  ← Deactivation check happens here
    ↓
    if current_company_round > 15:
        settlement_bonus_active = False
        params['settlement_bonus'] = 0  ← Global for all plans
    ↓
Revenue calculation:
    - Round 3: uses params['settlement_bonus']
    - Round 4+: uses params['settlement_bonus'] in base_revenue_r3
```

### 1.5 Code Execution Flow

1. **Initialization** (`__init__`, line 149-150):
   - `self.settlement_bonus_active = True`
   - `self.original_settlement_bonus = self.params['settlement_bonus']`

2. **Per-Round Execution** (`run_single_round`, line 295):
   - Processes all investors in current round
   - Calls `_calculate_revenue()` for each investor

3. **Revenue Calculation** (`_calculate_revenue`, line 232):
   - Calls `_check_settlement_bonus_condition()` at start
   - Checks condition: `current_company_round > 15`
   - If true, deactivates settlement_bonus globally

4. **State Reset** (`run_simulation`, line 407-410):
   - On new simulation start:
   - `self.settlement_bonus_active = True`
   - `self.params['settlement_bonus'] = self.original_settlement_bonus`

---

## 2. Related Codes

These codes will be **impacted** or **must be considered** when implementing the feature.

### 2.1 Backend Service Layer

**File**: `src/backend/simulation_service.py`

| Line Range | Component | Impact Level | Description |
|------------|-----------|--------------|-------------|
| 149-150 | `__init__` | **Medium** | Initializes settlement_bonus state; may need plan-aware initialization |
| 222-233 | `_check_settlement_bonus_condition` | **CRITICAL** | Core logic to modify for plan-specific behavior |
| 232-266 | `_calculate_revenue` | **Low** | Uses `params['settlement_bonus']`; logic stays same |
| 407-410 | `run_simulation` (state reset) | **Medium** | Resets settlement_bonus state; ensure plan-specific state is preserved |

### 2.2 Plan Configuration

**File**: `src/backend/constants.py`

| Line Range | Component | Impact Level | Description |
|------------|-----------|--------------|-------------|
| 106-116 | Plan G parameters | **CRITICAL** | Add new parameter to control settlement_bonus behavior |
| 6-105 | Other plans (A-F, K, P, R, E) | **Low** | May need same new parameter with default value (keep current behavior) |

**Recommended Changes**:
- Add `settlement_bonus_deactivation_round` parameter (or similar) to each plan
- Plan G: Set to `None` or high value (e.g., 999) to never deactivate
- Other plans: Set to `15` (maintain current behavior)

### 2.3 Tests

**File**: `src/backend/tests/unit/simulation/test_simulation_service.py`

| Line Range | Test Case | Impact Level | Description |
|------------|-----------|--------------|-------------|
| 164-181 | `test_RND_005_settlement_bonus_deactivates_round_16` | **HIGH** | Tests round 15→16 deactivation; update to skip Plan G |
| 593-609 | `test_settlement_bonus_deactivation_after_round_15` | **HIGH** | Similar test; update to skip Plan G or add Plan G variant |

**Required Test Updates**:
1. **Update existing tests**: Parameterize to exclude Plan G from deactivation checks
2. **Add new tests**: Verify Plan G maintains settlement_bonus beyond round 15
3. **Integration tests**: Verify other plans still deactivate at round 15

**File**: `src/backend/tests/unit/test_constants.py`

| Line Range | Test Case | Impact Level | Description |
|------------|-----------|--------------|-------------|
| 20 | Schema validation | **LOW** | May need to update expected keys if adding new parameter |
| 41-42 | `settlement_bonus` validation | **LOW** | Verify 0 is allowed (current test checks `>= 0`) |

### 2.4 Documentation

**File**: `docs/spec/ssd.md`

| Line Range | Section | Impact Level | Description |
|------------|---------|--------------|-------------|
| 204 | Simulation Engine Core Logic | **HIGH** | States "Settlement bonus: Rounds 1–15 only (auto-deactivated ≥16)" |
| 219-226 | Plan Variations | **MEDIUM** | Should document Plan G's unique settlement_bonus behavior |

**Required Updates**:
- Update line 204 to clarify exception for Plan G
- Add note in Plan G section about perpetual settlement_bonus

**File**: `docs/spec/tech-details.md`

| Line Range | Section | Impact Level | Description |
|------------|---------|--------------|-------------|
| N/A | Plan Parameters | **LOW** | Add documentation for new plan parameter if added |

**File**: `docs/plan/test-code/test-plan-01-backend-unit.md`

| Line Range | Section | Impact Level | Description |
|------------|---------|--------------|-------------|
| 62 | RND-005 specification | **HIGH** | Documents settlement_bonus deactivation test; needs Plan G exception |

### 2.5 Frontend (Minimal Impact)

**Files**: Frontend E2E test data only

| File | Impact Level | Description |
|------|--------------|-------------|
| `src/frontend/e2e/utils/test-helpers.ts` (lines 309, 318) | **LOW** | Mock plan parameters; may need update if E2E tests verify Plan G results |
| `src/frontend/e2e/fixtures/test-data.ts` (lines 89, 98) | **LOW** | Test fixtures; update if Plan G test data is added |
| `src/frontend/e2e/specs/results-display.spec.ts` (lines 35, 44, 53) | **LOW** | E2E spec; verify Plan G results if tests are added |

**No UI Changes Required**: `settlement_bonus` is not displayed in the frontend; it's an internal calculation parameter.

### 2.6 Data Flow Impact

```
Before Change:
    All Plans → current_company_round > 15 → settlement_bonus = 0

After Change (Plan G):
    Plan G → current_company_round > 15 → settlement_bonus = 100000 (stays active)
    Other Plans → current_company_round > 15 → settlement_bonus = 0 (unchanged)
```

### 2.7 Related Issue Documentation

**File**: `docs/analysis/IS-62/IS-109/analysis-00.md`

- Previous issue analyzing settlement_bonus deactivation impact on Plan G
- Documents negative profit scenario when settlement_bonus = 0 after round 15
- Provides context for why this feature is requested

---

## 3. Implementation Considerations

### 3.1 Recommended Approach

**Option A (Recommended)**: Add `settlement_bonus_deactivation_round` parameter to plan configurations

**Advantages**:
- Most flexible: Any plan can customize deactivation round
- Clean separation: Configuration-driven, not hardcoded plan checks
- Backward compatible: Set to 15 for existing plans
- Extensible: Future plans can specify custom deactivation rounds

**Changes Required**:
1. Add `settlement_bonus_deactivation_round` to each plan in `constants.py`
   - Plan G: `None` or high value (999)
   - Other plans: `15`
2. Modify `_check_settlement_bonus_condition()` to use this parameter
3. Update tests and documentation

### 3.2 Alternative Approaches

**Option B**: Hardcode Plan G check in `_check_settlement_bonus_condition()`

**Advantages**:
- Minimal code changes
- Quick implementation

**Disadvantages**:
- Less maintainable: Hardcoded plan ID
- Not extensible: Future plans need code changes

**Option C**: Add boolean flag `disable_settlement_bonus_deactivation`

**Advantages**:
- Simple boolean logic

**Disadvantages**:
- Less flexible than specifying exact deactivation round
- Binary choice (on/off only)

### 3.3 Code Example (Option A)

**Step 1**: Update `constants.py`

```python
"G": {
    'max_investor_count': 12,
    'min_payment_new': {1: 110000, 2: 110000, ...},
    'min_payment_re': 110000,
    'revenue_base_divisor': 1.1,
    'sales_commission': 0.32,
    'settlement_bonus': 100000,
    'settlement_bonus_deactivation_round': None,  # Never deactivate
    'max_bonus': 30000000,
    'round_bonus_rates': {4: 1, 5: 1, ...},
    'sales_achievement_rates': {4: 1, 5:1, ...}
},
```

**Step 2**: Update `_check_settlement_bonus_condition()`

```python
def _check_settlement_bonus_condition(self, investor: Investor) -> None:
    """
    Check if settlement bonus should be deactivated based on plan configuration.
    """
    deactivation_round = self.params.get('settlement_bonus_deactivation_round', 15)
    
    # If deactivation_round is None, never deactivate
    if deactivation_round is None:
        return
    
    if (self.settlement_bonus_active and 
            self.current_company_round > deactivation_round):
        self.settlement_bonus_active = False
        self.params['settlement_bonus'] = 0
        logger.info(f"Settlement bonus deactivated: company round {self.current_company_round} > {deactivation_round}")
```

### 3.4 Testing Requirements

**New Unit Tests**:
1. `test_plan_g_settlement_bonus_never_deactivates`: Verify Plan G maintains settlement_bonus beyond round 15
2. `test_plan_g_revenue_consistency_after_round_15`: Verify revenue calculations remain consistent
3. `test_other_plans_settlement_bonus_still_deactivates`: Regression test for Plans A-F, K, P, R, E

**Test Case Example**:

```python
def test_plan_g_settlement_bonus_never_deactivates(simulation_service_factory):
    """Test that Plan G maintains settlement_bonus for all rounds."""
    svc = simulation_service_factory('G')
    
    # Run simulation past round 15
    result = svc.run_simulation(20)
    
    # Verify settlement_bonus is still active
    assert svc.settlement_bonus_active == True
    assert svc.params['settlement_bonus'] == 100000
    
    # Verify revenue calculations include settlement_bonus after round 15
    for round_result in result.history[15:]:  # Rounds 16+
        assert round_result.total_revenue_before_tax > 0
```

---

## 4. Summary

### Root Cause
- `_check_settlement_bonus_condition()` enforces global deactivation at round 15
- No plan-specific configuration exists

### Required Changes
1. **Backend**: Modify settlement_bonus deactivation logic to be plan-aware
2. **Configuration**: Add plan-specific parameter to control deactivation
3. **Tests**: Update/add tests for Plan G and ensure other plans unchanged
4. **Documentation**: Update SSD, tech-details, test plans

### Impact Assessment
- **High Impact**: Backend calculation logic, tests, documentation
- **Low Impact**: Frontend (no UI changes), other plans (behavior unchanged)
- **Risk**: Low (isolated to Plan G, other plans maintain current behavior)
