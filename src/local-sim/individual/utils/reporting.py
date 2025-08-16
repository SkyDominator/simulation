"""
Reporting utilities for simulation results.

This module provides functions for formatting and displaying simulation results.
"""

import logging
from typing import Dict, List, Any, Optional
import pandas as pd

# Import SimulationResults and MultiPlanSimulationResults classes
from models.results import SimulationResults, MultiPlanSimulationResults

# Configure logging
logger = logging.getLogger(__name__)

# Define a function to check matplotlib availability when needed
def _check_matplotlib():
    """Check if matplotlib is available and return the plt module if it is."""
    try:
        import matplotlib.pyplot as plt
        return True, plt
    except ImportError:
        logger.warning("Matplotlib is not available. Visualization features will be disabled.")
        return False, None


def format_number(number: float) -> str:
    """
    Format a number with thousands separator.
    
    Args:
        number (float): The number to format
        
    Returns:
        str: Formatted number string with commas as thousands separator
    """
    return f"{number:,.0f}"


def print_round_summary(results: SimulationResults) -> None:
    """
    Print a summary of each round's results to the console.
    
    Args:
        results (SimulationResults): The simulation results to print
    """
    if not results.history:
        logger.warning("No simulation data to display")
        print("No simulation data to display")
        return
    
    print(f"\n=== Simulation Round Summary for Plan {results.plan_id} ===")
    
    for result in results.history:
        print(f"Round {result.company_round:2d}: " +
              f"[Investors: {result.investor_count:2d}] " +
              f"[Payment: {format_number(result.total_payment):>12}] " +
              f"[Revenue: {format_number(result.total_revenue_after_tax):>12}] " +
              f"[Net Profit: {format_number(result.net_profit_after_tax):>12}] " +
              f"[Cumulative: {format_number(result.cumulative_net_profit):>12}]")


def print_simulation_summary(results: SimulationResults) -> None:
    """
    Print a summary of the entire simulation to the console.
    
    Args:
        results (SimulationResults): The simulation results to print
    """
    if not results.history:
        logger.warning("No simulation data to display")
        print("No simulation data to display")
        return
        
    summary = results.get_summary()
    
    print(f"\n=== Overall Simulation Summary for Plan {results.plan_id} ===")
    print(f"Plan: {summary['plan_id']}")
    print(f"Total rounds: {summary['total_rounds']}")
    print(f"Final cumulative net profit: {format_number(summary['final_net_profit'])}")
    print(f"Maximum number of investors: {summary['max_investor_count']}")
    print(f"Total payments: {format_number(summary['total_payments'])}")
    print(f"Total revenue (after tax): {format_number(summary['total_revenue_after_tax'])}")
    print(f"Final net profit: {format_number(summary['final_net_profit'])}")
    print(f"Average net profit per round: {format_number(summary['average_net_profit_per_round'])}")
    
    if summary['first_turning_point_round']:
        print(f"First turning point round (profit starts increasing): {summary['first_turning_point_round']}")
        print(f"Maximum negative profit (deepest dip): {format_number(summary['max_negative_profit'])}")
        
    if summary['complete_turning_point_round']:
        print(f"Complete turning point round (sustained positive direction): {summary['complete_turning_point_round']}")
    else:
        print("No complete turning point found (profit direction continues to fluctuate)")
        
    if summary['positive_net_profit_round']:
        print(f"First round with positive cumulative profit: {summary['positive_net_profit_round']}")
        print(f"Total investment before profitability: {format_number(summary['investment_before_profit'])}")
    else:
        print("No round achieved positive cumulative profit")


def print_multi_plan_summary(multi_results: MultiPlanSimulationResults, show_individual: bool = True) -> None:
    """
    Print a comprehensive summary of multi-plan simulation results.
    
    Args:
        multi_results (MultiPlanSimulationResults): The multi-plan simulation results
        show_individual (bool): Whether to show individual plan summaries
    """
    if not multi_results.plan_results:
        logger.warning("No simulation data to display")
        print("No simulation data to display")
        return
    
    # Print individual plan summaries if requested
    if show_individual:
        for plan_id, results in multi_results.plan_results.items():
            print_simulation_summary(results)
    
    # Print comprehensive summary
    comprehensive = multi_results.get_comprehensive_summary()
    
    print("\n" + "="*80)
    print("=== COMPREHENSIVE MULTI-PLAN SIMULATION SUMMARY ===")
    print("="*80)
    
    print(f"\nTotal plans simulated: {comprehensive['total_plans_simulated']}")
    print(f"Rounds per plan: {comprehensive['total_rounds_per_plan']}")
    print(f"Total payments across all plans: {format_number(comprehensive['total_payments_all_plans'])}")
    print(f"Total revenue across all plans: {format_number(comprehensive['total_revenue_all_plans'])}")
    print(f"Overall net profit across all plans: {format_number(comprehensive['overall_net_profit'])}")
    print(f"Total investment before profitability across all plans: {format_number(comprehensive['total_investment_before_profit'])}")
    
    print("\n--- Best Performing Plans ---")
    if comprehensive['best_final_profit_plan']:
        best_plan_summary = comprehensive['plan_summaries'][comprehensive['best_final_profit_plan']]
        print(f"Highest final profit: Plan {comprehensive['best_final_profit_plan']} " +
              f"({format_number(best_plan_summary['final_net_profit'])})")
    
    if comprehensive['best_avg_profit_plan']:
        best_avg_summary = comprehensive['plan_summaries'][comprehensive['best_avg_profit_plan']]
        print(f"Best average profit per round: Plan {comprehensive['best_avg_profit_plan']} " +
              f"({format_number(best_avg_summary['average_net_profit_per_round'])})")
    
    if comprehensive['fastest_positive_plan']:
        fastest_summary = comprehensive['plan_summaries'][comprehensive['fastest_positive_plan']]
        print(f"Fastest to positive profit: Plan {comprehensive['fastest_positive_plan']} " +
              f"(Round {fastest_summary['positive_net_profit_round']})")
              
    if comprehensive['lowest_investment_plan']:
        lowest_investment_summary = comprehensive['plan_summaries'][comprehensive['lowest_investment_plan']]
        print(f"Lowest investment before profit: Plan {comprehensive['lowest_investment_plan']} " +
              f"({format_number(lowest_investment_summary['investment_before_profit'])})")
              
    if comprehensive['earliest_first_turning_point_plan']:
        earliest_first_turning_summary = comprehensive['plan_summaries'][comprehensive['earliest_first_turning_point_plan']]
        print(f"Earliest first turning point: Plan {comprehensive['earliest_first_turning_point_plan']} " +
              f"(Round {earliest_first_turning_summary['first_turning_point_round']})")
              
    if comprehensive['earliest_complete_turning_point_plan']:
        earliest_complete_turning_summary = comprehensive['plan_summaries'][comprehensive['earliest_complete_turning_point_plan']]
        print(f"Earliest complete turning point: Plan {comprehensive['earliest_complete_turning_point_plan']} " +
              f"(Round {earliest_complete_turning_summary['complete_turning_point_round']})")
              
    if comprehensive['least_negative_dip_plan']:
        least_negative_summary = comprehensive['plan_summaries'][comprehensive['least_negative_dip_plan']]
        print(f"Smallest negative profit dip: Plan {comprehensive['least_negative_dip_plan']} " +
              f"({format_number(least_negative_summary['max_negative_profit'])})")
    
    # Print comparative table
    print("\n--- Plan Comparison Table ---")
    comparison_df = multi_results.to_comparative_dataframe()
    print(comparison_df.to_string(index=False, formatters={
        'Final Net Profit': lambda x: format_number(x),
        'Total Payments': lambda x: format_number(x), 
        'Total Revenue': lambda x: format_number(x),
        'Avg Profit per Round': lambda x: format_number(x),
        'Investment Before Profit': lambda x: format_number(x),
        'Max Negative Profit': lambda x: format_number(x)
    }))


def plot_simulation_results(results: SimulationResults, save_path: Optional[str] = None) -> None:
    """
    Generate and optionally save plots visualizing the simulation results.
    
    Args:
        results (SimulationResults): The simulation results to plot
        save_path (Optional[str]): If provided, save the plots to this path
    """
    # Check matplotlib availability
    matplotlib_available, plt = _check_matplotlib()
    if not matplotlib_available:
        logger.warning("Matplotlib not available. Install with: pip install matplotlib")
        return
        
    if not results.history:
        logger.warning("No simulation data to plot")
        return
        
    try:
        # Double-check plt is available (since _check_matplotlib might return None for plt)
        if plt is None:
            logger.warning("Cannot create plots because matplotlib is not available")
            return
            
        df = results.to_dataframe()
        
        # Create a figure with multiple subplots
        fig, axs = plt.subplots(2, 2, figsize=(15, 10))
        fig.suptitle(f'Simulation Results for Plan {results.plan_id}', fontsize=16)
        
        # Plot 1: Payments and Revenue
        ax = axs[0, 0]
        ax.plot(df['전체 회차'], df['총 납입금'], 'b-', label='Total Payments')
        ax.plot(df['전체 회차'], df['총 수익금(세후)'], 'g-', label='Total Revenue (After Tax)')
        ax.set_title('Payments and Revenue by Round')
        ax.set_xlabel('Round')
        ax.set_ylabel('Amount')
        ax.legend()
        ax.grid(True)
        
        # Plot 2: Net Profit
        ax = axs[0, 1]
        ax.plot(df['전체 회차'], df['순수익(세후)'], 'r-', label='Net Profit (After Tax)')
        ax.axhline(y=0, color='k', linestyle='-', alpha=0.3)
        ax.set_title('Net Profit by Round')
        ax.set_xlabel('Round')
        ax.set_ylabel('Amount')
        ax.legend()
        ax.grid(True)
        
        # Plot 3: Cumulative Net Profit
        ax = axs[1, 0]
        ax.plot(df['전체 회차'], df['누적 순수익(세후)'], 'purple', label='Cumulative Net Profit')
        ax.axhline(y=0, color='k', linestyle='-', alpha=0.3)
        ax.set_title('Cumulative Net Profit by Round')
        ax.set_xlabel('Round')
        ax.set_ylabel('Amount')
        ax.legend()
        ax.grid(True)
        
        # Plot 4: Investor Count
        ax = axs[1, 1]
        ax.plot(df['전체 회차'], df['총 Investor 수'], 'orange', label='Total Investors')
        ax.set_title('Investor Count by Round')
        ax.set_xlabel('Round')
        ax.set_ylabel('Count')
        ax.legend()
        ax.grid(True)
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path)
            logger.info(f"Plots saved to {save_path}")
        else:
            plt.show()
        
    except Exception as e:
        logger.error(f"Failed to generate plots: {str(e)}")


def plot_multi_plan_comparison(multi_results: MultiPlanSimulationResults, save_path: Optional[str] = None) -> None:
    """
    Generate comparison charts for multiple plans.
    
    Args:
        multi_results (MultiPlanSimulationResults): The multi-plan simulation results to visualize
        save_path (Optional[str]): Path to save the visualization image
    """
    # Check matplotlib availability
    matplotlib_available, plt = _check_matplotlib()
    if not matplotlib_available:
        logger.warning("Matplotlib is not available. Skipping chart generation.")
        return
        
    if not multi_results.plan_results:
        logger.warning("No simulation data to plot")
        return
    
    try:
        # Double-check plt is available
        if plt is None:
            logger.warning("Cannot create plots because matplotlib is not available")
            return
            
        # Get comparative data
        comparison_df = multi_results.to_comparative_dataframe()
            
        # Create a 2x2 grid of plots
        fig, axs = plt.subplots(2, 2, figsize=(15, 10))
        
        # Plot 1: Final Net Profit
        ax = axs[0, 0]
        bars = ax.bar(comparison_df['Plan'], comparison_df['Final Net Profit'])
        for bar, profit in zip(bars, comparison_df['Final Net Profit']):
            bar.set_color('green' if profit >= 0 else 'red')
        ax.set_title('Final Net Profit by Plan')
        ax.set_xlabel('Plan')
        ax.set_ylabel('Final Net Profit')
        ax.grid(True, axis='y')
        
        # Plot 2: Investment Before Profitability (New Plot)
        ax = axs[0, 1]
        ax.bar(comparison_df['Plan'], comparison_df['Investment Before Profit'], color='orange')
        ax.set_title('Investment Before Profitability by Plan')
        ax.set_xlabel('Plan')
        ax.set_ylabel('Investment Before Reaching Profitability')
        ax.grid(True, axis='y')
        
        # Plot 3: First Positive Round
        ax = axs[1, 0]
        # Convert 'Never' to a high number for plotting
        first_positive = comparison_df['First Positive Round'].copy()
        first_positive = first_positive.replace('Never', float('inf'))
        # Only plot finite values
        mask = first_positive != float('inf')
        if mask.any():
            ax.bar(comparison_df.loc[mask, 'Plan'], first_positive[mask], color='purple')
            ax.set_title('First Positive Round by Plan')
            ax.set_xlabel('Plan')
            ax.set_ylabel('Round Number')
            ax.grid(True, axis='y')
        else:
            ax.text(0.5, 0.5, 'No positive rounds', ha='center', va='center', transform=ax.transAxes)
        
        # Plot 4: Average Profit per Round
        ax = axs[1, 1]
        bars = ax.bar(comparison_df['Plan'], comparison_df['Avg Profit per Round'])
        for bar, profit in zip(bars, comparison_df['Avg Profit per Round']):
            bar.set_color('green' if profit >= 0 else 'red')
        ax.set_title('Average Profit per Round by Plan')
        ax.set_xlabel('Plan')
        ax.set_ylabel('Average Profit per Round')
        ax.grid(True, axis='y')
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path)
            logger.info(f"Comparison plots saved to {save_path}")
        else:
            plt.show()
        
    except Exception as e:
        logger.error(f"Failed to generate comparison plots: {str(e)}")


def export_to_excel(results: SimulationResults, file_path: str) -> None:
    """
    Export simulation results to an Excel file.
    
    Args:
        results (SimulationResults): The simulation results to export
        file_path (str): Path to save the Excel file
        
    Raises:
        Exception: If export fails
    """
    try:
        with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
            # Export detailed results
            df = results.to_dataframe()
            df.to_excel(writer, sheet_name='Detailed Results', index=False)
            
            # Export summary
            summary = results.get_summary()
            
            # Create a more readable summary
            summary_data = [
                {'Metric': 'Plan ID', 'Value': summary['plan_id']},
                {'Metric': 'Total Rounds', 'Value': summary['total_rounds']},
                {'Metric': 'Final Net Profit', 'Value': summary['final_net_profit']},
                {'Metric': 'Maximum Investor Count', 'Value': summary['max_investor_count']},
                {'Metric': 'Total Payments', 'Value': summary['total_payments']},
                {'Metric': 'Total Revenue (After Tax)', 'Value': summary['total_revenue_after_tax']},
                {'Metric': 'Average Net Profit Per Round', 'Value': summary['average_net_profit_per_round']},
                {'Metric': 'First Positive Round', 'Value': summary.get('positive_net_profit_round', 'Never')},
                {'Metric': 'Investment Before Profitability', 'Value': summary.get('investment_before_profit', 0)},
                {'Metric': 'First Turning Point Round', 'Value': summary.get('first_turning_point_round', 'Never')},
                {'Metric': 'Complete Turning Point Round', 'Value': summary.get('complete_turning_point_round', 'Never')},
                {'Metric': 'Maximum Negative Profit', 'Value': summary.get('max_negative_profit', 0)}
            ]
            
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, sheet_name='Summary', index=False)
            
        logger.info(f"Results exported to {file_path}")
    except Exception as e:
        logger.error(f"Failed to export results to Excel: {str(e)}")
        raise


def export_multi_plan_to_excel(multi_results: MultiPlanSimulationResults, file_path: str) -> None:
    """
    Export multi-plan simulation results to an Excel file with multiple sheets.
    
    Args:
        multi_results (MultiPlanSimulationResults): The multi-plan simulation results to export
        file_path (str): Path to save the Excel file
        
    Raises:
        Exception: If export fails
    """
    try:
        with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
            # Export comparison summary
            comparison_df = multi_results.to_comparative_dataframe()
            comparison_df.to_excel(writer, sheet_name='Plan Comparison', index=False)
            
            # Export individual plan details
            for plan_id, results in multi_results.plan_results.items():
                df = results.to_dataframe()
                sheet_name = f'Plan {plan_id} Details'
                df.to_excel(writer, sheet_name=sheet_name, index=False)
            
            # Export comprehensive summary
            comprehensive = multi_results.get_comprehensive_summary()
            
            # Create summary dataframe with better formatting
            summary_data = [
                {'Metric': 'Total Plans Simulated', 'Value': comprehensive['total_plans_simulated']},
                {'Metric': 'Rounds Per Plan', 'Value': comprehensive['total_rounds_per_plan']},
                {'Metric': 'Total Payments All Plans', 'Value': comprehensive['total_payments_all_plans']},
                {'Metric': 'Total Revenue All Plans', 'Value': comprehensive['total_revenue_all_plans']},
                {'Metric': 'Overall Net Profit', 'Value': comprehensive['overall_net_profit']},
                {'Metric': 'Total Investment Before Profitability', 'Value': comprehensive['total_investment_before_profit']},
                {'Metric': 'Best Final Profit Plan', 'Value': comprehensive['best_final_profit_plan']},
                {'Metric': 'Best Average Profit Plan', 'Value': comprehensive['best_avg_profit_plan']},
                {'Metric': 'Fastest To Positive Plan', 'Value': comprehensive['fastest_positive_plan']},
                {'Metric': 'Lowest Investment Plan', 'Value': comprehensive['lowest_investment_plan']},
                {'Metric': 'Earliest First Turning Point Plan', 'Value': comprehensive['earliest_first_turning_point_plan']},
                {'Metric': 'Earliest Complete Turning Point Plan', 'Value': comprehensive['earliest_complete_turning_point_plan']},
                {'Metric': 'Least Negative Dip Plan', 'Value': comprehensive['least_negative_dip_plan']}
            ]
            
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, sheet_name='Overall Summary', index=False)
            
            # Create a dedicated sheet for investment before profitability analysis
            investment_data = []
            for plan_id, plan_summary in comprehensive['plan_summaries'].items():
                investment_data.append({
                    'Plan': plan_id,
                    'Investment Before Profitability': plan_summary.get('investment_before_profit', 0),
                    'First Positive Round': plan_summary.get('positive_net_profit_round', 'Never'),
                    'First Turning Point Round': plan_summary.get('first_turning_point_round', 'Never'),
                    'Complete Turning Point Round': plan_summary.get('complete_turning_point_round', 'Never'),
                    'Max Negative Profit': plan_summary.get('max_negative_profit', 0),
                    'Final Net Profit': plan_summary.get('final_net_profit', 0)
                })
            
            investment_df = pd.DataFrame(investment_data)
            investment_df = investment_df.sort_values('Investment Before Profitability')
            investment_df.to_excel(writer, sheet_name='Investment Analysis', index=False)
        
        logger.info(f"Multi-plan results exported to {file_path}")
    except Exception as e:
        logger.error(f"Failed to export multi-plan results to Excel: {str(e)}")
        raise


# This function was duplicated, so we're removing the duplicate and keeping plot_simulation_results
