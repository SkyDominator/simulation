"""
Investor models for general simulation.

This module defines the investor-related classes for the general simulation system.
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field


@dataclass
class PaymentRecord:
    """Class representing a payment made by an investor."""
    company_round: int
    amount: float


@dataclass
class RevenueRecord:
    """Class representing revenue generated for an investor."""
    company_round: int
    amount: float


@dataclass
class GeneralInvestor:
    """
    Class representing an investor in the general simulation system.
    
    Attributes:
        id (int): Unique identifier for the investor
        start_company_round (int): The company round when the investor joined
        internal_round (int): Current internal round for this investor (starting from 1)
        plan_id (str): The investment plan this investor is using
        investor_type (str): Type of investor ('신규'/new or '재입학'/re-entry)
        base_return_r3 (Optional[float]): Base return from round 3, used for future calculations
        payment_history (List[PaymentRecord]): History of payments made
        revenue_history (List[RevenueRecord]): History of revenue generated
        current_status (str): Current status of the investor ('활성', '졸업', etc.)
    """
    id: int
    start_company_round: int
    plan_id: str
    internal_round: int = 1
    investor_type: str = "신규"  # Default to 'new'
    base_return_r3: Optional[float] = None
    payment_history: List[PaymentRecord] = field(default_factory=list)
    revenue_history: List[RevenueRecord] = field(default_factory=list)
    current_status: str = "활성"  # Default to 'active'
    
    def add_payment(self, company_round: int, amount: float) -> None:
        """
        Add a payment record to the investor's history.
        
        Args:
            company_round (int): The company round when payment was made
            amount (float): Amount paid
        """
        self.payment_history.append(PaymentRecord(company_round=company_round, amount=amount))
    
    def add_revenue(self, company_round: int, amount: float) -> None:
        """
        Add a revenue record to the investor's history.
        
        Args:
            company_round (int): The company round when revenue was generated
            amount (float): Amount of revenue
        """
        self.revenue_history.append(RevenueRecord(company_round=company_round, amount=amount))
    
    def increment_round(self) -> None:
        """Increment the investor's internal round number."""
        self.internal_round += 1
    
    def is_graduated(self, max_rounds: int) -> bool:
        """
        Check if the investor has graduated (completed all rounds).
        
        Args:
            max_rounds (int): Maximum number of internal rounds in the plan
            
        Returns:
            bool: True if the investor has graduated, False otherwise
        """
        return self.internal_round >= max_rounds
    
    def set_base_return(self, value: float) -> None:
        """
        Set the base return value from round 3.
        
        Args:
            value (float): Base return value to set
        """
        self.base_return_r3 = value
    
    def graduate(self) -> None:
        """Mark the investor as graduated."""
        self.current_status = "졸업"
    
    def get_total_payments(self) -> float:
        """
        Calculate the total payments made by this investor.
        
        Returns:
            float: Sum of all payments
        """
        return sum(record.amount for record in self.payment_history)
    
    def get_total_revenue(self) -> float:
        """
        Calculate the total revenue generated for this investor.
        
        Returns:
            float: Sum of all revenue
        """
        return sum(record.amount for record in self.revenue_history)
    
    def get_roi(self) -> float:
        """
        Calculate the Return on Investment (ROI) for this investor.
        
        Returns:
            float: ROI as a percentage (total_revenue / total_payments * 100)
        """
        total_payments = self.get_total_payments()
        if total_payments == 0:
            return 0
        return (self.get_total_revenue() / total_payments) * 100
    
    def get_net_profit(self) -> float:
        """
        Calculate the net profit for this investor.
        
        Returns:
            float: Net profit (total_revenue - total_payments)
        """
        return self.get_total_revenue() - self.get_total_payments()
