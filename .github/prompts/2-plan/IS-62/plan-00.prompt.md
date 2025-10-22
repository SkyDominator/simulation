---
mode: agent
tools: ['edit', 'search', 'runCommands', 'runTasks', 'pylance mcp server/*', 'context7/*', 'usages', 'think', 'problems', 'changes', 'fetch', 'todos']
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

1. Read $RESEARCH_REPORT$.
2. Read $ANALYSIS_REPORT$.
3. Create $PLAN$ which is driven by $APPROACH$.
    - Take a holistic view of the codebase. Do not stray from the coding guideine.
    - Consider side effects and edge cases.
    - Consider not introducing new issues or regressions by code changes.
    - Refer to the following examples for the structure, format, style of the plan:
        - `docs/plan/IS-89/plan-01.md`


## Notes

- Refer to the backend and frontend coding guideline for the test code structure and style.