import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  use: { baseURL: "http://127.0.0.1:5175", channel: "msedge", headless: true },
  outputDir: "../../work/profile-test-results",
  reporter: "list",
});
