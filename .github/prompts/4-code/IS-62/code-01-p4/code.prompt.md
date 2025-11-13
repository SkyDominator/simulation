---
mode: agent
tools: ['edit', 'search', 'pylance mcp server/pylanceDocuments', 'pylance mcp server/pylanceFileSyntaxErrors', 'pylance mcp server/pylanceImports', 'pylance mcp server/pylanceInstalledTopLevelModules', 'pylance mcp server/pylanceInvokeRefactoring', 'pylance mcp server/pylancePythonEnvironments', 'pylance mcp server/pylanceSettings', 'pylance mcp server/pylanceSyntaxErrors', 'pylance mcp server/pylanceWorkspaceRoots', 'pylance mcp server/pylanceWorkspaceUserFiles', 'context7/*', 'usages', 'think', 'problems', 'changes', 'fetch', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'todos']
model: Claude Sonnet 4.5
---

# Implement

Implement codes by following the $PLAN$.

## Mappings

$PLAN$: `docs/plan/IS-62/plan-01.md`
$INSTRUCTIONS$: `.github/instructions/4-code.front.instructions.md`
$PHASE$: `Phase 4`

## Tasks

DO the following tasks:

1. Read $INSTRUCTIONS$.
2. Read $PLAN$.
3. Modify codebase following the $PHASE$ of $PLAN$. Strictly Adhere to $INSTRUCTIONS$ for the implementation.
5. Continuously & thoroughly iterate on a review-and-self-correct loop until the $PLAN$ is fully and accurately implemented.
6. Stop and wait for user order.

## Notes

Implement only what are described in the $PHASE$ of $PLAN$. NO MORE, NO LESS.

If any contradictions or ambiguities found in any of the given contexts (including $PLAN$, $INSTRUCTIONS$, etc.), STOP AND ASK for clarification to me instead of making assumptions.

If the legacy code is not consistent to the $PLAN$ or $INSTRUCTIONS$, erase the legacy code and implement according to the $PLAN$ and $INSTRUCTIONS$.

DO NOT:

1. Create any report documents.
2. Stary to solve other issues not mentioned in the $PLAN$. If other issues are found, stop and report and wait for user order.
3. Refactor the codebase beyond what is necessary to solve the mentioned issues in the $PLAN$.
4. Make regressions that hurt the implementations of the previous phases of the $PLAN$.