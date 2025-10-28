---
mode: agent
tools: ['edit', 'search', 'runCommands', 'runTasks', 'pylance mcp server/pylanceDocuments', 'pylance mcp server/pylanceFileSyntaxErrors', 'pylance mcp server/pylanceImports', 'pylance mcp server/pylanceInstalledTopLevelModules', 'pylance mcp server/pylanceInvokeRefactoring', 'pylance mcp server/pylancePythonEnvironments', 'pylance mcp server/pylanceSettings', 'pylance mcp server/pylanceSyntaxErrors', 'pylance mcp server/pylanceWorkspaceRoots', 'pylance mcp server/pylanceWorkspaceUserFiles', 'context7/*', 'usages', 'think', 'problems', 'changes', 'fetch', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'todos']
model: Claude Sonnet 4.5
---

# Rectify Task Result Based on Verification Findings

## Mappings

* $CODE$: `../code.prompt.md`
* $VERIFY$: `../sub-0/verify.prompt.md`
* $INSTRUCTIONS$: `.github/instructions/4-code.instructions.md`
* $TASK_TARGETS$ (files to verify for this subtask):
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
```

# Tasks

1. Check the findings is valid.
2. If yes, rectify codes based on the findings. Make no regressions nor side-effects. Follow the $INSTRUCTIONS$ strictly.
3. If not, explain why not and stop.

## Notes

If any contradictions or ambiguities found in whatever the provided contexts (instructions, research, analysis, plan, etc.), STOP and REPORT them clearly to me instead of guessing or making assumptions.