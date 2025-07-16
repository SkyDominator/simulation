"""
Simulation results model for general simulation.

This module defines the data structures for storing and reporting general simulation results.
"""

from typing import Dict, List, Any, Optional, Counter as CounterType, Tuple
from dataclasses import dataclass, field
import pandas as pd
from collections import Counter, defaultdict
import numpy as np
from datetime import datetime

from .investor import GeneralInvestor


@dataclass
class CompanyRoundResult:
    """
    Class representing the results of a single company round.
    
    Attributes:
        company_round (int): Current company round number
        active_investor_count (int): Number of active investors
        new_investor_count (int): Number of new investors joining this round
        reentry_investor_count (int): Number of re-entry investors joining this round
        graduated_investor_count (int): Number of investors graduating this round
        total_payment (float): Total payments collected in this round
        total_revenue_before_tax (float): Total revenue generated before tax
        total_revenue_after_tax (float): Total revenue generated after tax
        net_profit_after_tax (float): Net profit after tax for this round
        cumulative_net_profit (float): Cumulative net profit up to this round
        internal_round_distribution (Dict[int, int]): Distribution of internal rounds
    """
    company_round: int
    active_investor_count: int
    new_investor_count: int
    reentry_investor_count: int
    graduated_investor_count: int
    total_payment: float
    total_revenue_before_tax: float
    total_revenue_after_tax: float
    net_profit_after_tax: float
    cumulative_net_profit: float
    internal_round_distribution: Dict[int, int] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert to a dictionary representation.
        
        Returns:
            Dict[str, Any]: Dictionary containing all result data
        """
        return {
            '회사 회차': self.company_round,
            '활성 투자자 수': self.active_investor_count,
            '신규 투자자 수': self.new_investor_count,
            '재입학 투자자 수': self.reentry_investor_count,
            '졸업 투자자 수': self.graduated_investor_count,
            '총 납입금': self.total_payment,
            '총 수익금(세전)': self.total_revenue_before_tax,
            '총 수익금(세후)': self.total_revenue_after_tax,
            '순수익(세후)': self.net_profit_after_tax,
            '누적 순수익(세후)': self.cumulative_net_profit,
            '내부 회차 분포': self.internal_round_distribution
        }


@dataclass
class GeneralSimulationResults:
    """
    Class for storing and analyzing the complete results of a general simulation.
    
    Attributes:
        history (List[CompanyRoundResult]): List of results for each company round
        investors (List[GeneralInvestor]): List of all investors in the simulation
        plan_id (str): Identifier of the plan used for simulation
        investor_count (int): Total number of investors in the simulation
        timestamp (str): Timestamp of when the simulation was run
    """
    history: List[CompanyRoundResult] = field(default_factory=list)
    investors: List[GeneralInvestor] = field(default_factory=list)
    plan_id: str = ""
    investor_count: int = 0
    timestamp: str = field(default_factory=lambda: datetime.now().strftime("%Y%m%d_%H%M%S"))
    
    def add_round_result(self, result: CompanyRoundResult) -> None:
        """
        Add a round result to the history.
        
        Args:
            result (CompanyRoundResult): The result to add
        """
        self.history.append(result)
    
    def add_investor(self, investor: GeneralInvestor) -> None:
        """
        Add an investor to the simulation results.
        
        Args:
            investor (GeneralInvestor): The investor to add
        """
        self.investors.append(investor)
    
    def to_dataframe(self) -> pd.DataFrame:
        """
        Convert simulation results to a pandas DataFrame.
        
        Returns:
            pd.DataFrame: DataFrame containing all simulation results
        """
        data = [result.to_dict() for result in self.history]
        return pd.DataFrame(data)
    
    def get_investor_distribution_by_round(self) -> Dict[int, CounterType[int]]:
        """
        Get the distribution of internal rounds for each company round.
        
        Returns:
            Dict[int, Counter[int]]: Dictionary mapping company rounds to internal round distributions
        """
        distribution = {}
        for result in self.history:
            distribution[result.company_round] = result.internal_round_distribution
        return distribution
    
    def get_revenue_distribution(self) -> Tuple[float, float, List[float], List[float]]:
        """
        Calculate the distribution of revenue among investors.
        
        Returns:
            Tuple[float, float, List[float], List[float]]: Min, max, percentiles, and revenue values
        """
        revenues = [investor.get_total_revenue() for investor in self.investors]
        if not revenues:
            return 0.0, 0.0, [], []
            
        min_revenue = min(revenues)
        max_revenue = max(revenues)
        percentiles = [10.0, 25.0, 50.0, 75.0, 90.0, 95.0, 99.0]
        percentile_values = np.percentile(revenues, percentiles).tolist()
        
        return min_revenue, max_revenue, percentiles, percentile_values
    
    def get_roi_distribution(self) -> Dict[str, Any]:
        """
        Calculate the Return on Investment (ROI) distribution among investors.
        
        Returns:
            Dict[str, Any]: Dictionary containing ROI statistics
        """
        rois = [investor.get_roi() for investor in self.investors]
        if not rois:
            return {
                "min": 0.0,
                "max": 0.0,
                "mean": 0.0,
                "median": 0.0,
                "percentiles": [],
                "percentile_values": []
            }
            
        percentiles = [10, 25, 50, 75, 90, 95, 99]
        percentile_values = np.percentile(rois, percentiles).tolist()
        
        return {
            "min": min(rois),
            "max": max(rois),
            "mean": sum(rois) / len(rois),
            "median": np.median(rois),
            "percentiles": percentiles,
            "percentile_values": percentile_values
        }
    
    def get_payment_flow_analysis(self) -> Dict[str, Any]:
        """
        Analyze the flow of payments to revenue across investors and rounds.
        
        Returns:
            Dict[str, Any]: Dictionary with payment flow analysis data
        """
        # Track payments by company round
        payments_by_round = defaultdict(float)
        for investor in self.investors:
            for payment in investor.payment_history:
                payments_by_round[payment.company_round] += payment.amount
        
        # Track revenue by company round
        revenue_by_round = defaultdict(float)
        for investor in self.investors:
            for revenue in investor.revenue_history:
                revenue_by_round[revenue.company_round] += revenue.amount
        
        # Calculate the ratio of revenue to payment for each round
        revenue_payment_ratio = {}
        for round_num in payments_by_round:
            if payments_by_round[round_num] > 0:
                revenue_payment_ratio[round_num] = revenue_by_round[round_num] / payments_by_round[round_num]
            else:
                revenue_payment_ratio[round_num] = 0
        
        return {
            "payments_by_round": dict(payments_by_round),
            "revenue_by_round": dict(revenue_by_round),
            "revenue_payment_ratio": revenue_payment_ratio
        }
    
    def get_sustainability_metrics(self) -> Dict[str, Any]:
        """
        Calculate metrics related to the sustainability of the system.
        
        Returns:
            Dict[str, Any]: Dictionary with sustainability metrics
        """
        if not self.history:
            return {"status": "No data"}
        
        # Find where the system first becomes profitable and if/when it becomes unprofitable again
        profitable_rounds = []
        unprofitable_after_profit = []
        
        was_profitable = False
        for result in self.history:
            if result.cumulative_net_profit > 0:
                was_profitable = True
                profitable_rounds.append(result.company_round)
            elif was_profitable and result.cumulative_net_profit <= 0:
                unprofitable_after_profit.append(result.company_round)
        
        # Calculate required growth metrics
        growth_metrics = {}
        if len(self.history) > 1:
            # Calculate the average growth in new investors needed for sustainability
            new_investors = [r.new_investor_count for r in self.history]
            payment_totals = [r.total_payment for r in self.history]
            
            # Calculate the average growth rate required in new investors
            growth_rate_investors = []
            for i in range(1, len(new_investors)):
                if new_investors[i-1] > 0:
                    growth_rate_investors.append(new_investors[i] / new_investors[i-1])
            
            # Calculate the average growth rate required in payments
            growth_rate_payments = []
            for i in range(1, len(payment_totals)):
                if payment_totals[i-1] > 0:
                    growth_rate_payments.append(payment_totals[i] / payment_totals[i-1])
            
            if growth_rate_investors:
                growth_metrics["avg_investor_growth_rate"] = sum(growth_rate_investors) / len(growth_rate_investors)
            
            if growth_rate_payments:
                growth_metrics["avg_payment_growth_rate"] = sum(growth_rate_payments) / len(growth_rate_payments)
        
        # Find the point of diminishing returns, if any
        diminishing_returns_round = None
        if len(self.history) > 2:
            net_profits = [r.net_profit_after_tax for r in self.history]
            for i in range(2, len(net_profits)):
                # If profit growth rate is slowing down significantly
                if (net_profits[i] - net_profits[i-1]) < 0.5 * (net_profits[i-1] - net_profits[i-2]):
                    diminishing_returns_round = self.history[i].company_round
                    break
        
        return {
            "first_profitable_round": profitable_rounds[0] if profitable_rounds else None,
            "sustained_profitability": not unprofitable_after_profit,
            "unprofitable_after_profit_rounds": unprofitable_after_profit,
            "growth_metrics": growth_metrics,
            "diminishing_returns_round": diminishing_returns_round
        }
    
    def get_summary(self) -> Dict[str, Any]:
        """
        Get a comprehensive summary of the simulation results.
        
        Returns:
            Dict[str, Any]: Dictionary containing summary statistics
        """
        if not self.history:
            return {"status": "No data"}
            
        df = self.to_dataframe()
        
        # Basic metrics
        final_result = self.history[-1]
        total_payments = sum(r.total_payment for r in self.history)
        total_revenue = sum(r.total_revenue_after_tax for r in self.history)
        
        # Sustainability metrics
        sustainability = self.get_sustainability_metrics()
        
        # Revenue and ROI distribution
        roi_distribution = self.get_roi_distribution()
        
        # Payment flow analysis
        payment_flow = self.get_payment_flow_analysis()
        
        return {
            "plan_id": self.plan_id,
            "investor_count": self.investor_count,
            "total_company_rounds": len(self.history),
            "final_net_profit": final_result.cumulative_net_profit,
            "final_investor_count": final_result.active_investor_count,
            "total_payments": total_payments,
            "total_revenue": total_revenue,
            "average_net_profit_per_round": df['순수익(세후)'].mean(),
            "sustainability_metrics": sustainability,
            "roi_distribution": roi_distribution,
            "payment_flow": payment_flow,
            "investor_states": {
                "active": sum(1 for inv in self.investors if inv.current_status == "활성"),
                "graduated": sum(1 for inv in self.investors if inv.current_status == "졸업")
            }
        }
