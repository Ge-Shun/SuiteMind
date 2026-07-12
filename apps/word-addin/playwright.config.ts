import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: [
    {
      command: "npm run dev:e2e",
      url: "http://127.0.0.1:3000/taskpane.html?mockOffice=1",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: "npm run fake-provider",
      url: "http://127.0.0.1:3002/v1",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
