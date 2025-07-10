"""
Simulation results model.

This module defines the data structures used for storing and reporting simulation results.
"""

from typing import Dict, List, Any
from dataclasses import dataclass, field
import pandas as pd


@dataclass
class SimulationRoundResult:
    """
    Class representing the results of a single simulation round.
    
    Attributes:
        company_round (int): Current company round number
        investor_count (int): Total number of investors in this round
        total_payment (float): Total payments collected in this round
        total_revenue_before_tax (float): Total revenue generated before tax
        total_revenue_after_tax (float): Total revenue generated after tax
        net_profit_after_tax (float): Net profit after tax for this round
        cumulative_net_profit (float): Cumulative net profit up to this round
    """
    company_round: int
    investor_count: int
    total_payment: float
    total_revenue_before_tax: float
    total_revenue_after_tax: float
    net_profit_after_tax: float
    cumulative_net_profit: float


@dataclass
class SimulationResults:
    """
    Class for storing and analyzing the complete results of a simulation.
    
    Attributes:
        history (List[SimulationRoundResult]): List of results for each round
        plan_id (str): Identifier of the plan used for simulation
    """
    history: List[SimulationRoundResult] = field(default_factory=list)
    plan_id: str = ""
    
    def add_round_result(self, result: SimulationRoundResult) -> None:
        """
        Add a round result to the history.
        
        Args:
            result (SimulationRoundResult): The result to add
        """
        self.history.append(result)
    
    def to_dataframe(self) -> pd.DataFrame:
        """
        Convert simulation results to a pandas DataFrame.
        
        Returns:
            pd.DataFrame: DataFrame containing all simulation results
        """
        data = []
        for round_result in self.history:
            data.append({
                '전체 회차': round_result.company_round,
                '총 Investor 수': round_result.investor_count,
                '총 납입금': round_result.total_payment,
                '총 수익금(세전)': round_result.total_revenue_before_tax,
                '총 수익금(세후)': round_result.total_revenue_after_tax,
                '순수익(세후)': round_result.net_profit_after_tax,
                '누적 순수익(세후)': round_result.cumulative_net_profit
            })
        return pd.DataFrame(data)
    
    def get_summary(self) -> Dict[str, Any]:
        """
        Get a summary of the simulation results.
        
        Returns:
            Dict[str, Any]: Dictionary containing summary statistics
        """
        if not self.history:
            return {"status": "No data"}
            
        df = self.to_dataframe()
        
        return {
            "plan_id": self.plan_id,
            "total_rounds": len(self.history),
            "final_net_profit": self.history[-1].cumulative_net_profit,
            "max_investor_count": max(r.investor_count for r in self.history),
            "total_payments": sum(r.total_payment for r in self.history),
            "total_revenue_after_tax": sum(r.total_revenue_after_tax for r in self.history),
            "average_net_profit_per_round": df['순수익(세후)'].mean(),
            "positive_net_profit_round": next((r.company_round for r in self.history if r.cumulative_net_profit > 0), None)
        }
