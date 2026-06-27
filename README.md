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

## What This Simulation Is

This simulation is a forecasting tool. It helps a user test how money could come in, go out, and build up over time under one set of rules.

## What A Plan Means

In this project, a plan is not a user's personal goal or schedule. A plan is a rule set used by the simulator.

Each plan decides things like:

- how much a person pays when they join
- how many active people can be in the simulation at once
- when bonuses can be added
- how large those bonuses can become

So when a user chooses Plan A, Plan B, or another plan, they are really choosing a different calculation rule set.

## Simple Example

Imagine a user picks one plan and runs the simulation for 5 rounds.

Round 1:

- 1 person joins.
- That person pays the amount set by the chosen plan.
- The system calculates that person's expected earnings for round 1.

Round 2:

- A second person joins.
- Now the first person moves to their next personal step, and the second person starts at step 1.
- The simulation adds both people's payments and both people's earnings for this round.

Round 3:

- A third person joins.
- The earliest person may now qualify for an extra settlement bonus, depending on the rule set.
- The total result for round 3 includes all active people's payments and earnings together.

Later rounds:

- More people join until the plan reaches its maximum active count.
- After that, older people finish their cycle and new people replace them.
- Some later rounds may include larger bonuses.
- Those bonus amounts can also change if the sales achievement rate for that round is higher or lower.

## What The User Sees In The Result

For each round, the user can see:

- how much money was paid in
- how much money was earned
- earnings before and after tax
- whether the overall profit is going up or down over time

In short, the simulation answers a simple question: if this rule set continues round by round, does the outcome become more profitable or less profitable over time?

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
