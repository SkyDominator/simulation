# Test Plan – E2E Smoke (Minimal)

Master document: `test-code.md`. This file is a standalone minimal E2E smoke strategy.

## 1. Scope
Provide a single (or tiny set) of browser-level smoke tests to assert core app shell availability & basic health; defer comprehensive user flow automation.

## 2. Objectives
- Detect catastrophic deployment issues (app not loading, backend health failing) quickly
- Keep runtime extremely low (<1 minute)
- Avoid flaky OTP/OAuth journeys at this stage

## 3. Tasks (Verbatim from Master Plan)
1. Scaffold Playwright config + single health-page smoke (placeholder) — no gating yet

## 4. Test Design
Playwright test navigates to base URL (env `APP_BASE_URL`).

* Verifies header element via `data-testid="app-header"` (stable selector). Example front-end markup: `<h1 data-testid="app-header">Welcome to PartnerClub</h1>`
* Calls backend `/api/health` via fetch in page context; asserts `status` field is `ok` or `degraded`
* Optional: Lighthouse performance snapshot (non-gating, stored as artifact) (future)

Selector Strategy: All future E2E tests must use `data-testid` attributes rather than text or CSS selectors to reduce brittleness.

## 5. Tooling
- Framework: Playwright
- Command: `npx playwright test --project=chromium --reporter=line`
- CI: Separate, non-blocking job (required: success but allowed to retry)

## 6. Acceptance Criteria
- Test passes locally & in CI for a healthy deployment
- Fails if network 404/500 served or header text missing
- Does not attempt login or OTP

## 7. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Flakiness due to network latency | Keep assertions simple & add retry for header selector |
| Scope creep into full flows | Strict pass criteria limited to shell & health |

## 8. Future Enhancements
- Add UI route availability checks (results page, editor skeleton)
- Add consent redirect scenario once stable
- Add authenticated smoke once token bootstrap fixture exists
- Add admin-policy smoke: pre-seeded admin token → verify policy list table (Run after unit coverage)
- Add offline-results deep-link smoke using pre-seeded localStorage state (rely on localStorage seeding?)
- Add minimal a11y axe scan (non-gating) for header + admin-policy list

