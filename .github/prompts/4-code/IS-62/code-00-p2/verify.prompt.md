---
mode: agent
tools: ['edit', 'search', 'runCommands', 'pylance mcp server/pylanceDocuments', 'pylance mcp server/pylanceFileSyntaxErrors', 'pylance mcp server/pylanceImports', 'pylance mcp server/pylanceInstalledTopLevelModules', 'pylance mcp server/pylanceInvokeRefactoring', 'pylance mcp server/pylancePythonEnvironments', 'pylance mcp server/pylanceSettings', 'pylance mcp server/pylanceSyntaxErrors', 'pylance mcp server/pylanceWorkspaceRoots', 'pylance mcp server/pylanceWorkspaceUserFiles', 'context7/*', 'usages', 'think', 'problems', 'changes', 'fetch', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'todos']
model: Claude Sonnet 4.5
---

#  Verify Task Result

## Mappings

* $TASK_RUNNER_PROMPT$: `../code-00-p2/code.prompt.md`
* $TASK_RESULT$ (commit hash):
    1. `commit_hash`: `d6911405734a06508b47dc067b6a89dcbbee213b`

## Status

I ran $TASK_RUNNER_PROMPT$ and got $TASK_RESULT$ as result.

## Tasks

### Step 1. Read changed files in $TASK_RESULT$.

When there is a single commit, use this command to read the changed files made in the commit:

```shell
git diff --name-only {commit_hash}^ {commit_hash}
```

When there are multiple commits, use this command to read the changed files:

```shell
git diff --name-only {commit_hash_first}^ {commit_hash_last}
```

> Note: Ignore the changes except code changes.

### Step 2. Read code changes in each changed file in $TASK_RESULT$.

For each file, do the following.

When there is a single commit, use this command to read the changes made in each file in the commit:

```shell
git diff {commit_hash}^ {commit_hash} -- {file_path}
```

When there are multiple commits, use this command to read the changes made in each file in the commits:

```shell
git diff {commit_hash_first}^ {commit_hash_last} -- {file_path}
```

### Step 3. Verify $TASK_RESULT$.

Verify $TASK_RESULT$ according to:

1. NO LESS: No missing items in $TASK_RUNNER_PROMPT$.
2. NO MORE: No deviations or alterations or additions exist. Exactly implemented as per the task description.
3. FULL COMPLIANCE: Strict adherence to the every detail in $TASK_RUNNER_PROMPT$ is kept, with no arbitrary guessing or assumptions applied in the result.
4. NO GUESSING: No assumptions or guesses were made during implementation. If any ambiguity or incompleteness existed in $TASK_RUNNER_PROMPT$, it should have been reported instead of guessed.
5. NO SIDE-EFFECTS NOR REGRESSIONS: No unintended side-effects or regressions were introduced in the codebase outside the scope of the task description.

## Notes

If any contradictions or ambiguities found in whatever the provided contexts (instructions, research, analysis, plan, etc.), STOP and REPORT them clearly to me instead of guessing or making assumptions.

## Response

Respond with "The task result is verified and correct." if the result is correct. If there are issues, list them clearly and concisely, and correct the $TASK_RESULT$ accordingly.