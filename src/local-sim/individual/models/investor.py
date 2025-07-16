"""
Investor model module.

This module defines the Investor class which represents a participant in the financial simulation.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field


@dataclass
class PaymentRecord:
    """Class representing a payment made by an investor."""
    round: int
    amount: float


@dataclass
class RevenueRecord:
    """Class representing revenue generated for an investor."""
    round: int
    amount: float


@dataclass
class Investor:
    """
    Class representing an investor in the financial simulation system.
    
    Attributes:
        start_company_round (int): The company round when the investor joined
        internal_round (int): Current internal round number for this investor
        investor_type (str): Type of investor ('신규'/new or '재입학'/re-entry)
        base_return_r3 (Optional[float]): Base return from round 3, used for future calculations
        payment_history (List[PaymentRecord]): History of payments made
        revenue_history (List[RevenueRecord]): History of revenue generated
    """
    start_company_round: int
    internal_round: int = 1
    investor_type: str = "신규"  # Default to 'new'
    base_return_r3: Optional[float] = None
    payment_history: List[PaymentRecord] = field(default_factory=list)
    revenue_history: List[RevenueRecord] = field(default_factory=list)
    
    def add_payment(self, round_number: int, amount: float) -> None:
        """
        Add a payment record to the investor's history.
        
        Args:
            round_number (int): The company round when payment was made
            amount (float): Amount paid
        """
        self.payment_history.append(PaymentRecord(round=round_number, amount=amount))
    
    def add_revenue(self, round_number: int, amount: float) -> None:
        """
        Add a revenue record to the investor's history.
        
        Args:
            round_number (int): The company round when revenue was generated
            amount (float): Amount of revenue
        """
        self.revenue_history.append(RevenueRecord(round=round_number, amount=amount))
    
    def increment_round(self) -> None:
        """Increment the investor's internal round number."""
        self.internal_round += 1
    
    def is_graduated(self, max_investor_count: int) -> bool:
        """
        Check if the investor has graduated (completed all rounds).
        
        Args:
            max_investor_count (int): Maximum number of rounds before graduation
            
        Returns:
            bool: True if the investor has graduated, False otherwise
        """
        return self.internal_round >= max_investor_count
    
    def set_base_return(self, value: float) -> None:
        """
        Set the base return value from round 3.
        
        Args:
            value (float): Base return value to set
        """
        self.base_return_r3 = value
    
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
