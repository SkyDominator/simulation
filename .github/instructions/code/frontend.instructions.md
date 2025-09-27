---
applyTo: "/src/frontend/**/*.tsx,/src/frontend/**/*.ts,/src/frontend/**/*.js,/src/frontend/**/*.jsx"
---

# Front-end Coding Guidelines

PWA React/TypeScript application guidelines.

## React Principles

**DO:**
- Use functional components with hooks (`useState`, `useEffect`, custom hooks)
- Call hooks at top level only (no loops/conditionals)
- Apply SOLID principles (SRP, OCP, LSP, ISP, DIP)
- Break UI into small, focused components (container vs presentational)
- Organize by features/domains: `pages/`, `components/`, `hooks/`, `services/`
- Use composition over inheritance
- Use PascalCase for components, camelCase for variables/functions
- Use unique keys in lists
- Apply memoization only when needed (`React.memo`, `useMemo`, `useCallback`)
- Use `React.lazy` + `Suspense` for code splitting
- Use TypeScript for all props/state/API responses
- Use `import type` for type-only imports
- Treat props as immutable

**DON'T:**
- Use class components
- Call hooks conditionally
- Create monolithic components
- Organize by file types
- Modify props inside components
- Over-optimize with unnecessary memoization

## Architecture Patterns

**Structure:**
```
src/
├── pages/           # Route-level components
├── components/      # Reusable UI with domain folders
├── context/         # React Context providers
├── hooks/           # Custom business logic hooks  
├── services/        # API communication layer
├── types/           # TypeScript definitions
└── utils/           # Pure utility functions
```

**State Management:**
- Use backend API calls over local state
- Use localStorage/sessionStorage only for UI state
- Use Context API for auth/global state
- Calculate derived values in components (don't store)

## Implementation Patterns

**Functional Components:**
```tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import type { Plan } from '../types/types';

export const MyComponent: React.FC<{ plan: Plan }> = ({ plan }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  return <div>{/* JSX */}</div>;
};
```

**TypeScript:**
- Strict type safety for all props/state/API
- Types centralized in `src/types/types.ts`
- Use generics for reusable components

**Material-UI + Tailwind:**
```tsx
import { Container, Paper, Typography } from '@mui/material';

<Container maxWidth="lg" className="p-4">
  <Paper className="p-6">
    <Typography variant="h4">Title</Typography>
  </Paper>
</Container>
```

**Authentication:**
```tsx
import { useAuth } from '../context/useAuth';

const MyComponent = () => {
  const { user, session, signOut } = useAuth();
  
  if (!user) return <div>Please log in</div>;
  // Authenticated content
};
```

**API Communication:**
```tsx
import { api } from '../services/api';

const handleApiCall = async () => {
  try {
    setLoading(true);
    const result = await api.createSimulation(data, token);
  } catch (error) {
    console.error('API Error:', error);
  } finally {
    setLoading(false);
  }
};
```

**Custom Hooks:**
```tsx
export const useSimulationActions = () => {
  const { session } = useAuth();
  
  const deleteSimulation = useCallback(async (id: string) => {
    if (!session?.access_token) throw new Error('No session');
    return await api.deleteSimulation(id, session.access_token);
  }, [session?.access_token]);
  
  return { deleteSimulation };
};
```

**Component Composition:**
```tsx
import SimulationTable from '../components/MainPage/SimulationTable';
import SummaryReport from '../components/MainPage/SummaryReport';

export const MainPage = () => (
  <Container>
    <SimulationTable onSelectionChange={handleSelection} />
    <SummaryReport data={summaryData} />
  </Container>
);
```

## PWA & Performance

**Service Worker:**
- PWA via `vite-plugin-pwa`
- NetworkFirst for APIs, StaleWhileRevalidate for assets
- Graceful offline degradation

**Code Splitting:**
```tsx
const AdminPolicyPage = React.lazy(() => import('./pages/AdminPolicyPage'));

<Suspense fallback={<div>Loading...</div>}>
  <AdminPolicyPage />
</Suspense>
```

**State Persistence:**
```tsx
import { getJSON, setJSON } from './utils/persist';

const [page, setPage] = useState<Page>(() => 
  getJSON<Page>('ui.page', 'whitelist')
);

const updatePage = (newPage: Page) => {
  setPage(newPage);
  setJSON('ui.page', newPage);
};
```

## Error Handling & UX

**DO:**
- Implement error boundaries
- Provide actionable error messages
- Show loading indicators for async operations
- Use skeleton loaders
- Handle empty states explicitly
- Design mobile-first
- Use `LandscapeEnforcer.tsx` where needed
- Use MUI responsive breakpoints

**DON'T:**
- Expose technical error details to users
- Leave async operations without feedback

## Security

**DO:**
- Let Supabase handle JWT management
- Use session objects from auth context
- Validate all user inputs before API calls
- Sanitize dynamic content
- Include Authorization headers in API calls
- Handle 401/403 responses properly
- Use HTTPS always
- Use HttpOnly cookies for sensitive tokens
- Enforce auth server-side
- Use short-lived JWTs + refresh tokens
- Set strict CSP headers
- Use React Error Boundaries
- Monitor with Sentry/Datadog

**DON'T:**
- Store tokens in localStorage manually
- Store sensitive data in React state/props/localStorage
- Put secrets in `.env` (frontend exposes them)
- Use `dangerouslySetInnerHTML` without DOMPurify
- Log sensitive info to console
- Use `eval`, `Function()`, or dynamic script execution
- Embed API keys/secrets in frontend code

**XSS Prevention:**
- React escapes JSX by default
- Validate/escape all external input (APIs, query params, localStorage)
- Sanitize with DOMPurify if using `dangerouslySetInnerHTML`

**API Security:**
- Always HTTPS
- Protect against CSRF (tokens or SameSite cookies)
- Validate backend responses before rendering

**Headers:**
```
X-Frame-Options: DENY
Content-Security-Policy: frame-ancestors 'none';
```

## UI/UX Design

**Visual Principles:**
- Material Design 3 (MD3) with MUI for React
- Mobile-first design
- CSS Grid + Container Queries for adaptive layouts

**Interaction:**
- Mobile: Bottom Tab Bar navigation
- Desktop/Tablet: Side Navigation Rail or header
- Use `transform` and `opacity` for GPU-accelerated animations
- Clear offline UI states with banners/toasts
- Custom "Add to Home Screen" prompt after engagement

**Implementation:**
```jsx
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
        {children}
      </Box>
    </Box>
  );
}
```

**Libraries:**
- UI: @mui/material
- State: React Context + custom hooks
- PWA: workbox-precaching