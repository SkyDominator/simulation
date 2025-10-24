---
mode: agent
tools: ['edit', 'search', 'runCommands', 'pylance mcp server/pylanceDocuments', 'pylance mcp server/pylanceFileSyntaxErrors', 'pylance mcp server/pylanceImports', 'pylance mcp server/pylanceInstalledTopLevelModules', 'pylance mcp server/pylanceInvokeRefactoring', 'pylance mcp server/pylancePythonEnvironments', 'pylance mcp server/pylanceSettings', 'pylance mcp server/pylanceSyntaxErrors', 'pylance mcp server/pylanceWorkspaceRoots', 'pylance mcp server/pylanceWorkspaceUserFiles', 'context7/*', 'usages', 'think', 'problems', 'changes', 'fetch', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'todos']
model: GPT-5-Codex (Preview)
---

#  Verify Task Result

## Mappings

* $TASK_RUNNER_PROMPT$: `../code-00-p1/code-0.prompt.md`
* $TASK_RESULT$ (commit hash):
    * `c15afa15368f4a068023dce6df0409fede4d56af`
    * `e3b6d527788372d9014c9aaf3aee412b37237ceb`
    * `efbfe525878884987183c03497e441be96ce0ed6`

Use this command to read the changes made in each commit:

```shell
git diff --name-only {commit_hash}^ {commit_hash}
```

I ran $TASK_RUNNER_PROMPT$ and got $TASK_RESULT$ as result. Verify this result according to:

1. NO LESS: No missing items in $TASK_RUNNER_PROMPT$.
2. NO MORE: No deviations or alterations or additions exist. Exactly implemented as per the task description.
3. FULL COMPLIANCE: Strict adherence to the every detail in $TASK_RUNNER_PROMPT$ is kept, with no arbitrary guessing or assumptions applied in the result.
4. NO GUESSING: No assumptions or guesses were made during implementation. If any ambiguity or incompleteness existed in $TASK_RUNNER_PROMPT$, it should have been reported instead of guessed.

## Notes

Ignore all the other commits except for the ones in $TASK_RESULT$

## Response

Respond with "The task result is verified and correct." if the result is correct. If there are issues, list them clearly and concisely, and correct the $TASK_RESULT$ accordingly.