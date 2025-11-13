---
mode: agent
tools: ['edit', 'search', 'runCommands', 'pylance mcp server/pylanceDocuments', 'pylance mcp server/pylanceFileSyntaxErrors', 'pylance mcp server/pylanceImports', 'pylance mcp server/pylanceInstalledTopLevelModules', 'pylance mcp server/pylanceInvokeRefactoring', 'pylance mcp server/pylancePythonEnvironments', 'pylance mcp server/pylanceSettings', 'pylance mcp server/pylanceSyntaxErrors', 'pylance mcp server/pylanceWorkspaceRoots', 'pylance mcp server/pylanceWorkspaceUserFiles', 'context7/*', 'usages', 'think', 'problems', 'changes', 'fetch', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'todos']
model: GPT-5-Codex (Preview)
---

#  Verify Task Result

## Mappings

* $TASK_RUNNER_PROMPT$: `../code-00-p1/code-0.prompt.md`
* $TASK_RESULT$ (commit hash):
    1. `76f16960ae92e85ea65da87a454707ab0aa02e23`
    2. `a86f0db707bbd913e627552bb1c8226ec9af91f5`
    3. `b2003f19d60b82b975da283b9f31a599138afa71`
    4. `8276c69dc082cc5e1b26a1b5e505c92bb78cb5fc`

I ran $TASK_RUNNER_PROMPT$ and got $TASK_RESULT$ as result. Verify this result according to:

1. NO LESS: No missing items in $TASK_RUNNER_PROMPT$.
2. NO MORE: No deviations or alterations or additions exist. Exactly implemented as per the task description.
3. FULL COMPLIANCE: Strict adherence to the every detail in $TASK_RUNNER_PROMPT$ is kept, with no arbitrary guessing or assumptions applied in the result.
4. NO GUESSING: No assumptions or guesses were made during implementation. If any ambiguity or incompleteness existed in $TASK_RUNNER_PROMPT$, it should have been reported instead of guessed.
5. NO SIDE-EFFECTS NOR REGRESSIONS: No unintended side-effects or regressions were introduced in the codebase outside the scope of the task description.

## Notes

Ignore all the other commits except for the ones in $TASK_RESULT$.

When there is a single commit, use this command to read the changed files made in the commit:

```shell
git diff --name-only {commit_hash}^ {commit_hash}
```

When there are multiple commits, use this command to read the changed files:

```shell
git diff --name-only {commit_hash_first} {commit_hash_last}
```

When there is a single commit, use this command to read the changes made in each file in the commit:

```shell
git diff {commit_hash}^ {commit_hash} -- {file_path}
```

When there are multiple commits, use this command to read the changes made in each file in the commits:

```shell
git diff {commit_hash_first} {commit_hash_last} -- {file_path}
```

## Response

Respond with "The task result is verified and correct." if the result is correct. If there are issues, list them clearly and concisely, and correct the $TASK_RESULT$ accordingly.