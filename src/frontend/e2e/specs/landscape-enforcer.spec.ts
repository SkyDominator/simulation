import { test, expect } from "@playwright/test";
import { initE2EMode } from "../utils/test-helpers";

test.describe("LandscapeEnforcer Component", () => {
  test("Shows overlay in portrait viewport (not in E2E mode)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 393, height: 851 });
    await page.goto("/");

    await expect(page.getByText("가로 모드로 전환해주세요")).toBeVisible();
    await expect(
      page.getByText(/가로.*모드에서만 사용할 수 있습니다/)
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "인증번호 받기" })
    ).toBeVisible();
  });

  test("Hides overlay in landscape viewport", async ({ page }) => {
    await page.setViewportSize({ width: 851, height: 393 });
    await page.goto("/");

    await expect(page.getByText("가로 모드로 전환해주세요")).not.toBeVisible();

    const nameInput = page.getByLabel("이름");
    await expect(nameInput).toBeVisible();
    await nameInput.fill("Test User");
  });

  test("Skips overlay in E2E mode regardless of orientation", async ({
    page,
  }) => {
    await initE2EMode(page);
    await page.setViewportSize({ width: 393, height: 851 });
    await page.goto("/");

    await expect(page.getByText("가로 모드로 전환해주세요")).not.toBeVisible();

    const nameInput = page.getByLabel("이름");
    await expect(nameInput).toBeVisible();
    await nameInput.fill("Test User");
  });
});
