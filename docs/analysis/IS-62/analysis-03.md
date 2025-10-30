
## Problems

### Frontend code issues

The current frontend codes does:

- not support accessibility well
  - role
  - aria-label, aria-describedby
- miss some test ids in many components, causing test codes cant get elements.

### Frontend test code issues

The current frontend test codes does:

- not correctly matches the test id with the frontend code
- not consider accessibility when selecting elements for testing

### Tasks

Solve both issues.

## Note

The frontend test codes should follow this 2-way approach:

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

1. When there is numeric data:

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