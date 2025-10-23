---
mode: agent
tools: ['edit', 'search', 'pylance mcp server/pylanceDocuments', 'pylance mcp server/pylanceFileSyntaxErrors', 'pylance mcp server/pylanceInstalledTopLevelModules', 'pylance mcp server/pylancePythonEnvironments', 'pylance mcp server/pylanceRunCodeSnippet', 'pylance mcp server/pylanceSyntaxErrors', 'pylance mcp server/pylanceWorkspaceRoots', 'pylance mcp server/pylanceWorkspaceUserFiles', 'context7/*', 'usages', 'think', 'problems', 'changes', 'fetch', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'todos']
model: Claude Sonnet 4.5
---

# Plan

Create code implementation plan at $PLAN$ by reading $ANALYSIS_REPORT$. Follow the $APPROACH$.

## Mappings

$ANALYSIS_REPORT$: `docs/analysis/IS-62/IS-92/analysis-00.md`
$PLAN$: `docs/plan/IS-62/plan-00.md`
$APPROACH$: Directed in $ANALYSIS_REPORT$.

(If the file already exists, overwrite it. If the directory and the file do not exist, create them.)

## Tasks

1. Read $ANALYSIS_REPORT$.
2. Create $PLAN$ which is driven by $APPROACH$.
    - Take a holistic view of the codebase. Do not stray from the coding guideine.
    - Consider side effects and edge cases.
    - Consider not introducing new issues or regressions by code changes.
    - Refer to the following examples for the structure, format, style of the plan:
        - `docs/plan/IS-89/plan-01.md`


## Notes

- The current Test Infrastructure (fixtures, Mocks, Stubs, Fakes, etc.) should be not trusted. The plan include the revisions and improvements if required.