# Simulation Platform Portfolio Project

This repository showcases a production-style full-stack web application with authentication, role-based access control, simulation workflows, CI/CD automation, and deployment-ready configuration.

The domain-specific business identity and sensitive operational details have been anonymized so the repository can be shared as a portfolio artifact.

## Tech Stack

- Frontend: React, TypeScript, Vite, Material UI, Vitest, Playwright
- Backend: Python, FastAPI, pytest
- Data/Auth: Supabase (RLS)
- CI/CD: GitHub Actions
- Infrastructure: Nginx configuration for reverse proxy setup

## Project Structure

- `src/frontend`: React application
- `src/backend`: FastAPI service and business logic
- `config/nginx`: Nginx runtime configuration used for server deployment
- `docs`: planning, analysis, architecture notes, and workflow trails
- `.memo`: working notes and iterative development artifacts

## Core Capabilities

- Secure onboarding flow (allowlist verification, OTP, consent, OAuth)
- User-specific simulation CRUD and result visualization
- Role-restricted admin features for public notices and policy management
- PWA support for installable/offline-friendly UX
- Automated quality checks in CI

## What The Simulation Does

This simulation helps a user estimate how money moves over time in a selected plan.

- A simulation is calculated one round at a time.
- In each round, a new participant joins until the plan reaches its limit.
- After the limit is reached, older participants finish and new re-entry participants take their place.
- Each participant pays an amount based on the plan and the round when they joined.
- The system then calculates expected earnings for that round.
- Early rounds mainly use a basic commission.
- Later rounds can include extra bonuses.
- Those bonuses can change depending on the sales achievement rate for that round.
- The result shows how much was paid in, how much was earned, tax-adjusted earnings, and cumulative profit over time.

In short, the simulation is a round-by-round forecast tool that shows whether a plan becomes more or less profitable as time goes on.

## Local Setup

### 1) Backend

```bash
cd src/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and fill required values:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `OTP_SECRET_KEY`
- `SOLAPI_API_KEY`
- `SOLAPI_API_SECRET`
- `SOLAPI_SENDER_NUMBER`

Run backend:

```bash
uvicorn main:app --reload --port 8000
```

### 2) Frontend

```bash
cd src/frontend
npm install
cp .env.example .env
```

Edit `.env` and fill required values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_API_BASE_URL` (for local dev: `http://localhost:8000/api`)

Run frontend:

```bash
npm run dev
```

## Testing

Frontend unit/integration:

```bash
cd src/frontend
npm run test
```

Frontend e2e:

```bash
cd src/frontend
npx playwright test
```

Backend tests:

```bash
cd src/backend
pytest
```
