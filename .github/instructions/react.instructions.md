---
applyTo: '**/*.tsx, **/*.ts, **/*.js, **/*.jsx'
---

Follow the general guidelines below when writing React, TypeScript, and JavaScript code.

## Core Principles of React Coding (TypeScript + Vite + React)

### 1. Embrace Functional Components and Hooks
- Prefer **functional components** over class components for cleaner, more modern code. Hooks like `useState`, `useEffect`, and custom hooks keep logic modular and reusable.
- Follow React’s foundational **Rules of Hooks**:
  - Always call hooks at the top level (no loops or conditionals).
  - Only call hooks from React function components or custom hooks.

### 2. Single Responsibility & SOLID Principles
- Apply the **Single Responsibility Principle (SRP)**: each component (or hook) should focus on one clear task—rendering UI, fetching data, etc.
- Adopt broader **SOLID** principles for modular and maintainable code:
  - **OCP**: Open for extension, closed for modification  
  - **LSP**: Subtypes should work in place of base types  
  - **ISP**: Interfaces should be lean and focused  
  - **DIP**: Depend on abstractions, not concrete implementations

### 3. Thoughtful Component Design & Structure
- Break UI into **small, focused components**—think “smart” vs. “dumb” components or container vs. presentational.
- Organize file/folder structure by **features or domains**, not types—this keeps the codebase intuitive and scalable.
- Leverage **composition**: React’s strength lies in building complex UIs by nesting simpler components without introducing ripple effects.

### 4. Maintain Clean Code & Conventions
- Adopt consistent **naming**—use PascalCase for components and camelCase for variables and functions.
- Enforce code style with tools like **Prettier** and **ESLint** to improve readability and reduce friction.
- Keep code simple and avoid duplications (DRY principle). Overly complex logic invites bugs and frustration.

### 5. Optimize Performance Mindfully
- Use **unique keys** when rendering lists to help React track elements efficiently.
- Apply **memoization** (`React.memo`, `useMemo`, `useCallback`) to avoid unnecessary re-renders—only when needed.
- Implement **lazy loading** of components with `React.lazy` and `Suspense` to speed up initial load.

### 6. Type Safety & Props Integrity
- Use **TypeScript (or PropTypes)** to enforce prop types and catch errors early.
- Treat props as **immutable**, and avoid modifying them inside components to maintain predictable behavior.

## PWA UI/UX Design Guide for this React App

*This is a guide to creating user-friendly Progressive Web Apps with a native look and feel, leveraging modern design principles and React tooling.*

> The best PWA doesn't feel like a website in a wrapper. It feels like an app that was delivered through the web.

---

### The Look: Visual Principles 🎨

The visual design must be clean, adaptive, and personal.

* **Foundation: Material Design 3 (MD3)**
    * Google's latest design system is the gold standard for PWAs.
    * **Key Features:** Dynamic color theming, updated component styles, and enhanced accessibility.
    * **Implementation:** Use a component library like **MUI for React** which has excellent MD3 support.

* **Layout: Adaptive & Responsive**
    * **Mobile-First:** Design for the smallest screen and scale up.
    * **Modern CSS:** Utilize CSS Grid and Container Queries to create layouts that adapt to their container, not just the viewport. This is crucial for components that need to work anywhere.

---

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

---

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

### Key Libraries:

* UI Components: @mui/material
* Data & State Management: @tanstack/react-query (for handling loading/error states and offline caching)
* PWA Service Worker: workbox-precaching