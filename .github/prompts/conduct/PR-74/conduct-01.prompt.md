---
mode: agent
tools: ['runCommands', 'runTasks', 'edit', 'runNotebooks', 'search', 'new', 'extensions', 'runTests', 'usages', 'vscodeAPI', 'problems', 'changes', 'testFailure', 'openSimpleBrowser', 'fetch', 'githubRepo', 'context7', 'playwright', 'GitKraken (bundled with GitLens)', 'pylance mcp server', 'copilotCodingAgent', 'activePullRequest', 'openPullRequest', 'getPythonEnvironmentInfo', 'getPythonExecutableCommand', 'installPythonPackage', 'configurePythonEnvironment']
model: Claude Sonnet 4.5 (Preview) (copilot)
---

# Conductor for Research and Planning

You are a conductor who orchestrates the research and planning process to solve issues in the codebase.

## Issue Description

- Name: Authentication & Session Management >> E2E-AUTH-001: Login button triggers Supabase OAuth (Google)
- Location: `src/frontend/e2e/specs/auth-session.spec.ts:47:3`

### Error details

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: '인증번호 받기' })
    - locator resolved to <button tabindex="0" type="submit" class="MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary MuiButton-sizeLarge MuiButton-containedSizeLarge MuiButton-colorPrimary MuiButton-disableElevation MuiButton-fullWidth MuiButton-root MuiButton-contained MuiButton-containedPrimary MuiButton-sizeLarge MuiButton-containedSizeLarge MuiButton-colorPrimary MuiButton-disableElevation MuiButton-fullWidth css-zurgej">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="MuiBox-root css-dzc7qr">…</div> intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="MuiBox-root css-dzc7qr">…</div> intercepts pointer events
    - retrying click action
      - waiting 100ms
    52 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="MuiBox-root css-dzc7qr">…</div> intercepts pointer events
     - retrying click action
       - waiting 500ms


   at utils\test-helpers.ts:53

  51 |     await this.page.getByLabel("이름").fill(name);
  52 |     await this.page.getByLabel("휴대폰 번호").fill(phone);
> 53 |     await this.page.getByRole("button", { name: "인증번호 받기" }).click();
     |                                                              ^
  54 |   }
  55 |
  56 |   /**
    at TestHelpers.fillWhitelistForm (C:\Users\USER\Documents\workspace\partnersclub\simulation\src\frontend\e2e\utils\test-helpers.ts:53:62)
    at C:\Users\USER\Documents\workspace\partnersclub\simulation\src\frontend\e2e\specs\auth-session.spec.ts:63:5
```
### Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - heading "생명빛 클럽 시뮬레이션" [level=1] [ref=e6]
    - main [ref=e7]:
      - generic [ref=e11]:
        - generic [ref=e12]:
          - img "Logo" [ref=e13]
          - heading "환영합니다!" [level=5] [ref=e14]
          - paragraph [ref=e15]: 이름과 전화번호를 입력하고 인증번호 받기 버튼을 눌러주세요.
        - generic [ref=e16]:
          - generic [ref=e17]: 이름
          - generic [ref=e18]:
            - textbox "이름" [ref=e19]: 홍길동
            - group:
              - generic: 이름
        - generic [ref=e20]:
          - generic [ref=e21]: 휴대폰 번호
          - generic [ref=e22]:
            - textbox "휴대폰 번호" [active] [ref=e23]: 010-1234-5678
            - group:
              - generic: 휴대폰 번호
        - button "인증번호 받기" [ref=e24] [cursor=pointer]: 인증번호 받기
  - generic [ref=e25]:
    - heading "가로 모드로 전환해주세요" [level=5] [ref=e26]
    - paragraph [ref=e27]: 이 앱은 가로(landscape) 모드에서만 사용할 수 있습니다. 기기를 회전해주세요.
```

## Targets

$EXAMPLE_RESEARCHER$: `.github/prompts/research/PR-74/research-00.prompt.md`
$RESEARCHER$: `.github/prompts/research/PR-74/research-01.prompt.md`
$EXAMPLE_RESEARCH_RESULT$: `docs/research/PR-74/research-00.md`
$RESEARCH_RESULT$: `docs/research/PR-74/research-01.md`
$EXAMPLE_PLANNER$: `.github/prompts/plans/PR-74/planner-00.prompt.md`
$PLANNER$: `.github/prompts/plans/PR-74/planner-01.prompt.md`
$EXAMPLE_PLAN$: `docs/plans/PR-74/plan-00.md`
$PLAN$: `docs/plans/PR-74/plan-01.md`

## Tasks

Do the following tasks:

1. Generate $RESEARCHER$ to create a research artifact.

For the format, structure, style, refer to $EXAMPLE_RESEARCHER$

2. Generate $RESEARCH_RESULT$ by following instructions in $RESEARCHER$

    - if users didn't provide `(USER-MUST)` section, you MUST ask them to provide it. Stop and wait for their answer.
    - if users didn't provide `(USER)` sections, you can skip them and proceed.

For the format, structure, style, refer to $EXAMPLE_RESEARCH_RESULT$

3. Generate $PLANNER$ to create implementation plan to solve issues in $RESEARCH_RESULT$

For the format, structure, style, refer to $EXAMPLE_PLANNER$

4. Generate $PLAN$ by following instructions in $PLANNER$

For the format, structure, style, refer to $EXAMPLE_PLAN$

5. Stop and wait for my order.

Do not:

1. Create any files other than the above 2 files.
2. Proceed to implementation.