---
mode: agent
tools: ['runCommands', 'runTasks', 'edit', 'runNotebooks', 'search', 'new', 'extensions', 'runTests', 'usages', 'vscodeAPI', 'problems', 'changes', 'testFailure', 'openSimpleBrowser', 'fetch', 'githubRepo', 'context7', 'playwright', 'GitKraken (bundled with GitLens)', 'pylance mcp server', 'copilotCodingAgent', 'activePullRequest', 'openPullRequest', 'getPythonEnvironmentInfo', 'getPythonExecutableCommand', 'installPythonPackage', 'configurePythonEnvironment']
model: Claude Sonnet 4.5 (Preview) (copilot)
---

# Conductor for Research and Planning

You are a conductor who orchestrates the research and planning process to solve issues in the codebase.

## Issue Description

```ts
  1) [Mobile Chrome] › e2e\specs\auth-session.spec.ts:49:3 › Authentication & Session Management › E2E-AUTH-001: Login button triggers Supabase OAuth (Google)

    Error: expect(received).toBe(expected) // Object.is equality

    Expected: true
    Received: false

      92 |
      93 |     // Check that OAuth redirect was triggered
    > 94 |     expect(oauthTriggered).toBe(true);
         |                            ^
      95 |   });
```

## Mappings

$INIT_RESEARCHER$: `.github/prompts/research/PR-74/research-00.prompt.md`
$INIT_RESEARCH_RESULT$: `docs/research/PR-74/research-00.md`
$INIT_PLANNER$: `.github/prompts/planners/PR-74/plan-00.prompt.md`
$INIT_PLAN$: `docs/plans/PR-74/plan-00.md`

The following file should be provided by users in advance:

- $INIT_RESEARCHER$
- $INIT_PLANNER$

Ask users to provide it if not provided.

## Tasks

Do the following tasks:

1. Generate $INIT_RESEARCH_RESULT$ by following instructions in $INIT_RESEARCHER$.
    - if users didn't provide `(USER-MUST)` section, you MUST ask them to provide it. Stop and wait for their answer.
    - if users didn't provide `(USER)` sections, you can skip them and proceed. 

2. Generate $INIT_PLAN$ by following instructions in $INIT_PLANNER$

3. Stop and wait for user order.

Do not:

1. Create any files other than the above 2 files.
2. Proceed to implementation.