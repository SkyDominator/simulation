---
mode: agent
tools: ['edit', 'search', 'runCommands', 'pylance mcp server/pylanceDocuments', 'pylance mcp server/pylanceFileSyntaxErrors', 'pylance mcp server/pylanceImports', 'pylance mcp server/pylanceInstalledTopLevelModules', 'pylance mcp server/pylanceInvokeRefactoring', 'pylance mcp server/pylancePythonEnvironments', 'pylance mcp server/pylanceSettings', 'pylance mcp server/pylanceSyntaxErrors', 'pylance mcp server/pylanceWorkspaceRoots', 'pylance mcp server/pylanceWorkspaceUserFiles', 'context7/*', 'usages', 'think', 'problems', 'changes', 'fetch', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'todos']
model: Claude Sonnet 4.5
---

#  Verify Task Result

## Mappings

$TASK_RUNNER_PROMPT$: `../../3-plan/IS-62/plan-01.prompt.md`
$TASK_RESULT_FILE$: `../../../../docs/plan/IS-62/plan-01.md`

I ran $TASK_RUNNER_PROMPT$ and got $TASK_RESULT_FILE$ as result. Verify this result according to:

1. No items of $TASK_RUNNER_PROMPT$ is missing in $TASK_RESULT_FILE$.
2. Duplicated items are removed.
3. The format, structure, style is correctly followed as per the examples in $TASK_RUNNER_PROMPT$.
4. Unnecessary information not requested in $TASK_RUNNER_PROMPT$ are removed.
5. No conflicts, contradictions, or ambiguities in $TASK_RESULT_FILE$ content.

Respond with "The task result is verified and correct." if the result is correct. If there are issues, list them clearly and concisely, and correct the $TASK_RESULT_FILE$ content accordingly.