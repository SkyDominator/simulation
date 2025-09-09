import pytest
from decimal import Decimal
from unittest.mock import Mock, patch
import sys
import os

# Add the src directory to the path so we can import modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from simulation_service import FinancialSimulationService, Investor, SimulationRoundResult
from constants import PLAN_PARAMETERS


class TestFinancialSimulationService:
    """Test critical financial calculation logic"""
    
    @pytest.fixture
    def simulation_service_plan_a(self):
        """Create a FinancialSimulationService instance with Plan A"""
        return FinancialSimulationService(plan_id="A")
    
    @pytest.fixture
    def simulation_service_plan_b(self):
        """Create a FinancialSimulationService instance with Plan B"""
        return FinancialSimulationService(plan_id="B")
    
    def test_tax_calculation_accuracy(self, simulation_service_plan_a):
        """Test 3.3% tax calculation on total revenue"""
        # Run a single round to get revenue data
        result = simulation_service_plan_a.run_single_round()
        
        # Verify tax calculation (3.3%)
        expected_tax = result.total_revenue_before_tax * 0.033
        actual_tax = result.total_revenue_before_tax - result.total_revenue_after_tax
        
        assert abs(actual_tax - expected_tax) < 0.01, f"Tax calculation incorrect: expected {expected_tax}, got {actual_tax}"
    
    def test_plan_a_investment_schedule(self, simulation_service_plan_a):
        """Test Plan A investment calculations across rounds"""
        # Run simulation for 4 rounds
        results = simulation_service_plan_a.run_simulation(4)
        
        # Verify investment progression
        assert len(results.history) == 4
        assert results.history[0].total_payment > 0
        assert results.history[-1].cumulative_net_profit is not None
        
        # Verify first round payment matches plan A schedule
        first_round_payment = results.history[0].total_payment
        expected_first_payment = PLAN_PARAMETERS["A"]["scheduled_payment"][1]
        assert first_round_payment == expected_first_payment
    
    @pytest.mark.parametrize("plan_id,expected_max_investor", [
        ('A', 15), ('B', 15), ('C', 15), ('D', 18), ('K', 18)
    ])
    def test_plan_specific_max_investors(self, plan_id, expected_max_investor):
        """Test plan-specific max investor count parameters"""
        service = FinancialSimulationService(plan_id=plan_id)
        assert service.max_investor_count == expected_max_investor
    
    @pytest.mark.parametrize("plan_id,expected_max_bonus", [
        ('A', 30000000), ('B', 30000000), ('C', 50000000), ('D', 100000000) 
    ])
    def test_plan_specific_max_bonus(self, plan_id, expected_max_bonus):
        """Test plan-specific max bonus parameters"""
        service = FinancialSimulationService(plan_id=plan_id)
        assert service.params['max_bonus'] == expected_max_bonus
    
    def test_custom_sales_achievement_rates(self):
        """Test custom sales achievement rates override"""
        custom_rates = {4: 0.8, 5: 0.9, 6: 1.0, 7: 0.95, 8:0.6, 9:0.7, 10:0.65}
        service = FinancialSimulationService(
            plan_id="A", 
            sales_achievement_rates=custom_rates
        )
        
        # Verify custom rates were applied
        for round_num, rate in custom_rates.items():
            assert service.params['sales_achievement_rates'][round_num] == rate
    
    def test_invalid_plan_raises_error(self):
        """Test that invalid plan ID raises ValueError"""
        with pytest.raises(ValueError, match="Invalid plan"):
            FinancialSimulationService(plan_id="INVALID")
    
    def test_revenue_calculation_rounds_1_to_3(self, simulation_service_plan_a):
        """Test revenue calculation for early rounds (1-3)"""
        # Create an investor and calculate revenue for early rounds
        investor = Investor(start_company_round=1)
        payment = 550000  # Plan A first round payment
        
        # Test round 1-2 calculation
        investor.internal_round = 1
        revenue = simulation_service_plan_a._calculate_revenue(investor, payment)
        
        expected_revenue = (payment / 1.1) * 0.32  # base_calc_value * sales_commission
        assert abs(revenue - expected_revenue) < 0.01
    
    def test_settlement_bonus_deactivation(self, simulation_service_plan_a):
        """Test settlement bonus deactivation when first investor reaches round 15"""
        # Create investor that started at round 1
        investor = Investor(start_company_round=1)
        investor.internal_round = 15
        
        # Settlement bonus should be active initially
        assert simulation_service_plan_a.settlement_bonus_active is True
        
        # Calculate revenue which should trigger deactivation
        simulation_service_plan_a._calculate_revenue(investor, 1000000)
        
        # Settlement bonus should now be deactivated
        assert simulation_service_plan_a.settlement_bonus_active is False
        assert simulation_service_plan_a.params['settlement_bonus'] == 0
    
    def test_investor_graduation_logic(self):
        """Test investor graduation when internal round exceeds max_investor_count"""
        investor = Investor(start_company_round=1)
        max_count = 15
        
        # Not graduated initially
        assert investor.is_graduated(max_count) is False
        
        # Set to graduation threshold
        investor.internal_round = 15
        assert investor.is_graduated(max_count) is True
    
    def test_zero_rounds_raises_error(self, simulation_service_plan_a):
        """Test that zero or negative rounds raise ValueError"""
        with pytest.raises(ValueError, match="Total rounds must be positive"):
            simulation_service_plan_a.run_simulation(0)
        
        with pytest.raises(ValueError, match="Total rounds must be positive"):
            simulation_service_plan_a.run_simulation(-1)
    
    def test_simulation_results_structure(self, simulation_service_plan_a):
        """Test that simulation results have correct structure"""
        results = simulation_service_plan_a.run_simulation(3)
        
        # Verify results structure
        assert hasattr(results, 'plan_id')
        assert hasattr(results, 'history')
        assert results.plan_id == "A"
        assert len(results.history) == 3
        
        # Verify each round result structure
        for round_result in results.history:
            assert hasattr(round_result, 'company_round')
            assert hasattr(round_result, 'investor_count')
            assert hasattr(round_result, 'total_payment')
            assert hasattr(round_result, 'total_revenue_before_tax')
            assert hasattr(round_result, 'total_revenue_after_tax')
            assert hasattr(round_result, 'net_profit_after_tax')
            assert hasattr(round_result, 'cumulative_net_profit')
    
    def test_edge_case_sales_rates_out_of_range(self):
        """Test that sales achievement rates outside 0.5-1.0 are filtered out"""
        invalid_rates = {4: 0.3, 5: 1.5, 6: 0.8}  # 0.3 and 1.5 are invalid
        service = FinancialSimulationService(
            plan_id="A", 
            sales_achievement_rates=invalid_rates
        )
        
        # Only valid rate (0.8) should be kept, invalid ones filtered out
        assert 6 in service.params['sales_achievement_rates']
        assert service.params['sales_achievement_rates'][6] == 0.8
        # Invalid rates should not be present in the overridden rates
        assert 4 not in service.params['sales_achievement_rates']  # Filtered out
        assert 5 not in service.params['sales_achievement_rates']  # Filtered out
        # But the original default plan rates should still exist for other rounds
        assert len(service.params['sales_achievement_rates']) >= 1  # At least the valid one


class TestInvestor:
    """Test Investor class functionality"""
    
    def test_investor_initialization(self):
        """Test investor initialization with correct defaults"""
        investor = Investor(start_company_round=5)
        
        assert investor.start_company_round == 5
        assert investor.internal_round == 1
        assert investor.investor_type == "신규"
        assert investor.base_return_r3 is None
        assert investor.payment_history == []
        assert investor.revenue_history == []
    
    def test_investor_payment_tracking(self):
        """Test investor payment history tracking"""
        investor = Investor(start_company_round=1)
        
        investor.add_payment(1, 550000)
        investor.add_payment(2, 220000)
        
        assert len(investor.payment_history) == 2
        assert investor.get_total_payments() == 770000
    
    def test_investor_revenue_tracking(self):
        """Test investor revenue history tracking"""
        investor = Investor(start_company_round=1)
        
        investor.add_revenue(1, 160000)
        investor.add_revenue(2, 64000)
        
        assert len(investor.revenue_history) == 2
        assert investor.get_total_revenue() == 224000
    
    def test_investor_round_increment(self):
        """Test investor round progression"""
        investor = Investor(start_company_round=1)
        
        assert investor.internal_round == 1
        investor.increment_round()
        assert investor.internal_round == 2


class TestSimulationRoundResult:
    """Test SimulationRoundResult class"""
    
    def test_round_result_to_dict(self):
        """Test conversion of round result to dictionary"""
        result = SimulationRoundResult(
            company_round=1,
            investor_count=1,
            total_payment=550000,
            total_revenue_before_tax=160000,
            total_revenue_after_tax=154720,
            net_profit_after_tax=-550000,
            cumulative_net_profit=-550000
        )
        
        result_dict = result.to_dict()
        
        assert result_dict['company_round'] == 1
        assert result_dict['investor_count'] == 1
        assert result_dict['total_payment'] == 550000
        assert result_dict['total_revenue_before_tax'] == 160000
        assert result_dict['total_revenue_after_tax'] == 154720
        assert result_dict['net_profit_after_tax'] == -550000
        assert result_dict['cumulative_net_profit'] == -550000
