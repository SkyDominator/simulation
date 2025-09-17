# Test Plan – Frontend Shallow Integration Tests

Master reference: `test-code.md`. This file independently drives shallow flow tests.

## 1. Scope
Exercise multi-step onboarding/navigation logic within the PWA without launching a real browser automation layer. Use component rendering + mocked API module to simulate OTP → consent → login → main transitions and persistence across localStorage/sessionStorage.

## 2. Objectives
- Validate navigation state machine reliability
- Ensure 423 consent lock redirects user to consent page & resumes prior context post consent
- Assert local/session storage keys persisted & restored

## 3. Tasks (Verbatim from Master Plan)
1. Mock API module to simulate OTP → consent → main page transitions
2. Assert localStorage/sessionStorage keys (onboarding state, consent version)
3. Abstract navigation controller (refactor if needed) and test navigation state machine

## 4. Test Design
### 4.1 API Mock Scenarios
- OTP send success returns synthetic userHash
- OTP verify success marks onboarding stage advanced
- Consent fetch returns policy version `v1`; posting consent stores version; subsequent protected call no 423
- New policy version `v2` triggers 423 → redirect → post consent → resume main

### 4.2 State Machine
- Initial state `whitelist`
- After OTP verified → `consent`
- After consent accepted pre-auth → `login`
- After auth (mocked session) → `main`
- Inject 423 while at `main` → transition to `consent` (preserve intended target) → after consent back to previous

#### 4.2.1 Logical State Mapping Table 

| Page State (types.Page) | Rendered Component (file) | Trigger / Entry Condition | Storage Keys Mutated (localStorage) | Notes |
|-------------------------|---------------------------|---------------------------|--------------------------------------|-------|
| whitelist | `WhitelistCheckPage` (`pages/WhitelistCheckPage.tsx`) | App load (no user, default) OR logout from protected page | `ui.page="whitelist"` | Also sets transient userHash after OTP send (not persisted) |
| consent | `ConsentPage` (`pages/ConsentPage.tsx`) | OTP verified sets userHash → consent required OR 423 injected while on main | `ui.page="consent"` | On accept: sets next page to `login` |
| login | `LoginPage` (`pages/LoginPage.tsx`) | Consent accepted pre-auth OR user navigates back from whitelist to login | `ui.page="login"` | Social OAuth redirect may change location outside SPA flow |
| main | `MainPage` (`pages/MainPage.tsx`) | Auth session established & not editing | `ui.page="main"` | Parent for simulation table & summary components |
| plan-editor | `PlanEditorPage` (`pages/PlanEditor/index.tsx`) | User selects create/edit from MainPage | `ui.page="plan-editor"`, `ui.planEditor.plan`, `ui.planEditor.step` | Persisted plan draft & step restored across reload |
| results | `ResultsPage` (`pages/ResultsPage.tsx`) | Simulation run completes (online) | `ui.page="results"`, `ui.simulationResult` | Back → main clears or preserves result depending on UX decision |
| offline-results | `OfflineResultsPage` (`pages/OfflineResults.tsx`) | Offline simulation display path | `ui.page="offline-results"`, `ui.simulationResult` | Similar shape to `results` |
| admin-policy | `AdminPolicyPage` (`pages/AdminPolicyPage.tsx`) | Admin user navigates to policy management | `ui.page="admin-policy"` | Access gated by auth role (future) |
| consent (re-entry) | `ConsentPage` | New policy version published while user active (server 423) | `ui.page="consent"` | Previous intended page remembered in state (not persisted) |
| restore target | (dynamic; previous component) | After accepting newer policy | `ui.page=<previous>` | Returns user to prior flow |

### 4.3 Storage Assertions

- `localStorage.page` updated on transitions
- `sessionStorage.consentVersion` matches latest after acceptance
- Draft simulation edits (if any stub) preserved across reload (optional stretch)

## 5. Tooling

- Vitest + RTL
- Custom render helper wraps root providers & supplies mock Supabase auth context

## 6. Acceptance Criteria

- All tasks 1–3 satisfied
- 423 injected event results in exactly one redirect
- Stored state survives component unmount/remount simulation

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Tight coupling to implementation details | Interact via public navigation API / context rather than internals |
| Race conditions with async setState | Await next tick / use `findBy*` queries |

## 8. Future Enhancements

- Add offline (network error) recovery path tests
- Extend to plan editor multi-step persistence across reload

