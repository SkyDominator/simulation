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
6. OrientationEnforcer: ensure event listeners registered once and cleaned on unmount; overlay has ARIA role/label when active.
7. Plan Editor Validation: per-step invalid inputs (missing plan type, negative numbers, oversized arrays) surface user-facing errors; switching plan resets dependent fields.
8. Draft Persistence: simulate editing, unmount/remount, verify draft restored (localStorage mock only—no integration network calls).
9. Extreme numeric inputs: large values gracefully clamped / rejected with validation message.
10. Phone formatter: all allowed prefixes (010/011/016/017/018/019), invalid prefix unchanged, short (<10 digits) & long (>11 digits), whitespace & mixed separators.
11. API service caching: second identical privacy policy fetch returns cached data (spy on fetch to ensure single call).
12. API service error taxonomy: distinguish handling for 401, 403, 423 (redirect spy only for 423).
13. Corrupted storage resilience: insert malformed JSON in storage keys before render; component falls back to defaults without crash.
14. Consent redirect single-fire: multiple sequential 423 responses trigger redirect handler only once (debounce behavior test).
15. Supabase auth session refresh: mock auto-refresh callback invocation path (pure function/unit harness around wrapper).
16. Optional global error boundary (if added): simulate thrown error in child → fallback UI rendered & console.error suppressed in test.
17. Accessibility assertions: key interactive elements have discernible names (buttons via accessible role queries).

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
- Mock fetch returning 401/403 ensures distinct error propagation (no redirect)
- Repeated 423 only fires redirect once

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
- Additional enhancement tasks (Section 3.1) implemented or explicitly skipped with rationale
- Storage corruption test proves safe fallback (no uncaught exceptions)
- API caching test shows fetch call count == 1 for duplicate request

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Flaky orientation media query | Deterministic manual toggling of mock implementation |
| Over-coupling to DOM structure | Query by role / text instead of class names |

## 9. Future Enhancements

- Add accessibility assertions (axe) in CI (non-gating)
- Snapshot tests for stable visual table layouts (optional)

