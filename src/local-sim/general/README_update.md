# General Simulation Update: Revenue Pool Distribution

## Overview

This update implements the core business logic for the pyramid-like structure of the general simulation system. The key feature is that 83% of the total payments made by all investors in a company round becomes the revenue pool for distribution to investors according to their individual round formulas.

## Key Changes

1. **Revenue Pool Calculation**: Implemented the calculation of the revenue pool as 83% of the total payments made in a company round.

2. **Revenue Share Calculation**: Added the `_calculate_potential_revenue_share` method to determine each investor's potential revenue based on their internal round and payment amount.

3. **Proportional Distribution**: Implemented a two-step distribution process:
   - Calculate each investor's potential revenue share based on their individual formula
   - Scale these potential values proportionally to match the actual revenue pool size (83% of total payments)

4. **Base Return Setting**: Fixed an issue where the base return value from round 3 was not being properly set for investors, affecting their future revenue calculations.

## How the System Works

1. In each company round, the system collects all payments from active investors.
2. 83% of the total payment amount becomes the revenue pool for that round.
3. For each investor:
   - The system calculates their "potential revenue" based on their individual round formula
   - All potential revenues are summed and used to determine the proportion each investor receives from the actual revenue pool
   - The final revenue amount for each investor is calculated and distributed

This approach ensures that:

- The total revenue distributed never exceeds 83% of the total payments collected
- Each investor's share is proportional to what their individual formula dictates
- The pyramid structure is accurately modeled, where new payments fund existing investors' returns

## Business Model Implications

This implementation accurately reflects the pyramid-like nature of the business model, where:

- The sustainability of the model depends on recruiting new investors or increasing payment amounts
- If the inflow of new payments decreases, the revenue pool shrinks, affecting all investors
- Long-term sustainability requires continuous growth in either investor numbers or payment amounts

The simulation results show this relationship clearly, with key metrics like cumulative net profit and sustainability indicators reflecting the model's dynamics.
