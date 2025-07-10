"""
Reporting utilities for simulation results.

This module provides functions for formatting and displaying simulation results.
"""

import logging
from typing import Dict, List, Any, Optional
import pandas as pd
import matplotlib.pyplot as plt
from models.results import SimulationResults

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
    
    print("\n=== Simulation Round Summary ===")
    
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
    
    print("\n=== Overall Simulation Summary ===")
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


def plot_simulation_results(results: SimulationResults, save_path: Optional[str] = None) -> None:
    """
    Generate and optionally save plots visualizing the simulation results.
    
    Args:
        results (SimulationResults): The simulation results to plot
        save_path (Optional[str]): If provided, save the plots to this path
    """
    if not results.history:
        logger.warning("No simulation data to plot")
        return
        
    try:
        df = results.to_dataframe()
        
        # Create a figure with multiple subplots
        fig, axs = plt.subplots(2, 2, figsize=(15, 10))
        
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
