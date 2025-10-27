/**
 * Playwright Fixture Architecture - Base Module
 *
 * Provides reusable, typed fixtures for delivering whitelist, authenticated member,
 * admin, and seeded simulation states for Playwright E2E tests.
 *
 * This module composes and re-exports fixtures from specialized modules:
 * - authenticated.ts: memberSession fixture
 * - admin-user.ts: adminSession fixture
 * - with-simulation.ts: simulationSeed fixture
 * - mocked-apis.ts: mockedApis fixture
 *
 * Tests can import from this base module to access all fixtures in one place,
 * or import from specific fixture modules for focused testing.
 *
 * @see docs/plan/IS-62/plan-00.md - Phase 1: Playwright Fixture Architecture
 * @see https://playwright.dev/docs/test-fixtures
 */

import { test as base } from "@playwright/test";
import {
  memberSessionFixtures,
  type AuthenticatedFixtures,
} from "./authenticated";
import { adminSessionFixtures, type AdminUserFixtures } from "./admin-user";
import {
  simulationSeedFixtures,
  type SimulationSeedFixtures,
} from "./with-simulation";
import { mockedApisFixtures, type MockedApisFixtures } from "./mocked-apis";

// Re-export MockedApisController interface for convenience
export type { MockedApisController } from "./mocked-apis";

/**
 * Extended test with all custom fixtures composed
 *
 * Combines fixtures from:
 * - authenticated.ts (memberSession)
 * - admin-user.ts (adminSession)
 * - with-simulation.ts (simulationSeed)
 * - mocked-apis.ts (mockedApis)
 */
export const test = base
  .extend<AuthenticatedFixtures>(memberSessionFixtures)
  .extend<AdminUserFixtures>(adminSessionFixtures)
  .extend<SimulationSeedFixtures>(simulationSeedFixtures)
  .extend<MockedApisFixtures>(mockedApisFixtures);

export { expect } from "@playwright/test";
