import { Page } from "@playwright/test";

/**
 * Authentication helpers for E2E tests
 */

/**
 * Mock successful user authentication
 */
export async function loginTestUser(page: Page) {
  // Mock Supabase auth for testing
  await page.addInitScript(() => {
    // Set E2E mode flag
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__E2E_MODE__ = true;

    // Mock successful authentication
    window.localStorage.setItem(
      "supabase.auth.token",
      JSON.stringify({
        access_token: "mock-jwt-token",
        refresh_token: "mock-refresh-token",
        expires_at: Date.now() + 3600000, // 1 hour from now
        user: {
          id: "test-user-123",
          email: "test@example.com",
          user_metadata: {
            name: "Test User",
            phone: "010-1234-5678",
          },
        },
      })
    );

    // Mock session state
    window.localStorage.setItem("ui.page", '"main"');
    window.localStorage.setItem("ui.noticeOpen", "false");
  });

  try {
    await page.evaluate(() => {
      // Set E2E mode flag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__E2E_MODE__ = true;

      window.localStorage.setItem(
        "supabase.auth.token",
        JSON.stringify({
          access_token: "mock-jwt-token",
          refresh_token: "mock-refresh-token",
          expires_at: Date.now() + 3600000,
          user: {
            id: "test-user-123",
            email: "test@example.com",
            user_metadata: {
              name: "Test User",
              phone: "010-1234-5678",
            },
          },
        })
      );

      window.localStorage.setItem("ui.page", '"main"');
      window.localStorage.setItem("ui.noticeOpen", "false");
    });
  } catch {
    // Ignored: the page might not have navigated yet. The init script will
    // populate storage on the next navigation in that case.
  }
}

/**
 * Mock user logout
 */
export async function logoutTestUser(page: Page) {
  await page.evaluate(() => {
    window.localStorage.removeItem("supabase.auth.token");
    window.sessionStorage.clear();
  });
}

/**
 * Mock admin user authentication
 */
export async function loginAdminUser(page: Page) {
  await page.addInitScript(() => {
    // Set E2E mode flag
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__E2E_MODE__ = true;

    window.localStorage.setItem(
      "supabase.auth.token",
      JSON.stringify({
        access_token: "mock-admin-jwt-token",
        refresh_token: "mock-admin-refresh-token",
        expires_at: Date.now() + 3600000,
        user: {
          id: "admin-user-123",
          email: "admin@example.com",
          user_metadata: {
            name: "Admin User",
            role: "admin",
          },
        },
      })
    );

    // Set admin privileges
    window.localStorage.setItem("ui.page", '"main"');
    window.localStorage.setItem("ui.noticeOpen", "false");
    window.sessionStorage.setItem("user.isAdmin", "true");
  });

  try {
    await page.evaluate(() => {
      // Set E2E mode flag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__E2E_MODE__ = true;

      window.localStorage.setItem(
        "supabase.auth.token",
        JSON.stringify({
          access_token: "mock-admin-jwt-token",
          refresh_token: "mock-admin-refresh-token",
          expires_at: Date.now() + 3600000,
          user: {
            id: "admin-user-123",
            email: "admin@example.com",
            user_metadata: {
              name: "Admin User",
              role: "admin",
            },
          },
        })
      );

      window.localStorage.setItem("ui.page", '"main"');
      window.localStorage.setItem("ui.noticeOpen", "false");
      window.sessionStorage.setItem("user.isAdmin", "true");
    });
  } catch {
    // If evaluation fails before navigation, the init script handles storage.
  }
}

/**
 * Check if user is authenticated in the UI
 */
export async function isUserAuthenticated(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const token = window.localStorage.getItem("supabase.auth.token");
    return !!token;
  });
}

/**
 * Get current user info from localStorage
 */
export async function getCurrentUser(page: Page) {
  return await page.evaluate(() => {
    const tokenStr = window.localStorage.getItem("supabase.auth.token");
    if (!tokenStr) return null;

    try {
      const tokenData = JSON.parse(tokenStr);
      return tokenData.user;
    } catch {
      return null;
    }
  });
}

/**
 * Mock session expiry scenario
 */
export async function mockSessionExpiry(page: Page) {
  await page.evaluate(() => {
    // Set expired token
    window.localStorage.setItem(
      "supabase.auth.token",
      JSON.stringify({
        access_token: "expired-token",
        refresh_token: "expired-refresh",
        expires_at: Date.now() - 3600000, // 1 hour ago (expired)
        user: {
          id: "test-user-123",
          email: "test@example.com",
        },
      })
    );
  });
}

/**
 * Complete the pre-auth onboarding flow
 */
export async function completeOnboardingFlow(
  page: Page,
  userData: { name: string; phone: string } = {
    name: "홍길동",
    phone: "010-1234-5678",
  }
) {
  // Navigate to app start
  await page.goto("/");

  // Step 1: Whitelist check
  await page.fill('[data-testid="name-input"]', userData.name);
  await page.fill('[data-testid="phone-input"]', userData.phone);
  await page.click('[data-testid="submit-whitelist"]');

  // Step 2: OTP verification (assuming mocked success)
  await page.waitForSelector('[data-testid="otp-input"]', { timeout: 5000 });
  await page.fill('[data-testid="otp-input"]', "123456");
  await page.click('[data-testid="verify-otp"]');

  // Step 3: Privacy consent (if required)
  const consentExists = await page
    .locator('[data-testid="consent-checkbox"]')
    .isVisible()
    .catch(() => false);
  if (consentExists) {
    await page.check('[data-testid="consent-checkbox"]');
    await page.click('[data-testid="accept-consent"]');
  }

  // Step 4: OAuth login (mocked)
  await page.waitForSelector('[data-testid="google-login"]', { timeout: 5000 });

  // Mock successful OAuth completion
  await loginTestUser(page);
  await page.click('[data-testid="google-login"]');

  // Wait for main page
  await page.waitForSelector('[data-testid="main-page"]', { timeout: 10000 });
}
