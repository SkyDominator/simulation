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
Blocking – base.ts (lines ~75-110): the memberSession fixture still seeds auth purely via setAuthToken/localStorage. Phase 1 explicitly requires this fixture to “load storageState derived from the Supabase stub,” so we’re missing the new context created from that storage-state artifact. Please generate the storageState from the Supabase stub (e.g., commit a JSON under playwright/.auth/) and have the fixture spin up a context with that state before returning the page.

Phase 1 of plan-00.md explicitly calls for the memberSession fixture to “load storageState derived from the Supabase stub.” That requirement came out of the IS-92 analysis: we need deterministic auth context shared across Playwright runs, and the baseline approach of sprinkling tokens into localStorage doesn’t satisfy it. Without handing Playwright a storageState file, we can’t guarantee the Supabase stub session is identical between tests or avoid race conditions when navigation happens before the init scripts fire. So, for this project, yes—persisting the stubbed Supabase session into a storageState artifact and using it in the fixture is required to meet the agreed Phase 1 deliverable.
```

Based on the findings above, rectify codes. Make no regressions nor side-effects. Follow the $INSTRUCTIONS$ strictly.