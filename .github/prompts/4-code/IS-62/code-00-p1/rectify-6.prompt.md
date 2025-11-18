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
2. Your responded with some code changes.
3. We verified your result and found the followings:

```markdown
Blocking – missing baseURL on custom contexts base.ts: both memberSession and adminSession call browser.newContext({ storageState }) without also supplying the project baseURL. The updated specs now call memberSession.goto("/"), which will throw Protocol error (Page.navigate): Cannot navigate to invalid URL because the context has no base URL configured. Please pass the configured base URL (e.g., context = await browser.newContext({ storageState, baseURL: testInfo.project.use.baseURL })) so these fixtures keep the previous relative-navigation behaviour.
```

# Tasks

1. Check the foundings above is valid.
2. If yes, rectify codes based on the findings above. Make no regressions nor side-effects. Follow the $INSTRUCTIONS$ strictly.
3. If not, explain why not and stop.

## Notes

If any contradictions or ambiguities found in whatever the provided contexts (instructions, research, analysis, plan, etc.), STOP and REPORT them clearly to me instead of guessing or making assumptions.