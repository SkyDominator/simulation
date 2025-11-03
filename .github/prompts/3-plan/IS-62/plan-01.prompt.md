---
mode: agent
tools: ['runCommands', 'context7/*', 'edit', 'search', 'pylance mcp server/pylanceDocuments', 'pylance mcp server/pylanceFileSyntaxErrors', 'pylance mcp server/pylanceInstalledTopLevelModules', 'pylance mcp server/pylancePythonEnvironments', 'pylance mcp server/pylanceRunCodeSnippet', 'pylance mcp server/pylanceSyntaxErrors', 'pylance mcp server/pylanceWorkspaceRoots', 'pylance mcp server/pylanceWorkspaceUserFiles', 'todos', 'usages', 'think', 'problems', 'changes', 'fetch', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand']
model: GPT-5-Codex (Preview)
---

# Plan

Create code implementation plan at $PLAN_00$ by reading $ANALYSIS_REPORT$.

## Mappings

$INSTRUCTIONS$: `.github/instructions/3-plan.instructions.md`
$ANALYSIS_REPORT$: `docs/analysis/IS-62/IS-92/analysis-00.md` 
$PLAN_01$: `docs/plan/IS-62/plan-01.md`
$TARGET_00$: `**Test Infrastructure**` in $ANALYSIS_REPORT$.

(If the file already exists, overwrite it. If the directory and the file do not exist, create them.)

## Tasks

1. Read $INSTRUCTIONS$.
2. Read $ANALYSIS_REPORT$.
3. Create $PLAN_00$ for $TARGET_00$ following $INSTRUCTIONS$.
    - Take a holistic view of the codebase. Do not stray from the coding guideine.
    - Consider side effects and edge cases.
    - Consider not introducing new issues or regressions by code changes.
    - Refer to the following examples for the structure, format, style of the plan:
        - `docs/plan/IS-89/plan-01.md`

## Notes

- The current Test Infrastructure (fixtures, Mocks, Stubs, Fakes, etc.) implementations should be not trusted. The plan include the revisions or the improvements if required.
- MUST NOT cover other areas except $TARGET_00$.