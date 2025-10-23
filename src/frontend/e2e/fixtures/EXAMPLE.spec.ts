/**
 * Example Test: Using New Fixture Architecture
 *
 * This file demonstrates how to use the new Playwright fixtures
 * introduced in Phase 1 of the test infrastructure modernization.
 *
 * @see docs/plan/IS-62/plan-00.md - Phase 1: Playwright Fixture Architecture
 * @see src/frontend/e2e/fixtures/base.ts - Fixture implementation
 */

import { test, expect } from "../fixtures/base";

/**
 * Example 1: Using memberSession fixture
 *
 * The memberSession fixture automatically:
 * - Initializes E2E mode
 * - Sets up authenticated member state in localStorage
 * - No need for manual loginTestUser() calls
 */
test.describe("Example: Member Session Fixture", () => {
  test("authenticated member can access dashboard", async ({
    page,
    memberSession: _memberSession,
  }) => {
    // Navigate to the application
    await page.goto("/");

    // The memberSession fixture has already set up auth state
    // User should be on main page automatically
    await expect(page.locator("text=내 시뮬레이션")).toBeVisible();
  });
});

/**
 * Example 2: Using adminSession fixture
 *
 * The adminSession fixture automatically:
 * - Initializes E2E mode
 * - Sets up authenticated admin state with elevated privileges
 * - No need for manual loginAdminUser() calls
 */
test.describe("Example: Admin Session Fixture", () => {
  test("admin can access admin features", async ({
    page,
    adminSession: _adminSession,
  }) => {
    await page.goto("/");

    // The adminSession fixture has set up admin auth and privileges
    // Admin-specific UI should be available
    await expect(page.locator("text=관리자")).toBeVisible();
  });
});

/**
 * Example 3: Using mockedApis fixture
 *
 * The mockedApis fixture provides a centralized controller for API mocking
 * with typed methods and automatic cleanup.
 */
test.describe("Example: Mocked APIs Fixture", () => {
  test("user can complete OTP flow with mocked APIs", async ({
    page,
    mockedApis,
  }) => {
    // Enable OTP success mocking
    await mockedApis.enableOTPSuccess();
    await mockedApis.enableConsentAPI();

    await page.goto("/");

    // Fill whitelist form
    await page.getByLabel("이름").fill("홍길동");
    await page.getByLabel("휴대폰 번호").fill("010-1234-5678");
    await page.getByRole("button", { name: "인증번호 받기" }).click();

    // Fill OTP
    await page.getByLabel("인증번호").fill("123456");
    await page.getByRole("button", { name: "인증하기" }).click();

    // Mocked APIs will respond with success
    // No need for manual cleanup - mockedApis fixture handles it
  });

  test("user sees error with failed whitelist", async ({
    page,
    mockedApis,
  }) => {
    // Enable OTP failure for whitelist scenario
    await mockedApis.enableOTPFailure("whitelist");

    await page.goto("/");

    await page.getByLabel("이름").fill("김철수");
    await page.getByLabel("휴대폰 번호").fill("010-9876-5432");
    await page.getByRole("button", { name: "인증번호 받기" }).click();

    // Should see error message
    await expect(
      page.locator("text=가입 허용 명단에 없는 사용자입니다.")
    ).toBeVisible();
  });
});

/**
 * Example 4: Using simulationSeed fixture
 *
 * The simulationSeed fixture:
 * - Composes with memberSession (automatic dependency)
 * - Injects pre-seeded simulation data into localStorage
 * - Returns typed seed data for assertions
 */
test.describe("Example: Simulation Seed Fixture", () => {
  test("user can see pre-seeded simulation", async ({
    page,
    simulationSeed,
    mockedApis,
  }) => {
    // Enable simulation API mocking
    await mockedApis.enableSimulationAPI();

    await page.goto("/");

    // The simulationSeed fixture has injected draft data
    // Verify we can access the seeded simulation
    expect(simulationSeed.id).toBe("sim-seed-123");
    expect(simulationSeed.plan_id).toBe("A");

    // Check if draft data appears in UI
    await expect(page.locator(`text=${simulationSeed.plan_id}`)).toBeVisible();
  });
});

/**
 * Example 5: Combining multiple fixtures
 *
 * Fixtures can be composed together for complex test scenarios
 */
test.describe("Example: Combining Fixtures", () => {
  test("admin can manage simulations with mocked APIs", async ({
    page,
    adminSession: _adminSession,
    mockedApis,
  }) => {
    // Enable all relevant API mocking
    await mockedApis.enableAdminAPI();
    await mockedApis.enableSimulationAPI();
    await mockedApis.enableNoticesAPI();

    await page.goto("/");

    // adminSession provides auth + privileges
    // mockedApis handles all backend interactions
    // Test can focus on user journey validation

    await expect(page.locator("text=내 시뮬레이션")).toBeVisible();
    await expect(page.locator("text=공지사항")).toBeVisible();
  });
});

/**
 * Example 6: Migration from old helpers
 *
 * Before (using old helpers):
 * ```typescript
 * import { test, expect } from '@playwright/test';
 * import { TestHelpers, APIHelpers, initE2EMode } from '../utils/test-helpers';
 * import { loginTestUser } from '../utils/auth-helpers';
 *
 * test('old way', async ({ page }) => {
 *   await initE2EMode(page);
 *   await loginTestUser(page);
 *   await APIHelpers.mockSimulationAPI(page);
 *   const helpers = new TestHelpers(page);
 *   // ... test logic
 * });
 * ```
 *
 * After (using new fixtures):
 * ```typescript
 * import { test, expect } from '../fixtures/base';
 *
 * test('new way', async ({ page, memberSession, mockedApis }) => {
 *   await mockedApis.enableSimulationAPI();
 *   // ... test logic - auth is already set up
 * });
 * ```
 *
 * Benefits:
 * - Less boilerplate setup code
 * - Automatic cleanup via fixture lifecycle
 * - Type-safe API mocking methods
 * - Composable fixtures for complex scenarios
 * - Dependency injection makes test intent clearer
 */
