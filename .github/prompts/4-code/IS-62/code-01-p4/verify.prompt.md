---
mode: agent
tools: ['edit', 'search', 'runCommands', 'pylance mcp server/pylanceDocuments', 'pylance mcp server/pylanceFileSyntaxErrors', 'pylance mcp server/pylanceImports', 'pylance mcp server/pylanceInstalledTopLevelModules', 'pylance mcp server/pylanceInvokeRefactoring', 'pylance mcp server/pylancePythonEnvironments', 'pylance mcp server/pylanceSettings', 'pylance mcp server/pylanceSyntaxErrors', 'pylance mcp server/pylanceWorkspaceRoots', 'pylance mcp server/pylanceWorkspaceUserFiles', 'context7/*', 'usages', 'think', 'problems', 'changes', 'fetch', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'todos']
model: GPT-5-Codex (Preview)
---

#  Verify Task Result

## Mappings

* $CODE$: `../code-01-p4/code.prompt.md`
* $INSTRUCTIONS$: `.github/instructions/4-code.front.instructions.md`

## Task History

Read `./task-history.md` for the task history so far.

## Tasks

### Step 0. Read instructions.

Read $INSTRUCTIONS$ and $CODE$.

### Step 1. Read changed files from the commit(s).

When there is a single commit, use this command to read the changed files made in the commit:

```shell
git diff --name-only {commit_hash}^ {commit_hash}
```

When there are multiple commits, use this command to read the changed files:

```shell
git diff --name-only {commit_hash_first}^ {commit_hash_last}
```

> Note: Ignore the changes except code changes.

If the $TASK_TARGETS$ exist in the [mapping](#mappings), the $TASK_TARGETS$ are THE ONLY TARGETS to verify. Ignore other changed files for the steps below.

### Step 2. Read code changes in each changed file.

For each file, do the following.

When there is a single commit, use this command to read the changes made in each file in the commit:

```shell
git diff {commit_hash}^ {commit_hash} -- {file_path}
```

When there are multiple commits, use this command to read the changes made in each file in the commits:

```shell
git diff {commit_hash_first}^ {commit_hash_last} -- {file_path}
```

### Step 3. Verify code changes.

Verify them according to:

1. NO LESS: No missing items in the $CODE$.
2. NO MORE: No deviations or alterations or additions exist. Exactly implemented as per the task description.
3. FULL COMPLIANCE: 
    * Strict adherence to the $PHASE$ in the $PLAN$ described in $CODE$
    * Strict adherence to the every instruction in the $CODE$
    * Strict adherence to the every detail in the $CODE$ with no arbitrary guessing or assumptions applied in the result 
    * Strict adherence to the $INSTRUCTIONS$
4. NO GUESSING: No assumptions or guesses were made during implementation. If any ambiguity or incompleteness existed in the $CODE$, it should have been reported instead of guessed.
5. NO SIDE-EFFECTS NOR REGRESSIONS: No unintended side-effects or regressions were introduced in the codebase outside the scope of the task description.

## Notes

If any contradictions or ambiguities found in whatever the provided contexts (instructions, research, analysis, plan, etc.), STOP and REPORT them clearly to me instead of guessing or making assumptions.

## Notes for Future Steps (FOR LATER REFERENCE ONLY)

None

## Response

Respond with "The task result is verified and correct." if the result is correct. If there are issues, list them clearly, concisely, and in detail.