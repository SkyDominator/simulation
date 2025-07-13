# Partner Club Financial Simulation

This project provides a financial simulation for the Partner Club system, implementing various investment plans and calculating returns over multiple rounds. **Now supports both single-plan and multi-plan simulations with comprehensive comparative analysis.**

## Project Structure

The code has been refactored following SOLID principles and best practices:

- `src/python/`: Main project directory
  - `config/`: Configuration and plan parameters
  - `models/`: Data models for simulation results (supports multi-plan analysis)
  - `services/`: Business logic services
  - `utils/`: Utility functions including comprehensive reporting
  - `init.py`: Main entry point for running simulations

## How to Run the Simulation

1. Navigate to the project directory
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Run the main script:
   ```
   python src/python/init.py
   ```
4. Choose simulation type:
   - **Single plan**: Enter one plan (e.g., 'A')
   - **Multiple plans**: Enter comma-separated plans (e.g., 'A,B,C')
   - **All plans**: Enter 'all'
5. Specify the number of simulation rounds
6. View comprehensive results and export options

## Key Features

### Core Features
- Modular and maintainable code structure
- Proper error handling with logging
- Type hints throughout the codebase
- Comprehensive documentation
- Extensible design for adding new plans or modifying simulation behavior

### Multi-Plan Simulation Features ✨
- **Simultaneous simulation** of multiple investment plans
- **Comparative analysis** showing best-performing plans
- **Comprehensive reporting** with individual and aggregate results
- **Advanced visualization** comparing all plans (requires matplotlib)
- **Multi-sheet Excel export** with detailed breakdowns
- **Performance metrics** including fastest to profitability, highest returns, etc.

## Simulation Output

### Single Plan Results
- Round-by-round summary of payments, revenue, and profit
- Overall simulation summary with key metrics
- Excel export capability

### Multi-Plan Results
- Individual plan summaries (optional)
- **Comprehensive comparison table** showing:
  - Final net profit for each plan
  - Total payments and revenue
  - Average profit per round
  - First round achieving positive cumulative profit
- **Best performers identification**:
  - Highest final profit plan
  - Best average profit per round
  - Fastest to positive profitability
- **Aggregate analysis** across all simulated plans
- Advanced visualization and export options

## Simulation Process

1. Investors join the system each round during the growth phase
2. When an investor graduates, they are replaced by re-entry investors
3. Each investor makes payments and receives revenue based on plan parameters
4. The simulation tracks payments, revenue, and net profit for each round
5. When the first investor (start_company_round = 1) reaches their 15th internal round, the settlement bonus is set to 0 for all subsequent calculations for all investors

## Business Rules

The simulation applies several business rules that affect the calculation of payments and revenues:

1. **Settlement Bonus Rule**: When the first investor (who started at company round 1) reaches their 15th internal round, the settlement bonus is set to 0 for all investors in all subsequent calculations. This represents a change in the financial structure after reaching a certain maturity in the program.

2. **Revenue Calculation**: Revenue is calculated differently based on the internal round of each investor:
   - Rounds 1-2: Based on sales commission
   - Round 3: Sales commission + settlement bonus (which may be zeroed out by rule 1)
   - Rounds 4+: Based on previous returns plus performance bonuses

## Available Plans

Current plans supported: A, B, C, D, K, P, R, F, E
Each plan has different:
- Payment structures
- Revenue calculations  
- Maximum investor counts
- Bonus rates

## Adding New Plans

To add a new plan:

1. Edit the `_get_all_plan_parameters` function in `config/__init__.py`
2. Add a new entry with the required parameters
3. The plan will automatically be available in both single and multi-plan simulations

## Dependencies

### Required
- Python 3.7+
- pandas (for data processing and export)
- openpyxl (for Excel export functionality)

### Optional
- matplotlib (for advanced visualization and comparison plots)

Install all dependencies:
```bash
pip install -r requirements.txt
```

## Example Usage

### Single Plan Simulation
```bash
python src/python/init.py
# Select: A
# Rounds: 30
```

### Multi-Plan Comparison
```bash
python src/python/init.py
# Select: A,B,C,D
# Rounds: 30
# Export to Excel: y
# Generate plots: y (if matplotlib installed)
```

### All Plans Analysis
```bash
python src/python/init.py
# Select: all
# Rounds: 30
```
