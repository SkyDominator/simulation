import { Page } from "@playwright/test";
import * as journeyActions from "./journey-actions";
import {
  initE2EMode as setupInitE2EMode,
  waitForPageLoad,
  waitForMainPage as waitForMainPageState,
  waitForSimulationResults as waitForSimulationResultsState,
  waitForNotification as waitForNotificationState,
  isElementVisible as isElementVisibleState,
  setAuthToken,
} from "./stateSetup";
import {
  mockOTPSuccess as routeMockOTPSuccess,
  mockOTPFailure as routeMockOTPFailure,
  mockSimulationAPI as routeMockSimulationAPI,
  mockConsentSuccess as routeMockConsentSuccess,
  mockNetworkError as routeMockNetworkError,
  mockNoticesAPI as routeMockNoticesAPI,
  mockAdminAPI as routeMockAdminAPI,
  getConsentMockState as routeGetConsentMockState,
  type ConsentMockSnapshot,
} from "./apiMocks/playwright";
import { createMemberAuthToken } from "../../test/shared/fixtures";

export { initE2EMode } from "./stateSetup";

export class TestHelpers {
  constructor(private readonly page: Page) {}

  async fillWhitelistForm(name: string, phone: string): Promise<void> {
    await journeyActions.fillWhitelistForm(this.page, name, phone);
  }

  async fillOTPForm(code: string): Promise<void> {
    await journeyActions.fillOTPForm(this.page, code);
  }

  async selectPlan(planId: string): Promise<void> {
    await journeyActions.selectPlan(this.page, planId);
  }

  async fillInvestmentAmount(round: number, amount: string): Promise<void> {
    await journeyActions.fillInvestmentAmount(this.page, round, amount);
  }

  async waitForSimulationResults(): Promise<void> {
    await waitForSimulationResultsState(this.page);
  }

  async waitForNotification(message: string): Promise<void> {
    await waitForNotificationState(this.page, message);
  }

  async clickNext(): Promise<void> {
    await journeyActions.clickNext(this.page);
  }

  async clickPrevious(): Promise<void> {
    await journeyActions.clickPrevious(this.page);
  }

  async waitForPageLoad(): Promise<void> {
    await waitForPageLoad(this.page);
  }

  async isElementVisible(
    selector: string,
    timeout: number = 5000
  ): Promise<boolean> {
    return await isElementVisibleState(this.page, selector, timeout);
  }

  async waitForMainPage(): Promise<void> {
    await waitForMainPageState(this.page);
  }

  async clickCreateSimulation(): Promise<void> {
    await journeyActions.clickCreateSimulation(this.page);
  }
}

export class APIHelpers {
  static async mockOTPSuccess(page: Page): Promise<void> {
    await routeMockOTPSuccess(page);
  }

  static async mockOTPFailure(
    page: Page,
    scenario: "whitelist" | "invalid_code" | "expired"
  ): Promise<void> {
    await routeMockOTPFailure(page, scenario);
  }

  static async mockSimulationAPI(page: Page): Promise<void> {
    await routeMockSimulationAPI(page);
  }

  static async mockConsentSuccess(page: Page): Promise<void> {
    await routeMockConsentSuccess(page);
  }

  static async mockNetworkError(page: Page, endpoint: string): Promise<void> {
    await routeMockNetworkError(page, endpoint);
  }

  static async mockAuthSuccess(page: Page): Promise<void> {
    await setupInitE2EMode(page);
    await setAuthToken(page, createMemberAuthToken());
  }

  static async mockNoticesAPI(page: Page): Promise<void> {
    await routeMockNoticesAPI(page);
  }

  static async mockAdminAPI(page: Page): Promise<void> {
    await routeMockAdminAPI(page);
  }

  static getConsentMockState(page: Page): ConsentMockSnapshot | null {
    return routeGetConsentMockState(page);
  }
}
