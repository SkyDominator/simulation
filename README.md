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
1. Install dependencies:

```bash
pip install -r requirements.txt
```

1. Run the main script:

```bash
python src/python/init.py
```

1. Choose simulation type:
   - **Single plan**: Enter one plan (e.g., 'A')
   - **Multiple plans**: Enter comma-separated plans (e.g., 'A,B,C')
   - **All plans**: Enter 'all'
1. Specify the number of simulation rounds
1. View comprehensive results and export options

## Key Features

### Core Features


### Multi-Plan Simulation Features ✨


### Memo Feature
User-defined memo support added (2025-08-19). Ensure the `simulations` table has a `memo TEXT` column. A migration script is provided in `src/backend/migrations/20250819_add_memo_column.sql`.

## Simulation Output

### Single Plan Results

- Round-by-round summary of payments, revenue, and profit
- Overall simulation summary with key metrics
- Excel export capability

### Multi-Plan Results

- Individual plan summaries (optional)
- **Comprehensive comparison table**: final net profit for each plan, total payments and revenue, average profit per round, first round achieving positive cumulative profit
- **Best performers identification**: highest final profit plan, best average profit per round, fastest to positive profitability
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

---

## Containerized Full-Stack Development (FastAPI + React)

The runtime application (FastAPI backend + React/Vite PWA frontend) is developed entirely inside Docker using VS Code Dev Containers for consistent cross‑platform setup (Windows / macOS / Linux).

### Services

| Service  | Port | Description                 |
|----------|------|-----------------------------|
| backend  | 8000 | FastAPI (Uvicorn, reload)   |
| frontend | 5173 | Vite dev server (React PWA) |

### Prerequisites

- Docker (Desktop or Engine)
- VS Code + Dev Containers extension
- Git (source of truth remains your cloned repo)

### Open in Dev Container

1. Clone repo: `git clone <repo-url>`
2. Open folder in VS Code.
3. Command Palette: “Dev Containers: Reopen in Container”.
4. Both containers start idle (no servers auto-running).

### Start Backend (Launch Debug)

Use VS Code debug configuration: `Backend: FastAPI (launch)`.

### Start Backend (Attach Mode)

1. In a terminal (inside backend container):

   ```bash
   python debug_run.py
   ```

2. Start VS Code debug config: `Backend: FastAPI (attach)`.

### Start Frontend

Open a terminal (inside dev container root) and run:

```bash
cd src/my-pwa-frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

Then use debug config: `Frontend: Chrome (Vite + Breakpoints)`.

### Full Stack Debug Sequence

1. Start backend (launch or attach variant).
2. Start frontend dev server.
3. Run compound: `Full Stack Debug` (opens Chrome with mapped sources).

### Dependency Updates

Backend (Python): add to `src/backend/requirements.txt` then rebuild:

```bash
docker compose build backend
```

Frontend (Node): modify `package.json` then inside container:

```bash
cd src/my-pwa-frontend
npm install
```

### Virtual Environment Strategy

Python virtual env lives at `/opt/venv` (image layer) so source bind mounts do not overwrite it. Node `node_modules` lives in a named volume (`frontend_node_modules`).

### Troubleshooting

- Breakpoints skipped (backend): confirm interpreter path `/opt/venv/bin/python` in debug config.
- Attach not hitting: ensure port 5678 free and `debug_run.py` started.
- Frontend HMR issues on Windows: check firewall for port 5173.
- Module missing after adding dependency: rebuild or reinstall as above.

### Rebuild Everything

```bash
docker compose build --no-cache
docker compose up -d
```

### Stop Containers

```bash
docker compose down
```

---

## PWA quick start

The frontend is PWA-enabled (offline app shell + safe runtime caching for public notices). To preview and test installation locally:

```powershell
cd src\my-pwa-frontend
npm run build; npm run preview
```

Open the preview URL in Chrome and choose “Install app”. Serve over HTTPS in production to unlock full PWA capabilities.

