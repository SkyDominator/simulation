/// <reference types="node" />
import { defineConfig, devices } from "@playwright/test";

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Unlock additional parallelism on CI while keeping local defaults flexible. */
  workers: process.env.CI ? 3 : undefined,
  /* Stop after 5 test failures */
  // maxFailures: 5,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  // reporter: "html",
  reporter: [
    ["list"], // Console output with verbose details
    ["json", { outputFile: "test-results/results.json" }], // JSON report
    ["html", { outputFolder: "playwright-report", open: "never" }], // HTML report
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://localhost:4173", // Vite preview server

    /* Collect rich artifacts for failure triage. */
    trace: "retain-on-failure",

    /* Capture visual context when assertions fail. */
    screenshot: "only-on-failure",

    /* Retain videos on failing assertions for replay-driven debugging. */
    video: "retain-on-failure",
  },

  /* Configure projects for major browsers */
  projects: [
    // {
    //   name: "chromium",
    //   use: { ...devices["Desktop Chrome"] },
    // },

    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },

    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },

    /* Test against mobile viewports. */
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 5"],
        // Force landscape orientation to avoid LandscapeEnforcer overlay during tests
        viewport: { width: 851, height: 393 },
      },
    },
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run preview",
    port: 4173,
    cwd: "./",
    reuseExistingServer: true, // Always reuse existing server for now
  },
});
