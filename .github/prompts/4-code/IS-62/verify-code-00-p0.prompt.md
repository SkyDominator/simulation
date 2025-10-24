---
mode: agent
tools: ['edit', 'search', 'pylance mcp server/pylanceDocuments', 'pylance mcp server/pylanceFileSyntaxErrors', 'pylance mcp server/pylanceImports', 'pylance mcp server/pylanceInstalledTopLevelModules', 'pylance mcp server/pylanceInvokeRefactoring', 'pylance mcp server/pylancePythonEnvironments', 'pylance mcp server/pylanceSettings', 'pylance mcp server/pylanceSyntaxErrors', 'pylance mcp server/pylanceWorkspaceRoots', 'pylance mcp server/pylanceWorkspaceUserFiles', 'context7/*', 'usages', 'think', 'problems', 'changes', 'fetch', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'todos']
model: GPT-5-Codex (Preview)
---

#  Verify Task Result

## Mappings

* $TASK_RUNNER_PROMPT$: `../IS-62/code-00-p0.prompt.md`
* $TASK_RESULT$ (commit hash):
    * `87394b4aa3ac925c5e659862f61f595ad1034dc3`

I ran $TASK_RUNNER_PROMPT$ and got $TASK_RESULT$ as result. Verify this result according to:

1. No missing items in the task description in $TASK_RUNNER_PROMPT$.
2. Strict adherence to the task requirements in $TASK_RUNNER_PROMPT$ is maintained, with no arbitrary guessing or assumptions applied in the result.
3. Exactly implemented as per the task description, with no deviations or alterations (NO MORE, NO LESS).

## Notes

Ignore all the other commits except for the ones in $TASK_RESULT$

## Response

Respond with "The task result is verified and correct." if the result is correct. If there are issues, list them clearly and concisely, and correct the $TASK_RESULT$ accordingly.