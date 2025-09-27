## Front-end Coding Guidelines

ALWAYS FOLLOW the guidelines below when writing React, TypeScript, and JavaScript code for this PWA application.

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
- Don't store sensitive data (tokens, passwords) in React state, props, or localStorage. Minimize the use of local storage.
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
* State Management: React Context + custom hooks (as implemented in this codebase)  
* PWA Service Worker: workbox-precaching