아래 이슈들을 divide & conquer 방식으로 해결하기 위해 부분 부분으로 나누어 여러 개의 implementation planning tasks 생성해야함. 즉, plan file이 여러개 나와야 하고, 각 plan file은 독립적으로 해결 가능한 문제 단위로 작성되어야 함.

## Problems

Using shared resources and fixtures, re-implement all E2E-JOURNEY tests from scratch. They must tests all the UX flows in docs/spec/ux-flow.md. Re-use the existing cases or test codes if possible ONLY if they fit the instructions below.

## Notes

### Plans for test simulations

Use these 2 test plans for simulations (so all tests should be done against the 2 cases below)

```
A플랜, 
가입한 회차 선택: 28
현재 회차 선택: 29
시뮬레이션 총 회차 선택: 30
4회차부터 매출 달성율: 모두 65%
개인 회차 매출액: 110, 242, 이후 모두 최소 매출액
```

```
P플랜, 
가입한 회차 선택: 13
현재 회차 선택: 18
시뮬레이션 총 회차 선택: 21
4회차부터 매출 달성율: 개인 회차 4, 5회차는 64%, 6회차부터 모두 65%
개인 회차 매출액: 550, 33, 33, 55, 110, 77, 이후 모두 최소 매출액
```

### Test id consistency

The test ids in the frontend code and its current test codes have the following issues:

- There are missing test ids in many components, causing test codes to not get elements.
- There are test ids that are not consistent with the test codes. Unify into a single naming.

Should be fixed in this task.

### How to select elements in frontend tests

The frontend test codes should follow this 2-way approach. See the following examples.

1. base line: 3 tier strategy for selecting elements

```ts
// 1순위: Role + Accessible Name (접근성 보장)
page.getByRole("button", { name: "로그인" })

// 2순위: Label (폼 요소용)
page.getByLabel("이메일 주소")

// 3순위: TestId (복잡한 구조/동적 콘텐츠)
page.getByTestId("dashboard-simulation-create")

// 실전: OR 체이닝
const element = page
  .getByRole("button", { name: /로그인/i })
  .or(page.getByTestId("login-button"))
  .first();
```

2. When there is numeric data:

```ts
// ...existing code...

test("E2E-RESULTS-003: Summary section shows final metrics", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("main-page")).toBeVisible({ timeout: 5000 });

  const runButton = page
    .getByRole("button", { name: /run|실행/i })      // 1순위: 접근성
    .or(page.getByTestId("run-button"))               // 2순위: 구조 변경 대비
    .first();

  if (await runButton.isVisible()) {
    await runButton.click();
    await helpers.waitForSimulationResults();

    // Summary section - 접근성 우선, testid는 보험
    const summary = page
      .getByRole("region", { name: /요약|summary/i }) // 1순위: landmark role
      .or(page.getByTestId("results-summary"))        // 2순위: 안정성
      .first();
    await expect(summary).toBeVisible({ timeout: 5000 });

    // 숫자 데이터는 정확한 텍스트 매칭
    await expect(
      page.locator("text=/최종.*이익|final.*profit/i").first()
    ).toBeVisible();
  }
});

// ...existing code...
```

## Remove the legacy test codes

Remove all existing E2E-JOURNEY test codes that are being replaced by the new implementations.

## Divide & Conquer

- Create multiple implementation planning tasks to solve the issues above.
- Each plan file should be an independently solvable problem unit.