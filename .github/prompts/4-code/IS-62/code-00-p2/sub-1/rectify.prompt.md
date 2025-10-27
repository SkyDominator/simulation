---
mode: agent
tools: ['edit', 'search', 'runCommands', 'runTasks', 'pylance mcp server/pylanceDocuments', 'pylance mcp server/pylanceFileSyntaxErrors', 'pylance mcp server/pylanceImports', 'pylance mcp server/pylanceInstalledTopLevelModules', 'pylance mcp server/pylanceInvokeRefactoring', 'pylance mcp server/pylancePythonEnvironments', 'pylance mcp server/pylanceSettings', 'pylance mcp server/pylanceSyntaxErrors', 'pylance mcp server/pylanceWorkspaceRoots', 'pylance mcp server/pylanceWorkspaceUserFiles', 'context7/*', 'usages', 'think', 'problems', 'changes', 'fetch', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'todos']
model: Claude Sonnet 4.5
---

## Mappings

$INSTRUCTIONS$: `.github/instructions/4-code.instructions.md`

## Status

In the last session we did:

1. I requested `../code-00-p2/code.prompt.md`
2. Your responded with some code changes.
3. We verified your result and found the followings:

```markdown
FILENAME MISMATCH (NO MORE / FULL COMPLIANCE violation)

The plan explicitly specifies: src/frontend/e2e/utils/journey-actions.ts

But the actual implementation uses: src/frontend/e2e/utils/journeyActions.ts

This is a deviation from the plan specification. The plan uses kebab-case (journey-actions.ts) but the implementation uses camelCase (journeyActions.ts). This violates the "NO MORE" principle - the filename should match exactly what was specified in the plan.
```

# Tasks

1. Check the foundings above is valid.
2. If yes, rectify codes based on the findings above. Make no regressions nor side-effects. Follow the $INSTRUCTIONS$ strictly.
3. If not, explain why not and stop.

## Notes

If any contradictions or ambiguities found in whatever the provided contexts (instructions, research, analysis, plan, etc.), STOP and REPORT them clearly to me instead of guessing or making assumptions.