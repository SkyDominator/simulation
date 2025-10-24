/**
 * Example E2E Test Using New Fixture Architecture
 *
 * This file demonstrates how to use the new Playwright fixtures from base.ts.
 * It serves as a reference for migrating existing tests to the new infrastructure.
 *
 * @see docs/plan/IS-62/plan-00.md - Phase 1: Playwright Fixture Architecture
 * @example
 *
 * // Old approach (deprecated):
 * test("old way", async ({ page }) => {
 *   const helpers = new TestHelpers(page);
 *   await APIHelpers.mockOTPSuccess(page);
 *   await loginTestUser(page);
 *   await helpers.fillWhitelistForm("홍길동", "010-1234-5678");
 * });
 *
 * // New approach (recommended):
 * test("new way", async ({ memberSession, mockedApis }) => {
 *   const { page } = memberSession;
 *   await mockedApis.otp.mockSendSuccess();
 *   await fillWhitelistForm(page, "홍길동", "010-1234-5678");
 * });
 */

import { test, expect } from "../fixtures/base";
import {
  fillWhitelistForm,
  fillOTPForm,
  acceptPrivacyConsent,
} from "../utils/journeyActions";

/**
 * Example 1: Using memberSession fixture
 * Automatically provides authenticated member state
 */
test("member can access dashboard", async ({ memberSession }) => {
  const { page, authToken } = memberSession;

  // Navigate to main page
  await page.goto("/");

  // Verify authentication state
  await expect(page.locator("text=내 시뮬레이션")).toBeVisible({
    timeout: 10000,
  });

  // Auth token is available for assertions
  expect(authToken.user.id).toBe("test-user-123");
});

/**
 * Example 2: Using adminSession fixture
 * Automatically provides authenticated admin state with admin privileges
 */
test("admin can access admin features", async ({
  adminSession,
  mockedApis,
}) => {
  const { page, authToken } = adminSession;

  // Mock admin verification
  await mockedApis.admin.mockVerify(true);

  // Navigate to admin page
  await page.goto("/admin");

  // Verify admin role
  expect(authToken.user.user_metadata.role).toBe("admin");

  // Admin-specific actions here
});

/**
 * Example 3: Using mockedApis fixture
 * Centralized API mocking with typed controllers
 */
test("user completes onboarding flow", async ({ page, mockedApis }) => {
  // Setup mocks before navigation
  await mockedApis.otp.mockSendSuccess();
  await mockedApis.otp.mockVerifySuccess();
  await mockedApis.consent.mockPrivacyPolicy();
  await mockedApis.consent.mockConsentRecord();

  // Navigate to start
  await page.goto("/");

  // Execute onboarding flow
  await fillWhitelistForm(page, "홍길동", "010-1234-5678");
  await fillOTPForm(page, "123456");
  await acceptPrivacyConsent(page);

  // Verify completion
  await expect(page.locator("text=내 시뮬레이션")).toBeVisible({
    timeout: 10000,
  });
});

/**
 * Example 4: Using simulationSeed fixture
 * Pre-loaded simulation data for testing dashboard and results
 */
test("user views seeded simulations", async ({ simulationSeed }) => {
  const { page, simulationIds } = simulationSeed;

  // Navigate to dashboard
  await page.goto("/");
  await expect(page.locator("text=내 시뮬레이션")).toBeVisible({
    timeout: 10000,
  });

  // Verify simulations are displayed
  for (const id of simulationIds) {
    await expect(page.locator(`[data-simulation-id="${id}"]`)).toBeVisible();
  }

  // Simulations are already mocked and ready for interaction
});

/**
 * Example 5: Composing multiple fixtures
 * Combining memberSession with custom API mocks
 */
test("member creates and runs simulation", async ({
  memberSession,
  mockedApis,
}) => {
  const { page } = memberSession;

  // Setup simulation mocks
  await mockedApis.simulation.mockCreate("sim-new");
  await mockedApis.simulation.mockRun();

  // Navigate and interact
  await page.goto("/");
  // ... simulation creation flow
});

/**
 * Example 6: Error scenario testing with mockedApis
 */
test("handles OTP verification failure", async ({ page, mockedApis }) => {
  // Mock failure scenario
  await mockedApis.otp.mockSendSuccess();
  await mockedApis.otp.mockVerifyInvalidCode();

  await page.goto("/");
  await fillWhitelistForm(page, "홍길동", "010-1234-5678");
  await fillOTPForm(page, "000000"); // Wrong code

  // Verify error message appears
  await expect(
    page.locator('[role="alert"]').filter({ hasText: "올바르지 않습니다" })
  ).toBeVisible();
});

/**
 * Example 7: Consent state tracking
 */
test("tracks consent recording", async ({ page, mockedApis }) => {
  await mockedApis.otp.mockSendSuccess();
  await mockedApis.otp.mockVerifySuccess();
  await mockedApis.consent.mockPrivacyPolicy();
  await mockedApis.consent.mockConsentRecord();
  await mockedApis.consent.mockConsentGet();

  await page.goto("/");
  await fillWhitelistForm(page, "홍길동", "010-1234-5678");
  await fillOTPForm(page, "123456");
  await acceptPrivacyConsent(page);

  // Check consent mock state for diagnostics
  const state = mockedApis.consent.getState();
  expect(state?.postCount).toBe(1);
});
