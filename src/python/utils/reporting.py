"""
Reporting utilities for simulation results.

This module provides functions for formatting and displaying simulation results.
"""

import logging
from typing import Dict, List, Any, Optional
import pandas as pd

try:
    import matplotlib.pyplot as plt
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False
    
from models.results import SimulationResults, MultiPlanSimulationResults

logger = logging.getLogger(__name__)


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
    print(f"Average net profit per round: {format_number(summary['average_net_profit_per_round'])}")
    
    if summary['positive_net_profit_round']:
        print(f"First round with positive cumulative profit: {summary['positive_net_profit_round']}")
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
    
    # Print comparative table
    print("\n--- Plan Comparison Table ---")
    comparison_df = multi_results.to_comparative_dataframe()
    print(comparison_df.to_string(index=False, formatters={
        'Final Net Profit': lambda x: format_number(x),
        'Total Payments': lambda x: format_number(x), 
        'Total Revenue': lambda x: format_number(x),
        'Avg Profit per Round': lambda x: format_number(x)
    }))


def plot_simulation_results(results: SimulationResults, save_path: Optional[str] = None) -> None:
    """
    Generate and optionally save plots visualizing the simulation results.
    
    Args:
        results (SimulationResults): The simulation results to plot
        save_path (Optional[str]): If provided, save the plots to this path
    """
    if not MATPLOTLIB_AVAILABLE:
        logger.warning("Matplotlib not available. Install with: pip install matplotlib")
        return
        
    if not results.history:
        logger.warning("No simulation data to plot")
        return
        
    try:
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
        
        plt.show()
        
    except Exception as e:
        logger.error(f"Failed to generate plots: {str(e)}")


def plot_multi_plan_comparison(multi_results: MultiPlanSimulationResults, save_path: Optional[str] = None) -> None:
    """
    Generate comparison plots for multiple plans.
    
    Args:
        multi_results (MultiPlanSimulationResults): The multi-plan simulation results
        save_path (Optional[str]): If provided, save the plots to this path
    """
    if not MATPLOTLIB_AVAILABLE:
        logger.warning("Matplotlib not available. Install with: pip install matplotlib")
        return
        
    if not multi_results.plan_results:
        logger.warning("No simulation data to plot")
        return
        
    try:
        # Create a figure with multiple subplots
        fig, axs = plt.subplots(2, 2, figsize=(15, 10))
        fig.suptitle('Multi-Plan Simulation Comparison', fontsize=16)
        
        colors = ['blue', 'red', 'green', 'orange', 'purple', 'brown', 'pink', 'gray', 'olive']
        
        # Plot 1: Cumulative Net Profit Comparison
        ax = axs[0, 0]
        for i, (plan_id, results) in enumerate(multi_results.plan_results.items()):
            df = results.to_dataframe()
            color = colors[i % len(colors)]
            ax.plot(df['전체 회차'], df['누적 순수익(세후)'], color=color, label=f'Plan {plan_id}')
        ax.axhline(y=0, color='k', linestyle='-', alpha=0.3)
        ax.set_title('Cumulative Net Profit Comparison')
        ax.set_xlabel('Round')
        ax.set_ylabel('Amount')
        ax.legend()
        ax.grid(True)
        
        # Plot 2: Final Net Profit Bar Chart
        ax = axs[0, 1]
        comparison_df = multi_results.to_comparative_dataframe()
        bars = ax.bar(comparison_df['Plan'], comparison_df['Final Net Profit'])
        # Color bars: green for positive, red for negative
        for bar, profit in zip(bars, comparison_df['Final Net Profit']):
            bar.set_color('green' if profit >= 0 else 'red')
        ax.set_title('Final Net Profit by Plan')
        ax.set_xlabel('Plan')
        ax.set_ylabel('Final Net Profit')
        ax.grid(True, axis='y')
        
        # Plot 3: Total Payments vs Revenue
        ax = axs[1, 0]
        ax.scatter(comparison_df['Total Payments'], comparison_df['Total Revenue'], 
                  s=100, alpha=0.7)
        for i, plan in enumerate(comparison_df['Plan']):
            ax.annotate(plan, (comparison_df.iloc[i]['Total Payments'], 
                             comparison_df.iloc[i]['Total Revenue']))
        # Add diagonal line where payments = revenue
        max_val = max(comparison_df['Total Payments'].max(), comparison_df['Total Revenue'].max())
        ax.plot([0, max_val], [0, max_val], 'k--', alpha=0.5, label='Break-even line')
        ax.set_title('Total Payments vs Total Revenue')
        ax.set_xlabel('Total Payments')
        ax.set_ylabel('Total Revenue')
        ax.legend()
        ax.grid(True)
        
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
        df = results.to_dataframe()
        df.to_excel(file_path, index=False)
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
            summary_data = []
            for key, value in comprehensive.items():
                if key != 'plan_summaries':  # Skip the nested dict
                    summary_data.append({'Metric': key, 'Value': value})
            
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, sheet_name='Overall Summary', index=False)
        
        logger.info(f"Multi-plan results exported to {file_path}")
    except Exception as e:
        logger.error(f"Failed to export multi-plan results to Excel: {str(e)}")
        raise
