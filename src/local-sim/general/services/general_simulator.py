"""
General simulation service.

This module implements the core service for the general simulation system.
"""

import logging
import random
from typing import Dict, List, Any, Optional, Tuple, Set, Counter
from collections import defaultdict, Counter

from typing import Dict, List, Any, Optional, Tuple, Set, Counter
import os
import sys
import logging
from collections import defaultdict, Counter

# Import models from local relative path
from ..models.investor import GeneralInvestor
from ..models.results import GeneralSimulationResults, CompanyRoundResult

# Dictionary for caching plan parameters
_PLAN_PARAMETERS_CACHE = {}

def get_plan_parameters(plan: str) -> Dict[str, Any]:
    """
    Get the parameters for a specific plan (hardcoded for the general simulation).
    
    This function provides hardcoded plan parameters to avoid import issues.
    In a real application, this would import from the config module.
    
    Args:
        plan (str): The plan identifier (e.g., 'A', 'B', 'C', etc.)
        
    Returns:
        Dict[str, Any]: Dictionary containing plan parameters
        
    Raises:
        ValueError: If the plan is not supported
    """
    # Check if we have the plan parameters in cache
    if plan in _PLAN_PARAMETERS_CACHE:
        return _PLAN_PARAMETERS_CACHE[plan]
    
    # Plans A and B are enough for simulation purposes
    # These are copies of the actual plan parameters
    plans = {
        "A": {
            'max_investor_count': 15,
            'max_rounds': 30,
            'scheduled_payment': {1: 330000, 2: 2420000, 3:330000, 4: 330000, 5: 330000, 6: 330000, 7: 330000, 8: 330000, 9: 1100000, 10: 1100000, 11: 2200000, 12: 2200000, 13:3300000, 14:5500000, 15: 11000000, 16: 11000000, 17: 11000000, 18: 11000000, 19: 11000000, 20: 11000000, 21: 11000000, 22: 11000000, 23: 11000000, 24: 11000000, 25: 11000000, 26: 11000000, 27: 11000000, 28: 11000000, 29: 11000000, 30: 11000000},
            'min_payment_new': {1: 0, 2: 220000, 3:330000, 4: 330000, 5: 330000, 6: 330000, 7: 330000, 8: 330000, 9: 1100000, 10: 1100000, 11: 2200000, 12: 2200000, 13:3300000, 14:5500000, 15: 11000000, 16: 11000000, 17: 11000000, 18: 11000000, 19: 11000000, 20: 11000000, 21: 11000000, 22: 11000000, 23: 11000000, 24: 11000000, 25: 11000000, 26: 11000000, 27: 11000000, 28: 11000000, 29: 11000000, 30: 11000000},
            'min_payment_re': 11000000,
            'revenue_base_divisor': 1.1,
            'sales_commission': 0.32,
            'settlement_bonus': 100000,
            'max_bonus': 30000000,
            'round_bonus_rates': {4: 1, 5: 1, 6: 2, 7: 2, 8: 3, 9: 3, 10: 5, 11: 5, 12:10, 13:20, 14:50, 15:100},
            'sales_achievement_rates': {4: 1, 5:1, 6:1, 7:1, 8:1, 9:1, 10:1, 11:1, 12:1, 13:1, 14:1, 15:1, 16:1, 17:1, 18:1, 19:1, 20:1, 21:1, 22:1, 23:1, 24:1, 25:1, 26:1, 27:1, 28:1, 29:1, 30:1}
        },
        "B": {
            'max_investor_count': 15,
            'max_rounds': 30,
            'scheduled_payment': {1: 110000, 2: 110000, 3:110000, 4: 110000, 5: 110000, 6: 110000, 7: 110000, 8: 110000, 9: 110000, 10: 110000, 11: 110000, 12: 110000, 13:110000, 14:110000, 15: 110000, 16: 110000, 17: 110000, 18: 110000, 19: 110000, 20: 110000, 21: 110000, 22: 110000, 23: 110000, 24: 110000, 25: 110000, 26: 110000, 27: 110000, 28: 110000, 29: 110000, 30: 110000},
            'min_payment_new': {1: 110000, 2: 110000, 3:110000, 4: 110000, 5: 110000, 6: 110000, 7: 110000, 8: 110000, 9: 110000, 10: 110000, 11: 110000, 12: 110000, 13:110000, 14:110000, 15: 110000, 16: 110000, 17: 110000, 18: 110000, 19: 110000, 20: 110000, 21: 110000, 22: 110000, 23: 110000, 24: 110000, 25: 110000, 26: 110000, 27: 110000, 28: 110000, 29: 110000, 30: 110000},
            'min_payment_re': 110000,
            'revenue_base_divisor': 1.1,
            'sales_commission': 0.32,
            'settlement_bonus': 100000,
            'max_bonus': 30000000,
            'round_bonus_rates': {4: 1, 5: 1, 6: 2, 7: 2, 8: 3, 9: 3, 10: 5, 11: 5, 12:10, 13:20, 14:50, 15:100},
            'sales_achievement_rates': {4: 1, 5:1, 6:1, 7:1, 8:1, 9:1, 10:1, 11:1, 12:1, 13:1, 14:1, 15:1, 16:1, 17:1, 18:1, 19:1, 20:1, 21:1, 22:1, 23:1, 24:1, 25:1, 26:1, 27:1, 28:1, 29:1, 30:1}
        }
    }
    
    if plan not in plans:
        raise ValueError(f"Unsupported plan: {plan}. Available plans: {list(plans.keys())}")
    
    # Cache the plan parameters
    _PLAN_PARAMETERS_CACHE[plan] = plans[plan]
    return plans[plan]

def validate_plan_parameters(parameters: Dict[str, Any]) -> bool:
    """
    Validate that plan parameters are complete and well-formed.
    
    Args:
        parameters (Dict[str, Any]): Plan parameters to validate
        
    Returns:
        bool: True if valid
        
    Raises:
        ValueError: If parameters are invalid or missing required fields
    """
    required_keys = [
        'max_investor_count', 'max_rounds', 'scheduled_payment', 'min_payment_new', 
        'min_payment_re', 'revenue_base_divisor', 'sales_commission', 
        'settlement_bonus', 'max_bonus', 'round_bonus_rates', 
        'sales_achievement_rates'
    ]
    
    for key in required_keys:
        if key not in parameters:
            raise ValueError(f"Missing required parameter: {key}")
    
    return True

logger = logging.getLogger(__name__)


class GeneralSimulationService:
    """
    Service class implementing the general financial simulation logic.
    
    This class handles the simulation of multiple investors over many company rounds,
    managing investor lifecycles, payment flows, and revenue calculations.
    """
    
    def __init__(self, plan_id: str, investor_count: int = 1000):
        """
        Initialize the general simulation service.
        
        Args:
            plan_id (str): The plan identifier to use for the simulation
            investor_count (int): Total number of investors to simulate
            
        Raises:
            ValueError: If the plan_id is not valid or parameters are incomplete
        """
        try:
            self.params = get_plan_parameters(plan_id)
            validate_plan_parameters(self.params)
        except ValueError as e:
            logger.error(f"Failed to initialize general simulation with plan '{plan_id}': {str(e)}")
            raise
            
        self.plan_id = plan_id
        self.max_rounds = self.params['max_rounds']
        self.investor_count = investor_count
        self.investors: Dict[int, GeneralInvestor] = {}
        self.investor_id_counter: int = 0
        self.current_company_round: int = 0
        self.results = GeneralSimulationResults(plan_id=plan_id, investor_count=investor_count)
        self.settlement_bonus_active: bool = True
        self.original_settlement_bonus: float = self.params['settlement_bonus']
        self.investor_entry_schedule: List[int] = []
        
        logger.info(f"General simulation initialized with plan '{plan_id}' for {investor_count} investors")
        
    def _generate_investor_entry_schedule(self, max_company_rounds: int) -> None:
        """
        Generate a schedule of when investors enter the system.
        
        Args:
            max_company_rounds (int): Maximum number of company rounds to simulate
        """
        # Create a discrete uniform distribution of investor entries over company rounds
        remaining_investors = self.investor_count
        
        # Make sure some investors join in the first rounds
        min_initial_investors = min(10, self.investor_count // 10)
        self.investor_entry_schedule = [min_initial_investors]
        remaining_investors -= min_initial_investors
        
        # Distribute the rest across the rounds with some randomness
        rounds_remaining = max_company_rounds - 1
        
        if rounds_remaining > 0:
            # Base rate is the average number of investors per round
            base_rate = remaining_investors // rounds_remaining
            
            # Add some randomness around the base rate
            for _ in range(rounds_remaining):
                # Calculate a random number of investors for this round
                # with more investors in earlier rounds (decreasing probability)
                variation = random.randint(-base_rate // 4, base_rate // 2)
                investors_this_round = max(0, min(remaining_investors, base_rate + variation))
                
                self.investor_entry_schedule.append(investors_this_round)
                remaining_investors -= investors_this_round
                
                # If we've allocated all investors, stop
                if remaining_investors <= 0:
                    break
        
        # Add any remaining investors to the last scheduled round
        if remaining_investors > 0 and self.investor_entry_schedule:
            self.investor_entry_schedule[-1] += remaining_investors
            
        # Extend the schedule to max_company_rounds if needed
        while len(self.investor_entry_schedule) < max_company_rounds:
            self.investor_entry_schedule.append(0)
            
        logger.info(f"Generated investor entry schedule: {sum(self.investor_entry_schedule)} investors "
                    f"over {len(self.investor_entry_schedule)} rounds")
        
    def _add_new_investors(self, company_round: int, count: int) -> List[int]:
        """
        Add new investors to the simulation.
        
        Args:
            company_round (int): The current company round
            count (int): Number of investors to add
            
        Returns:
            List[int]: List of new investor IDs
        """
        new_investor_ids = []
        
        for _ in range(count):
            self.investor_id_counter += 1
            investor_id = self.investor_id_counter
            
            investor = GeneralInvestor(
                id=investor_id,
                start_company_round=company_round,
                plan_id=self.plan_id,
                investor_type="신규"
            )
            
            self.investors[investor_id] = investor
            self.results.add_investor(investor)
            new_investor_ids.append(investor_id)
            
        logger.debug(f"Added {count} new investors at company round {company_round}")
        return new_investor_ids

    def _add_reentry_investors(self, company_round: int, count: int) -> List[int]:
        """
        Add re-entry investors to the simulation.
        
        Args:
            company_round (int): The current company round
            count (int): Number of investors to add
            
        Returns:
            List[int]: List of new investor IDs
        """
        new_investor_ids = []
        
        for _ in range(count):
            self.investor_id_counter += 1
            investor_id = self.investor_id_counter
            
            investor = GeneralInvestor(
                id=investor_id,
                start_company_round=company_round,
                plan_id=self.plan_id,
                investor_type="재입학"
            )
            
            self.investors[investor_id] = investor
            self.results.add_investor(investor)
            new_investor_ids.append(investor_id)
            
        logger.debug(f"Added {count} re-entry investors at company round {company_round}")
        return new_investor_ids

    def _check_settlement_bonus_condition(self) -> None:
        """
        Check if settlement bonus should be deactivated.
        
        In the general simulation, the settlement bonus is deactivated when
        the first investor (start_company_round == 1) reaches their 15th internal round.
        """
        if not self.settlement_bonus_active:
            return
            
        # Find any investors who started in round 1
        for investor in self.investors.values():
            if (investor.start_company_round == 1 and 
                    investor.internal_round == 15):
                # Investor from first round has reached 15th internal round
                self.settlement_bonus_active = False
                self.params['settlement_bonus'] = 0
                logger.info("Settlement bonus deactivated: First investor reached 15th internal round")
                break
    
    def _calculate_revenue(self, investor: GeneralInvestor, actual_payment: float) -> float:
        """
        Calculate the revenue for an investor based on their payment and internal round.
        
        Args:
            investor (GeneralInvestor): The investor to calculate revenue for
            actual_payment (float): The actual payment made by the investor
            
        Returns:
            float: The calculated revenue
        """
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
                logger.warning(f"Investor {investor.id} has no base_return_r3 value in round {internal_round}")
                return additional_revenue
            
        return 0

    def _calculate_actual_payment(self, investor: GeneralInvestor) -> float:
        """
        Calculate the actual payment amount for an investor based on plan parameters.
        
        Args:
            investor (GeneralInvestor): The investor to calculate payment for
            
        Returns:
            float: The calculated payment amount
        """
        p = self.params
        
        # Get the scheduled payment amount for this internal round
        # In the general simulation, we use min_payment_new as specified in requirements
        if investor.investor_type == "신규":  # New investor
            # According to requirements, first round payment is fixed at 330,000 won
            if investor.internal_round == 1:
                return 330000
            
            # For other rounds, follow the min_payment_new schedule
            min_payment = p['min_payment_new'].get(investor.internal_round, 0)
            return min_payment
        else:  # Re-entry investor
            return p['min_payment_re']

    def _calculate_potential_revenue_share(self, investor: GeneralInvestor, actual_payment: float) -> float:
        """
        Calculate the potential revenue share for an investor based on their payment and internal round.
        
        This method calculates what each investor would receive based on their individual
        formula without considering the total revenue pool. These values are later scaled
        to distribute the actual revenue pool proportionally.
        
        Args:
            investor (GeneralInvestor): The investor to calculate revenue share for
            actual_payment (float): The actual payment made by the investor
            
        Returns:
            float: The calculated potential revenue share
        """
        internal_round = investor.internal_round
        p = self.params
        
        base_calc_value = actual_payment / p['revenue_base_divisor']

        if internal_round <= 2:
            return base_calc_value * p['sales_commission']
        
        elif internal_round == 3:
            # For round 3, include the settlement bonus in the potential revenue
            revenue_r3 = (base_calc_value * p['sales_commission']) + p['settlement_bonus']
            # Set the base return for this investor for future rounds
            investor.set_base_return(revenue_r3)
            return revenue_r3
        
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
                # If we don't have the base return, just use the bonus calculation
                # This is a fallback case and shouldn't happen in normal operation
                logger.warning(f"Investor {investor.id} has no base_return_r3 value in round {internal_round}")
                return base_calc_value * p['sales_commission'] + additional_revenue
            
        return 0

    def run_single_round(self) -> CompanyRoundResult:
        """
        Execute a single round of the general simulation.
        
        Returns:
            CompanyRoundResult: The results of this round
        """
        self.current_company_round += 1
        company_round = self.current_company_round
        
        logger.info(f"Running general simulation round {company_round}")
        
        # Track metrics for this round
        total_payment_this_round = 0
        graduated_count = 0
        internal_round_distribution = Counter()
        
        # Add new investors based on the schedule
        if company_round <= len(self.investor_entry_schedule):
            new_investors_count = self.investor_entry_schedule[company_round - 1]
            self._add_new_investors(company_round, new_investors_count)
        else:
            new_investors_count = 0
        
        # Add re-entry investors (in real scenarios, this would be based on market research)
        # For now, we'll add re-entry investors proportional to the number of graduating investors
        reentry_investors_count = max(0, graduated_count // 2)
        self._add_reentry_investors(company_round, reentry_investors_count)
        
        # Check settlement bonus condition before processing investors
        self._check_settlement_bonus_condition()
        
        # Process all current investors
        active_investor_ids = list(self.investors.keys())
        next_round_investor_ids = []
        
        # First pass: Collect all payments for this round
        for investor_id in active_investor_ids:
            investor = self.investors[investor_id]
            
            # Skip investors who have already graduated
            if investor.current_status == "졸업":
                continue
                
            # Record the internal round distribution
            internal_round_distribution[investor.internal_round] += 1
            
            # Calculate and process payment
            actual_payment = self._calculate_actual_payment(investor)
            investor.add_payment(company_round, actual_payment)
            total_payment_this_round += actual_payment
            
            # Update investor status for next round
            if not investor.is_graduated(self.max_rounds):
                investor.increment_round()
                next_round_investor_ids.append(investor_id)
            else:
                investor.graduate()
                graduated_count += 1
                logger.debug(f"Investor {investor_id} graduated in round {company_round}")
        
        # KEY CHANGE: Calculate total revenue available for distribution
        # 83% of all payments in this round become the revenue pool
        revenue_pool = total_payment_this_round * 0.83
        logger.info(f"Round {company_round}: Total payments: {total_payment_this_round:.0f}, "
                   f"Revenue pool (83%): {revenue_pool:.0f}")
        
        # Second pass: Distribute revenue according to investor formulas
        # First, calculate each investor's share ratio based on their internal round
        total_revenue_this_round = 0
        investor_revenue_share = {}
        
        # Calculate the potential revenue for each investor based on their formula
        total_potential_revenue = 0
        for investor_id in next_round_investor_ids:
            investor = self.investors[investor_id]
            # Use the existing formula but without applying the actual payment yet
            # Just to calculate the relative weights
            base_payment = self._calculate_actual_payment(investor)
            potential_revenue = self._calculate_potential_revenue_share(investor, base_payment)
            investor_revenue_share[investor_id] = potential_revenue
            total_potential_revenue += potential_revenue
        
        # Now distribute the actual revenue pool based on the calculated shares
        if total_potential_revenue > 0:
            scaling_factor = revenue_pool / total_potential_revenue
            for investor_id, potential_revenue in investor_revenue_share.items():
                investor = self.investors[investor_id]
                actual_revenue = round(potential_revenue * scaling_factor)
                investor.add_revenue(company_round, actual_revenue)
                total_revenue_this_round += actual_revenue
                logger.debug(f"Investor {investor_id} (round {investor.internal_round}): "
                           f"Revenue: {actual_revenue:.0f}")
        
        # Tax calculation (3.3%)
        tax_rate = 0.033
        total_revenue_after_tax = total_revenue_this_round - (total_revenue_this_round * tax_rate)
        
        # Net profit calculation
        if company_round == 1:
            net_profit_after_tax = -total_payment_this_round
            cumulative_net_profit = net_profit_after_tax
        else:
            prev_round_result = self.results.history[-1]
            prev_revenue_after_tax = prev_round_result.total_revenue_after_tax
            net_profit_after_tax = prev_revenue_after_tax - total_payment_this_round
            cumulative_net_profit = prev_round_result.cumulative_net_profit + net_profit_after_tax
        
        # Create the round result
        round_result = CompanyRoundResult(
            company_round=company_round,
            active_investor_count=len(next_round_investor_ids),
            new_investor_count=new_investors_count,
            reentry_investor_count=reentry_investors_count,
            graduated_investor_count=graduated_count,
            total_payment=total_payment_this_round,
            total_revenue_before_tax=total_revenue_this_round,
            total_revenue_after_tax=total_revenue_after_tax,
            net_profit_after_tax=net_profit_after_tax,
            cumulative_net_profit=cumulative_net_profit,
            internal_round_distribution=dict(internal_round_distribution)
        )
        
        # Save results for this round
        self.results.add_round_result(round_result)
        
        logger.info(f"Round {company_round} completed: {len(next_round_investor_ids)} active investors, " +
                  f"payment: {total_payment_this_round:.0f}, " +
                  f"revenue (after tax): {total_revenue_after_tax:.0f}, " +
                  f"net profit: {net_profit_after_tax:.0f}")
        
        return round_result

    def run_simulation(self, max_company_rounds: int, **kwargs) -> GeneralSimulationResults:
        """
        Run the complete general simulation for the specified number of rounds.
        
        Args:
            max_company_rounds (int): The maximum number of company rounds to simulate
            **kwargs: Additional parameters for the simulation
            
        Returns:
            GeneralSimulationResults: The complete simulation results
            
        Raises:
            ValueError: If max_company_rounds is not positive
        """
        if max_company_rounds <= 0:
            raise ValueError("Maximum company rounds must be positive")
        
        logger.info(f"Starting general simulation with plan '{self.plan_id}' "
                   f"for {max_company_rounds} rounds with {self.investor_count} investors")
        
        # Reset the simulation state
        self.current_company_round = 0
        self.investors = {}
        self.investor_id_counter = 0
        self.results = GeneralSimulationResults(plan_id=self.plan_id, investor_count=self.investor_count)
        # Reset settlement bonus state for new simulation
        self.settlement_bonus_active = True
        self.params['settlement_bonus'] = self.original_settlement_bonus
        
        # Generate the investor entry schedule
        self._generate_investor_entry_schedule(max_company_rounds)
        
        try:
            for _ in range(max_company_rounds):
                self.run_single_round()
                
            logger.info("General simulation completed successfully")
            return self.results
            
        except Exception as e:
            logger.error(f"General simulation failed: {str(e)}")
            raise
