import { test, expect } from "@playwright/test";

test.describe("Embedded Browser Detection - E2E", () => {
  test.use({
    // Simulate KakaoTalk in-app browser
    userAgent:
      "Mozilla/5.0 (Linux; Android 13) KAKAOTALK 10.0.0 Mobile Safari/537.36",
    viewport: { width: 375, height: 667 },
  });

  test("detects KakaoTalk browser, shows warning banner and disables buttons", async ({
    page,
  }) => {
    // Navigate to login page
    await page.goto("/login");

    // Wait for page load
    await page.waitForLoadState("networkidle");

    // Check warning banner appears
    const banner = page.locator(
      "text=/앱 내부 브라우저에서는 Google 로그인이 제한됩니다/"
    );
    await expect(banner).toBeVisible();

    // Check both login buttons are disabled
    const googleButton = page.getByTestId("google-login");
    const kakaoButton = page.getByTestId("kakao-login");

    await expect(googleButton).toBeDisabled();
    await expect(kakaoButton).toBeDisabled();
  });

  test("disabled buttons prevent click and modal does not appear", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const googleButton = page.getByTestId("google-login");

    // Verify button is disabled
    await expect(googleButton).toBeDisabled();

    // Try to click (should not work since button is disabled)
    await googleButton.click({ force: true });

    // Modal should NOT appear
    await expect(page.locator("text=브라우저에서 열어주세요")).not.toBeVisible({
      timeout: 2000,
    });
  });

  test("warning banner can be dismissed", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Check warning banner appears
    const banner = page.getByRole("alert");
    await expect(banner).toBeVisible();

    // Dismiss banner (find close button in alert)
    const closeButton = banner.locator('button[aria-label="Close"]');
    await closeButton.click();

    // Banner should disappear
    await expect(banner).not.toBeVisible();

    // Buttons should still be disabled
    const googleButton = page.getByTestId("google-login");
    await expect(googleButton).toBeDisabled();
  });
});

test.describe("Standard Browser - E2E Control", () => {
  test.use({
    // Simulate standard Chrome browser
    userAgent:
      "Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0 Mobile Safari/537.36",
    viewport: { width: 375, height: 667 },
  });

  test("enables OAuth buttons in standard browser without warning", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // No warning banner should appear
    await expect(
      page.locator("text=/앱 내부 브라우저에서는 Google 로그인이 제한됩니다/")
    ).not.toBeVisible();

    // Both buttons should be enabled
    const googleButton = page.getByTestId("google-login");
    const kakaoButton = page.getByTestId("kakao-login");

    await expect(googleButton).not.toBeDisabled();
    await expect(kakaoButton).not.toBeDisabled();
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
