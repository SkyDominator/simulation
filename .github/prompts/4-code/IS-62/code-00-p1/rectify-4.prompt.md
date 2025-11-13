---
mode: agent
tools: ['edit', 'search', 'runCommands', 'runTasks', 'pylance mcp server/pylanceDocuments', 'pylance mcp server/pylanceFileSyntaxErrors', 'pylance mcp server/pylanceImports', 'pylance mcp server/pylanceInstalledTopLevelModules', 'pylance mcp server/pylanceInvokeRefactoring', 'pylance mcp server/pylancePythonEnvironments', 'pylance mcp server/pylanceSettings', 'pylance mcp server/pylanceSyntaxErrors', 'pylance mcp server/pylanceWorkspaceRoots', 'pylance mcp server/pylanceWorkspaceUserFiles', 'context7/*', 'usages', 'think', 'problems', 'changes', 'fetch', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'todos']
model: Claude Sonnet 4.5
---

## Mappings

$INSTRUCTIONS$: `.github/instructions/4-code.instructions.md`

## Status

In the last session we did:

1. I requested `../code-00-p1/code-0.prompt.md`
2. Your responses include: 
    * `src/frontend/e2e/fixtures/base.ts`
3. We verified the result and found the followings:

```markdown
Major – base.ts (~70-110): adminSession spins up its own browser context instead of composing the newly introduced memberSession fixture as Phase 1 explicitly requires (“composes memberSession with admin claims and admin API mocks”). This duplicates the member setup logic, breaks the intended fixture layering, and leaves us without the guaranteed parity between member/admin sessions the plan calls for. Please refactor the fixture to take memberSession (and the shared mocked API factory) as dependencies, layer the admin overrides on top, and return that composed page.

Major – base.ts (~112-155): simulationSeed likewise creates a fresh context rather than composing with memberSession, even though the plan states it should build on memberSession while adding deterministic simulation mocks and drafts. The current approach re-implements the member setup and undermines the reuse contract the plan is trying to enforce. It should accept memberSession, apply the deterministic mocks/draft via the shared helpers, and reuse that page.
```

# Tasks

1. Check the foundings above is valid.
2. If yes, rectify codes based on the findings above. Make no regressions nor side-effects. Follow the $INSTRUCTIONS$ strictly.
3. If not, explain why not and stop.