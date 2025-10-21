---
mode: agent
tools: ['runCommands', 'runTasks', 'edit', 'search', 'context7/*', 'usages', 'think', 'problems', 'changes', 'fetch', 'githubRepo', 'github.vscode-pull-request-github/copilotCodingAgent', 'github.vscode-pull-request-github/activePullRequest', 'github.vscode-pull-request-github/openPullRequest', 'todos']
model: Claude Sonnet 4.5
---

# Research

Investigates and analyzes the codebase to create research artifacts to help solve issues.

The artifacts provide the implementation snapshot of matters preventing going through the entire codebase every time you want to understand the current source codes.

The artifacts must provide the implementation details, context, code map, data flow, and related UX flows.

## Mappings

$RESEARCH_RESULT$: `docs/research/IS-89/research-01.md`

(If the file already exists, overwrite it. If the directory and the file do not exist, create them.)

## pre-requisites

Check status.

```shell
gh auth status
```

Log in to GitHub CLI if not logged in.:

```shell
# Use `SIMULATION_READ_ISSUE` (fine grained token for Github issue read-only) in the environment variables to log in.
gh auth login
```

## The issue statements

```shell
gh issue view 89 --repo SkyDominator/simulation
```

```shell
gh pr view 90 --repo SkyDominator/simulation
```

The PR 90 was merged to solve issue 89, but the issue still remains. The user experiences exactly the same problem as described in the issue after the merge.

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

The research should answer to the following check:

```markdown
PWA의 로그인 페이지에 다음 로직을 추가해야 한다.
KakaoTalk 인앱 브라우저 감지: 사용자의 navigator.userAgent 문자열에 KAKAOTALK이 포함되어 있는지 확인합니다.

UI 분기 처리:

KakaoTalk 감지 시: "Google 로그인" 버튼을 숨기거나 비활성화합니다. 대신 "Google 로그인은 외부 브라우저에서만 가능합니다."라는 안내 메시지와 함께, 사용자가 직접 외부 브라우저로 열 수 있도록 안내합니다.

그 외 브라우저: 기존 "Google 로그인" 버튼을 정상적으로 표시합니다.
```

## The research outcome 

- Create $RESEARCH_RESULT$ file to report results.
- Refer to the following examples for the structure, format, style of the report:
    - `../../../../docs/research/IS-89/research-00.md`