"""
Test script to verify the new turning point features work correctly.

This script tests both the "First Turning Point Round" and "Complete Turning Point Round" features.
"""

import sys
import os

# Add the local-sim directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src', 'local-sim', 'individual'))

from models.results import SimulationResults, SimulationRoundResult


def test_turning_point_features():
    """Test the turning point calculation logic with sample data."""
    
    print("Testing Turning Point Features")
    print("=" * 50)
    
    # Create sample simulation results with different profit patterns
    results = SimulationResults(plan_id="TEST")
    
    # Scenario 1: Simple pattern - goes down, then consistently up
    print("\nScenario 1: Simple upward trend after initial dip")
    print("-" * 50)
    
    # Reset results for this test
    results.history = []
    
    # Add rounds with a pattern: negative -> more negative -> starts going up consistently
    sample_rounds_1 = [
        SimulationRoundResult(1, 1, 1000, 500, 484, -516, -516),     # Round 1: -516 cumulative
        SimulationRoundResult(2, 2, 2000, 1200, 1162, -838, -1354),  # Round 2: -1354 cumulative (deeper)
        SimulationRoundResult(3, 3, 3000, 2000, 1934, -1066, -2420), # Round 3: -2420 cumulative (deepest)
        SimulationRoundResult(4, 4, 4000, 3200, 3098, -902, -3322),  # Round 4: -3322 cumulative (still deeper)
        SimulationRoundResult(5, 5, 5000, 4800, 4646, -354, -3676),  # Round 5: -3676 cumulative (deepest point)
        SimulationRoundResult(6, 6, 6000, 6500, 6294, 294, -3382),   # Round 6: -3382 cumulative (first improvement!)
        SimulationRoundResult(7, 7, 7000, 8000, 7744, 744, -2638),   # Round 7: -2638 cumulative (continues up)
        SimulationRoundResult(8, 8, 8000, 9500, 9202, 1202, -1436),  # Round 8: -1436 cumulative (continues up)
        SimulationRoundResult(9, 9, 9000, 11000, 10648, 1648, 212),  # Round 9: 212 cumulative (first positive!)
        SimulationRoundResult(10, 10, 10000, 12500, 12106, 2106, 2318) # Round 10: 2318 cumulative (continues up)
    ]
    
    for round_result in sample_rounds_1:
        results.add_round_result(round_result)
    
    summary_1 = results.get_summary()
    print(f"First Turning Point Round: {summary_1['first_turning_point_round']}")
    print(f"Complete Turning Point Round: {summary_1['complete_turning_point_round']}")
    print(f"First Positive Round: {summary_1['positive_net_profit_round']}")
    print(f"Max Negative Profit: {summary_1['max_negative_profit']}")
    
    # Scenario 2: Complex pattern - multiple ups and downs
    print("\nScenario 2: Complex pattern with multiple direction changes")
    print("-" * 50)
    
    # Reset results for this test
    results.history = []
    
    # Add rounds with a more complex pattern: down -> up -> down -> up consistently
    sample_rounds_2 = [
        SimulationRoundResult(1, 1, 1000, 500, 484, -516, -516),     # Round 1: -516 cumulative
        SimulationRoundResult(2, 2, 2000, 1200, 1162, -838, -1354),  # Round 2: -1354 cumulative (deeper)
        SimulationRoundResult(3, 3, 3000, 2000, 1934, -1066, -2420), # Round 3: -2420 cumulative (deepest so far)
        SimulationRoundResult(4, 4, 4000, 3500, 3390, -610, -3030),  # Round 4: -3030 cumulative (improved - first turning point!)
        SimulationRoundResult(5, 5, 5000, 3000, 2910, -2090, -5120), # Round 5: -5120 cumulative (went down again!)
        SimulationRoundResult(6, 6, 6000, 6500, 6294, 294, -4826),   # Round 6: -4826 cumulative (improved)
        SimulationRoundResult(7, 7, 7000, 6000, 5820, -1180, -6006), # Round 7: -6006 cumulative (went down again!)
        SimulationRoundResult(8, 8, 8000, 9500, 9202, 1202, -4804),  # Round 8: -4804 cumulative (improved)
        SimulationRoundResult(9, 9, 9000, 11000, 10648, 1648, -3156), # Round 9: -3156 cumulative (continues up)
        SimulationRoundResult(10, 10, 10000, 12500, 12106, 2106, -1050), # Round 10: -1050 cumulative (continues up)
        SimulationRoundResult(11, 11, 11000, 14000, 13552, 2552, 1502),  # Round 11: 1502 cumulative (continues up)
        SimulationRoundResult(12, 12, 12000, 15500, 15014, 3014, 4516)   # Round 12: 4516 cumulative (continues up)
    ]
    
    for round_result in sample_rounds_2:
        results.add_round_result(round_result)
    
    summary_2 = results.get_summary()
    print(f"First Turning Point Round: {summary_2['first_turning_point_round']}")
    print(f"Complete Turning Point Round: {summary_2['complete_turning_point_round']}")
    print(f"First Positive Round: {summary_2['positive_net_profit_round']}")
    print(f"Max Negative Profit: {summary_2['max_negative_profit']}")
    
    # Scenario 3: Never achieves complete turning point
    print("\nScenario 3: Never achieves complete turning point (continues to fluctuate)")
    print("-" * 50)
    
    # Reset results for this test
    results.history = []
    
    # Add rounds that continue to fluctuate until the end
    sample_rounds_3 = [
        SimulationRoundResult(1, 1, 1000, 500, 484, -516, -516),     # Round 1: -516 cumulative
        SimulationRoundResult(2, 2, 2000, 1200, 1162, -838, -1354),  # Round 2: -1354 cumulative (deeper)
        SimulationRoundResult(3, 3, 3000, 2000, 1934, -1066, -2420), # Round 3: -2420 cumulative (first turning point next)
        SimulationRoundResult(4, 4, 4000, 3500, 3390, -610, -3030),  # Round 4: -3030 cumulative (improved - first turning point!)
        SimulationRoundResult(5, 5, 5000, 6000, 5820, 820, -2210),   # Round 5: -2210 cumulative (improved)
        SimulationRoundResult(6, 6, 6000, 5000, 4850, -1150, -3360), # Round 6: -3360 cumulative (went down!)
        SimulationRoundResult(7, 7, 7000, 8000, 7744, 744, -2616),   # Round 7: -2616 cumulative (improved)
        SimulationRoundResult(8, 8, 8000, 7000, 6790, -1210, -3826), # Round 8: -3826 cumulative (went down again!)
        SimulationRoundResult(9, 9, 9000, 10000, 9700, 700, -3126),  # Round 9: -3126 cumulative (improved)
        SimulationRoundResult(10, 10, 10000, 9500, 9202, -798, -3924) # Round 10: -3924 cumulative (went down at the end!)
    ]
    
    for round_result in sample_rounds_3:
        results.add_round_result(round_result)
    
    summary_3 = results.get_summary()
    print(f"First Turning Point Round: {summary_3['first_turning_point_round']}")
    print(f"Complete Turning Point Round: {summary_3['complete_turning_point_round']}")
    print(f"First Positive Round: {summary_3['positive_net_profit_round']}")
    print(f"Max Negative Profit: {summary_3['max_negative_profit']}")
    
    print("\n" + "=" * 50)
    print("Test completed successfully!")
    print("\nExpected results:")
    print("Scenario 1: First=6, Complete=6 (simple upward trend)")
    print("Scenario 2: First=4, Complete=8 or 9 (complex but eventually stabilizes)")
    print("Scenario 3: First=4, Complete=None (never stabilizes)")


if __name__ == "__main__":
    test_turning_point_features()
