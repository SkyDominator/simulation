# Partner Club Financial Simulation

This project provides a financial simulation for the Partner Club system, implementing various investment plans and calculating returns over multiple rounds.

## Project Structure

The code has been refactored following SOLID principles and best practices:

- `src/python/`: Main project directory
  - `config/`: Configuration and plan parameters
  - `models/`: Data models for the simulation
  - `services/`: Business logic services
  - `utils/`: Utility functions
  - `init.py`: Main entry point for running simulations

## How to Run the Simulation

1. Navigate to the project directory
2. Run the main script:
   ```
   python src/python/init.py
   ```
3. Follow the prompts to select a plan and specify the number of simulation rounds
4. View the results in the console, with an option to export to Excel

## Key Features

- Modular and maintainable code structure
- Proper error handling with logging
- Type hints throughout the codebase
- Comprehensive documentation
- Extensible design for adding new plans or modifying simulation behavior

## Simulation Process

1. Investors join the system each round during the growth phase
2. When an investor graduates, they are replaced by re-entry investors
3. Each investor makes payments and receives revenue based on plan parameters
4. The simulation tracks payments, revenue, and net profit for each round

## Adding New Plans

To add a new plan:

1. Edit the `_get_all_plan_parameters` function in `config/__init__.py`
2. Add a new entry with the required parameters
3. The plan will automatically be available in the simulation

## Dependencies

- Python 3.7+
- pandas (for data processing and export)
- matplotlib (optional, for visualization)
