"""
Financial simulation service for backend API.

This module provides a simplified version of the financial simulation service
for use in the backend API. It accepts custom parameters while using default
values from configuration for other parameters.
"""

import logging
from typing import Dict, List, Any, Optional, Tuple

from constants import PLAN_PARAMETERS

logger = logging.getLogger(__name__)

class Investor:
    """
    Class representing an investor in the financial simulation system.
    """
    def __init__(self, start_company_round: int, investor_type: str = "신규"):
        self.start_company_round = start_company_round
        self.internal_round = 1
        self.investor_type = investor_type
        self.base_calc_value_r3 = None
        self.payment_history = []
        self.revenue_history = []
    
    def add_payment(self, round_number: int, amount: float) -> None:
        self.payment_history.append({"round": round_number, "amount": amount})
    
    def add_revenue(self, round_number: int, amount: float) -> None:
        self.revenue_history.append({"round": round_number, "amount": amount})
    
    def increment_round(self) -> None:
        self.internal_round += 1
    
    def is_graduated(self, max_investor_count: int) -> bool:
        return self.internal_round >= max_investor_count
    
    def set_base_calc_value(self, value: float) -> None:
        self.base_calc_value_r3 = value
    
    def get_total_payments(self) -> float:
        return sum(record["amount"] for record in self.payment_history)
    
    def get_total_revenue(self) -> float:
        return sum(record["amount"] for record in self.revenue_history)


class SimulationRoundResult:
    """
    Class representing the results of a single simulation round.
    """
    def __init__(self, company_round, investor_count, total_payment,
                 total_revenue_before_tax, total_revenue_after_tax,
                 net_profit_after_tax, cumulative_net_profit):
        self.company_round = company_round
        self.investor_count = investor_count
        self.total_payment = total_payment
        self.total_revenue_before_tax = total_revenue_before_tax
        self.total_revenue_after_tax = total_revenue_after_tax
        self.net_profit_after_tax = net_profit_after_tax
        self.cumulative_net_profit = cumulative_net_profit
        self.investor_details = []  # List of individual investor details for this round
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the round result to a dictionary."""
        return {
            "company_round": self.company_round,
            "investor_count": self.investor_count,
            "total_payment": self.total_payment,
            "total_revenue_before_tax": self.total_revenue_before_tax,
            "total_revenue_after_tax": self.total_revenue_after_tax,
            "net_profit_after_tax": self.net_profit_after_tax,
            "cumulative_net_profit": self.cumulative_net_profit,
            "investor_details": self.investor_details
        }


class SimulationResults:
    """
    Class for storing and analyzing the complete results of a simulation.
    """
    def __init__(self, plan_id: str = ""):
        self.history = []
        self.plan_id = plan_id
    
    def add_round_result(self, result: SimulationRoundResult) -> None:
        self.history.append(result)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the simulation results to a dictionary."""
        return {
            "plan_id": self.plan_id,
            "history": [round_result.to_dict() for round_result in self.history]
        }


class FinancialSimulationService:
    """
    Service class implementing the core financial simulation logic.
    
    This class handles the dynamic calculation of payments and revenues 
    based on plan parameters, and manages the investor lifecycle.
    """
    
    def __init__(self, plan_id: str, scheduled_payment: Optional[Dict[int, int]] = None, sales_achievement_rates: Optional[Dict[int, float]] = None):
        """
        Initialize the financial simulation service.
        
        Args:
            plan_id (str): The plan identifier to use for the simulation
            scheduled_payment (Optional[Dict[int, int]]): Custom scheduled payment dict
            sales_achievement_rates (Optional[Dict[int, float]]): Custom sales achievement rates
            starting_company_round (int): The starting company round
        """
        if plan_id not in PLAN_PARAMETERS:
            logger.error(f"Invalid plan: {plan_id}")
            raise ValueError(f"Invalid plan: {plan_id}")
        
        # Copy all parameters from the default plan
        self.params = PLAN_PARAMETERS[plan_id].copy()
        
        # Override scheduled_payment if provided, with sanitation
        if scheduled_payment is not None:
            self.params['scheduled_payment'] = self._sanitize_scheduled_payment(scheduled_payment, plan_id)
        # Override sales achievement rates (already expected as fractions 0.5-1.0)
        if sales_achievement_rates is not None:
            # Validate and coerce ranges
            cleaned: Dict[int, float] = {}
            for k, v in sales_achievement_rates.items():
                if not (0.5 <= v <= 1.0):
                    continue
                cleaned[int(k)] = float(v)
            if cleaned:
                self.params['sales_achievement_rates'] = cleaned
            
        self.plan_id = plan_id
        self.max_investor_count = self.params['max_investor_count']
        self.investors = []
        self.current_company_round = 0
        self.results = SimulationResults(plan_id=plan_id)
        self.settlement_bonus_active = True
        self.original_settlement_bonus = self.params['settlement_bonus']
        
        logger.info(f"Financial simulation initialized with plan '{plan_id}'")

    def _sanitize_scheduled_payment(self, scheduled_payment: Dict[int, int], plan_id: str) -> Dict[int, int]:
        """
        Sanitize scheduled payment values by replacing negatives/NaN with plan minimums.
        
        Args:
            scheduled_payment: Raw scheduled payment dictionary
            plan_id: Plan ID for minimum payment lookup
            
        Returns:
            Sanitized scheduled payment dictionary
        """
        plan_params = PLAN_PARAMETERS[plan_id]
        min_payment_new = plan_params.get('min_payment_new', {})
        min_payment_re = plan_params.get('min_payment_re', 0)
        
        sanitized = {}
        corrections = []
        
        for round_key, amount in scheduled_payment.items():
            try:
                # Ensure round key is integer
                round_num = int(round_key)
                
                # Ensure amount is valid integer
                if amount is None or amount <= 0:  # Include zero as invalid
                    # Use minimum payment for this round, fallback to re-entry minimum
                    corrected_amount = min_payment_new.get(round_num, min_payment_re)
                    corrections.append(f"Round {round_num}: {amount} -> {corrected_amount}")
                    sanitized[round_num] = corrected_amount
                else:
                    sanitized[round_num] = int(amount)
                    
            except (ValueError, TypeError):
                # Invalid round key or amount, skip this entry
                logger.warning(f"Skipping invalid scheduled payment entry: round={round_key}, amount={amount}")
                continue
        
        if corrections:
            logger.warning(f"Sanitized scheduled payment for plan {plan_id}: {corrections}")
        
        return sanitized

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
        """
        if (self.settlement_bonus_active and 
                self.current_company_round > 15):
            self.settlement_bonus_active = False
            self.params['settlement_bonus'] = 0
            logger.info("Settlement bonus deactivated: First investor reached 16th or higher current_company_round")
    
    def _calculate_revenue(self, investor: Investor, actual_payment: float) -> float:
        """
        Calculate the revenue for an investor based on their payment and internal round.
        """
        # Check if we need to deactivate settlement bonus
        self._check_settlement_bonus_condition(investor)
        
        internal_round = investor.internal_round
        p = self.params
        
        base_calc_value = actual_payment / p['revenue_base_divisor']

        if internal_round <= 2:
            return base_calc_value * p['sales_commission']
        
        elif internal_round == 3:
            investor.set_base_calc_value(base_calc_value)
            return (base_calc_value * p['sales_commission']) + p['settlement_bonus']
        
        else:  # internal_round >= 4
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
            
            base_revenue_r3 = (investor.base_calc_value_r3 * p['sales_commission']) + p['settlement_bonus'] 
            return base_revenue_r3 + additional_revenue

    def _calculate_actual_payment(self, investor: Investor) -> float:
        """
        Calculate the actual payment amount for an investor based on plan parameters.
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
        # actual_payment = max(scheduled_payment, min_payment)
        # Frontend requests always send scheduled_payment >= min_payment
        actual_payment = scheduled_payment
        
        return actual_payment

    def run_single_round(self) -> SimulationRoundResult:
        """
        Execute a single round of the simulation.
        """
        self.current_company_round += 1
        t = self.current_company_round
        
        logger.info(f"Running simulation round {t}")
        
        total_payment_this_round = 0
        total_revenue_this_round = 0
        next_round_investors = []
        graduation_count = 0
        round_investor_details = []  # Track individual investor details for this round
        
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
            
            # Store individual investor details for this round
            round_investor_details.append({
                'investor_start_round': investor.start_company_round,
                'investor_internal_round': investor.internal_round,
                'payment': actual_payment,
                'revenue': revenue,
                'investor_type': investor.investor_type
            })
            
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
        
        # Store investor details for this round
        round_result.investor_details = round_investor_details
        
        # Save results and update investors for next round
        self.results.add_round_result(round_result)
        
        logger.info(f"Round {t} completed: {len(self.investors)} investors, " +
                   f"payment: {total_payment_this_round:.0f}, " +
                   f"revenue (after tax): {total_revenue_after_tax:.0f}, " +
                   f"net profit: {net_profit_after_tax:.0f}")

        self.investors = next_round_investors
        
        return round_result
        
    def run_simulation(self, total_rounds: int) -> SimulationResults:
        """
        Run the complete simulation for the specified number of rounds.
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
