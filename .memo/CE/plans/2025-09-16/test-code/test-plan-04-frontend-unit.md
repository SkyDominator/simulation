# Test Plan – Frontend Unit & Component Tests

Master overview: `test-code.md`. This file independently specifies frontend unit/component testing.

## 1. Scope
Validate React components, hooks, utilities, and lightweight service modules in isolation using Vitest + React Testing Library (RTL). No real network; API calls mocked. Focus on rendering correctness, state transitions, formatting utilities, and error/423 handling.

## 2. Objectives
- Fast feedback (<5s typical)
- Cover critical UI logic: App shell, orientation enforcement, plan editor stepper, phone formatting utility, privacy policy fetch path
- Ensure 423 consent-locked responses trigger redirect handler logic in API module

## 3. Tasks (Verbatim from Master Plan)
1. Add Vitest + RTL dependencies & `test` script (if absent)
2. Add `vitest.config.ts` & `src/setupTests.ts` (jest-dom setup)
3. Components: `App` shell render; plan editor step progression; orientation enforcer overlay toggle
4. Utilities: phone normalization / formatting logic
5. API service module: privacy policy fetch (success + 423 Locked path handling)

## 4. Detailed Test Design
### 4.1 Setup
- `src/setupTests.ts` imports `@testing-library/jest-dom`
- Global mock for `matchMedia` & orientation locking API
- Provide lightweight mock for Supabase client (only functions referenced in tested modules)

### 4.2 Component Targets
- `App`: renders header text "생명빛 클럽 시뮬레이션" and main container
- Orientation Enforcer: simulate portrait media query → overlay visible; change to landscape → overlay removed
- Plan Editor Stepper: simulate clicking next through steps, assert proper step label highlight & validation gating (use minimal stub data)

### 4.3 Utilities
- Phone formatter: inputs ("01012345678", "010-1234-5678", variants with spaces) all normalize to canonical hyphen form; invalid length returns original or empty per implementation

### 4.4 API Service Module
- Mock fetch returning policy JSON → resolves & caches version
- Mock fetch returning 423 → handler invokes consent redirect callback (spy assertion)

## 5. Coverage Expectations
- Contributes initial ≥25% frontend coverage gate (shared with integration & future tests)
- Lines & branches for core utilities >80%

## 6. Tooling
- Run: `vitest run --coverage` (V8 provider)
- Watch: `vitest`
- ESLint + TypeScript should pass before test run in CI

## 7. Acceptance Criteria
- All tasks 1–5 implemented
- All component tests headless deterministic (no timers leaking)
- Orientation tests pass without real screen APIs (mocked)
- 423 path reliably triggers redirect spy exactly once

## 8. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Flaky orientation media query | Deterministic manual toggling of mock implementation |
| Over-coupling to DOM structure | Query by role / text instead of class names |

## 9. Future Enhancements
- Add accessibility assertions (axe) in CI (non-gating)
- Snapshot tests for stable visual table layouts (optional)

