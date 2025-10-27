/// <reference types="node" />

/**
 * Simulation Seed Fixture
 *
 * Provides member session with simulation data seeded.
 * Composes deterministic simulation payloads, localStorage drafts,
 * and offline state to support dashboard/results specs.
 *
 * @see docs/plan/IS-62/plan-00.md - Phase 1: Playwright Fixture Architecture
 * @see https://playwright.dev/docs/test-fixtures
 */

/* eslint-disable react-hooks/rules-of-hooks */
// ^ Playwright fixtures use 'use' callback parameter, not React hooks

import { Page } from "@playwright/test";
import {
  test as authenticatedTest,
  type AuthenticatedFixtures,
} from "./authenticated";
import { mockSimulationAPI } from "../utils/apiMocks/playwright";
import { setSimulationDraft } from "../utils/stateSetup";

/**
 * Simulation seed fixture type
 */
export type SimulationSeedFixtures = {
  /**
   * Seeded simulation state
   * - Composes memberSession
   * - Injects deterministic simulation API responses
   * - Sets localStorage draft for simulation
   */
  simulationSeed: Page;
};

/**
 * simulationSeed fixture object
 * Exported for composition in base.ts
 */
export const simulationSeedFixtures = {
  /**
   * simulationSeed fixture
   * Provides member session with simulation data seeded
   * Composes memberSession and injects simulation mocks on top
   */
  simulationSeed: async (
    { memberSession }: AuthenticatedFixtures,
    use: (r: Page) => Promise<void>
  ) => {
    // Mock simulation API
    await mockSimulationAPI(memberSession);

    // Set simulation draft in localStorage
    await setSimulationDraft(memberSession, {
      plan_id: "A",
      starting_company_round: 1,
      current_company_round: 1,
      simulation_rounds: 12,
      investments: {
        1: 1000000,
        2: 2000000,
        3: 3000000,
      },
    });

    // Provide composed page to test
    await use(memberSession);

    // Cleanup handled by memberSession fixture
  },
};

/**
 * Extended test with simulation seed fixture
 * Builds on top of authenticated member session
 */
export const test = authenticatedTest.extend<SimulationSeedFixtures>(
  simulationSeedFixtures
);

export { expect } from "@playwright/test";
