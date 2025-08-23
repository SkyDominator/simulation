# Partners Club Financial Simulation PWA

This project provides a financial simulation for the Partner Club system, implementing various investment plans and calculating returns over multiple rounds. **Now supports both single-plan and multi-plan simulations with comprehensive comparative analysis, accessible through a Progressive Web App (PWA).**

## Project Structure

The code has been refactored following SOLID principles and best practices:

- `src/backend/`: FastAPI backend server for the PWA
  - `api/`: API endpoints and routing
  - `auth/`: JWT authentication
  - `config/`: Backend configuration settings
  - `models/`: Data schemas and models
  - `services/`: Business logic and simulation services
- `src/my-pwa-frontend/`: React frontend PWA
  - `src/`: Frontend source code
  - `public/`: Static assets and PWA manifest
- `src/local-sim/`: Local simulation engines
  - `general/`: General simulation module
  - `individual/`: Individual simulation module
- `src/python/`: Original simulation codebase
  - `config/`: Configuration and plan parameters
  - `models/`: Data models for simulation results
  - `services/`: Business logic services
  - `utils/`: Utility functions including reporting
- `deploy_option_a.ps1`: PowerShell deployment script for Cloudflare Tunnel

## Development Setup

### Prerequisites

- Docker and Docker Compose
- Node.js (LTS version)
- Python 3.11+
- Supabase account with project set up

### Running Locally

1. Clone the repository
2. Set up environment variables:

```
# Backend (.env)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-supabase-secret-key
SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
JWT_SECRET=your-jwt-secret

# Frontend (.env.local)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
VITE_API_BASE_URL=http://localhost:8000
```

3. Start the development environment:

```bash
docker-compose up -d
```

4. Access the frontend at `http://localhost:5173`
5. API endpoints are available at `http://localhost:8000`

### Running the CLI Simulation

1. Navigate to the project directory
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Run the main script:

```bash
python src/python/init.py
```

4. Choose simulation type:
   - **Single plan**: Enter one plan (e.g., 'A')
   - **Multiple plans**: Enter comma-separated plans (e.g., 'A,B,C')
   - **All plans**: Enter 'all'
5. Specify the number of simulation rounds
6. View comprehensive results and export options

## Deployment Options

### Option A: Cloudflare Tunnel (Recommended)

This option uses Cloudflare Tunnel to provide a secure HTTPS connection to your app running on a Windows PC, without opening ports in your firewall.

1. Follow the steps in [cloudflare_tunnel_setup.md](./cloudflare_tunnel_setup.md)
2. Run the deployment script:

```powershell
.\deploy_option_a.ps1 -DomainName "partnersclub.yourdomain.com"
```

For detailed steps, see the [Cloudflare Tunnel Setup Guide](./cloudflare_tunnel_setup.md).

### Option B: Traditional Web Hosting

Deploy the frontend to a static hosting service and the backend to a Python application hosting platform.

1. Build the frontend:

```bash
cd src/my-pwa-frontend
npm run build
```

2. Deploy the `/dist` directory to services like Netlify, Vercel, or GitHub Pages
3. Deploy the backend to services like:
   - Heroku
   - DigitalOcean App Platform
   - Railway
   - Render

### Option C: Self-hosting with Reverse Proxy

For advanced users who want to self-host on a VPS or dedicated server:

1. Set up a server with Nginx as a reverse proxy
2. Configure SSL with Let's Encrypt
3. Run the frontend and backend as systemd services

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
| -------- | ---- | --------------------------- |
| backend  | 8000 | FastAPI (Uvicorn, reload)   |
| frontend | 5173 | Vite dev server (React PWA) |

## PWA Features

This application is a full Progressive Web App with:

- Offline functionality for core features
- Install prompts on compatible devices
- Fast loading and smooth animations
- Responsive design for all screen sizes

### Installing the PWA

#### On Android:

1. Open the app in Chrome
2. Tap the menu (three dots)
3. Select "Install App" or "Add to Home Screen"

#### On iOS:

1. Open the app in Safari
2. Tap the Share icon
3. Select "Add to Home Screen"

#### On Desktop:

1. Open the app in Chrome/Edge
2. Click the install icon in the address bar
3. Follow the prompts to install

## CI/CD Pipeline

This project includes a GitHub Actions workflow for CI/CD:

- Automatically builds and tests on push to main branch
- Creates releases with version tags
- Builds production artifacts for deployment

To use CI/CD:

1. Set up GitHub repository secrets:

   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `JWT_SECRET`

2. Push to main branch to trigger the workflow

## Database Structure

The application uses Supabase with the following tables:

- `simulations`: Stores simulation data and results
- `whitelist`: Controls access to the application
- `notices`: System notifications and announcements
- `admins`: Administrative user information

Row-Level Security (RLS) policies protect all tables to ensure data security.

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
