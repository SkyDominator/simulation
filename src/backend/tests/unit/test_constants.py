"""Tests for plan parameter integrity and constants validation."""
import pytest
from constants import PLAN_PARAMETERS


class TestPlanParameterIntegrity:
    """Test PLAN-001 to PLAN-006: Plan parameter table integrity."""
    
    def test_PLAN_001_all_expected_plan_ids_present(self):
        """PLAN-001: All expected plan IDs present set(A,B,C,D,K,P,R,F,E,G)."""
        expected_plans = {'A', 'B', 'C', 'D', 'K', 'P', 'R', 'F', 'E', 'G'}
        actual_plans = set(PLAN_PARAMETERS.keys())
        
        assert actual_plans == expected_plans, f"Missing plans: {expected_plans - actual_plans}, Extra plans: {actual_plans - expected_plans}"
    
    def test_PLAN_002_required_keys_present(self, plan_parameters):
        """PLAN-002: Each plan dict contains required keys."""
        required_keys = {
            'max_investor_count', 'min_payment_new', 'min_payment_re', 
            'revenue_base_divisor', 'sales_commission', 'settlement_bonus',
            'max_bonus', 'round_bonus_rates', 'sales_achievement_rates'
        }
        
        plan = PLAN_PARAMETERS[plan_parameters]
        actual_keys = set(plan.keys())
        
        missing_keys = required_keys - actual_keys
        assert not missing_keys, f"Plan {plan_parameters} missing required keys: {missing_keys}"
    
    def test_PLAN_003_numeric_types_correct(self, plan_parameters):
        """PLAN-003: Numeric fields have correct types and positive values."""
        plan = PLAN_PARAMETERS[plan_parameters]
        
        # Integer fields
        assert isinstance(plan['max_investor_count'], int)
        assert plan['max_investor_count'] > 0
        
        assert isinstance(plan['min_payment_re'], int)
        assert plan['min_payment_re'] > 0
        
        assert isinstance(plan['settlement_bonus'], int)
        assert plan['settlement_bonus'] >= 0  # Can be 0 when deactivated
        
        assert isinstance(plan['max_bonus'], int)
        assert plan['max_bonus'] > 0
        
        # Float fields
        assert isinstance(plan['revenue_base_divisor'], (int, float))
        assert plan['revenue_base_divisor'] > 1.0  # Must be greater than 1 for meaningful division
        
        assert isinstance(plan['sales_commission'], (int, float))
        assert 0.0 <= plan['sales_commission'] <= 1.0  # Commission as decimal percentage
    
    def test_PLAN_004_min_payment_new_structure(self, plan_parameters):
        """PLAN-004: min_payment_new is dict with int keys and positive int values."""
        plan = PLAN_PARAMETERS[plan_parameters]
        min_payment_new = plan['min_payment_new']
        
        assert isinstance(min_payment_new, dict)
        assert len(min_payment_new) > 0
        
        for round_num, amount in min_payment_new.items():
            assert isinstance(round_num, int), f"Round key {round_num} must be int"
            assert round_num > 0, f"Round number {round_num} must be positive"
            assert isinstance(amount, int), f"Amount {amount} for round {round_num} must be int"
            assert amount > 0, f"Amount {amount} for round {round_num} must be positive"
    
    def test_PLAN_005_sales_achievement_rates_range(self, plan_parameters):
        """PLAN-005: sales_achievement_rates values in valid range [0.1, 1.0]."""
        plan = PLAN_PARAMETERS[plan_parameters]
        rates = plan['sales_achievement_rates']
        
        assert isinstance(rates, dict)
        
        for round_num, rate in rates.items():
            assert isinstance(round_num, int), f"Round key {round_num} must be int"
            assert round_num > 0, f"Round number {round_num} must be positive"
            assert isinstance(rate, (int, float)), f"Rate {rate} for round {round_num} must be numeric"
            assert 0.1 <= rate <= 1.0, f"Rate {rate} for round {round_num} must be in range [0.1, 1.0]"
    
    def test_PLAN_006_round_bonus_rates_structure(self, plan_parameters):
        """PLAN-006: round_bonus_rates keys subset of range(4, 100) and values >=1."""
        plan = PLAN_PARAMETERS[plan_parameters]
        bonus_rates = plan['round_bonus_rates']
        
        assert isinstance(bonus_rates, dict)
        
        for round_num, multiplier in bonus_rates.items():
            assert isinstance(round_num, int), f"Round key {round_num} must be int"
            assert 4 <= round_num < 100, f"Round {round_num} must be in range [4, 100)"
            assert isinstance(multiplier, (int, float)), f"Multiplier {multiplier} for round {round_num} must be numeric"
            assert multiplier >= 1, f"Multiplier {multiplier} for round {round_num} must be >= 1"