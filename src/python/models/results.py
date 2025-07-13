"""
Simulation results model.

This module defines the data structures used for storing and reporting simulation results.
"""

from typing import Dict, List, Any, Optional
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


@dataclass
class MultiPlanSimulationResults:
    """
    Class for storing and analyzing results from multiple plan simulations.
    
    Attributes:
        plan_results (Dict[str, SimulationResults]): Results for each plan
        total_rounds (int): Number of rounds simulated for each plan
    """
    plan_results: Dict[str, SimulationResults] = field(default_factory=dict)
    total_rounds: int = 0
    
    def add_plan_result(self, plan_id: str, results: SimulationResults) -> None:
        """
        Add results for a specific plan.
        
        Args:
            plan_id (str): The plan identifier
            results (SimulationResults): The simulation results for this plan
        """
        self.plan_results[plan_id] = results
        if results.history:
            self.total_rounds = max(self.total_rounds, len(results.history))
    
    def get_plan_summary(self, plan_id: str) -> Optional[Dict[str, Any]]:
        """
        Get summary for a specific plan.
        
        Args:
            plan_id (str): The plan identifier
            
        Returns:
            Optional[Dict[str, Any]]: Summary for the plan, or None if plan not found
        """
        if plan_id not in self.plan_results:
            return None
        return self.plan_results[plan_id].get_summary()
    
    def get_comprehensive_summary(self) -> Dict[str, Any]:
        """
        Get a comprehensive summary comparing all plans.
        
        Returns:
            Dict[str, Any]: Dictionary containing comparative analysis
        """
        if not self.plan_results:
            return {"status": "No data"}
        
        summaries = {}
        for plan_id, results in self.plan_results.items():
            summaries[plan_id] = results.get_summary()
        
        # Find best performing plans
        best_final_profit = max(summaries.values(), key=lambda x: x.get('final_net_profit', float('-inf')))
        best_avg_profit = max(summaries.values(), key=lambda x: x.get('average_net_profit_per_round', float('-inf')))
        fastest_positive = min((s for s in summaries.values() if s.get('positive_net_profit_round')), 
                              key=lambda x: x.get('positive_net_profit_round', float('inf')), default=None)
        
        total_payments_all_plans = sum(s.get('total_payments', 0) for s in summaries.values())
        total_revenue_all_plans = sum(s.get('total_revenue_after_tax', 0) for s in summaries.values())
        
        return {
            "total_plans_simulated": len(self.plan_results),
            "total_rounds_per_plan": self.total_rounds,
            "plan_summaries": summaries,
            "best_final_profit_plan": best_final_profit.get('plan_id') if best_final_profit else None,
            "best_avg_profit_plan": best_avg_profit.get('plan_id') if best_avg_profit else None,
            "fastest_positive_plan": fastest_positive.get('plan_id') if fastest_positive else None,
            "total_payments_all_plans": total_payments_all_plans,
            "total_revenue_all_plans": total_revenue_all_plans,
            "overall_net_profit": total_revenue_all_plans - total_payments_all_plans
        }
    
    def to_comparative_dataframe(self) -> pd.DataFrame:
        """
        Create a comparative DataFrame showing key metrics for all plans.
        
        Returns:
            pd.DataFrame: DataFrame with comparative metrics
        """
        comparison_data = []
        for plan_id, results in self.plan_results.items():
            summary = results.get_summary()
            comparison_data.append({
                'Plan': plan_id,
                'Final Net Profit': summary.get('final_net_profit', 0),
                'Total Payments': summary.get('total_payments', 0),
                'Total Revenue': summary.get('total_revenue_after_tax', 0),
                'Max Investors': summary.get('max_investor_count', 0),
                'Avg Profit per Round': summary.get('average_net_profit_per_round', 0),
                'First Positive Round': summary.get('positive_net_profit_round', 'Never')
            })
        
        df = pd.DataFrame(comparison_data)
        return df.sort_values('Final Net Profit', ascending=False)
