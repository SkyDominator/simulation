---
mode: agent
tools: ['edit', 'search', 'runCommands', 'pylance mcp server/pylanceDocuments', 'pylance mcp server/pylanceFileSyntaxErrors', 'pylance mcp server/pylanceImports', 'pylance mcp server/pylanceInstalledTopLevelModules', 'pylance mcp server/pylanceInvokeRefactoring', 'pylance mcp server/pylancePythonEnvironments', 'pylance mcp server/pylanceSettings', 'pylance mcp server/pylanceSyntaxErrors', 'pylance mcp server/pylanceWorkspaceRoots', 'pylance mcp server/pylanceWorkspaceUserFiles', 'context7/*', 'usages', 'think', 'problems', 'changes', 'fetch', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'todos']
model: GPT-5-Codex (Preview)
---

#  Verify Task Result

## Mappings

* $CODE$: `../code.prompt.md`
* $RECTIFY$: `../sub-2/rectify.prompt.md`
* $INSTRUCTIONS$: `.github/instructions/4-code.instructions.md`
* $TASK_TARGETS$:
    * `src/frontend/e2e/utils/journey-actions.ts`
    * `src/frontend/e2e/utils/apiMocks/playwright.ts`
    * `src/frontend/e2e/utils/auth-helpers.ts`
    * `src/frontend/e2e/utils/test-helpers.ts`


## History

So far during the past Chat sessions, we did:

1. $CODE$
2. Response commit hashes (cumulative):
    1. `d6911405734a06508b47dc067b6a89dcbbee213b`
3. $VERIFY$
4. Response - Verification Findings:
```
journey-actions.ts: the new simulation-table helpers are wired to data-test ids that don’t exist. The UI exposes data-testid="results-${id}", edit-${id}, delete-${id}, simulation-checkbox-${id}, and memo-chip-${id}, with the memo modal lacking memo-input/memo-save test ids altogether (see SimulationTable.tsx and MemoModal.tsx). The current selectors (view-results-*, edit-simulation-*, delete-simulation-*, select-simulation-*, memo-*) will never match, so these helpers can’t be used as written.

So, we need to add or update data-test ids to ALL the UI components matching the new helpers.
```
5. $RECTIFY$
6. Response commit hashes (cumulative):
    1. `d6911405734a06508b47dc067b6a89dcbbee213b`
    2. `16362f48a987429fad21fdcd089d8ee2c22dd966`

## Tasks

### Step 0. Read instructions.

Refer to $INSTRUCTIONS$ for the task history.

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

The $TASK_TARGETS$ are THE ONLY TARGETS to verify. Ignore other changed files for the steps below.

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
3. FULL COMPLIANCE: Strict adherence to the every detail in the $CODE$ is kept, with no arbitrary guessing or assumptions applied in the result. Strict adherence to the $INSTRUCTIONS$ is also a must.
4. NO GUESSING: No assumptions or guesses were made during implementation. If any ambiguity or incompleteness existed in the $CODE$, it should have been reported instead of guessed.
5. NO SIDE-EFFECTS NOR REGRESSIONS: No unintended side-effects or regressions were introduced in the codebase outside the scope of the task description.

## Notes

If any contradictions or ambiguities found in whatever the provided contexts (instructions, research, analysis, plan, etc.), STOP and REPORT them clearly to me instead of guessing or making assumptions.

## Response

Respond with "The task result is verified and correct." if the result is correct. If there are issues, list them clearly, concisely, and in detail.