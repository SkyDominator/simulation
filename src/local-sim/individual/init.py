"""
Main entry point for Light of Life Club financial simulation.

This module serves as the entry point for running the financial simulation.
It demonstrates how to use the refactored modular codebase with support for
single plan and multi-plan simulations.
"""

import logging
from typing import List, Dict, Any, Optional
import traceback

from models.results import SimulationResults, MultiPlanSimulationResults
from services.simulator import FinancialSimulationService
from config import get_plan_parameters
from utils.reporting import (
    print_round_summary,
    print_simulation_summary, 
    print_multi_plan_summary,
    plot_multi_plan_comparison,
    export_to_excel,
    export_multi_plan_to_excel
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
        # Get plan parameters to check max_rounds
        plan_params = get_plan_parameters(plan_id)
        max_rounds = plan_params.get('max_rounds', total_rounds)
        
        # Check if requested rounds exceed plan's maximum
        if total_rounds > max_rounds:
            logger.warning(f"Plan {plan_id} has a maximum limit of {max_rounds} rounds. "
                          f"Requested {total_rounds} rounds will be capped to {max_rounds}.")
            total_rounds = max_rounds
        
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


def run_multi_plan_simulation(plan_ids: List[str], total_rounds: int) -> MultiPlanSimulationResults:
    """
    Run financial simulations for multiple plans.
    
    Args:
        plan_ids (List[str]): List of plan identifiers to simulate
        total_rounds (int): The number of rounds to simulate for each plan
        
    Returns:
        MultiPlanSimulationResults: The multi-plan simulation results
        
    Raises:
        ValueError: If any plan_id is invalid or parameters are incomplete
        Exception: For any other errors during simulation
    """
    multi_results = MultiPlanSimulationResults()
    multi_results.total_rounds = total_rounds
    
    failed_plans = []
    
    for plan_id in plan_ids:
        try:
            logger.info(f"Running simulation for Plan {plan_id}...")
            
            # Get plan parameters to check max_rounds
            plan_params = get_plan_parameters(plan_id)
            max_rounds = plan_params.get('max_rounds', total_rounds)
            
            # Check if requested rounds exceed plan's maximum
            if total_rounds > max_rounds:
                logger.warning(f"Plan {plan_id} has a maximum limit of {max_rounds} rounds. "
                               f"Requested {total_rounds} rounds will be capped to {max_rounds}.")
                plan_rounds = max_rounds
            else:
                plan_rounds = total_rounds
            
            # Run simulation with appropriate number of rounds
            results = run_simulation(plan_id, plan_rounds)
            multi_results.add_plan_result(plan_id, results)
            logger.info(f"Successfully completed simulation for Plan {plan_id}")
        except Exception as e:
            logger.error(f"Failed to simulate Plan {plan_id}: {str(e)}")
            failed_plans.append(plan_id)
    
    if failed_plans:
        logger.warning(f"Failed to simulate plans: {', '.join(failed_plans)}")
    
    if not multi_results.plan_results:
        raise Exception("All plan simulations failed")
    
    return multi_results


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


def parse_plan_selection(user_input: str, available_plans: List[str]) -> List[str]:
    """
    Parse user input for plan selection.
    
    Args:
        user_input (str): User input string
        available_plans (List[str]): List of available plans
        
    Returns:
        List[str]: List of selected plan identifiers
    """
    if not user_input.strip():
        return []
    
    # Handle special cases
    if user_input.lower() == 'all':
        return available_plans
    
    # Parse comma-separated plans
    selected_plans = []
    for plan in user_input.split(','):
        plan = plan.strip().upper()
        if plan in available_plans:
            selected_plans.append(plan)
        else:
            logger.warning(f"Invalid plan: {plan}")
    
    return selected_plans


def main() -> None:
    """
    Main function to run the simulation from the command line.
    
    This function handles user input, runs single or multi-plan simulations,
    and displays comprehensive results.
    """
    try:
        # Display available plans
        available_plans = list_available_plans()
        print("Available plans:", ", ".join(available_plans))
        
        # Get plan selection
        print("\nPlan Selection Options:")
        print("  - Single plan: Enter one plan (e.g., 'A')")
        print("  - Multiple plans: Enter comma-separated plans (e.g., 'A,B,C')")
        print("  - All plans: Enter 'all'")
        
        plan_input = input("Select plan(s) (default: A): ").strip() or "A"
        selected_plans = parse_plan_selection(plan_input, available_plans)
        
        if not selected_plans:
            print("No valid plans selected. Using default plan A.")
            selected_plans = ['A']
            
        # Display maximum rounds information for selected plans
        print("\nMaximum simulation rounds for selected plans:")
        for plan_id in selected_plans:
            try:
                max_rounds = get_plan_parameters(plan_id).get('max_rounds')
                print(f"  - Plan {plan_id}: {max_rounds} rounds maximum")
            except ValueError:
                print(f"  - Plan {plan_id}: Invalid plan")
                continue
        
        # Get number of rounds
        try:
            total_rounds = int(input("Enter number of rounds to simulate (default: 30): ") or "30")
            if total_rounds <= 0:
                raise ValueError("Number of rounds must be positive")
                
        except ValueError:
            print("Invalid input. Using default of 30 rounds.")
            total_rounds = 30
        
        # Run simulation(s)
        if len(selected_plans) == 1:
            # Single plan simulation
            plan_id = selected_plans[0]
            print(f"\nRunning simulation for Plan {plan_id} with {total_rounds} rounds...\n")
            results = run_simulation(plan_id, total_rounds)
            
            # Display the results
            print_round_summary(results)
            print_simulation_summary(results)
            
            # Option to export results
            export = input("\nExport results to Excel? (y/n): ").strip().lower()
            if export == 'y':
                file_path = input("Enter file path (default: results.xlsx): ").strip() or "results.xlsx"
                export_to_excel(results, file_path)
                print(f"Results exported to {file_path}")
        else:
            # Multi-plan simulation
            print(f"\nRunning multi-plan simulation for Plans {', '.join(selected_plans)} with {total_rounds} rounds each...\n")
            multi_results = run_multi_plan_simulation(selected_plans, total_rounds)
            
            # Display results
            show_individual = input("Show individual plan summaries? (y/n, default: y): ").strip().lower()
            show_individual = show_individual != 'n'
            
            print_multi_plan_summary(multi_results, show_individual=show_individual)
            
            # Options for export and visualization
            print("\n--- Export and Visualization Options ---")
            
            export = input("Export results to Excel? (y/n): ").strip().lower()
            if export == 'y':
                file_path = input("Enter file path (default: multi_plan_results.xlsx): ").strip() or "multi_plan_results.xlsx"
                export_multi_plan_to_excel(multi_results, file_path)
                print(f"Multi-plan results exported to {file_path}")
            
            # Note: Plotting would require matplotlib, which may not be installed
            plot = input("Generate comparison plots? (y/n): ").strip().lower()
            if plot == 'y':
                try:
                    plot_path = input("Enter plot save path (optional, press Enter to display only): ").strip() or None
                    plot_multi_plan_comparison(multi_results, save_path=plot_path)
                except Exception as e:
                    print(f"Plotting failed: {e}")
                    print("Note: Plotting functionality requires matplotlib. Install with: pip install matplotlib")
            
    except ValueError as e:
        print(f"\nSimulation setup error: {e}")
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        traceback.print_exc()


if __name__ == "__main__":
    main()