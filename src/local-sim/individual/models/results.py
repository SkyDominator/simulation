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
    
    def _find_complete_turning_point(self) -> Optional[int]:
        """
        Find the complete turning point round where no following rounds show
        direction changes toward negative side.
        
        Returns:
            Optional[int]: The round number of the complete turning point, or None if not found
        """
        if len(self.history) <= 2:
            return None
        
        # Work backwards from the end to find the last round where
        # profit direction changed to negative
        last_negative_direction_change = None
        
        for i in range(len(self.history) - 1, 0, -1):
            current_cumulative = self.history[i].cumulative_net_profit
            prev_cumulative = self.history[i-1].cumulative_net_profit
            
            # If current round shows a decrease in cumulative profit (negative direction)
            if current_cumulative < prev_cumulative:
                last_negative_direction_change = self.history[i].company_round
                break
        
        # If no negative direction change was found, the complete turning point
        # is the first turning point (if it exists)
        if last_negative_direction_change is None:
            # Find the first positive direction change
            for i in range(1, len(self.history)):
                current_cumulative = self.history[i].cumulative_net_profit
                prev_cumulative = self.history[i-1].cumulative_net_profit
                
                if current_cumulative > prev_cumulative:
                    return self.history[i].company_round
            return None
        
        # The complete turning point is the round after the last negative direction change
        for i, result in enumerate(self.history):
            if result.company_round > last_negative_direction_change:
                # Check if this round and all following rounds maintain positive direction
                is_complete_turning_point = True
                for j in range(i, len(self.history) - 1):
                    if self.history[j+1].cumulative_net_profit < self.history[j].cumulative_net_profit:
                        is_complete_turning_point = False
                        break
                
                if is_complete_turning_point:
                    return result.company_round
        
        return None
    
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
        
        # Find the first positive round
        positive_round_result = next((r for r in self.history if r.cumulative_net_profit > 0), None)
        positive_round = positive_round_result.company_round if positive_round_result else None
        
        # Calculate the accumulated negative net profit just before first positive round
        # This is the "investment hole" that needs to be overcome
        investment_before_profit = 0
        if positive_round:
            # Get the round just before the first positive round
            pre_positive_idx = next((i for i, r in enumerate(self.history) if r.company_round == positive_round), 0) - 1
            if pre_positive_idx >= 0:
                # The accumulated negative net profit is the negative value of the cumulative profit
                # in the round just before the first positive round
                investment_before_profit = -self.history[pre_positive_idx].cumulative_net_profit
        
        # Find the round where cumulative net profit starts turning in positive direction
        # (gets less negative or more positive) - this is the FIRST turning point
        first_turning_point_round = None
        complete_turning_point_round = None
        max_negative_profit = 0
        
        if len(self.history) > 1:
            # Initialize with the first round
            prev_cumulative = self.history[0].cumulative_net_profit
            max_negative_profit = min(0, prev_cumulative)
            
            # Iterate starting from the second round
            for i, result in enumerate(self.history[1:], 1):
                current_cumulative = result.cumulative_net_profit
                
                # Update max negative value if we find a deeper negative value
                if current_cumulative < max_negative_profit:
                    max_negative_profit = current_cumulative
                
                # If the cumulative profit is increasing (going in positive direction)
                # and we haven't found the first turning point yet
                if current_cumulative > prev_cumulative and first_turning_point_round is None:
                    first_turning_point_round = result.company_round
                
                prev_cumulative = current_cumulative
            
            # Find the complete turning point - the round after which no following rounds
            # show direction changes toward negative side
            if first_turning_point_round is not None:
                complete_turning_point_round = self._find_complete_turning_point()
        
        return {
            "plan_id": self.plan_id,
            "total_rounds": len(self.history),
            "final_net_profit": self.history[-1].cumulative_net_profit,
            "max_investor_count": max(r.investor_count for r in self.history),
            "total_payments": sum(r.total_payment for r in self.history),
            "total_revenue_after_tax": sum(r.total_revenue_after_tax for r in self.history),
            "average_net_profit_per_round": df['순수익(세후)'].mean(),
            "positive_net_profit_round": positive_round,
            "investment_before_profit": investment_before_profit,
            "first_turning_point_round": first_turning_point_round,  # First round where profit starts moving in positive direction
            "complete_turning_point_round": complete_turning_point_round,  # Round after which no following rounds show negative direction
            "max_negative_profit": max_negative_profit  # Maximum negative value of the cumulative net profit
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
        
        # Calculate totals
        total_payments_all_plans = sum(s.get('total_payments', 0) for s in summaries.values())
        total_revenue_all_plans = sum(s.get('total_revenue_after_tax', 0) for s in summaries.values())
        total_investment_before_profit = sum(s.get('investment_before_profit', 0) for s in summaries.values())
        
        # Find plan with lowest investment before profit
        lowest_investment_plan = min((s for s in summaries.values() if s.get('investment_before_profit', 0) > 0), 
                                    key=lambda x: x.get('investment_before_profit', float('inf')), default=None)
        
        # Find plan with earliest first turning point (when profit starts moving in positive direction)
        earliest_first_turning_point_plan = min((s for s in summaries.values() if s.get('first_turning_point_round')),
                                        key=lambda x: x.get('first_turning_point_round', float('inf')), default=None)
        
        # Find plan with earliest complete turning point (sustained positive direction)
        earliest_complete_turning_point_plan = min((s for s in summaries.values() if s.get('complete_turning_point_round')),
                                          key=lambda x: x.get('complete_turning_point_round', float('inf')), default=None)
        
        # Find plan with smallest max negative profit (least negative dip)
        least_negative_dip_plan = max((s for s in summaries.values()),
                                    key=lambda x: x.get('max_negative_profit', float('-inf')), default=None)
        
        return {
            "total_plans_simulated": len(self.plan_results),
            "total_rounds_per_plan": self.total_rounds,
            "plan_summaries": summaries,
            "best_final_profit_plan": best_final_profit.get('plan_id') if best_final_profit else None,
            "best_avg_profit_plan": best_avg_profit.get('plan_id') if best_avg_profit else None,
            "fastest_positive_plan": fastest_positive.get('plan_id') if fastest_positive else None,
            "lowest_investment_plan": lowest_investment_plan.get('plan_id') if lowest_investment_plan else None,
            "earliest_first_turning_point_plan": earliest_first_turning_point_plan.get('plan_id') if earliest_first_turning_point_plan else None,
            "earliest_complete_turning_point_plan": earliest_complete_turning_point_plan.get('plan_id') if earliest_complete_turning_point_plan else None,
            "least_negative_dip_plan": least_negative_dip_plan.get('plan_id') if least_negative_dip_plan else None,
            "total_payments_all_plans": total_payments_all_plans,
            "total_revenue_all_plans": total_revenue_all_plans,
            "overall_net_profit": total_revenue_all_plans - total_payments_all_plans,
            "total_investment_before_profit": total_investment_before_profit
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
                'First Positive Round': summary.get('positive_net_profit_round', 'Never'),
                'Investment Before Profit': summary.get('investment_before_profit', 0),
                'First Turning Point Round': summary.get('first_turning_point_round', 'Never'),  # First round when profit starts moving up
                'Complete Turning Point Round': summary.get('complete_turning_point_round', 'Never'),  # Round with sustained positive direction
                'Max Negative Profit': summary.get('max_negative_profit', 0)  # Deepest dip in the investment hole
            })
        
        df = pd.DataFrame(comparison_data)
        return df.sort_values('Final Net Profit', ascending=False)
