# Test Plan – Frontend Unit & Component Tests

Master overview: `test-code.md`. This file independently specifies frontend unit/component testing.

## 1. Scope
Validate React components, hooks, utilities, and lightweight service modules in isolation using Vitest + React Testing Library (RTL). No real network; API calls mocked. Focus on rendering correctness, state transitions, formatting utilities, and error/423 handling.

## 2. Objectives
- Fast feedback (<5s typical)
- Cover critical UI logic: App shell, orientation enforcement, plan editor stepper, phone formatting utility, privacy policy fetch path
- Ensure 423 consent-locked responses trigger redirect handler logic in API module

## 3. Tasks (Verbatim from Master Plan with Stable IDs)

| ID | Task |
|----|------|
| F01 | Add Vitest + RTL dependencies & `test` script (if absent) |
| F02 | Add `vitest.config.ts` & `src/setupTests.ts` (jest-dom setup) |
| F03 | Components: `App` shell render; plan editor step progression; orientation enforcer overlay toggle |
| F04 | Utilities: phone normalization / formatting logic |
| F05 | API service module: privacy policy fetch (success + 423 Locked path handling) |
| F06 | OrientationEnforcer: ensure listeners registered once & cleaned; overlay has ARIA role/label |
| F07 | Plan Editor Validation: invalid inputs & switching plan resets dependent fields |
| F08 | Draft Persistence: edit, unmount/remount, verify draft restored (localStorage mock) |
| F09 | Extreme numeric inputs: clamp / reject with validation message |
| F10 | Phone formatter: allowed prefixes (010/011/016/017/018/019); invalid prefix & length edge cases |
| F11 | API service caching: second identical fetch returns cached data |
| F12 | API service error taxonomy: distinct handling for 401/403/423 (redirect only on 423) |
| F13 | Corrupted storage resilience: malformed JSON falls back safely |
| F14 | Consent redirect single-fire debounce (multiple 423 → one redirect) |
| F15 | Supabase auth session refresh: mock auto-refresh callback path |
| F16 | Optional global error boundary: thrown child error → fallback UI, console.error suppressed |
| F17 | Accessibility assertions: interactive elements have discernible names |
| F18 | OfflineResultsPage: populated render (table rows + back button) |
| F19 | OfflineResultsPage: empty state (no `ui.simulationResult`) + accessibility landmarks |
| F20 | AdminPolicyPage: list render (mock policies), loading & error states |
| F21 | AdminPolicyPage: create new draft validation (version required, min content length) |
| F22 | AdminPolicyPage: publish action invokes callback & disables publish button post-success |
| F23 | Permission handling: 403 mock triggers role-gated banner + redirect intent flag (no actual nav) |
| F24 | a11y: table semantics (role="table" + headers association) for OfflineResultsPage & AdminPolicyPage lists (accessibility test failures should block CI) |

## 4. Detailed Test Design

### 4.1 Setup

- `src/setupTests.ts` imports `@testing-library/jest-dom`
- Global mock for `matchMedia` & orientation locking API
- Provide lightweight mock for Supabase client (only functions referenced in tested modules)

### 4.2 Component Targets

- `App`: renders header text "생명빛 클럽 시뮬레이션" and main container
- Orientation Enforcer: simulate portrait media query → overlay visible; change to landscape → overlay removed
- Plan Editor Stepper: simulate clicking next through steps, assert proper step label highlight & validation gating (use minimal stub data)
- OfflineResultsPage:
	- Provide mock `simulationResult` object (minimal history of 18 rounds) via context / prop (align with SSD Section 13.4 results shape)
	- Assert table renders expected row count & back button `aria-label` present
	- Empty state path: absence of result shows placeholder text (placeholder: "수당표에 표시할 시뮬레이션이 없습니다.)
	- Accessibility: role="table", column headers have `scope="col"`
- AdminPolicyPage:
	- Mock API module returning: loading -> success with 2 policies (one published, one draft)
	- Validate published badge visible & draft lacks badge
	- Error path: mock 500, shows retry button & logs error
	- Create form: version required, content min length (10 chars)
	- Publish: clicking publish triggers mock mutation then disables button, updates list marking previous published as unpublished (simulate via updated mock response)
	- 403 path: mock forbidden response → surfaces role warning component ("권한이 없습니다.") without throwing

### 4.3 Utilities

- Phone formatter: inputs ("01012345678", "010-1234-5678", variants with spaces) all normalize to canonical hyphen form; invalid length returns original or empty per implementation

### 4.4 API Service Module

Contracts by status code (tests assert mapping):

| Status Code | Contract |
|------------|----------|
| 200 | Success: parse JSON response and update UI |
| 400 | Client error: display user-friendly message from response.error field |
| 401 | Unauthorized: redirect to login page |
| 403 | Forbidden: show access denied message |
| 423 | Locked: show consent required message (trigger consent redirect callback once) |
| 404 | Not found: display not found page |
| 500 | Server error: show generic error message and log details |

Test Cases:
1. Mock 200 response caches and returns data; second call doesn't refetch.
2. Mock 423 response triggers consent redirect callback exactly once across repeated identical failing calls.
3. Mock 401 response triggers login redirect (different spy) but NOT consent redirect.
4. Mock 403 response surfaces access denied UI state.
5. Mock 404 produces not-found component/state.
6. Mock 500 logs error (spy on console.error) and shows generic message.

## 5. Coverage Expectations

- Contributes initial ≥25% frontend coverage gate (shared with integration & future tests)
- Lines & branches for core utilities >80%
- Add per-component minimum lines hit (non-gating initially): OfflineResultsPage ≥70% lines, AdminPolicyPage ≥60% lines (NEED_VERIFICATION: adopt as future gate?)

## 6. Tooling

- Run: `vitest run --coverage` (V8 provider)
- Watch: `vitest`
- ESLint + TypeScript should pass before test run in CI

## 7. Acceptance Criteria

- All tasks 1–5 implemented
- All component tests headless deterministic (no timers leaking)
- Orientation tests pass without real screen APIs (mocked)
- 423 path reliably triggers redirect spy exactly once
- OfflineResultsPage tests (F18–F19) pass with both populated & empty states
- AdminPolicyPage tests (F20–F23) cover list, create, publish, and 403 scenarios
- Accessibility assertions (F24) either pass or are reported as warnings if gating not yet approved
- Export test (F25) skipped with explicit message if feature not implemented
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

