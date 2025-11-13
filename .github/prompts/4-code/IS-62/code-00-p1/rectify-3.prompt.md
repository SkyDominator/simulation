---
mode: agent
tools: ['edit', 'search', 'runCommands', 'runTasks', 'pylance mcp server/pylanceDocuments', 'pylance mcp server/pylanceFileSyntaxErrors', 'pylance mcp server/pylanceImports', 'pylance mcp server/pylanceInstalledTopLevelModules', 'pylance mcp server/pylanceInvokeRefactoring', 'pylance mcp server/pylancePythonEnvironments', 'pylance mcp server/pylanceSettings', 'pylance mcp server/pylanceSyntaxErrors', 'pylance mcp server/pylanceWorkspaceRoots', 'pylance mcp server/pylanceWorkspaceUserFiles', 'context7/*', 'usages', 'think', 'problems', 'changes', 'fetch', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'todos']
model: Claude Sonnet 4.5
---

## Mappings

$INSTRUCTIONS$: `.github/instructions/4-code.instructions.md`

## Tasks

In the last session we did:

1. I requested `../code-00-p1/code-0.prompt.md`
2. You responded with the result: 
    * `src/frontend/e2e/fixtures/base.ts`
3. We verified the result and found the followings:

```markdown
Bug base.ts (≈lines 214-266): the mockedApis fixture routes against Playwright’s default page, but memberSession/adminSession each spin up their own browser context and return a different Page. Specs such as simulation-flow.spec.ts now combine memberSession with mockedApis, so the mocks never attach to the page that actually runs the journey. Those tests will issue live HTTP requests instead of hitting the interceptors, breaking Phase 1’s goal of centralized mocks and causing regressions.
Because of this blocking issue, the task result cannot be
```

Based on the findings above, rectify codes. Make no regressions nor side-effects. Follow the $INSTRUCTIONS$ strictly.