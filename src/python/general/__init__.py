"""
General simulation system for Partner Club.

This module implements a simulation system for modeling large numbers of investors
across many company rounds, to analyze the sustainability of investment plans.
"""

from .services.general_simulator import GeneralSimulationService
from .models.results import GeneralSimulationResults

__all__ = ['GeneralSimulationService', 'GeneralSimulationResults', 'run_simulation']

def run_simulation(plan_id: str, investor_count: int, max_company_rounds: int, **kwargs):
    """
    Run the general simulation with the given parameters.
    
    Args:
        plan_id (str): The plan identifier to use for simulation
        investor_count (int): Number of investors to simulate (100, 1000, or 10000)
        max_company_rounds (int): Maximum number of company rounds to simulate
        **kwargs: Additional parameters to pass to the simulation
        
    Returns:
        GeneralSimulationResults: The results of the simulation
    """
    simulator = GeneralSimulationService(plan_id=plan_id, investor_count=investor_count)
    return simulator.run_simulation(max_company_rounds, **kwargs)
