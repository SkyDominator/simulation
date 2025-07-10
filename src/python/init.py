"""
Main entry point for partner club financial simulation.

This module serves as the entry point for running the financial simulation.
It demonstrates how to use the refactored modular codebase.
"""

import sys
import os
import logging
import pandas as pd
from typing import List, Dict, Any, Optional
import traceback

from config import get_plan_parameters, validate_plan_parameters
from models.investor import Investor
from models.results import SimulationResults
from services.simulator import FinancialSimulationService
from utils.reporting import (
    print_round_summary,
    print_simulation_summary, 
    export_to_excel
)

# Configure logging
logger = logging.getLogger(__name__)


def run_simulation(plan_id: str, total_rounds: int) -> SimulationResults:
    """
    Run a complete financial simulation for the specified plan.
    
    Args:
        plan_id (str): The plan identifier to use
        total_rounds (int): The number of rounds to simulate
        
    Returns:
        SimulationResults: The simulation results
        
    Raises:
        ValueError: If the plan_id is invalid or the parameters are incomplete
        Exception: For any other errors during simulation
    """
    try:
        # Create the simulation service with the specified plan
        simulator = FinancialSimulationService(plan_id=plan_id)
        
        # Run the simulation for the specified number of rounds
        results = simulator.run_simulation(total_rounds)
        
        return results
        
    except ValueError as e:
        logger.error(f"Invalid simulation parameters: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Simulation failed: {str(e)}")
        raise


def list_available_plans() -> List[str]:
    """
    Get a list of all available plans.
    
    Returns:
        List[str]: List of plan identifiers
    """
    try:
        # Access the internal function that has all plan parameters
        from config import _get_all_plan_parameters
        all_plans = list(_get_all_plan_parameters().keys())
        return sorted(all_plans)
    except Exception:
        # Fall back to a basic list of common plans
        return ['A', 'B', 'C', 'D', 'K', 'P', 'R', 'F', 'E']


def main() -> None:
    """
    Main function to run the simulation from the command line.
    
    This function handles user input, runs the simulation, and displays the results.
    """
    try:
        # Display available plans
        available_plans = list_available_plans()
        print("Available plans:", ", ".join(available_plans))
        
        # Get user input or use default values
        plan = input("Select a plan (default: A): ").strip().upper() or "A"
        
        if plan not in available_plans:
            print(f"Invalid plan: {plan}")
            return
        
        try:
            total_rounds = int(input("Enter number of rounds to simulate (default: 30): ") or "30")
            if total_rounds <= 0:
                raise ValueError("Number of rounds must be positive")
        except ValueError:
            print("Invalid input. Using default of 30 rounds.")
            total_rounds = 30
            
        # Run the simulation
        print(f"\nRunning simulation for Plan {plan} with {total_rounds} rounds...\n")
        results = run_simulation(plan, total_rounds)
        
        # Display the results
        print_round_summary(results)
        print_simulation_summary(results)
        
        # Option to export results
        export = input("\nExport results to Excel? (y/n): ").strip().lower()
        if export == 'y':
            file_path = input("Enter file path (default: results.xlsx): ").strip() or "results.xlsx"
            export_to_excel(results, file_path)
            print(f"Results exported to {file_path}")
            
    except ValueError as e:
        print(f"\nSimulation setup error: {e}")
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        traceback.print_exc()
        

if __name__ == "__main__":
    main()