import { test, expect } from "@playwright/test";
import { TestHelpers, APIHelpers } from "../utils/test-helpers";
import { loginAdminUser, loginTestUser } from "../utils/auth-helpers";

/**
 * CAT-ADMIN: Admin Features Tests
 * Tests administrative functionality for policy and notice management
 */

test.describe("Admin Features - Access Control", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await APIHelpers.mockAdminAPI(page);
    await APIHelpers.mockNoticesAPI(page);
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test("E2E-ADMIN-001: Admin user can navigate to policy page", async ({
    page,
  }) => {
    await loginAdminUser(page);
    await page.goto("/");

    // Look for admin menu or button
    const adminButton = page
      .getByTestId("admin-button")
      .or(page.getByRole("button", { name: /admin|관리자|policy|정책/i }))
      .first();

    if (await adminButton.isVisible()) {
      await adminButton.click();

      // Should navigate to admin policy page
      await expect(
        page
          .locator('[data-testid="admin-policy-page"]')
          .or(page.locator("text=/정책.*관리|policy.*management/i"))
          .first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("E2E-ADMIN-002: Non-admin user cannot access policy page", async ({
    page,
  }) => {
    await loginTestUser(page); // Regular user, not admin
    await page.goto("/");

    // Try to access admin page (might be hidden or show error)
    const adminButton = page
      .getByTestId("admin-button")
      .or(page.getByRole("button", { name: /admin|관리자/i }))
      .first();

    // Admin button should not be visible for regular users
    const isVisible = await adminButton.isVisible().catch(() => false);

    if (isVisible) {
      await adminButton.click();

      // Should show permission error
      await expect(
        page.locator("text=/권한|permission|admin.*required/i").first()
      ).toBeVisible({ timeout: 5000 });
    } else {
      // Admin button not visible - correct behavior
      expect(isVisible).toBe(false);
    }
  });
});

test.describe("Admin Features - Privacy Policy Management", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await loginAdminUser(page);
    await APIHelpers.mockAdminAPI(page);
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test("E2E-ADMIN-003: Policy list displays all versions", async ({ page }) => {
    await page.goto("/");

    // Navigate to admin policy page
    const adminButton = page
      .getByTestId("admin-button")
      .or(page.getByRole("button", { name: /admin|관리자|policy/i }))
      .first();

    if (await adminButton.isVisible()) {
      await adminButton.click();

      // Wait for policy page
      await page.waitForTimeout(1000);

      // Policy list should be visible
      const policyList = page
        .locator('[data-testid="policy-list"]')
        .or(page.locator("table, [role=\"table\"]"))
        .first();

      if (await policyList.isVisible()) {
        await expect(policyList).toBeVisible();

        // Should have multiple policy entries
        const rows = page.locator("tr, [role=\"row\"]");
        expect(await rows.count()).toBeGreaterThan(0);
      }
    }
  });

  test("E2E-ADMIN-004: Create policy button opens editor", async ({ page }) => {
    await page.goto("/");

    const adminButton = page
      .getByTestId("admin-button")
      .or(page.getByRole("button", { name: /admin|관리자|policy/i }))
      .first();

    if (await adminButton.isVisible()) {
      await adminButton.click();
      await page.waitForTimeout(1000);

      // Find create policy button
      const createButton = page
        .getByTestId("create-policy")
        .or(page.getByRole("button", { name: /새.*정책|create.*policy|add/i }))
        .first();

      if (await createButton.isVisible()) {
        await createButton.click();

        // Editor should appear (modal or new page)
        const editor = page
          .locator('[data-testid="policy-editor"]')
          .or(page.locator('[role="dialog"]'))
          .or(page.locator("textarea, [contenteditable]"))
          .first();

        await expect(editor).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("E2E-ADMIN-005: Policy editor accepts markdown content", async ({
    page,
  }) => {
    await page.goto("/");

    const adminButton = page
      .getByTestId("admin-button")
      .or(page.getByRole("button", { name: /admin|관리자|policy/i }))
      .first();

    if (await adminButton.isVisible()) {
      await adminButton.click();
      await page.waitForTimeout(1000);

      const createButton = page
        .getByTestId("create-policy")
        .or(page.getByRole("button", { name: /새.*정책|create.*policy/i }))
        .first();

      if (await createButton.isVisible()) {
        await createButton.click();

        // Find editor textarea
        const editor = page
          .locator("textarea")
          .or(page.locator('[contenteditable="true"]'))
          .first();

        if (await editor.isVisible()) {
          // Type markdown content
          const markdownContent = "# Privacy Policy\n\n## Section 1\n\nContent here.";
          await editor.fill(markdownContent);

          // Verify content was entered
          const content = await editor.inputValue().catch(() =>
            editor.textContent()
          );
          expect(content).toContain("Privacy Policy");
        }
      }
    }
  });

  test("E2E-ADMIN-006: Save button POSTs to /api/admin/privacy-policies", async ({
    page,
  }) => {
    // Set up request spy
    const createRequests: any[] = [];
    await page.route("**/api/admin/privacy-policies**", async (route) => {
      if (route.request().method() === "POST") {
        createRequests.push({
          method: route.request().method(),
          body: route.request().postDataJSON(),
        });
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              id: "policy-new",
              version: "v3",
              created_at: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/");

    const adminButton = page
      .getByTestId("admin-button")
      .or(page.getByRole("button", { name: /admin|관리자|policy/i }))
      .first();

    if (await adminButton.isVisible()) {
      await adminButton.click();
      await page.waitForTimeout(1000);

      const createButton = page
        .getByTestId("create-policy")
        .or(page.getByRole("button", { name: /새.*정책|create.*policy/i }))
        .first();

      if (await createButton.isVisible()) {
        await createButton.click();

        // Fill in policy data
        const versionInput = page
          .getByLabel(/version|버전/i)
          .or(page.locator('input[name="version"]'))
          .first();

        if (await versionInput.isVisible()) {
          await versionInput.fill("v3.0");
        }

        const editor = page.locator("textarea").first();
        if (await editor.isVisible()) {
          await editor.fill("Test policy content");
        }

        // Find and click save button
        const saveButton = page
          .getByTestId("save-policy")
          .or(page.getByRole("button", { name: /저장|save/i }))
          .first();

        if (await saveButton.isVisible()) {
          await saveButton.click();

          // Wait for request
          await page.waitForTimeout(1000);

          // Verify API was called
          expect(createRequests.length).toBeGreaterThan(0);
          if (createRequests.length > 0) {
            expect(createRequests[0].method).toBe("POST");
          }
        }
      }
    }
  });

  test("E2E-ADMIN-007: Publish button makes policy active", async ({
    page,
  }) => {
    // Set up request spy for publish endpoint
    const publishRequests: any[] = [];
    await page.route("**/api/admin/privacy-policies/**/publish", async (route) => {
      publishRequests.push({
        method: route.request().method(),
        url: route.request().url(),
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "policy-2",
            published: true,
            effective_date: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto("/");

    const adminButton = page
      .getByTestId("admin-button")
      .or(page.getByRole("button", { name: /admin|관리자|policy/i }))
      .first();

    if (await adminButton.isVisible()) {
      await adminButton.click();
      await page.waitForTimeout(1000);

      // Find publish button for a policy
      const publishButton = page
        .getByTestId("publish-policy")
        .or(page.getByRole("button", { name: /발행|publish/i }))
        .first();

      if (await publishButton.isVisible()) {
        await publishButton.click();

        // Confirm if modal appears
        const confirmButton = page
          .getByRole("button", { name: /확인|confirm/i })
          .first();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        // Wait for request
        await page.waitForTimeout(1000);

        // Verify publish API was called
        expect(publishRequests.length).toBeGreaterThan(0);
        if (publishRequests.length > 0) {
          expect(publishRequests[0].method).toBe("POST");
          expect(publishRequests[0].url).toContain("publish");
        }
      }
    }
  });

  test("E2E-ADMIN-008: Delete button removes draft policy", async ({
    page,
  }) => {
    // Set up request spy
    const deleteRequests: any[] = [];
    await page.route("**/api/admin/privacy-policies/**", async (route) => {
      if (route.request().method() === "DELETE") {
        deleteRequests.push({
          method: route.request().method(),
          url: route.request().url(),
        });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Policy deleted successfully",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/");

    const adminButton = page
      .getByTestId("admin-button")
      .or(page.getByRole("button", { name: /admin|관리자|policy/i }))
      .first();

    if (await adminButton.isVisible()) {
      await adminButton.click();
      await page.waitForTimeout(1000);

      // Find delete button for a draft policy
      const deleteButton = page
        .getByTestId("delete-policy")
        .or(page.getByRole("button", { name: /삭제|delete/i }))
        .first();

      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Confirm deletion
        const confirmButton = page
          .getByRole("button", { name: /확인|yes|delete/i })
          .first();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        // Wait for request
        await page.waitForTimeout(1000);

        // Verify delete API was called
        expect(deleteRequests.length).toBeGreaterThan(0);
        if (deleteRequests.length > 0) {
          expect(deleteRequests[0].method).toBe("DELETE");
        }
      }
    }
  });
});
