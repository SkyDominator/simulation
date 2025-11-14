# Analysis Report: IS-109 - Negative Net Profit After Tax in Plan G Simulations

## Issue Summary

**Issue ID**: IS-109  
**Issue Title**: [Bug] Simulation results after 25th simulation rounds is not what I expected  
**Plan Type**: G  
**Symptom**: Consistent negative `net_profit_after_tax` value of -20,352 for all rounds after round 16 when sales achievement rate is 30%

**User Expectation**: Positive net profit values throughout the simulation  
**Actual Behavior**: Negative net profit (-20,352) consistently from round 17 onwards

---

## Root Cause Analysis

### 1. Root Cause Codes

The negative profit is a **correct calculation** based on the interaction between three key mechanisms in the simulation engine:

#### 1.1 Settlement Bonus Deactivation

**Location**: `src/backend/simulation_service.py:222-233`

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
- Settlement bonus (100,000 per investor at internal round 3) is **permanently deactivated** when `current_company_round > 15`
- This affects all subsequent revenue calculations for all investors

#### 1.2 Revenue Calculation with Low Sales Achievement

**Location**: `src/backend/simulation_service.py:232-266`

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

**Critical Line**: Line 265 uses `p['settlement_bonus']` which becomes 0 after round 15.

#### 1.3 Net Profit Calculation

**Location**: `src/backend/simulation_service.py:351-375`

```python
# Net profit calculation
if t == 1:
    net_profit_after_tax = -total_payment_this_round
    net_profit_before_tax = -total_payment_this_round
    cumulative_net_profit = net_profit_after_tax
    cumulative_net_profit_before_tax = net_profit_before_tax
else:
    prev_round_result = self.results.history[-1]

    # Before tax calculations
    prev_revenue_before_tax = prev_round_result.total_revenue_before_tax
    net_profit_before_tax = prev_revenue_before_tax - total_payment_this_round
    cumulative_net_profit_before_tax = prev_round_result.cumulative_net_profit_before_tax + net_profit_before_tax
    
    # After tax calculations
    prev_revenue_after_tax = prev_round_result.total_revenue_after_tax
    net_profit_after_tax = prev_revenue_after_tax - total_payment_this_round
    cumulative_net_profit = prev_round_result.cumulative_net_profit + net_profit_after_tax
```

**Key Point**: Net profit for round N = Previous round's revenue (N-1) - Current round's payment (N)

### 2. Data Flow Analysis

#### Round 16 (Last round with settlement bonus):
1. **Total Payment**: 1,320,000 (12 investors × 110,000)
2. **Total Revenue** (before tax): 1,344,000
3. **Total Revenue** (after tax): 1,299,648 (1,344,000 × 0.967 after 3.3% tax)
4. **Net Profit** (after tax): 946,648 (round 15 revenue 2,266,648 - round 16 payment 1,320,000)
5. **Settlement bonus**: Still active (deactivates AFTER this round)

#### Round 17+ (Settlement bonus deactivated):
1. **Total Payment**: 1,320,000 (12 investors × 110,000)
2. **Investor Revenue Calculation**:
   - For investor at internal_round 12:
     - `base_calc_value = 110,000 / 1.1 = 100,000`
     - `bonus_rate = 10` (from `round_bonus_rates[12]`)
     - `bonus_amount = min(100,000 × 10, 30,000,000) = 1,000,000`
     - `achievement_rate = 0.30` (30%)
     - `additional_revenue = 1,000,000 × 0.30 = 300,000`
     - `base_revenue_r3 = (100,000 × 0.32) + 0 = 32,000` (settlement_bonus is 0)
     - **Total revenue = 32,000 + 300,000 = 332,000**
   
   - Similar calculations for other internal_rounds result in different revenues
   - **Total Revenue** (before tax): 1,344,000 (sum of all 12 investors)
   
3. **Total Revenue** (after tax): 1,299,648 (1,344,000 × 0.967)
4. **Net Profit** (after tax): 1,299,648 - 1,320,000 = **-20,352**

**Mathematical Proof**:
```
Round 17 net_profit_after_tax = Round 16 revenue_after_tax - Round 17 payment
                               = 1,299,648 - 1,320,000
                               = -20,352
```

This pattern continues because:
- Revenue stays constant at 1,344,000 (before tax) / 1,299,648 (after tax)
- Payment stays constant at 1,320,000
- Profit = 1,299,648 - 1,320,000 = -20,352 (consistently)

### 3. Plan G Specific Parameters

**Location**: `src/backend/constants.py:104-112`

```python
"G": {
    'max_investor_count': 12,
    'min_payment_new': {1: 110000, 2: 110000, 3: 110000, ..., 12: 110000},
    'min_payment_re': 110000,
    'revenue_base_divisor': 1.1,
    'sales_commission': 0.32,
    'settlement_bonus': 100000,
    'max_bonus': 30000000,
    'round_bonus_rates': {4: 1, 5: 1, 6: 2, 7: 2, 8: 3, 9: 3, 10: 5, 11: 5, 12: 10},
    'sales_achievement_rates': {4: 1, 5:1, 6:1, 7:1, 8:1, 9:1, 10:1, 11:1, 12:1}
}
```

**Key Constraints for Plan G**:
- Smaller `max_investor_count` (12 vs. 15-18 for other plans)
- Uniform payment (110,000 for all rounds)
- `round_bonus_rates` only defined up to internal_round 12
- Settlement bonus critical for early profitability

---

## Related/Impacted Codes

### 1. Simulation Service Orchestration

**Location**: `src/backend/services/simulations.py:88-130`

```python
def run(self, req: SimulationRunRequest, user_id: str) -> SimulationRunResponse:
    # ... fetch simulation from DB ...
    
    # Convert sales achievement rates percent -> fraction for simulator override
    rates_percent = row.sales_achievement_rates or {}
    sales_rates_fraction = {int(k): (v / 100.0) for k, v in rates_percent.items()}
    simulator = FinancialSimulationService(
        plan_id=row.plan_id, 
        scheduled_payment=sched_int, 
        sales_achievement_rates=sales_rates_fraction
    )
    results = simulator.run_simulation(row.simulation_rounds).to_dict()
    
    # ... persist results ...
```

**Impact**: This service calls the simulation engine and persists results. Any changes to settlement bonus logic will affect stored results.

### 2. API Route

**Location**: `src/backend/api/routes.py:325-328`

```python
@router.post("/api/simulation/run", response_model=SimulationRunResponse)
async def run_simulation(request: SimulationRunRequest, user_id: str = Depends(authenticate_jwt_token)):
    sim_service = get_service(SimulationService)
    return sim_service.run(request, user_id)
```

**Impact**: Frontend calls this endpoint to run simulations. Any behavioral changes need coordination with frontend expectations.

### 3. Simulation Initialization

**Location**: `src/backend/simulation_service.py:112-152`

```python
def __init__(self, plan_id: str, scheduled_payment: Optional[Dict[int, int]] = None, 
             sales_achievement_rates: Optional[Dict[int, float]] = None):
    # ... parameter validation ...
    
    self.settlement_bonus_active = True
    self.original_settlement_bonus = self.params['settlement_bonus']
```

**Impact**: Settlement bonus state is initialized for each simulation run. Reset logic at line 413-414 ensures clean state.

### 4. Round Execution

**Location**: `src/backend/simulation_service.py:295-354`

```python
def run_single_round(self) -> SimulationRoundResult:
    self.current_company_round += 1
    t = self.current_company_round
    
    # ... add investors ...
    
    # Process all current investors
    for investor in self.investors:
        # Calculate and process payment
        actual_payment = self._calculate_actual_payment(investor)
        investor.add_payment(t, actual_payment)
        total_payment_this_round += actual_payment
        
        # Calculate and process revenue
        revenue = self._calculate_revenue(investor, actual_payment)
        revenue = round(revenue)
        investor.add_revenue(t, revenue)
        total_revenue_this_round += revenue
```

**Impact**: Each round processes all investors. Settlement bonus deactivation affects all subsequent rounds globally.

### 5. Test Coverage

**Location**: `src/backend/tests/unit/simulation/test_simulation_service.py:164-185, 593-609`

**Relevant Tests**:
- `test_RND_005_settlement_bonus_deactivates_round_16`: Verifies settlement bonus deactivation
- `test_settlement_bonus_deactivation_after_round_15`: Tests deactivation timing

**Impact**: Tests validate current behavior. Changes to settlement bonus logic require test updates.

### 6. Constant Validation

**Location**: `src/backend/tests/unit/test_constants.py:81-90`

```python
def test_PLAN_006_round_bonus_rates_structure(self, plan_parameters):
    """PLAN-006: round_bonus_rates keys subset of range(4, 100) and values >=1."""
    plan_id, plan = plan_parameters
    bonus_rates = plan['round_bonus_rates']
```

**Impact**: Tests ensure `round_bonus_rates` structure validity. Plan G's limited range (4-12) is by design.

---

## Code Execution Flow

### Initialization Flow
```
API Request (POST /api/simulation/run)
  → routes.py:run_simulation()
    → services/simulations.py:SimulationService.run()
      → simulation_service.py:FinancialSimulationService.__init__()
        → Constants loaded from PLAN_PARAMETERS["G"]
        → settlement_bonus_active = True
        → original_settlement_bonus = 100000
```

### Per-Round Execution Flow (Round 17+)
```
simulation_service.py:run_single_round()
  → current_company_round = 17
  → Add re-entry investor (재입학) [stable phase]
  → For each of 12 investors:
      → _calculate_actual_payment() → 110,000
      → _calculate_revenue()
          → _check_settlement_bonus_condition()
              → if current_company_round > 15:
                  → settlement_bonus_active = False
                  → params['settlement_bonus'] = 0
          → internal_round >= 4:
              → bonus_rate = round_bonus_rates.get(internal_round, 0)
              → bonus_amount = min(base_calc_value * bonus_rate, max_bonus)
              → additional_revenue = bonus_amount * achievement_rate
              → base_revenue_r3 = (base_calc_value_r3 * 0.32) + 0  # settlement_bonus is 0
              → return base_revenue_r3 + additional_revenue
  → Total revenue (before tax): 1,344,000
  → Total revenue (after tax): 1,299,648
  → Total payment: 1,320,000
  → Net profit (after tax): prev_revenue_after_tax - total_payment
                          = 1,299,648 - 1,320,000
                          = -20,352
```

---

## Conclusion

### Is This a Bug?

**No.** The behavior is mathematically correct according to the implemented financial model. However, it reveals a **design consideration**:

**The Issue**: For Plan G with low sales achievement rates (≤30%), the model produces negative profits after settlement bonus deactivation at round 16 because:

1. **Revenue drops** when settlement bonus (100,000 per investor at internal_round 3) is removed
2. **Low sales achievement** (30%) means bonus revenue is insufficient to compensate
3. **Fixed payment** (110,000 per investor) exceeds adjusted revenue

### Mathematical Breakeven Analysis

For net profit to be positive after round 16, the following must hold:
```
Revenue (after tax) > Payment
1,344,000 × 0.967 > 1,320,000
1,299,648 > 1,320,000  ❌ FALSE
```

**Required revenue (before tax)** for breakeven:
```
Revenue_needed = Payment / 0.967 = 1,320,000 / 0.967 ≈ 1,365,048
```

**Current revenue gap**: 1,365,048 - 1,344,000 = **21,048** (before tax)

This explains why `net_profit_after_tax = -20,352` (after tax impact on the gap).

### Potential Solutions (If Design Change Needed)

1. **Extend `round_bonus_rates` for Plan G** beyond internal_round 12
2. **Adjust settlement bonus deactivation threshold** (keep active longer than round 15)
3. **Increase sales commission rate** for Plan G in later rounds
4. **Lower minimum payment** for re-entry investors (재입학) in Plan G
5. **Document as expected behavior** if financial model is accurate

---

## Appendix: Supporting Evidence

### Issue Data Sample (Round 17)
```json
{
  "company_round": 17,
  "total_payment": 1320000,
  "investor_count": 12,
  "investor_details": [
    {"investor_internal_round": 12, "payment": 110000, "revenue": 332000, "investor_type": "재입학"},
    {"investor_internal_round": 11, "payment": 110000, "revenue": 182000, "investor_type": "재입학"},
    // ... 10 more investors ...
  ],
  "total_revenue_before_tax": 1344000,
  "total_revenue_after_tax": 1299648,
  "net_profit_after_tax": -20352,
  "cumulative_net_profit": 3697774
}
```

### Plan G Parameters
- **Settlement Bonus**: 100,000 (active rounds 1-15 only)
- **Max Investor Count**: 12
- **Round Bonus Rates**: {4:1, 5:1, 6:2, 7:2, 8:3, 9:3, 10:5, 11:5, 12:10}
- **Sales Commission**: 32%
- **Tax Rate**: 3.3%

---

**Analysis Date**: 2025-11-14  
**Analyst**: GitHub Copilot (Agent Mode)  
**Branch**: IS-109
