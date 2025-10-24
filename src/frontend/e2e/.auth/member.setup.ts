/**
 * Auth setup script for member session
 * Generates storageState file with mock Supabase auth tokens
 *
 * @see docs/plan/IS-62/plan-00.md - Phase 1: memberSession storageState
 */

import { test as setup } from "@playwright/test";

const authFile = "./e2e/.auth/member.json";

setup("authenticate as member", async ({ page }) => {
  // Create mock member auth token matching Supabase JWT structure
  const now = Date.now();
  const mockAuthToken = {
    access_token: "mock-member-access-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600000,
    refresh_token: "mock-member-refresh-token",
    user: {
      id: "member-user-id-001",
      email: "member@test.com",
      user_metadata: {
        name: "테스트 회원",
        phone: "010-1234-5678",
      },
    },
  };

  // Set up mock auth state via init script
  await page.addInitScript((token) => {
    // Set E2E mode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__E2E_MODE__ = true;
    window.localStorage.setItem("__e2e_mode__", "true");

    // Set auth token
    window.localStorage.setItem("supabase.auth.token", JSON.stringify(token));
    window.localStorage.setItem("ui.page", '"main"');
    window.localStorage.setItem("ui.noticeOpen", "false");
  }, mockAuthToken);

  // Navigate to trigger init script
  await page.goto("/");

  // Save storageState to file
  await page.context().storageState({ path: authFile });
});
