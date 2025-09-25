# Copilot Instructions

This file provides context and instructions for AI coding assistants to help them understand the project environment and structure, coding patterns, and conventions used in this repository. It is intended to improve the quality of code suggestions and completions.

## Project overview

This app is a Progressive Web App (PWA) that provides financial simulation services. It consists of a backend built with FastAPI and a frontend built with React and TypeScript. The app uses Supabase for database, authentication, and storage. The app is designed to be responsive and works well on both desktop and mobile devices (but mobile first as described in later sessions).

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

## Project instructions

These notes help AI coding agents work effectively in this repo. Keep edits small, follow the patterns below, and verify with quick runs.

### Architecture at a glance
- Backend: FastAPI (`src/backend`) with a thin router layer (`api/routes.py`) delegating to services (`services/**`). Data access is via Supabase Python client; responses use Pydantic models in `models/schemas.py`.
- Auth: Bearer JWT validated against Supabase JWKS (`auth/jwt.py`); injection pattern: `user_id: str = Depends(authenticate_jwt_token)`.
- OTP: `services/otp/otp_service.py` writes to `phone_otps`, rate limits via settings, and sends SMS via Solapi. `/api/otp/send` first checks `whitelist` and returns `user_hash` when allowed; `/api/otp/verify` increments attempts and returns `remaining_attempts`.
- Simulations: `services/simulations.py` orchestrates DB IO and `FinancialSimulationService` (`simulation_service.py`). Updating a simulation clears `simulation_results`; running recomputes and persists results.
- Admin content: Notices and privacy policies live in `notices` and `privacy_policies` tables. Publishing a policy unpublishes all others.
- Frontend: React + Vite PWA (`src/frontend`). Supabase client reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. PWA caches GET `/api/notices` with NetworkFirst.

### Local dev & runtime
- Current deployment: frontend is served via Vite preview on the laptop server (run `npm run preview` in `src/frontend/`; default port 4173). Backend runs locally (Windows) via the helper scripts in `windows-scripts/` or directly with `uvicorn`.
- Docker Compose exists for full-stack dev, but it is not used for now. It is not the active deployment path. If used later, containers clone this repo at startup via `/entrypoints/common-init.sh` using `REPO_URL` and optional PAT in `.secrets/github_pat.txt`.
- Env: backend `.env` in repo root (keys below). Frontend `.env.local` is read by Vite at build/preview time.
- Windows helpers in `windows-scripts/` manage start/stop and optional NSSM services.

Minimal commands (PowerShell):
- Frontend preview: from `src/frontend`, run `npm run preview` (or via service/scripts); default http://localhost:4173
- Backend tests: `cd src/backend; python -m pytest -q`

### Configuration keys (backend)
- Required: `SUPABASE_URL`, (`SUPABASE_SECRET_KEY` preferred) or `SUPABASE_PUBLISHABLE_KEY`.
- OTP: `OTP_VALIDITY_MINUTES`, `OTP_RESEND_LIMIT_PER_15MIN`, `OTP_RESEND_LIMIT_PER_DAY`, `OTP_SECRET_KEY`.
- SMS: `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER_NUMBER` (NHN keys also supported but legacy).
- CORS: `settings.cors_origins` default to local and prod domains; override if adding hosts.

### Backend patterns to follow
- Router->Service->Model: add endpoints in `api/routes.py`, keep logic in a service, and define request/response models in `models/schemas.py`.
- Supabase client: prefer Secret key; fallback to Publishable.
  ```python
  from supabase import create_client
  from config.settings import settings
  def _supabase_client():
      key = settings.supabase_secret_key or settings.supabase_publishable_key
      return create_client(settings.supabase_url, key)
  ```
- Auth guard for admin: use `_assert_admin(user_id, client)` which checks `admins.user_id`.
- Simulation update invalidation: when modifying plan fields, set `simulation_results` to `None` (see `SimulationService.update`).
- The full schema information on the current implemented models is available in `${WORKSPACE_ROOT}/.memo/CE/specs/schema/schema.md`.


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
- API base: `VITE_API_BASE_URL` defaults to production in `vite.config.ts`. Set it for local dev, e.g., `http://localhost:8000/api` (the live environment for backend).
- Supabase client is created in `src/frontend/src/supabaseClient.ts` and persists sessions; JWTs come from Supabase auth.

### Gotchas
- JWKS fetch is networked; tests should mock `JWKSClient.get_keys()` to avoid real HTTP.
- OTP messages include Korean strings; keep success/remaining_attempts contract unchanged.
- `get_simulations` returns 404 if none; UI should handle empty state vs 404 accordingly.
- Privacy policy creation cannot set `published`; use `/api/admin/privacy-policies/{id}/publish` to toggle and auto-unpublish others.
- SSD alignment: Some SSD-described endpoints (e.g., public privacy-policy GET, consents GET) aren’t present in `api/routes.py` yet; follow `routes.py` as source-of-truth. OTP verify attempts default to 6 via env `otp_max_verification_attempts` (lowercase name) in `settings.py`.

### Where to look first
- API: `src/backend/api/routes.py`
- Core domain: `src/backend/services/simulations.py`, `src/backend/simulation_service.py`, `src/backend/constants.py`
- Auth: `src/backend/auth/jwt.py`
- Models: `src/backend/models/schemas.py`
- Frontend config: `src/frontend/vite.config.ts`, `src/frontend/src/supabaseClient.ts`

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
    - Implement appropriate status codes for API responses to indicate success or failure.
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

Follow the general guidelines below when writing React, TypeScript, and JavaScript code.

### Core Principles of React Coding (TypeScript + Vite + React)

1. Embrace Functional Components and Hooks
- Prefer **functional components** over class components for cleaner, more modern code. Hooks like `useState`, `useEffect`, and custom hooks keep logic modular and reusable.
- Follow React’s foundational **Rules of Hooks**:
  - Always call hooks at the top level (no loops or conditionals).
  - Only call hooks from React function components or custom hooks.

2. Single Responsibility & SOLID Principles
- Apply the **Single Responsibility Principle (SRP)**: each component (or hook) should focus on one clear task—rendering UI, fetching data, etc.
- Adopt broader **SOLID** principles for modular and maintainable code:
  - **OCP**: Open for extension, closed for modification  
  - **LSP**: Subtypes should work in place of base types  
  - **ISP**: Interfaces should be lean and focused  
  - **DIP**: Depend on abstractions, not concrete implementations

3. Thoughtful Component Design & Structure
- Break UI into **small, focused components**—think “smart” vs. “dumb” components or container vs. presentational.
- Organize file/folder structure by **features or domains**, not types—this keeps the codebase intuitive and scalable.
- Leverage **composition**: React’s strength lies in building complex UIs by nesting simpler components without introducing ripple effects.

4. Maintain Clean Code & Conventions
- Adopt consistent **naming**—use PascalCase for components and camelCase for variables and functions.
- Enforce code style with tools like **Prettier** and **ESLint** to improve readability and reduce friction.
- Keep code simple and avoid duplications (DRY principle). Overly complex logic invites bugs and frustration.

5. Optimize Performance Mindfully
- Use **unique keys** when rendering lists to help React track elements efficiently.
- Apply **memoization** (`React.memo`, `useMemo`, `useCallback`) to avoid unnecessary re-renders—only when needed.
- Implement **lazy loading** of components with `React.lazy` and `Suspense` to speed up initial load.

6. Type Safety & Props Integrity
- Use **TypeScript (or PropTypes)** to enforce prop types and catch errors early.
- Treat props as **immutable**, and avoid modifying them inside components to maintain predictable behavior.

7. State Management
- Simplify the state management as much as possible. Minimize the use of the local host storage. Use backend API calls to manage state and persist data.
- For the existing data in backend, use backend API calls to get the data. Do not re-create the same data in the frontend side.

8. Security
- Strictly follow the [security principles](#security-principles) described below.

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
- Don’t store sensitive data (tokens, passwords) in React state, props, or localStorage. Minimize the use of the local host storage.
- Assume `.env` variables in the frontend are exposed — don’t put secrets there.

3. Secure API Interaction
- Always use **HTTPS**.
- Protect against **CSRF** (tokens or SameSite cookies).
- Validate backend responses before rendering.

4. Authentication & Authorization
- Enforce auth **server-side** — frontend checks are cosmetic only.
- Use short-lived JWTs + refresh tokens (rotate securely).
- Keep only minimal session state on the client.

5. Avoid Leaking Sensitive Data
- Don’t log sensitive info in console or error boundaries.
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
- Don’t embed secrets (API keys, DB creds) in frontend code — use backend proxy.
- Avoid `eval`, `Function()`, or dynamic script execution.
- Don’t attach inline event handlers in HTML.

9. Clickjacking Protection
- Configure server headers:
  - `X-Frame-Options: DENY`
  - `Content-Security-Policy: frame-ancestors 'none';`

10. Error Handling & Monitoring
- Use React **Error Boundaries**, but don’t expose stack traces to users.
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