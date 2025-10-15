---
mode: agent
tools: ['runCommands', 'runTasks', 'edit', 'search', 'new', 'extensions', 'todos', 'usages', 'think', 'problems', 'changes', 'testFailure', 'openSimpleBrowser', 'fetch', 'githubRepo', 'context7', 'playwright', 'GitKraken', 'pylance mcp server', 'copilotCodingAgent', 'activePullRequest', 'openPullRequest', 'getPythonEnvironmentInfo', 'getPythonExecutableCommand', 'installPythonPackage', 'configurePythonEnvironment']
model: Claude Sonnet 4.5
---

# Research

Investigates and analyzes the codebase to create research artifacts to help solve issues.

The artifacts provide the implementation snapshot of matters preventing going through the entire codebase every time you want to understand the current source codes.

The artifacts must provide the implementation details, context, code map, data flow, and related UX flows.

## Mappings

$RESEARCH_RESULT$: `docs/research/IS-89/research-00.md`:$INIT_RESEARCH_RESULT$

(If the file already exists, overwrite it. If the directory and the file do not exist, create them.)

## The issue statements

`https://github.com/SkyDominator/simulation/issues/89`

## The goal of research

The basic goal of this research is to identify source codes:

1. Root cause codes
    1. Code map
        * `file path:line number` format
    2. Data flow
    3. Code execution flow
2. Related codes (will or may impact or be impacted by the root cause codes)
    1. Code map
        * `file path:line number` format
    2. Data flow
    3. Code execution flow

## The research outcome 

- Create $RESEARCH_RESULT$ file to report results.
- Refer to the following examples for the structure, format, style of the report:
    - `/docs/examples/example1-research.md`
    - `/docs/examples/example2-research.md`