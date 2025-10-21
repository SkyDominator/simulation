---
mode: agent
tools: ['runCommands', 'runTasks', 'edit', 'search', 'context7/*', 'playwright/*', 'pylance mcp server/*', 'usages', 'think', 'problems', 'changes', 'testFailure', 'fetch', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'ms-python.python/configurePythonEnvironment', 'todos', 'runTests']
model: Claude Sonnet 4.5
---

# Implement

## Overview

Implement codes by following the $PLAN$.

## Mappings

$RESEARCH_RESULT$: `docs/research/IS-89/research-01.md`
$PLAN$: `docs/plan/IS-89/plan-01.md`

## Tasks

DO the following tasks:

1. Read $RESEARCH_RESULT$ and $PLAN$ carefully.
2. Modify codebase following the $PLAN$. MUST go through ALL Phases in the plan. Implement only what are described in the $PLAN$. NO MORE, NO LESS.
3. Continuously & thoroughly iterate on a review-and-self-correct loop until the $PLAN$ is fully and accurately implemented.
4. Stop and wait for user order.

## Notes

If the $PLAN$ is ambiguous, incomplete or problematic, DO:

1. First, consult the $RESEARCH_RESULT$ for more information and try to suggest alternative solutions. If some solutions come out after consulting, update the $PLAN$ accordingly and continue implementation.
2. If no solutions are found or still unclear about something, stop and ask for clarification instead of making assumptions.

DO NOT:

1. Create any report documents.
2. Stary to solve other issues not mentioned in the $PLAN$. If other issues are found, stop and report and wait for user order.
3. Refactor the codebase beyond what is necessary to solve the mentioned issues in the $PLAN$.