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