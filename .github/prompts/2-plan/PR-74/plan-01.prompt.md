---
mode: agent
tools: ['runCommands', 'runTasks', 'edit', 'runNotebooks', 'search', 'new', 'extensions', 'runTests', 'usages', 'vscodeAPI', 'problems', 'changes', 'testFailure', 'openSimpleBrowser', 'fetch', 'githubRepo', 'context7', 'playwright', 'GitKraken (bundled with GitLens)', 'pylance mcp server', 'copilotCodingAgent', 'activePullRequest', 'openPullRequest', 'getPythonEnvironmentInfo', 'getPythonExecutableCommand', 'installPythonPackage', 'configurePythonEnvironment']
model: Claude Sonnet 4.5 (Preview) (copilot)
---

# Planner

You are a planner who creates implementation plans to solve issues based on research artifacts.

The plans should be concrete, actionable, and structured to guide implementation without ambiguity.

## Mappings

$RESEARCH_RESULT$: `docs/research/PR-74/research-01.md`
$PLAN$: `docs/plans/PR-74/plan-01.md`

## The issue statements

Based on research findings in $RESEARCH_RESULT$:

### Problem

`E2E-AUTH-001` test fails because:
1. Mobile viewports (Pixel 5, iPhone 12) use **portrait dimensions** by default
2. `LandscapeEnforcer` component detects portrait orientation and renders blocking overlay
3. Overlay intercepts all pointer events with `zIndex: 2000`, causing click timeouts
4. E2E mode detection may have timing race condition during component initialization

### Root Causes

**Primary:** Playwright's mobile device presets use portrait viewports (height > width), triggering `window.matchMedia("(orientation: portrait)").matches === true`

**Secondary:** Potential race between `page.addInitScript()` setting `window.__E2E_MODE__` and `LandscapeEnforcer` calling `isE2EMode()` during first render

## The goal of planning

Create a concrete implementation plan that:

1. **Fixes the immediate issue** - Mobile E2E tests must pass without portrait overlay blocking interactions
2. **Ensures reliability** - E2E mode detection must be bulletproof against timing races
3. **Maintains production behavior** - Real users on portrait mobile devices must still see the landscape enforcer
4. **Preserves test coverage** - Ability to test LandscapeEnforcer behavior separately
5. **Follows best practices** - Solutions align with Playwright and React patterns

## Implementation Requirements

### Must Have

1. Configure mobile E2E projects to use landscape viewports
2. Improve E2E mode detection reliability (defense-in-depth)
3. Verify all mobile E2E tests pass after changes
4. Document the solution in test plan

### Should Have

1. Add diagnostic logging for debugging E2E mode detection
2. Create dedicated test for LandscapeEnforcer with controlled orientation
3. Update test plan with viewport configuration rationale

### Could Have

1. Alternative E2E mode detection methods (localStorage, meta tags)
2. Component-level data attributes for testability
3. CI/CD guards to prevent regression

## The planning outcome

- Create $PLAN$ file with detailed implementation steps
- Refer to the following examples for the structure, format, style:
    - `/docs/examples/example1-plan.md`
    - `/docs/plans/PR-74/plan-00.md`

## Planning Guidelines

**Structure:**
- Problem recap (brief)
- Objectives (clear, measurable)
- Out of scope (explicit boundaries)
- Implementation steps (numbered, actionable)
- Testing & verification (concrete steps)
- Risks & mitigations (identified upfront)
- Follow-up ideas (future improvements)

**Style:**
- Be concrete: exact file paths, line numbers, code snippets
- Be actionable: each step clear enough for implementation
- Be defensive: anticipate edge cases and failure modes
- Be pragmatic: balance perfect solution vs. time/complexity

**Priorities:**
1. Fix the blocking issue (viewport configuration)
2. Add reliability (E2E mode detection)
3. Verify solution (test execution)
4. Document changes (test plan updates)
