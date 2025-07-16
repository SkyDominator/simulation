"""
General simulation main script.

This script is the entry point for running the general simulation system.
"""

import os
import sys
import logging
import argparse
from typing import Dict, Any, List, Optional

# Add the project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from src.python.general.services.general_simulator import GeneralSimulationService
from src.python.general.utils.reporting import (
    setup_logging, 
    print_simulation_summary,
    plot_simulation_results,
    export_to_excel
)


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Run general simulation for Partner Club")
    parser.add_argument(
        "--plan", 
        type=str, 
        default="A", 
        help="Investment plan to simulate (default: A)"
    )
    parser.add_argument(
        "--investors", 
        type=int, 
        default=1000, 
        choices=[100, 1000, 10000],
        help="Number of investors to simulate (default: 1000)"
    )
    parser.add_argument(
        "--rounds", 
        type=int, 
        default=100,
        help="Maximum number of company rounds to simulate (default: 100)"
    )
    parser.add_argument(
        "--output", 
        type=str, 
        default="output", 
        help="Output directory for results (default: 'output')"
    )
    parser.add_argument(
        "--plot", 
        action="store_true", 
        help="Generate plots of the results"
    )
    parser.add_argument(
        "--excel", 
        action="store_true", 
        help="Export results to Excel"
    )
    return parser.parse_args()


def run_simulation(plan_id: str, investor_count: int, max_company_rounds: int) -> Any:
    """
    Run the general simulation.
    
    Args:
        plan_id (str): The plan identifier
        investor_count (int): Number of investors to simulate
        max_company_rounds (int): Maximum number of company rounds
        
    Returns:
        Any: The simulation results
    """
    simulator = GeneralSimulationService(plan_id=plan_id, investor_count=investor_count)
    return simulator.run_simulation(max_company_rounds)


def main():
    """Main entry point for the script."""
    # Parse command line arguments
    args = parse_arguments()
    
    # Setup logging
    setup_logging()
    
    # Print simulation parameters
    print(f"\n일반 시뮬레이션 시작")
    print(f"- 플랜: {args.plan}")
    print(f"- 투자자 수: {args.investors:,}명")
    print(f"- 최대 회사 회차: {args.rounds}회\n")
    
    try:
        # Run the simulation
        results = run_simulation(args.plan, args.investors, args.rounds)
        
        # Print summary
        print_simulation_summary(results)
        
        # Generate plots if requested
        if args.plot:
            plot_simulation_results(results, args.output)
            print(f"\n차트가 {args.output} 폴더에 저장되었습니다.")
        
        # Export to Excel if requested
        if args.excel:
            excel_file = export_to_excel(results, args.output)
            print(f"\n엑셀 파일이 저장되었습니다: {excel_file}")
        
    except Exception as e:
        logging.error(f"Simulation failed: {str(e)}")
        print(f"\n오류 발생: {str(e)}")
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
