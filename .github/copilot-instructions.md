# Copilot Instructions

This file provides instructions and context for AI coding assistants to help them behave right, and understand the project itself, coding patterns & conventions used in this repository. It is intended to improve the quality of code suggestions and completions.

## Basic behavioral patterns for ALL AI coding assistants (agents)

Adhere to the instructions in [agents.md](/.github/instructions/agents.md) for basic behavioral patterns.

## Project overview

**LOLClub Simulation** is a sophisticated Progressive Web App (PWA) that provides comprehensive financial simulation services for investment plan analysis. The application consists of a FastAPI backend with Python 3.11+ and a React 19+ frontend with TypeScript, integrated with Supabase for database, authentication, and storage.

**Core Features:**
- **Financial Simulation Engine**: 10 distinct investment plans (A, B, C, D, K, P, R, F, E, G) with varying parameters, investor lifecycles, and revenue calculations
- **Multi-step Authentication**: Whitelist verification → OTP SMS verification → Supabase OAuth (Google, Kakao)
- **Admin Content Management**: Notice board system and privacy policy versioning with publishing workflow
- **Progressive Web App**: Offline functionality, service worker caching, responsive mobile-first design
- **Real-time Simulation**: Complex financial calculations with result caching and memo functionality

The app is designed to be responsive and works optimally on both desktop and mobile devices with a mobile-first approach.

## Project environment

Here are the details of the project environment.

### App development environment

OS: Windows 11
IDE: Visual Studio Code
Internet Browser: Google Chrome, Screen Size: 1920x1080
Device: Desktop
Python: 3.11.6 or later
TypeScript: 5.8.3 or later
React: 19.1.0 or later

### App test environment

Here is the test environment:

* Desktop Target: (Windows 11, Google Chrome)
* Mobile Target: (iPhone 11 Pro, iOS 18.1.1, Google Chrome)
* Notes:
    * No CI/CD pipelines are set up yet.
    * Testing framework: Pytest for backend, Vitest and Playwright for frontend.
    * Frontend is tested via Vite dev on a Windows local machine (some other notebook for development machine, 5173 port).
    * Backend is tested with debugpy on a Windows local machine (some other notebook for development machine, 8001 port).

### App live environment

Here is the live environment:

* Desktop Target: (Windows 11+, Google Chrome)
* Mobile Target: 
    * iPhone 11+, iOS 18.1.1+, Google Chrome
    * Samsung Galaxy S21+, Android 12+, Google Chrome
* Notes:
    * Hosted on Supabase (PostgreSQL, Storage, Auth)
    * Frontend is served via Vite preview on a Windows local machine (MSI Notebook, 24 hours running, 4173 port).
    * Backend is served on a Windows local machine (MSI Notebook, 24 hours running, 8000 port).
    * No CI/CD pipelines are set up yet.

## Project details

These notes help AI coding agents work effectively in this repo. Keep edits small, follow the patterns below, and verify with quick runs.

### Architecture at a glance

**Backend (FastAPI + Python 3.11+)**:
- **Application Factory**: `main.py` creates FastAPI app with CORS middleware and exception handlers
- **Router Layer**: `api/routes.py` (507+ lines) - centralized route definitions with thin delegation to services
- **Service Layer**: Domain logic in `services/` - `simulations.py` (simulation CRUD), `otp/otp_service.py` (SMS verification)
- **Core Engine**: `simulation_service.py` - sophisticated financial simulation with 10 investment plans
- **Data Models**: Pydantic schemas in `models/schemas.py` for request/response validation
- **Configuration**: Environment-based settings in `config/settings.py` with frozen dataclass pattern
- **Authentication**: JWT validation via Supabase JWKS in `auth/jwt.py`
- **Database**: Supabase PostgreSQL with Row Level Security (RLS) policies
- **Exception Handling**: Structured error hierarchy in `exceptions.py` with centralized handlers

**Authentication & Authorization**:
- Bearer JWT validated against Supabase JWKS (`auth/jwt.py`)
- Injection pattern: `user_id: str = Depends(authenticate_jwt_token)`
- Admin privileges check: `_assert_admin(user_id, client)` verifies `admins.user_id`

**OTP System**:
- Service: `services/otp/otp_service.py` writes to `phone_otps` table
- Rate limiting: Configurable via settings (3 per 15min, 10 per day by default)
- SMS delivery: Solapi API integration with Korean language support
- Flow: `/api/otp/send` checks `whitelist` → returns `user_hash` → `/api/otp/verify` validates and tracks attempts

**Financial Simulations**:
- Orchestration: `services/simulations.py` handles DB I/O and delegates to `FinancialSimulationService`
- Plans: 10 investment plans in `constants.py` with distinct parameters (max investors: 12-18, varying payment structures)
- Calculation: Revenue algorithm includes base calculation, commission rates (32%), round bonuses, tax (3.3%)
- Lifecycle: New investors → growth phase → graduation → re-entry investor replacement
- Caching: Simulation result invalidation on plan updates (sets `simulation_results` to `None`)

**Admin Content Management**:
- Notices: CRUD operations in `notices` table with admin-only endpoints
- Privacy Policies: Versioned in `privacy_policies` table with publishing workflow (unpublishes others on publish)

**Frontend (React 19 + TypeScript 5.8+ + Vite)**:
- **PWA Configuration**: `vite.config.ts` with `vite-plugin-pwa`, service worker, offline caching
- **UI Framework**: Material-UI (MUI) + Tailwind CSS for responsive design
- **Application Controller**: `AppController.tsx` manages page navigation and state persistence
- **Authentication**: Supabase client integration (`supabaseClient.ts`) with JWT session management
- **State Management**: React Context + hooks pattern, minimal localStorage usage
- **API Integration**: Services layer for backend communication with proper error handling
- **Caching Strategy**: NetworkFirst for notices, StaleWhileRevalidate for static assets
- **Responsive Design**: Mobile-first approach with landscape orientation preference

**Database Schema (Supabase PostgreSQL)**:
```
- simulations: User simulation data with JSON results and metadata
- whitelist: Pre-approved users (hash-based verification) 
- phone_otps: OTP verification records with rate limiting
- consent_records: Privacy policy consent tracking (IP, user agent, timestamps)
- notices: Admin-managed announcements with CRUD
- privacy_policies: Versioned policy documents with publishing status
- admins: Administrative user roles (user_id references)
- user_onboarding: Onboarding flags tied to Supabase user_id
```

### Local dev & runtime

**Current Deployment Architecture**:
- **Frontend**: Served via Vite preview on Windows laptop server (default port 4173)
- **Backend**: Runs locally on Windows via helper scripts in `windows-scripts/` or directly with `uvicorn` (default port 8000)
- **Public Access**: Frontend accessible via Cloudflare Tunnel at `https://simulation.lightoflifeclub.com`
- **Database**: Hosted on Supabase cloud (PostgreSQL, Auth, Storage)

**Development Environment**:
- **Docker Compose**: Available for full-stack development but NOT actively used for deployment
- **Environment Variables**: 
  - Backend: `.env` in repository root (configuration keys below)
  - Frontend: `.env.local` read by Vite at build/preview time
- **Windows Automation**: PowerShell scripts in `windows-scripts/` for service management with optional NSSM services

**Quick Start Commands (PowerShell)**:
```powershell
# Frontend preview (production-like)
cd src/frontend
npm run preview  # Default: http://localhost:4173

# Backend development server  
cd src/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Backend tests
cd src/backend
python -m pytest -q

# Frontend development
cd src/frontend  
npm run dev      # Default: http://localhost:5173
npm run test     # Vitest unit tests
```

**Docker Development (Optional)**:
- Containers available but not used for production deployment
- Services clone repo at startup via `/entrypoints/common-init.sh`
- Requires `REPO_URL` env variable and optional GitHub PAT in `.secrets/github_pat.txt`

### Configuration keys (backend)

**Required Environment Variables**:
- `SUPABASE_URL`: Supabase project URL (e.g., `https://xyz.supabase.co`)
- `SUPABASE_SECRET_KEY`: Server-side key (preferred) OR `SUPABASE_PUBLISHABLE_KEY` (fallback)

**OTP & SMS Configuration**:
- `OTP_SECRET_KEY`: Encryption key for OTP tokens (default: development key - replace in production)
- `OTP_VALIDITY_MINUTES`: OTP expiration time (default: 5 minutes)
- `OTP_RESEND_LIMIT_PER_15MIN`: Rate limit for OTP requests (default: 3)
- `OTP_RESEND_LIMIT_PER_DAY`: Daily OTP request limit (default: 10)  
- `otp_max_verification_attempts`: Maximum verification attempts (default: 6, lowercase in settings)

**SMS Provider Keys**:
- **Solapi** (Primary): `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER_NUMBER`
- **NHN Cloud** (Legacy): `NHN_CLOUD_APPKEY`, `NHN_CLOUD_SECRET_KEY`, `NHN_CLOUD_SENDER_NUMBER`

**CORS Configuration**:
- `settings.cors_origins`: Auto-configured for local development and production domains
- Default origins include:
  ```
  https://simulation.lightoflifeclub.com  # Production (Cloudflare Tunnel)
  http://localhost:5173, http://127.0.0.1:5173  # Vite dev server
  http://localhost:4173, http://127.0.0.1:4173  # Vite preview
  Local network IPs for development
  ```

**Frontend Environment Variables**:
- `VITE_SUPABASE_URL`: Supabase project URL (same as backend)
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Client-side Supabase key
- `VITE_API_BASE_URL`: Backend API base URL (defaults to production in `vite.config.ts`)

### Backend patterns to follow

**Router → Service → Model Architecture**:
- **Routes**: Add endpoints in `api/routes.py`, keep thin and delegate to services
- **Services**: Business logic in `services/` directory (domain-specific modules)
- **Models**: Request/response schemas in `models/schemas.py` using Pydantic v2
- **Error Handling**: Use custom exceptions from `exceptions.py` and raise `HTTPException` with appropriate status codes

**Supabase Client Pattern**:
```python
from supabase import create_client
from config.settings import settings

def _supabase_client():
    """Create Supabase client preferring Secret key, fallback to Publishable."""
    key = settings.supabase_secret_key or settings.supabase_publishable_key
    return create_client(settings.supabase_url, key)
```

**Authentication & Authorization**:
- **JWT Validation**: Use dependency injection pattern
  ```python
  from auth.jwt import authenticate_jwt_token
  
  async def my_endpoint(user_id: str = Depends(authenticate_jwt_token)):
      # user_id is validated JWT 'sub' field
      pass
  ```
- **Admin Guard**: Use `_assert_admin(user_id, client)` which checks `admins.user_id` table
- **Error Responses**: 401 for invalid auth, 403 for insufficient privileges

**Simulation Business Rules**:
- **Result Invalidation**: When modifying plan fields, set `simulation_results` to `None`
- **Plan Parameters**: Reference `constants.py` for the 10 investment plans (A-G)
- **Service Integration**: `SimulationService.update()` pattern shows result cache clearing

**Database Access Patterns**:
- **Client Creation**: Use service-level client instances or dependency injection
- **Error Handling**: Wrap Supabase operations in try/catch, use `handle_database_exception`
- **RLS Policies**: All tables protected by Row Level Security - respect user isolation

**API Response Patterns**:
```python
# Standard success responses
return ResponseModel(data=result, status="success")

# Error handling
from exceptions import SimulationNotFoundError
if not simulation:
    raise SimulationNotFoundError(f"Simulation {id} not found")
```

**Configuration & Environment**:
- **Settings Access**: Import from `config.settings import settings` 
- **Frozen Dataclass**: Settings uses immutable pattern with `__post_init__` customization
- **Environment Loading**: Automatic via `os.getenv()` with sensible defaults


### Adding an endpoint (example)

```python
from fastapi import APIRouter, Depends, HTTPException
from auth.jwt import authenticate_jwt_token
from models.schemas import MyReq, MyResp
router = APIRouter()

@router.post('/api/my-feature', response_model=MyResp)
async def my_feature(req: MyReq, user_id: str = Depends(authenticate_jwt_token)):
    ## delegate to a service; raise HTTPException on errors
    return MyResp(...)
```

Place models in `models/schemas.py` and business logic in `services/`.

### Frontend integration notes

**API Communication**:
- **Base URL**: `VITE_API_BASE_URL` defaults to `https://simulation.lightoflifeclub.com/api` in `vite.config.ts`
- **Local Development**: Set to `http://localhost:8000/api` for local backend testing
- **Authentication**: JWTs obtained from Supabase Auth and sent via Authorization header

**Supabase Integration**:
- **Client Setup**: Created in `src/frontend/src/supabaseClient.ts` with session persistence
- **Auto-refresh**: Sessions automatically renewed, JWTs available for backend API calls
- **Configuration**: Reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`

**State Management Architecture**:
- **Application Controller**: `AppController.tsx` orchestrates page navigation and state
- **Context Pattern**: Authentication context with `useAuth()` hook
- **Persistence**: Selective use of localStorage/sessionStorage (minimize for security)
- **API State**: Services layer handles backend communication with proper error boundaries

**Component Structure**:
```
src/
├── pages/           # Route components (WhitelistCheckPage, MainPage, etc.)
├── components/      # Reusable UI components  
├── context/         # React context providers (Auth, etc.)
├── hooks/           # Custom hooks (useAuth, useConsentFlow, etc.)
├── services/        # API communication layer
├── types/           # TypeScript type definitions
└── utils/           # Utility functions and helpers
```

**PWA Features**:
- **Service Worker**: Automated via `vite-plugin-pwa` with runtime caching
- **Offline Strategy**: NetworkFirst for `/api/notices`, StaleWhileRevalidate for assets
- **Manifest**: Configured for "Light of Life Club Simulation" with proper icons
- **Installation**: Custom prompts and native "Add to Home Screen" support

### Gotchas & Important Implementation Details

**Testing & Mocking**:
- **JWKS Network Calls**: Tests should mock `JWKSClient.get_keys()` to avoid real HTTP requests
- **Test Environment**: Backend requires environment variables; use test fixtures and mocks

**OTP & SMS Integration**:
- **Korean Language**: OTP messages include Korean strings - maintain existing contract
- **Rate Limiting**: Enforced at service level with database tracking
- **Verification Attempts**: Default 6 attempts via `otp_max_verification_attempts` (lowercase in `settings.py`)

**Simulation Behavior**:
- **Empty State**: `get_simulations` returns 404 when no simulations exist - UI handles empty vs 404
- **Result Caching**: Simulation results cached in database; cleared automatically on plan updates
- **Financial Calculations**: Complex revenue algorithm in `simulation_service.py` with multiple plan types

**Admin & Privacy Policy Management**:
- **Publishing Constraint**: Creating privacy policy cannot set `published=true`  
- **Publishing Workflow**: Use `/api/admin/privacy-policies/{id}/publish` to publish (auto-unpublishes others)
- **Admin Authentication**: All admin endpoints require `_assert_admin()` check

**Frontend Security & State**:
- **Minimal Local Storage**: Avoid storing sensitive data; prefer backend API calls
- **JWT Handling**: Tokens managed by Supabase client, not manually stored
- **Error Boundaries**: Implement proper error handling for failed API calls

**Database & Schema**:
- **RLS Policies**: All tables protected by Row Level Security - respect user isolation
- **Schema Documentation**: Full schema available in `.memo/CE/specs/schema/schema.md`
- **Migration Pattern**: Schema changes should consider existing data and RLS policies

**Development Environment**:
- **Windows Primary**: Development optimized for Windows with PowerShell scripts
- **Port Configuration**: Frontend dev (5173), frontend preview (4173), backend (8000)
- **Cloudflare Tunnel**: Production frontend served via tunnel at `simulation.lightoflifeclub.com`

**API Contract Alignment**:
- **Source of Truth**: `api/routes.py` is authoritative over specification documents  
- **Endpoint Coverage**: Some SSD-described endpoints may not be implemented yet
- **Backwards Compatibility**: Maintain existing API contracts for stability

### Where to look first

**Core Backend Files**:
- **API Endpoints**: `src/backend/api/routes.py` (507+ lines) - all REST endpoints
- **Business Logic**: `src/backend/services/simulations.py` - simulation CRUD operations  
- **Financial Engine**: `src/backend/simulation_service.py` - core calculation logic
- **Plan Configuration**: `src/backend/constants.py` - 10 investment plan parameters
- **Authentication**: `src/backend/auth/jwt.py` - JWT validation and Supabase JWKS
- **Data Models**: `src/backend/models/schemas.py` - Pydantic request/response models
- **Configuration**: `src/backend/config/settings.py` - environment and app settings
- **Error Handling**: `src/backend/exceptions.py` - structured exception hierarchy

**Core Frontend Files**:
- **App Controller**: `src/frontend/src/AppController.tsx` - main application orchestrator
- **Vite Config**: `src/frontend/vite.config.ts` - PWA, build, and development configuration
- **Supabase Setup**: `src/frontend/src/supabaseClient.ts` - authentication and API client
- **Main Pages**: `src/frontend/src/pages/` - WhitelistCheckPage, MainPage, PlanEditor, etc.
- **Context**: `src/frontend/src/context/` - React context providers for state management
- **API Services**: `src/frontend/src/services/` - backend API communication layer

**Documentation & Schema**:
- **Database Schema**: `.memo/CE/specs/schema/schema.md` - complete table definitions and RLS policies
- **API Specification**: `.memo/CE/specs/SSD.md` - software specification document
- **Test Plans**: `.memo/CE/plans/test-code-v1/` - comprehensive testing strategy and implementation

If anything above seems off or you need deeper conventions (e.g., testing/mocking patterns), ask in PR or ping to refine these notes.
## Back-end Coding Guidelines

Follow the general guidelines below when writing Python codes.

### General Guidelines

1. Single Responsibility & SOLID Principles
    - Apply the **Single Responsibility Principle (SRP)** in all codes.
    - Adopt broader **SOLID** principles for modular and maintainable code:
        - **OCP**: Open for extension, closed for modification.
        - **LSP**: Subtypes should work in place of base types.
        - **ISP**: Interfaces should be lean and focused.
        - **DIP**: Depend on abstractions, not concrete implementations. Use dependency injection wherever applicable.
2. Modular Design
    - Break code into **small, focused functions and classes**—each should do one thing well
    - Organize files and folders by **features or domains**, not types—this keeps the codebase intuitive and scalable.
    - Enhance Maintainability
        - Use design patterns where appropriate to solve common problems.
        - Ensure that modules have clear interfaces and are loosely coupled.
    - Improve Reusability
        - Identify and extract common functionality into reusable components or functions.
        - Encourage the use of shared libraries or modules to avoid code duplication.
    - Increase Flexibility and Scalability
        - Design systems that can easily adapt to changing requirements.
        - Use configuration files or environment variables to manage settings and parameters.
    - Promote Testability
        - Write code that is easy to test in isolation.
3. Documentation
    - Add docstrings to functions and classes, and inline comments where necessary to explain complex logic.
4. Error Handling
    - Implement detailed, structured, and categorized exceptions for appropriate error handling, ease of debugging, and ease of test code implementation.
    - Implement custom error classes where appropriate to represent specific error conditions.
    - Implement logging for errors to aid in debugging and monitoring.
    - Use try-except blocks to handle exceptions gracefully and provide meaningful error messages.
5. API Status handling
    - Implement appropriate status codes for API responses to indicate success or failure.
        - 200: Successful GET operations
        - 201: Successful POST/PUT operations
        - 400: Business logic validation errors
        - 401: Missing or invalid authentication
        - 403: Insufficient permissions (admin required)
        - 404: Resource not found
        - 422: Request validation errors
        - 500: Server errors
5. Performance
    - Optimize code for performance where applicable, but prioritize readability and maintainability.
6. Dependencies
    - If new libraries are introduced, ensure they are documented and included in the requirements file. Use context7.
7. Security
    - Be mindful of security best practices, especially when handling user input or sensitive data.
8. Refactoring
    - If you encounter code that can be improved, refactor it while ensuring existing functionality remains intact.
9. Functionality
    - Ensure that the code meets the specified requirements and behaves as expected.
10. Monitoring and Logging
    - Implement logging where appropriate to aid in debugging and monitoring application behavior.
    - Use structured logging to capture relevant context and metadata.
11. Others
    - Follows Python best practices for ambiguious cases.
    - Use meaningful variable and function names.
    - Try to make each function "pure", meaning it should not have side effects and should return the same output for the same input.
    - Avoid deep nesting of code blocks.  
    - Use type hints to improve code readability and help with static analysis.
    - Use context7 MCP.
    - Use dataclasses or pydantic to simplify class definitions and improve readability.
    - Use f-strings for string formatting for better readability and performance.
    - Use list comprehensions and generator expressions for concise and efficient iteration.

## Front-end Coding Guidelines

Follow the guidelines below when writing React, TypeScript, and JavaScript code for this PWA application.

### Core Principles of React Coding

**1. Embrace Functional Components and Hooks**:
- Prefer **functional components** over class components for cleaner, more modern code. Hooks like `useState`, `useEffect`, and custom hooks keep logic modular and reusable.
- Follow React's foundational **Rules of Hooks**:
  - Always call hooks at the top level (no loops or conditionals).
  - Only call hooks from React function components or custom hooks.

**2. Single Responsibility & SOLID Principles**:
- Apply the **Single Responsibility Principle (SRP)**: each component (or hook) should focus on one clear task—rendering UI, fetching data, etc.
- Adopt broader **SOLID** principles for modular and maintainable code:
  - **OCP**: Open for extension, closed for modification  
  - **LSP**: Subtypes should work in place of base types  
  - **ISP**: Interfaces should be lean and focused  
  - **DIP**: Depend on abstractions, not concrete implementations

**3. Thoughtful Component Design & Structure**:
- Break UI into **small, focused components**—think "smart" vs. "dumb" components or container vs. presentational.
- Organize file/folder structure by **features or domains**, not types—this keeps the codebase intuitive and scalable.
- Leverage **composition**: React's strength lies in building complex UIs by nesting simpler components without introducing ripple effects.

**4. Maintain Clean Code & Conventions**:
- Adopt consistent **naming**—use PascalCase for components and camelCase for variables and functions.
- Enforce code style with tools like **Prettier** and **ESLint** to improve readability and reduce friction.
- Keep code simple and avoid duplications (DRY principle). Overly complex logic invites bugs and frustration.

**5. Optimize Performance Mindfully**:
- Use **unique keys** when rendering lists to help React track elements efficiently.
- Apply **memoization** (`React.memo`, `useMemo`, `useCallback`) to avoid unnecessary re-renders—only when needed.
- Implement **lazy loading** of components with `React.lazy` and `Suspense` to speed up initial load.

**6. Type Safety & Props Integrity**:
- Use **TypeScript** to enforce prop types and catch errors early.
- Treat props as **immutable**, and avoid modifying them inside components to maintain predictable behavior.

**7. State Management Best Practices**:
- Simplify the state management as much as possible. Minimize the use of local storage.
- Use backend API calls to manage state and persist data.
- For existing data in backend, use backend API calls to get the data. Do not re-create the same data in the frontend.

### Core Architecture Patterns

**Application Structure**:
- **App Controller Pattern**: `AppController.tsx` orchestrates page navigation, state persistence, and UI flow
- **Context-Based State**: Authentication and global state managed via React Context (`AuthContext.tsx`)
- **Custom Hooks**: Business logic extracted into reusable hooks (`useAuth`, `useMainPageState`, `useSimulationActions`)
- **Service Layer**: Backend communication centralized in `services/api.ts` with proper error handling

**Component Organization**:
```
src/
├── pages/           # Route-level components (MainPage, WhitelistCheckPage, etc.)
├── components/      # Reusable UI components with domain-specific folders
├── context/         # React context providers and hooks
├── hooks/           # Custom business logic hooks  
├── services/        # API communication layer
├── types/           # TypeScript type definitions
└── utils/           # Pure utility functions
```

**State Management Philosophy**:
- **Minimize Client State**: Prefer backend API calls over local state management
- **Selective Persistence**: Use localStorage/sessionStorage sparingly and only for UI state
- **Context for Global State**: Authentication and cross-component state via Context API
- **Derived State**: Calculate derived values in components rather than storing them

### Implementation Patterns for This Codebase

**Functional Components & Modern Hooks**:
```tsx
// Prefer functional components with hooks
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import type { Plan } from '../types/types';

export const MyComponent: React.FC<{ plan: Plan }> = ({ plan }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Component logic here
  return <div>{/* JSX */}</div>;
};
```

**TypeScript Integration**:
- **Strict Type Safety**: All props, state, and API responses properly typed
- **Import Types**: Use `import type` for type-only imports to optimize bundle size
- **Interface Definition**: Types centralized in `src/types/types.ts`
- **Generic Components**: Leverage TypeScript generics for reusable components

**Material-UI + Tailwind Integration**:
```tsx
import { Container, Paper, Typography, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

// Combine MUI components with Tailwind classes
<Container maxWidth="lg" className="p-4">
  <Paper className="p-6">
    <Typography variant="h4">Title</Typography>
  </Paper>
</Container>
```

### Established Patterns to Follow

**Authentication Integration**:
```tsx
// Use the established auth hook
import { useAuth } from '../context/useAuth';

const MyComponent = () => {
  const { user, session, signOut } = useAuth();
  
  if (!user) {
    return <div>Please log in</div>;
  }
  // Component with authenticated user
};
```

**API Communication**:
```tsx
// Use the centralized API service
import { api } from '../services/api';

const handleApiCall = async () => {
  try {
    setLoading(true);
    const result = await api.createSimulation(data, token);
    // Handle success
  } catch (error) {
    // Handle error with user feedback
    console.error('API Error:', error);
  } finally {
    setLoading(false);
  }
};
```

**Custom Hooks Pattern**:
```tsx
// Business logic extracted into custom hooks
export const useSimulationActions = () => {
  const { session } = useAuth();
  
  const deleteSimulation = useCallback(async (id: string) => {
    if (!session?.access_token) throw new Error('No session');
    return await api.deleteSimulation(id, session.access_token);
  }, [session?.access_token]);
  
  return { deleteSimulation };
};
```

**Component Composition**:
```tsx
// Break complex components into smaller, focused pieces
import SimulationTable from '../components/MainPage/SimulationTable';
import SummaryReport from '../components/MainPage/SummaryReport';

export const MainPage = () => {
  return (
    <Container>
      <SimulationTable onSelectionChange={handleSelection} />
      <SummaryReport data={summaryData} />
    </Container>
  );
};
```

### PWA & Performance Considerations

**Service Worker Integration**:
- **Automated Setup**: PWA functionality configured via `vite-plugin-pwa`
- **Caching Strategy**: NetworkFirst for API calls, StaleWhileRevalidate for assets
- **Offline Handling**: Graceful degradation when network unavailable

**Bundle Optimization**:
```tsx
// Use dynamic imports for code splitting
const AdminPolicyPage = React.lazy(() => import('./pages/AdminPolicyPage'));

// Wrap with Suspense
<Suspense fallback={<div>Loading...</div>}>
  <AdminPolicyPage />
</Suspense>
```

**State Persistence Pattern**:
```tsx
// Selective localStorage usage (from AppController pattern)
import { getJSON, setJSON } from './utils/persist';

const [page, setPage] = useState<Page>(() => 
  getJSON<Page>('ui.page', 'whitelist')
);

// Update both state and localStorage
const updatePage = (newPage: Page) => {
  setPage(newPage);
  setJSON('ui.page', newPage);
};
```

### Error Handling & User Experience

**Error Boundaries**:
- Implement error boundaries for graceful error recovery
- Don't expose technical details to users
- Provide actionable error messages

**Loading States**:
- Always provide loading indicators for async operations
- Use skeleton loaders for better perceived performance
- Handle empty states explicitly

**Responsive Design**:
- **Mobile-First**: Design for mobile, enhance for desktop
- **Landscape Enforcement**: Use `LandscapeEnforcer.tsx` component where needed
- **MUI Breakpoints**: Leverage Material-UI responsive utilities

### Security Best Practices

**Token Management**:
- JWTs handled exclusively by Supabase client
- Never store tokens in localStorage manually  
- Use session objects from auth context for API calls

**Data Validation**:
- Validate all user inputs before sending to backend
- Sanitize any dynamic content rendering
- Use TypeScript for compile-time type safety

**API Security**:
- Always include proper Authorization headers
- Handle 401/403 responses appropriately
- Implement proper CORS handling in development

### Security principles { #security-principles }

1. Prevent Cross-Site Scripting (XSS)
- Never trust user input — React escapes JSX, but dangerous sinks exist.
- Avoid `dangerouslySetInnerHTML`. If necessary → sanitize with **DOMPurify**.
- Validate & escape all external input (APIs, query params, localStorage, etc.).

2. Safe State & Props Management
- HttpOnly cookies for sensitive tokens (HttpOnly cookies + backend handling).
    - auth proxy with Supabase edge functions or backend API.
    - If using Supabase client directly, use RLS policies to restrict data access.
    - Currently, the frontend uses Supabase client directly. Implement auth proxy or RLS policies when possible.
- Don't store sensitive data (tokens, passwords) in React state, props, or localStorage. Minimize the use of the local host storage.
- Assume `.env` variables in the frontend are exposed — don't put secrets there.

3. Secure API Interaction
- Always use **HTTPS**.
- Protect against **CSRF** (tokens or SameSite cookies).
- Validate backend responses before rendering.

4. Authentication & Authorization
- Enforce auth **server-side** — frontend checks are cosmetic only.
- Use short-lived JWTs + refresh tokens (rotate securely).
- Keep only minimal session state on the client.

5. Avoid Leaking Sensitive Data
- Don't log sensitive info in console or error boundaries.
- Minimize data exposure in API responses (watch Redux/React Query caches).

6. Dependency & Build Security
- Keep dependencies updated (`npm audit`).
- Use **SRI** for CDN-loaded scripts.
- Lock dependency versions with `package-lock.json` / `yarn.lock`.

7. Content Security Policy (CSP)
- Set strict CSP headers:
  - Block inline scripts (`'unsafe-inline'`).
  - Whitelist trusted sources for scripts/styles/images.

8. Avoid Insecure Patterns
- Don't embed secrets (API keys, DB creds) in frontend code — use backend proxy.
- Avoid `eval`, `Function()`, or dynamic script execution.
- Don't attach inline event handlers in HTML.

9. Clickjacking Protection
- Configure server headers:
  - `X-Frame-Options: DENY`
  - `Content-Security-Policy: frame-ancestors 'none';`

10. Error Handling & Monitoring
- Use React **Error Boundaries**, but don't expose stack traces to users.
- Monitor with tools like Sentry or Datadog.

## UI/UX Design Guideline

*This is a guide to creating user-friendly Progressive Web Apps with a native look and feel, leveraging modern design principles and React tooling.*

> The best PWA doesn't feel like a website in a wrapper. It feels like an app that was delivered through the web.

### The Look: Visual Principles 🎨

The visual design must be clean, adaptive, and personal.

* **Foundation: Material Design 3 (MD3)**
    * Google's latest design system is the gold standard for PWAs.
    * **Key Features:** Dynamic color theming, updated component styles, and enhanced accessibility.
    * **Implementation:** Use a component library like **MUI for React** which has excellent MD3 support.

* **Layout: Adaptive & Responsive**
    * **Mobile-First:** Design for the smallest screen and scale up.
    * **Modern CSS:** Utilize CSS Grid and Container Queries to create layouts that adapt to their container, not just the viewport. This is crucial for components that need to work anywhere.

### The Feel: Interaction & Experience ✨

How the app responds to input is what separates a great PWA from a website.

* **Navigation: Platform-Aware**
    * **Mobile:** Use a persistent **Bottom Tab Bar** for primary navigation.
    * **Desktop/Tablet:** Transition to a **Side Navigation Rail** or a traditional header to make use of screen real estate.

* **Performance: Instant & Smooth**
    * **Animations:** Use performant CSS properties like `transform` and `opacity` for smooth, GPU-accelerated animations.
    * **Offline UX:** Design clear UI states for offline mode. Use banners or toasts to inform the user of their connection status and enable optimistic UI updates.

* **Installation: Seamless**
    * Design a non-intrusive, custom "Add to Home Screen" prompt within your UI to encourage installation after the user has engaged with the app.

### Recommended React Implementation

```jsx
// A basic shell component structure for a PWA
import { Box } from '@mui/material';
import MobileNavigation from './MobileNavigation';
import DesktopNavigation from './DesktopNavigation';
import useIsMobile from '../hooks/useIsMobile';

function AppShell({ children }) {
  const isMobile = useIsMobile();

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {isMobile ? <MobileNavigation /> : <DesktopNavigation />}
      
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {/* Main content goes here */}
        {children}
      </Box>
    </Box>
  );
}
```

### Key Libraries

* UI Components: @mui/material
* Data & State Management: @tanstack/react-query (for handling loading/error states and offline caching)
* PWA Service Worker: workbox-precaching