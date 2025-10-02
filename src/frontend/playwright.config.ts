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
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
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

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    // trace: "off", // Disable trace to avoid ffmpeg dependency
    trace: "on-first-retry", // Disable trace to avoid ffmpeg dependency

    /* Take screenshots on failure */
    // screenshot: 'only-on-failure',
    screenshot: "off",

    /* Record video on failure - disabled to avoid ffmpeg dependency in CI */
    video: "off",
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
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },

    /* Test against branded browsers. */
    {
      name: "Microsoft Edge",
      use: { ...devices["Desktop Edge"], channel: "msedge" },
    },
    {
      name: "Google Chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
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
