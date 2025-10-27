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
    * `src/frontend/e2e/specs/simulation-flow.spec.ts`
    * `src/frontend/e2e/specs/onboarding.spec.ts`
    * `src/frontend/e2e/fixtures/base.ts`
    * `src/frontend/e2e/utils/apiMocks/playwright.ts`
3. We verified the result and found the followings:

```markdown
simulation-flow.spec.ts (lines 12-29): the journey tests were switched to the new fixture signature but they never call mockedApis.mockSimulationAPI() nor swap to the simulationSeed fixture. As soon as they hit /, the frontend issues a real request to /api/simulations, which returns 404 under the preview server, producing console noise and violating Phase 1’s requirement that journey specs rely on the deterministic Playwright mocks introduced in base.ts. Please compose the new fixture (simulationSeed) or invoke the mocked API controller inside these tests so they no longer talk to the live endpoint.

onboarding.spec.ts (lines 10-31): the new “E2E-JOURNEY” path also lands on the dashboard after consent, yet it only sets up OTP/consent mocks. Once the dashboard renders it hits /api/simulations, again falling back to the real preview server and leaking 404s. This breaks the “centralize request interception with typed payloads” objective for Phase 1. Add await mockedApis.mockSimulationAPI() (and, if needed, mockNoticesAPI) before navigating so the flow stays fully under the new fixture architecture.

Because of these regressions, the task result does not satisfy Phase 1, so the verification fails.
```

Based on the findings above, rectify codes. Make no regressions nor side-effects. Follow the $INSTRUCTIONS$ strictly.