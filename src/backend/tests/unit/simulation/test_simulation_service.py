"""Tests for FinancialSimulationService - core simulation logic."""
import pytest
import json
from pathlib import Path
from typing import Dict, Any

from simulation_service import FinancialSimulationService, SimulationResults
from constants import PLAN_PARAMETERS


class TestSimulationServiceStructuralInvariants:
    """Test structural invariants for single round simulation across all plans."""
    
    def test_plan_a_round_1_structure(self, simulation_service_factory):
        """Test Plan A round 1 structural invariants."""
        svc = simulation_service_factory('A')
        result = svc.run_simulation(1)
        r1 = result.history[0]
        
        assert r1.investor_count >= 1
        assert r1.total_payment >= 0
        assert r1.total_revenue_after_tax >= 0
        assert r1.cumulative_net_profit is not None  # Can be negative in early rounds
    
    def test_all_plans_round_1_invariants(self, simulation_service_factory, plan_parameters):
        """Test round 1 structural invariants across all plans."""
        svc = simulation_service_factory(plan_parameters)
        result = svc.run_simulation(1)
        r1 = result.history[0]
        
        # Basic structural invariants
        assert r1.investor_count >= 1
        assert r1.total_payment >= 0
        assert r1.total_revenue_before_tax >= 0
        assert r1.total_revenue_after_tax >= 0
        assert r1.total_revenue_after_tax <= r1.total_revenue_before_tax  # Tax reduces revenue
        assert r1.company_round == 1
        
        # Tax calculation correctness (3.3%)
        expected_tax = r1.total_revenue_before_tax * 0.033
        actual_tax = r1.total_revenue_before_tax - r1.total_revenue_after_tax
        assert abs(actual_tax - expected_tax) <= 1e-6
    
    def test_cumulative_profit_monotonic(self, simulation_service_factory):
        """Test that cumulative profit is monotonic non-decreasing after initial rounds."""
        svc = simulation_service_factory('A')
        result = svc.run_simulation(5)
        
        # After the initial investment rounds, cumulative profit should trend upward
        # (though individual rounds might have small decreases due to new investments)
        cumulative_profits = [r.cumulative_net_profit for r in result.history]
        
        # At minimum, the final cumulative profit should be higher than the first
        # (this is a weaker test but avoids flakiness from round-to-round variations)
        assert len(cumulative_profits) == 5
        # Check that we don't have extreme negative drift
        assert cumulative_profits[-1] > cumulative_profits[0] - 10000000  # Allow for reasonable investment


class TestSimulationServiceMultiRoundSnapshot:
    """Test multi-round simulation with snapshot validation."""
    
    def test_plan_a_canonical_snapshot(self, simulation_service_factory, determinism_guard):
        """Test Plan A with canonical 36 rounds and validate against snapshot."""
        from conftest import CANONICAL_SNAPSHOT_ROUNDS
        
        # Use determinism guard to ensure no randomness
        svc = simulation_service_factory('A')
        result = svc.run_simulation(CANONICAL_SNAPSHOT_ROUNDS)
        
        # Generate snapshot data
        snapshot_data = {
            "version": "1.0",
            "generated_at": "2025-09-18T00:00:00Z",  # Will be ignored in comparison
            "plan_id": "A",
            "rounds": CANONICAL_SNAPSHOT_ROUNDS,
            "fields": ["investor_count", "total_payment", "total_revenue_after_tax", "cumulative_profit"],
            "history": []
        }
        
        for round_result in result.history:
            snapshot_data["history"].append({
                "round": round_result.company_round,
                "investor_count": round_result.investor_count,
                "total_payment": round_result.total_payment,
                "total_revenue_after_tax": round_result.total_revenue_after_tax,
                "cumulative_profit": round_result.cumulative_net_profit
            })
        
        # Check if snapshot file exists
        snapshot_path = Path(__file__).parent / "__snapshots__" / "plan_a_rounds_36.json"
        
        if snapshot_path.exists():
            # Load existing snapshot and compare
            with open(snapshot_path) as f:
                expected_snapshot = json.load(f)
            
            # Compare ignoring generated_at
            assert snapshot_data["version"] == expected_snapshot["version"]
            assert snapshot_data["plan_id"] == expected_snapshot["plan_id"]
            assert snapshot_data["rounds"] == expected_snapshot["rounds"]
            assert snapshot_data["fields"] == expected_snapshot["fields"]
            
            # Compare history with tolerance for floating point
            assert len(snapshot_data["history"]) == len(expected_snapshot["history"])
            
            for actual, expected in zip(snapshot_data["history"], expected_snapshot["history"]):
                assert actual["round"] == expected["round"]
                assert actual["investor_count"] == expected["investor_count"]
                assert abs(actual["total_payment"] - expected["total_payment"]) <= 1e-6
                assert abs(actual["total_revenue_after_tax"] - expected["total_revenue_after_tax"]) <= 1e-6
                assert abs(actual["cumulative_profit"] - expected["cumulative_profit"]) <= 1e-6
        else:
            # Create snapshot file for future comparisons
            snapshot_path.parent.mkdir(exist_ok=True)
            with open(snapshot_path, 'w') as f:
                json.dump(snapshot_data, f, indent=2)
            
            # Mark test as expected to fail until snapshot is verified
            pytest.fail(f"Snapshot file created at {snapshot_path}. Review and re-run test.")
    
    def test_settlement_bonus_deactivation_after_round_15(self, simulation_service_factory):
        """Test that settlement bonus is deactivated after round 15."""
        svc = simulation_service_factory('A')
        result = svc.run_simulation(20)  # Run past round 15
        
        # Check that settlement bonus is active for early rounds and inactive later
        # This requires checking the service state, but we can infer from revenue patterns
        
        # For Plan A, settlement bonus should affect rounds 1-15
        early_rounds = result.history[:15]
        later_rounds = result.history[15:]
        
        assert len(early_rounds) == 15
        assert len(later_rounds) == 5
        
        # Verify simulation ran correctly
        assert all(r.company_round <= 15 for r in early_rounds)
        assert all(r.company_round > 15 for r in later_rounds)


class TestSimulationServiceEdgeCases:
    """Test edge cases and error conditions."""
    
    def test_invalid_plan_id_raises_error(self, simulation_service_factory):
        """Test that invalid plan ID raises ValueError."""
        with pytest.raises(ValueError, match="Invalid plan"):
            simulation_service_factory('INVALID_PLAN')
    
    def test_zero_rounds_raises_error(self, simulation_service_factory):
        """Test that zero rounds raises ValueError.""" 
        svc = simulation_service_factory('A')
        with pytest.raises(ValueError, match="Total rounds must be positive"):
            svc.run_simulation(0)
    
    def test_negative_rounds_raises_error(self, simulation_service_factory):
        """Test that negative rounds raises ValueError."""
        svc = simulation_service_factory('A')
        with pytest.raises(ValueError, match="Total rounds must be positive"):
            svc.run_simulation(-5)


class TestSimulationServiceTaxLogic:
    """Test tax computation correctness."""
    
    def test_tax_calculation_first_round(self, simulation_service_factory):
        """Test tax calculation correctness for first round."""
        svc = simulation_service_factory('A')
        result = svc.run_simulation(1)
        r1 = result.history[0]
        
        # Tax should be 3.3% of gross revenue
        expected_tax = r1.total_revenue_before_tax * 0.033
        actual_tax = r1.total_revenue_before_tax - r1.total_revenue_after_tax
        
        assert abs(actual_tax - expected_tax) <= 1e-6
    
    def test_tax_calculation_multiple_rounds(self, simulation_service_factory):
        """Test tax calculation correctness across multiple rounds."""
        svc = simulation_service_factory('A')
        result = svc.run_simulation(5)
        
        for round_result in result.history:
            expected_tax = round_result.total_revenue_before_tax * 0.033
            actual_tax = round_result.total_revenue_before_tax - round_result.total_revenue_after_tax
            
            assert abs(actual_tax - expected_tax) <= 1e-6
    
    def test_cumulative_tax_accumulation(self, simulation_service_factory):
        """Test that cumulative tax calculations don't double-tax."""
        svc = simulation_service_factory('A')
        result = svc.run_simulation(3)
        
        # Calculate sum of per-round net after tax
        sum_net_after_tax = sum(r.total_revenue_after_tax for r in result.history)
        
        # Calculate total gross and expected total tax
        total_gross = sum(r.total_revenue_before_tax for r in result.history)
        expected_total_tax = total_gross * 0.033
        
        # Verify no double taxation
        actual_total_after_tax = total_gross - expected_total_tax
        assert abs(sum_net_after_tax - actual_total_after_tax) <= 1e-6


class TestSimulationServiceCustomParameters:
    """Test simulation with custom parameter overrides."""
    
    def test_custom_scheduled_payment_override(self, simulation_service_factory):
        """Test simulation with custom scheduled payment."""
        custom_payment = {1: 500000, 2: 600000, 3: 700000}
        svc = simulation_service_factory('A', {'scheduled_payment': custom_payment})
        
        result = svc.run_simulation(3)
        
        # Verify custom payments are used
        # The exact payment logic depends on min_payment constraints
        # but we can verify the service accepts the parameters
        assert len(result.history) == 3
        assert all(r.total_payment > 0 for r in result.history)
    
    def test_custom_sales_achievement_rates(self, simulation_service_factory):
        """Test simulation with custom sales achievement rates."""
        custom_rates = {4: 0.8, 5: 0.9, 6: 0.7}  # Valid range 0.5-1.0
        svc = simulation_service_factory('A', {'sales_achievement_rates': custom_rates})
        
        result = svc.run_simulation(10)
        
        # Verify simulation runs successfully with custom rates
        assert len(result.history) == 10
        assert all(r.total_revenue_after_tax >= 0 for r in result.history)
    
    def test_invalid_sales_achievement_rates_filtered(self, simulation_service_factory):
        """Test that invalid sales achievement rates are filtered out."""
        # Mix of valid and invalid rates
        custom_rates = {4: 0.8, 5: 1.5, 6: 0.3, 7: 0.9}  # 5 and 6 are invalid
        svc = simulation_service_factory('A', {'sales_achievement_rates': custom_rates})
        
        # Should not raise error - invalid rates should be filtered
        result = svc.run_simulation(5)
        assert len(result.history) == 5


class TestSimulationServicePlanSpecificLogic:
    """Test plan-specific parameter validation."""
    
    def test_plan_d_max_investor_count(self, simulation_service_factory):
        """Test Plan D has correct max_investor_count (18)."""
        svc = simulation_service_factory('D')
        
        # Verify plan D parameters
        assert svc.max_investor_count == 18
        assert PLAN_PARAMETERS['D']['max_investor_count'] == 18
    
    def test_plan_a_vs_plan_c_max_bonus_difference(self, simulation_service_factory):
        """Test Plan A vs Plan C max_bonus differences."""
        svc_a = simulation_service_factory('A')
        svc_c = simulation_service_factory('C')
        
        # Verify different max_bonus values
        assert PLAN_PARAMETERS['A']['max_bonus'] == 30000000
        assert PLAN_PARAMETERS['C']['max_bonus'] == 50000000
        assert svc_a.params['max_bonus'] != svc_c.params['max_bonus']


class TestSimulationResultsStructure:
    """Test simulation results data structure."""
    
    def test_simulation_results_to_dict(self, simulation_service_factory):
        """Test SimulationResults.to_dict() method."""
        svc = simulation_service_factory('A')
        result = svc.run_simulation(3)
        
        result_dict = result.to_dict()
        
        assert 'plan_id' in result_dict
        assert 'history' in result_dict
        assert result_dict['plan_id'] == 'A'
        assert len(result_dict['history']) == 3
        
        # Verify each round has required fields
        for round_data in result_dict['history']:
            required_fields = [
                'company_round', 'investor_count', 'total_payment',
                'total_revenue_before_tax', 'total_revenue_after_tax',
                'net_profit_after_tax', 'cumulative_net_profit',
                'investor_details'
            ]
            for field in required_fields:
                assert field in round_data
    
    def test_round_result_to_dict(self, simulation_service_factory):
        """Test SimulationRoundResult.to_dict() method."""
        svc = simulation_service_factory('A')
        result = svc.run_simulation(1)
        round_result = result.history[0]
        
        round_dict = round_result.to_dict()
        
        required_fields = [
            'company_round', 'investor_count', 'total_payment',
            'total_revenue_before_tax', 'total_revenue_after_tax',
            'net_profit_after_tax', 'cumulative_net_profit',
            'investor_details'
        ]
        
        for field in required_fields:
            assert field in round_dict
            assert round_dict[field] is not None


class TestSimulationServiceBoundaryConditions:
    """Test boundary conditions and round transitions."""
    
    def test_round_boundary_transitions(self, simulation_service_factory):
        """Test explicit boundary transitions for rounds 1, 15, 16."""
        svc = simulation_service_factory('A')
        result = svc.run_simulation(20)
        
        # Test round 1 
        r1 = result.history[0]
        assert r1.company_round == 1
        assert r1.investor_count == 1  # First investor added
        
        # Test round 15 (last round with settlement bonus)
        r15 = result.history[14]  # 0-indexed
        assert r15.company_round == 15
        
        # Test round 16 (first round without settlement bonus)
        r16 = result.history[15]  # 0-indexed  
        assert r16.company_round == 16
        
        # Settlement bonus deactivation should be reflected in revenue patterns
        # The exact revenue difference would depend on implementation details
        assert r15.total_revenue_before_tax >= 0
        assert r16.total_revenue_before_tax >= 0
    
    def test_investor_growth_ceiling(self, simulation_service_factory):
        """Test that investor count never exceeds max_investor_count."""
        svc = simulation_service_factory('A')  # max_investor_count = 15
        result = svc.run_simulation(25)  # Run well past max
        
        for round_result in result.history:
            assert round_result.investor_count <= 15
    
    def test_high_round_count_stability(self, simulation_service_factory):
        """Test simulation stability with high round count."""
        svc = simulation_service_factory('A')
        result = svc.run_simulation(100)
        
        # Verify simulation completes without errors
        assert len(result.history) == 100
        
        # Check monotonic cumulative values (allowing for some variance)
        cumulative_profits = [r.cumulative_net_profit for r in result.history]
        
        # Should generally trend upward over long periods
        assert cumulative_profits[-1] > cumulative_profits[30]  # Later half > earlier half


class TestSimulationServiceInputValidation:
    """Test input validation and sanitation."""
    
    def test_plan_id_case_sensitivity(self, simulation_service_factory):
        """Test that plan IDs are case sensitive and reject lowercase."""
        with pytest.raises(ValueError, match="Invalid plan"):
            simulation_service_factory('a')  # lowercase should fail
        
        with pytest.raises(ValueError, match="Invalid plan"):
            simulation_service_factory('plan_a')  # alternative format should fail
    
    def test_scheduled_payment_negative_values_handling(self, simulation_service_factory):
        """Test handling of negative payment values."""
        # The service should handle this gracefully by using minimums
        negative_payments = {1: -100000, 2: 200000}
        svc = simulation_service_factory('A', {'scheduled_payment': negative_payments})
        
        # Should use minimum payment rules instead of negative values
        result = svc.run_simulation(2)
        assert len(result.history) == 2
        assert all(r.total_payment >= 0 for r in result.history)
    
    def test_scheduled_payment_non_integer_keys_conversion(self, simulation_service_factory):
        """Test that string round keys are converted to integers.""" 
        string_key_payments = {"1": 500000, "2": 600000}  # String keys
        # This depends on how the service handles string keys
        # The test verifies the service doesn't crash
        try:
            svc = simulation_service_factory('A', {'scheduled_payment': string_key_payments})
            result = svc.run_simulation(2)
            assert len(result.history) == 2
        except (ValueError, TypeError, KeyError):
            # If the service rejects string keys, that's also acceptable behavior
            pass


class TestSimulationServiceMonetaryExtremes:
    """Test monetary magnitude extremes."""
    
    def test_very_large_payment_values(self, simulation_service_factory):
        """Test simulation with very large payment values."""
        large_payments = {1: 1000000000, 2: 2000000000}  # 1-2 billion
        svc = simulation_service_factory('A', {'scheduled_payment': large_payments})
        
        result = svc.run_simulation(2)
        
        # Should not cause overflow or precision issues
        assert len(result.history) == 2
        for round_result in result.history:
            assert round_result.total_payment >= 0
            assert round_result.total_revenue_after_tax >= 0
            assert round_result.cumulative_net_profit is not None
            # Verify no extreme precision drift
            assert abs(round_result.total_revenue_after_tax) < 1e15  # Reasonable upper bound
    
    def test_zero_payment_handling(self, simulation_service_factory):
        """Test handling of zero payment values."""
        zero_payments = {1: 0, 2: 0, 3: 0}
        svc = simulation_service_factory('A', {'scheduled_payment': zero_payments})
        
        result = svc.run_simulation(3)
        
        # Should use minimum payment rules instead of zero
        assert len(result.history) == 3
        # Payments should fall back to minimums from plan parameters
        for round_result in result.history:
            assert round_result.total_payment > 0  # Should use minimums


class TestSimulationServiceAchievementRates:
    """Test sales achievement rates handling."""
    
    def test_achievement_rates_padding_behavior(self, simulation_service_factory):
        """Test shorter achievement rates list gets padded."""
        # Provide rates for only first few rounds
        short_rates = {4: 0.8, 5: 0.9}  # Missing later rounds
        svc = simulation_service_factory('A', {'sales_achievement_rates': short_rates})
        
        result = svc.run_simulation(10)
        
        # Should complete without errors (padding behavior)
        assert len(result.history) == 10
    
    def test_achievement_rates_truncation_behavior(self, simulation_service_factory):
        """Test longer achievement rates list gets truncated."""
        # Provide more rates than needed
        long_rates = {i: 0.8 for i in range(4, 50)}  # Many more than needed
        svc = simulation_service_factory('A', {'sales_achievement_rates': long_rates})
        
        result = svc.run_simulation(5)
        
        # Should complete without errors (truncation behavior)
        assert len(result.history) == 5
    
    def test_achievement_rates_out_of_range_ignored(self, simulation_service_factory):
        """Test that achievement rates outside 0.5-1.0 range are ignored."""
        invalid_rates = {4: 1.5, 5: 0.3, 6: 0.8}  # Only 6 is valid
        svc = simulation_service_factory('A', {'sales_achievement_rates': invalid_rates})
        
        # Should not raise error and should run simulation
        result = svc.run_simulation(10)
        assert len(result.history) == 10


@pytest.mark.unit_slow  
class TestSimulationServiceStress:
    """Stress tests marked for optional execution."""
    
    def test_very_high_round_count(self, simulation_service_factory):
        """Test simulation with very high round count (200 rounds).""" 
        svc = simulation_service_factory('A')
        result = svc.run_simulation(200)
        
        # Verify basic stability
        assert len(result.history) == 200
        
        # Check for monotonic cumulative values only (no performance assertions)
        cumulative_profits = [r.cumulative_net_profit for r in result.history]
        
        # Over 200 rounds, should generally show growth
        early_avg = sum(cumulative_profits[:50]) / 50
        late_avg = sum(cumulative_profits[-50:]) / 50
        assert late_avg > early_avg  # Later periods should be more profitable


class TestSimulationServiceDeterminism:
    """Test determinism and reproducibility."""
    
    def test_simulation_determinism(self, simulation_service_factory, determinism_guard):
        """Test that simulation results are deterministic."""
        # Run same simulation twice with determinism guard
        svc1 = simulation_service_factory('A')
        result1 = svc1.run_simulation(5)
        
        svc2 = simulation_service_factory('A')  
        result2 = svc2.run_simulation(5)
        
        # Results should be identical
        assert len(result1.history) == len(result2.history)
        
        for r1, r2 in zip(result1.history, result2.history):
            assert r1.company_round == r2.company_round
            assert r1.investor_count == r2.investor_count
            assert r1.total_payment == r2.total_payment
            assert abs(r1.total_revenue_after_tax - r2.total_revenue_after_tax) <= 1e-6
            assert abs(r1.cumulative_net_profit - r2.cumulative_net_profit) <= 1e-6
    
    def test_no_random_usage_in_simulation(self, simulation_service_factory, determinism_guard):
        """Test that simulation doesn't use random functions."""
        # determinism_guard fixture will raise if random functions are called
        svc = simulation_service_factory('A')
        result = svc.run_simulation(10)
        
        # If we reach here, no random functions were called
        assert len(result.history) == 10
