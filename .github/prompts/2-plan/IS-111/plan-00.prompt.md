---
mode: agent
tools: ['edit', 'search', 'upstash/context7/*', 'usages', 'think', 'changes', 'todos']
model: Claude Sonnet 4.5
---

# Plan

Create code implementation plan at $PLAN$ by reading $ANALYSIS_RESULT$ to solve issues in the codebase.

## The issue statements

```shell
gh issue view 111 --repo SkyDominator/simulation
```

## Mappings

$ANALYSIS_RESULT$: `docs/analysis/IS-111/analysis-00.md`
$PLAN$: `docs/plan/IS-111/plan-00.md`
$APPROACH$: `Option A`

(If the file already exists, overwrite it. If the directory and the file do not exist, create them.)

## Tasks

1. Read the issue.
2. Read $ANALYSIS_RESULT$.
3. Create $PLAN$ which is driven by $APPROACH$.
    - Take a holistic view of the codebase. Do not stray from the coding guideine.
    - Consider side effects and edge cases.
    - Consider not introducing new issues or regressions by code changes.
    - Refer to the following examples for the structure, format, style of the plan:
        - `docs/plan/IS-89/plan-00.md`


## Notes

- $PLAN$ should MUST include the implementation plan for test codes as we chose TDD approach.
    - Plan for defining test cases
    - Plan for writing/editing test codes
    - For the type of tests, refer to `.vscode/launch.json`.