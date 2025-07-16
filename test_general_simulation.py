"""
Test script for the general simulation system.

This script runs a small test of the general simulation system to verify it works correctly.
"""

import os
import sys
import logging

# Add the project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from src.python.general.services.general_simulator import GeneralSimulationService
from src.python.general.utils.reporting import print_simulation_summary


def test_general_simulation():
    """Run a small test of the general simulation."""
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    print("일반 시뮬레이션 테스트 시작...")
    
    # Create the simulation with a small number of investors and rounds
    simulator = GeneralSimulationService(plan_id="A", investor_count=100)
    
    # Run the simulation for 20 rounds
    results = simulator.run_simulation(20)
    
    # Print the summary
    print_simulation_summary(results)
    
    print("\n테스트 완료!")
    
    return results


if __name__ == "__main__":
    test_general_simulation()
