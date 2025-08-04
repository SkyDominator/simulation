"""
Test script for the custom simulation API.

This script tests the FinancialSimulationService class without needing to run the API.
"""

import json
from simulation_service import FinancialSimulationService

def test_custom_simulation():
    """Test the simulation service with custom parameters."""
    # Use Plan P but with custom scheduled payments
    plan_id = "P"
    max_rounds = 36  # Run just 36 rounds for the test

    # Custom scheduled payments - different from the default
    # scheduled_payment = {
    #     1: 330000,  # Changed from default 550000
    #     2: 220000,  # Changed from default 220000
    #     3: 330000,  # Changed from default 330000
    #     4: 330000,  # Same as default
    #     5: 330000,  # Same as default,
    #     6: 330000,  # Same as default
    #     7: 330000,  # Same as default
    #     8: 330000,  # Same as default
    #     9: 1100000,  # Same as default
    #     10: 1100000,  # Same as default
    #     11: 2200000,  # Same as default
    #     12: 2200000,  # Same as default
    #     13: 3300000,  # Same as default
    #     14: 5500000,  # Same as default
    #     15: 11000000,  # Same as default
    # }
    
    scheduled_payment = {1: 330000, 2: 330000, 3:330000, 4: 330000, 5: 330000, 6: 330000, 7: 330000, 8: 330000, 9: 1100000, 10: 1100000, 11: 2200000, 12: 2200000, 13:3300000, 14:5500000, 15: 11000000, 16: 11000000, 17: 22000000, 18: 22000000, 19: 22000000, 20: 22000000, 21: 22000000, 22: 22000000, 23: 22000000, 24: 22000000, 25: 22000000, 26: 22000000, 27: 22000000, 28: 22000000, 29: 22000000, 30: 22000000, 31:22000000, 32:22000000, 33:22000000, 34:22000000, 35:22000000, 36:22000000}
    
    try:
        # Create simulation service with custom parameters
        simulator = FinancialSimulationService(
            plan_id=plan_id,
            scheduled_payment=scheduled_payment
        )
        
        # Run the simulation
        results = simulator.run_simulation(max_rounds)
        
        # Print results
        print(f"Simulation results for plan {plan_id} with custom scheduled payments:")
        print(json.dumps(results.to_dict(), indent=2))
        
        return True
    except Exception as e:
        print(f"Test failed: {str(e)}")
        return False

if __name__ == "__main__":
    test_custom_simulation()
