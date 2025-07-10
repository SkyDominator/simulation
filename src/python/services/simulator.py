"""
Financial simulation service.

This module provides the core simulation service for the financial simulator.
"""

import logging
from typing import Dict, List, Any, Optional, Tuple

from models.investor import Investor
from models.results import SimulationRoundResult, SimulationResults
from config import get_plan_parameters, validate_plan_parameters

logger = logging.getLogger(__name__)


class FinancialSimulationService:
    """
    Service class implementing the core financial simulation logic.
    
    This class handles the dynamic calculation of payments and revenues 
    based on plan parameters, and manages the investor lifecycle.
    """
    
    def __init__(self, plan_id: str):
        """
        Initialize the financial simulation service.
        
        Args:
            plan_id (str): The plan identifier to use for the simulation
            
        Raises:
            ValueError: If the plan_id is not valid or parameters are incomplete
        """
        try:
            self.params = get_plan_parameters(plan_id)
            validate_plan_parameters(self.params)
        except ValueError as e:
            logger.error(f"Failed to initialize simulation with plan '{plan_id}': {str(e)}")
            raise
            
        self.plan_id = plan_id
        self.max_investor_count = self.params['max_investor_count']
        self.investors: List[Investor] = []
        self.current_company_round: int = 0
        self.results = SimulationResults(plan_id=plan_id)
        self.settlement_bonus_active: bool = True  # Flag to track if settlement bonus is still active
        self.original_settlement_bonus: float = self.params['settlement_bonus']  # Store the original bonus value
        
        logger.info(f"Financial simulation initialized with plan '{plan_id}'")

    def _add_new_investor(self, investor_type: str = "신규") -> None:
        """
        Add a new investor to the simulation.
        
        Args:
            investor_type (str): Type of investor ('신규'/new or '재입학'/re-entry)
        """
        investor = Investor(
            start_company_round=self.current_company_round,
            investor_type=investor_type
        )
        self.investors.append(investor)
        logger.debug(f"Added new {investor_type} investor at company round {self.current_company_round}")

    def _check_settlement_bonus_condition(self, investor: Investor) -> None:
        """
        Check if settlement bonus should be deactivated based on investor status.
        
        This method checks if the first investor (start_company_round == 1) has reached
        their 15th internal round, and if so, deactivates the settlement bonus.
        
        Args:
            investor (Investor): The investor to check
        """
        if (self.settlement_bonus_active and 
                investor.start_company_round == 1 and 
                investor.internal_round == 15):
            # First investor has reached 15th internal round, deactivate settlement bonus
            self.settlement_bonus_active = False
            self.params['settlement_bonus'] = 0
            logger.info("Settlement bonus deactivated: First investor reached 15th internal round")
    
    def _calculate_revenue(self, investor: Investor, actual_payment: float) -> float:
        """
        Calculate the revenue for an investor based on their payment and internal round.
        
        Args:
            investor (Investor): The investor to calculate revenue for
            actual_payment (float): The actual payment made by the investor
            
        Returns:
            float: The calculated revenue
        """
        # Check if we need to deactivate settlement bonus
        self._check_settlement_bonus_condition(investor)
        
        internal_round = investor.internal_round
        p = self.params
        
        base_calc_value = actual_payment / p['revenue_base_divisor']

        if internal_round <= 2:
            return base_calc_value * p['sales_commission']
        
        elif internal_round == 3:
            revenue_k3 = (base_calc_value * p['sales_commission']) + p['settlement_bonus']
            investor.set_base_return(revenue_k3)
            return revenue_k3
        
        elif internal_round >= 4:
            # Get the bonus rate for this round, default to 0 if not specified
            bonus_rate = p['round_bonus_rates'].get(internal_round, 0)
            
            # Calculate potential bonus but cap it at max_bonus
            bonus_amount = min(
                base_calc_value * bonus_rate,
                p['max_bonus']
            )
            
            # Apply the achievement rate for the current round
            achievement_rate = p['sales_achievement_rates'].get(self.current_company_round, 0)
            additional_revenue = bonus_amount * achievement_rate
            
            # Add the additional revenue to the base return from round 3
            if investor.base_return_r3 is not None:
                return investor.base_return_r3 + additional_revenue
            else:
                logger.warning(f"Investor has no base_return_r3 value in round {internal_round}")
                return additional_revenue
            
        return 0

    def _calculate_actual_payment(self, investor: Investor) -> float:
        """
        Calculate the actual payment amount for an investor based on plan parameters.
        
        Args:
            investor (Investor): The investor to calculate payment for
            
        Returns:
            float: The calculated payment amount
        """
        p = self.params
        start_round = investor.start_company_round
        
        # Get the scheduled payment amount for this start round
        scheduled_payment = p['scheduled_payment'].get(start_round, 0)
        
        # Determine the minimum payment based on investor type
        if investor.investor_type == "신규":  # New investor
            min_payment = p['min_payment_new'].get(start_round, 0)
        else:  # Re-entry investor
            min_payment = p['min_payment_re']
        
        # Actual payment is the maximum of scheduled and minimum
        actual_payment = max(scheduled_payment, min_payment)
        
        return actual_payment

    def run_single_round(self) -> SimulationRoundResult:
        """
        Execute a single round of the simulation.
        
        Returns:
            SimulationRoundResult: The results of this round
        """
        self.current_company_round += 1
        t = self.current_company_round
        
        logger.info(f"Running simulation round {t}")
        
        total_payment_this_round = 0
        total_revenue_this_round = 0
        next_round_investors = []
        graduation_count = 0
        
        # Add new investors based on the simulation rules
        if t <= self.max_investor_count:
            # Growth phase: Add new investors
            self._add_new_investor(investor_type="신규")
            logger.debug(f"Growth phase: Added new investor in round {t}")
                
        if t > self.max_investor_count:
            # Stable phase: Replace graduated investors with re-entries
            self._add_new_investor(investor_type="재입학")
            logger.debug(f"Stable phase: Added re-entry investor in round {t}")
        
        # Process all current investors
        for investor in self.investors:
            # Calculate and process payment
            actual_payment = self._calculate_actual_payment(investor)
            investor.add_payment(t, actual_payment)
            total_payment_this_round += actual_payment
            
            # Calculate and process revenue
            revenue = self._calculate_revenue(investor, actual_payment)
            revenue = round(revenue)
            investor.add_revenue(t, revenue)
            total_revenue_this_round += revenue
            
            # Update investor status
            if not investor.is_graduated(self.max_investor_count):
                investor.increment_round()
                next_round_investors.append(investor)
            else:
                investor.investor_type = "졸업"  # Mark as graduated
                graduation_count += 1
                logger.debug(f"Investor graduated in round {t}")
        
        # Tax calculation (3.3%)
        tax_rate = 0.033
        total_revenue_after_tax = total_revenue_this_round - (total_revenue_this_round * tax_rate)
        
        # Net profit calculation
        if t == 1:
            net_profit_after_tax = -total_payment_this_round
            cumulative_net_profit = net_profit_after_tax
        else:
            prev_round_result = self.results.history[-1]
            prev_revenue_after_tax = prev_round_result.total_revenue_after_tax
            net_profit_after_tax = prev_revenue_after_tax - total_payment_this_round
            cumulative_net_profit = prev_round_result.cumulative_net_profit + net_profit_after_tax
        
        # Create the round result
        round_result = SimulationRoundResult(
            company_round=t,
            investor_count=len(self.investors),
            total_payment=total_payment_this_round,
            total_revenue_before_tax=total_revenue_this_round,
            total_revenue_after_tax=total_revenue_after_tax,
            net_profit_after_tax=net_profit_after_tax,
            cumulative_net_profit=cumulative_net_profit
        )
        
        # Save results and update investors for next round
        self.results.add_round_result(round_result)
        self.investors = next_round_investors
        
        logger.info(f"Round {t} completed: {len(self.investors)} investors, " +
                   f"payment: {total_payment_this_round:.0f}, " +
                   f"revenue (after tax): {total_revenue_after_tax:.0f}, " +
                   f"net profit: {net_profit_after_tax:.0f}")
        
        return round_result
        
    def run_simulation(self, total_rounds: int) -> SimulationResults:
        """
        Run the complete simulation for the specified number of rounds.
        
        Args:
            total_rounds (int): The total number of rounds to simulate
            
        Returns:
            SimulationResults: The complete simulation results
            
        Raises:
            ValueError: If total_rounds is not positive
        """
        if total_rounds <= 0:
            raise ValueError("Total rounds must be positive")
        
        logger.info(f"Starting simulation with plan '{self.plan_id}' for {total_rounds} rounds")
        
        # Reset the simulation state
        self.current_company_round = 0
        self.investors = []
        self.results = SimulationResults(plan_id=self.plan_id)
        # Reset settlement bonus state for new simulation
        self.settlement_bonus_active = True
        self.params['settlement_bonus'] = self.original_settlement_bonus
        
        try:
            for _ in range(total_rounds):
                self.run_single_round()
                
            logger.info("Simulation completed successfully")
            return self.results
            
        except Exception as e:
            logger.error(f"Simulation failed: {str(e)}")
            raise
