"""
Models package for general simulation.

This module exposes the model classes used in the general simulation system.
"""

from .investor import GeneralInvestor, PaymentRecord, RevenueRecord
from .results import GeneralSimulationResults, CompanyRoundResult

__all__ = [
    'GeneralInvestor', 
    'PaymentRecord', 
    'RevenueRecord', 
    'GeneralSimulationResults', 
    'CompanyRoundResult'
]
