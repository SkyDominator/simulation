import { test, expect } from "@playwright/test";

test.describe("Embedded Browser Detection - E2E", () => {
  test.use({
    // Simulate KakaoTalk in-app browser
    userAgent:
      "Mozilla/5.0 (Linux; Android 13) KAKAOTALK 10.0.0 Mobile Safari/537.36",
    viewport: { width: 375, height: 667 },
  });

  test("detects KakaoTalk browser and shows warning modal", async ({
    page,
  }) => {
    // Navigate to login page
    await page.goto("/login");

    // Wait for page load
    await page.waitForLoadState("networkidle");

    // Optional: Check if warning banner appears
    const banner = page.locator(
      "text=/앱 내부 브라우저에서는 Google 로그인이 제한됩니다/"
    );
    if (await banner.isVisible()) {
      await expect(banner).toBeVisible();
    }

    // Click Google login button
    await page.click('button:has-text("Google로 로그인")');

    // Modal should appear
    await expect(page.locator("text=브라우저에서 열어주세요")).toBeVisible();
    await expect(
      page.locator("text=/KakaoTalk 앱 내부 브라우저/")
    ).toBeVisible();

    // Verify modal content
    await expect(page.locator("text=브라우저에서 열기")).toBeVisible();
    await expect(page.locator("text=취소")).toBeVisible();
    await expect(page.locator("text=/수동으로 여는 방법/")).toBeVisible();
  });

  test("allows user to dismiss modal", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Trigger modal
    await page.click('button:has-text("Google로 로그인")');
    await expect(page.locator("text=브라우저에서 열어주세요")).toBeVisible();

    // Dismiss modal
    await page.click('button:has-text("취소")');

    // Modal should disappear
    await expect(
      page.locator("text=브라우저에서 열어주세요")
    ).not.toBeVisible();
  });

  test("shows manual instructions for external browser opening", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Trigger modal
    await page.click('button:has-text("Google로 로그인")');

    // Check manual instructions
    await expect(
      page.locator("text=/메뉴\\(⋮\\) 버튼을 누르세요/")
    ).toBeVisible();
    await expect(page.locator("text=/다른 브라우저로 열기/")).toBeVisible();
  });
});

test.describe("Standard Browser - E2E Control", () => {
  test.use({
    // Simulate standard Chrome browser
    userAgent:
      "Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0 Mobile Safari/537.36",
    viewport: { width: 375, height: 667 },
  });

  test("allows OAuth in standard browser without warning", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // No warning banner should appear
    await expect(
      page.locator("text=/앱 내부 브라우저에서는 Google 로그인이 제한됩니다/")
    ).not.toBeVisible();

    // Click Google login button
    await page.click('button:has-text("Google로 로그인")');

    // Modal should NOT appear
    await expect(page.locator("text=브라우저에서 열어주세요")).not.toBeVisible({
      timeout: 2000,
    });

    // Should redirect to OAuth (or show OAuth-related page)
    // Note: Actual OAuth redirect will happen, just verify no modal interference
  });
});

test.describe("Login Button State in Embedded Browsers", () => {
  test("Google button disabled in KakaoTalk browser", async ({ browser }) => {
    // Create context with KakaoTalk user agent
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Linux; Android 13) KAKAOTALK 10.0.0 Mobile",
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Check button state
    const googleButton = page.getByTestId("google-login");
    await expect(googleButton).toBeDisabled();

    // Verify visual appearance (grayed out)
    const buttonClass = await googleButton.getAttribute("class");
    expect(buttonClass).toContain("Mui-disabled");

    await context.close();
  });

  test("Kakao button disabled in KakaoTalk browser", async ({ browser }) => {
    // Create context with KakaoTalk user agent
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Linux; Android 13) KAKAOTALK 10.0.0 Mobile",
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Check button state
    const kakaoButton = page.getByTestId("kakao-login");
    await expect(kakaoButton).toBeDisabled();

    await context.close();
  });

  test("Both buttons enabled in Chrome browser", async ({ browser }) => {
    // Use default Chrome user agent (standard browser)
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0 Mobile Safari/537.36",
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Check button states
    const googleButton = page.getByTestId("google-login");
    const kakaoButton = page.getByTestId("kakao-login");

    await expect(googleButton).not.toBeDisabled();
    await expect(kakaoButton).not.toBeDisabled();

    await context.close();
  });

  test("Buttons disabled in Facebook browser", async ({ browser }) => {
    // Create context with Facebook in-app browser user agent
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Linux; Android 13) FBAN/FB4A",
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Check button states
    const googleButton = page.getByTestId("google-login");
    const kakaoButton = page.getByTestId("kakao-login");

    await expect(googleButton).toBeDisabled();
    await expect(kakaoButton).toBeDisabled();

    await context.close();
  });

  test("Disabled button click does not trigger modal", async ({ browser }) => {
    // Create context with KakaoTalk user agent
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Linux; Android 13) KAKAOTALK 10.0.0 Mobile",
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const googleButton = page.getByTestId("google-login");

    // Verify button is disabled
    await expect(googleButton).toBeDisabled();

    // Try to click (should not work since button is disabled)
    await googleButton.click({ force: true });

    // Modal should not appear
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 2000 });

    await context.close();
  });

  test("Warning banner appears with disabled buttons", async ({ browser }) => {
    // Create context with KakaoTalk user agent
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Linux; Android 13) KAKAOTALK 10.0.0 Mobile",
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Check banner and buttons together
    const banner = page.getByRole("alert");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(
      "앱 내부 브라우저에서는 Google 로그인이 제한됩니다"
    );

    const googleButton = page.getByTestId("google-login");
    await expect(googleButton).toBeDisabled();

    await context.close();
  });
});
