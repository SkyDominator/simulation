/**
 * Journey action helpers for E2E tests
 *
 * Standalone functions for common user interaction flows.
 * These are pure action helpers that don't handle assertions or setup.
 *
 * @see docs/plan/IS-62/plan-00.md - Phase 2: Helper & Mock Consolidation
 * @see docs/plan/IS-62/appendix.md - Section 8.3: Deprecated Patterns
 */

import { Page } from "@playwright/test";

/**
 * Fill the whitelist verification form and submit
 */
export async function fillWhitelistForm(
  page: Page,
  name: string,
  phone: string
): Promise<void> {
  // Use Material-UI label-based selectors
  await page.getByLabel("이름").fill(name);
  await page.getByLabel("휴대폰 번호").fill(phone);
  await page.getByRole("button", { name: "인증번호 받기" }).click();
}

/**
 * Fill the OTP verification form and submit
 */
export async function fillOTPForm(page: Page, code: string): Promise<void> {
  await page.getByLabel("인증번호").fill(code);
  await page.getByRole("button", { name: "인증하기" }).click();
}

/**
 * Select a plan in the plan editor
 */
export async function selectPlan(page: Page, planId: string): Promise<void> {
  // Material-UI Select component renders as a combobox
  // Use data-testid for reliable selection
  await page.click('[data-testid="plan-selector"]');
  // Click the option in the dropdown menu
  await page.click(`li[role="option"]:has-text("${planId} 플랜")`);
}

/**
 * Fill investment amount for specific round
 */
export async function fillInvestmentAmount(
  page: Page,
  round: number,
  amount: string
): Promise<void> {
  // Find the input field associated with the round
  await page
    .locator(`text=${round}회차`)
    .locator("..")
    .locator('input[type="text"]')
    .fill(amount);
}

/**
 * Navigate through multi-step forms - click Next button
 */
export async function clickNext(page: Page): Promise<void> {
  await page.getByRole("button", { name: /다음|Next|계속/i }).click();
}

/**
 * Navigate through multi-step forms - click Previous button
 */
export async function clickPrevious(page: Page): Promise<void> {
  await page.getByRole("button", { name: /이전|Previous|뒤로/i }).click();
}

/**
 * Click create simulation button on dashboard
 */
export async function clickCreateSimulation(page: Page): Promise<void> {
  await page.getByRole("button", { name: "새 시뮬레이션" }).click();
}

/**
 * Complete the privacy consent flow
 */
export async function acceptPrivacyConsent(page: Page): Promise<void> {
  const consentExists = await page
    .locator('[data-testid="consent-checkbox"]')
    .isVisible()
    .catch(() => false);

  if (consentExists) {
    await page.check('[data-testid="consent-checkbox"]');
    await page.click('[data-testid="accept-consent"]');
  }
}

/**
 * Decline privacy consent
 */
export async function declinePrivacyConsent(page: Page): Promise<void> {
  await page.click('[data-testid="decline-consent"]');
}

/**
 * Click Google OAuth login button
 */
export async function clickGoogleLogin(page: Page): Promise<void> {
  await page.click('[data-testid="google-login"]');
}

/**
 * Click Kakao OAuth login button
 */
export async function clickKakaoLogin(page: Page): Promise<void> {
  await page.click('[data-testid="kakao-login"]');
}

/**
 * Navigate to a specific page by clicking main navigation
 */
export async function navigateToPage(
  page: Page,
  pageName: "공지사항" | "문의하기" | "개인 정보 보호 정책"
): Promise<void> {
  await page.getByRole("button", { name: pageName }).click();
}

/**
 * Logout from the application
 */
export async function logout(page: Page): Promise<void> {
  await page.getByRole("button", { name: "로그아웃" }).click();
}

/**
 * Open a simulation for viewing results
 */
export async function openSimulationResults(
  page: Page,
  simulationId: string
): Promise<void> {
  await page.click(`[data-testid="results-${simulationId}"]`);
}

/**
 * Edit a simulation
 */
export async function editSimulation(
  page: Page,
  simulationId: string
): Promise<void> {
  await page.click(`[data-testid="edit-simulation-${simulationId}"]`);
}

/**
 * Delete a simulation
 */
export async function deleteSimulation(
  page: Page,
  simulationId: string
): Promise<void> {
  await page.click(`[data-testid="delete-simulation-${simulationId}"]`);
}

/**
 * Add or update memo for a simulation
 */
export async function updateSimulationMemo(
  page: Page,
  simulationId: string,
  memo: string
): Promise<void> {
  await page.click(`[data-testid="memo-edit-${simulationId}"]`);
  const editButton = page.getByRole("button", { name: "편집" });
  if (await editButton.isVisible()) {
    await editButton.click();
  }

  const memoInput = page.getByTestId("memo-input");
  await memoInput.fill("");
  await memoInput.fill(memo);
  await page.getByTestId("memo-save").click();
}

/**
 * Select multiple simulations for comprehensive results
 */
export async function selectSimulationsForComprehensive(
  page: Page,
  simulationIds: string[]
): Promise<void> {
  for (const id of simulationIds) {
    await page.check(`[data-testid="select-simulation-${id}"]`);
  }
}

/**
 * View comprehensive results
 */
export async function viewComprehensiveResults(page: Page): Promise<void> {
  await page.getByRole("button", { name: "종합 결과" }).click();
}

/**
 * Complete full onboarding flow (whitelist → OTP → consent → OAuth)
 *
 * @param page - Playwright page instance
 * @param userData - User data for whitelist verification
 * @param options - Optional configuration
 * @param options.onBeforeOAuth - Hook to run before clicking OAuth button (e.g., to inject auth tokens)
 */
export async function completeOnboardingFlow(
  page: Page,
  userData: { name: string; phone: string } = {
    name: "홍길동",
    phone: "010-1234-5678",
  },
  options?: { onBeforeOAuth?: (page: Page) => Promise<void> }
): Promise<void> {
  // Navigate to app start
  await page.goto("/");

  // Step 1: Whitelist check
  await fillWhitelistForm(page, userData.name, userData.phone);

  // Step 2: OTP verification (assuming mocked success)
  await page.waitForSelector('[data-testid="otp-input"]', { timeout: 5000 });
  await fillOTPForm(page, "123456");

  // Step 3: Privacy consent (if required)
  await acceptPrivacyConsent(page);

  // Step 4: OAuth login (mocked)
  await page.waitForSelector('[data-testid="google-login"]', { timeout: 5000 });

  // Run pre-OAuth hook if provided (e.g., for token injection in E2E mode)
  if (options?.onBeforeOAuth) {
    await options.onBeforeOAuth(page);
  }

  await clickGoogleLogin(page);

  // Wait for main page
  await page.waitForSelector('[data-testid="main-page"]', { timeout: 10000 });
}

/**
 * Complete pre-authentication journey with assertion hooks
 *
 * Wraps the six-step pre-authentication flow (whitelist → OTP → consent → login → dashboard)
 * with optional hooks for assertions between steps.
 *
 * @param page - Playwright page instance
 * @param userData - User data for whitelist verification
 * @param otpCode - OTP code to use (defaults to "123456")
 * @param hooks - Optional hooks for assertions between steps
 * @param hooks.afterWhitelist - Hook to run after whitelist form submission
 * @param hooks.afterOTP - Hook to run after OTP verification
 * @param hooks.afterConsent - Hook to run after consent acceptance
 * @param hooks.beforeOAuth - Hook to run before OAuth button click (e.g., for token injection)
 * @param hooks.afterOAuth - Hook to run after OAuth login completes
 *
 * @see docs/plan/IS-62/plan-01.md - Phase 3: Positive Journey
 */
export async function completePreAuthJourney(
  page: Page,
  userData: { name: string; phone: string } = {
    name: "홍길동",
    phone: "010-1234-5678",
  },
  otpCode: string = "123456",
  hooks?: {
    afterWhitelist?: (page: Page) => Promise<void>;
    afterOTP?: (page: Page) => Promise<void>;
    afterConsent?: (page: Page) => Promise<void>;
    beforeOAuth?: (page: Page) => Promise<void>;
    afterOAuth?: (page: Page) => Promise<void>;
  }
): Promise<void> {
  // Navigate to app start
  await page.goto("/");

  // Step 1: Whitelist check
  await fillWhitelistForm(page, userData.name, userData.phone);

  if (hooks?.afterWhitelist) {
    await hooks.afterWhitelist(page);
  }

  // Step 2: OTP verification
  await page.waitForSelector('[data-testid="otp-form"]', { timeout: 5000 });
  await fillOTPForm(page, otpCode);

  if (hooks?.afterOTP) {
    await hooks.afterOTP(page);
  }

  // Step 3 & 4: Consent flow orchestration and privacy policy consent
  const consentPageVisible = await page
    .getByTestId("consent-page")
    .isVisible()
    .catch(() => false);

  if (consentPageVisible) {
    await acceptPrivacyConsent(page);

    if (hooks?.afterConsent) {
      await hooks.afterConsent(page);
    }
  }

  // Step 5: OAuth login
  await page.waitForSelector('[data-testid="login-form"]', { timeout: 5000 });

  if (hooks?.beforeOAuth) {
    await hooks.beforeOAuth(page);
  }

  await clickGoogleLogin(page);

  // Step 6: Post-login navigation
  await page.waitForSelector('[data-testid="main-page"]', { timeout: 10000 });

  if (hooks?.afterOAuth) {
    await hooks.afterOAuth(page);
  }
}
