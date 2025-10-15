---
mode: agent
tools: ['edit', 'search', 'new', 'GitKraken/*', 'pylance mcp server/*', 'runCommands', 'runTasks', 'context7/get-library-docs', 'context7/resolve-library-id', 'playwright/browser_click', 'playwright/browser_close', 'playwright/browser_console_messages', 'playwright/browser_drag', 'playwright/browser_evaluate', 'playwright/browser_file_upload', 'playwright/browser_fill_form', 'playwright/browser_handle_dialog', 'playwright/browser_hover', 'playwright/browser_install', 'playwright/browser_navigate', 'playwright/browser_navigate_back', 'playwright/browser_network_requests', 'playwright/browser_press_key', 'playwright/browser_resize', 'playwright/browser_select_option', 'playwright/browser_snapshot', 'playwright/browser_tabs', 'playwright/browser_take_screenshot', 'playwright/browser_type', 'playwright/browser_wait_for', 'usages', 'think', 'problems', 'changes', 'testFailure', 'openSimpleBrowser', 'fetch', 'githubRepo', 'github.vscode-pull-request-github/copilotCodingAgent', 'github.vscode-pull-request-github/activePullRequest', 'github.vscode-pull-request-github/openPullRequest', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'ms-python.python/configurePythonEnvironment', 'extensions', 'todos']
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

`gh issue view 89 --repo SkyDominator/simulation`

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