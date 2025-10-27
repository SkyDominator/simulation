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
base.ts: the adminSession fixture only reuses memberSession and adds mockAdminAPI but never layers in admin claims or the admin storage state. Phase 1 explicitly requires adminSession to compose memberSession with admin claims plus admin API mocks; as implemented the admin claims are missing and the new playwright/.auth/admin.json artifact is unused. Admin fixtures therefore do not satisfy the plan.
```

# Tasks

1. Check the foundings above is valid.
2. If yes, rectify codes based on the findings above. Make no regressions nor side-effects. Follow the $INSTRUCTIONS$ strictly.
3. If not, explain why not and stop.