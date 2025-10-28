import { Page } from "@playwright/test";
import {
  initE2EMode,
  setAuthToken,
  setAdminFlags,
  clearAuthState,
  isUserAuthenticated as stateIsUserAuthenticated,
  getCurrentUser as stateGetCurrentUser,
} from "./stateSetup";
import {
  createMemberAuthToken,
  createAdminAuthToken,
  createExpiredAuthToken,
} from "../../test/shared/fixtures";
import { completeOnboardingFlow as actionsCompleteOnboardingFlow } from "./journey-actions";

/**
 * Legacy authentication helpers delegating to the modular state/fixture utilities.
 */
export async function loginTestUser(page: Page): Promise<void> {
  await initE2EMode(page);
  await setAuthToken(page, createMemberAuthToken());
}

export async function logoutTestUser(page: Page): Promise<void> {
  await clearAuthState(page);
}

export async function loginAdminUser(page: Page): Promise<void> {
  await initE2EMode(page);
  await setAuthToken(page, createAdminAuthToken());
  await setAdminFlags(page);
}

export async function isUserAuthenticated(page: Page): Promise<boolean> {
  return await stateIsUserAuthenticated(page);
}

export async function getCurrentUser(page: Page): Promise<unknown> {
  return await stateGetCurrentUser(page);
}

export async function mockSessionExpiry(page: Page): Promise<void> {
  await initE2EMode(page);
  await setAuthToken(page, createExpiredAuthToken());
}

export async function completeOnboardingFlow(
  page: Page,
  userData: { name: string; phone: string } = {
    name: "홍길동",
    phone: "010-1234-5678",
  }
): Promise<void> {
  await actionsCompleteOnboardingFlow(page, userData, {
    onBeforeOAuth: async (page) => {
      await initE2EMode(page);
      await setAuthToken(page, createMemberAuthToken());
    },
  });
}
