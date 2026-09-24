import { defineConfig, devices } from "@playwright/test";

/**
 * Tests run against the production build served by `astro preview`.
 *
 * The matrix covers the three browser engines. Every iPhone and iPad
 * browser uses WebKit, so iOS coverage comes from the WebKit projects.
 *
 * Set PLAYWRIGHT_BASE_URL to test a deployed site instead (no local server).
 *
 * Local options:
 *   PW_ENGINES=chromium          only run engines you have installed
 *   PW_CHROMIUM_PATH=/path/chrome use an existing Chromium binary
 */
const engines = (process.env.PW_ENGINES ?? "chromium,webkit,firefox").split(",");
const chromiumPath = process.env.PW_CHROMIUM_PATH || undefined;
const liveUrl = process.env.PLAYWRIGHT_BASE_URL;

// [project name, Playwright device profile]
const matrix: [name: string, device: keyof typeof devices][] = [
  // iPhone: smallest current screen, compact older model, standard, largest
  ["iphone-se", "iPhone SE (3rd gen)"],
  ["iphone-12-mini", "iPhone 12 Mini"],
  ["iphone-17", "iPhone 17"],
  ["iphone-17-pro-max", "iPhone 17 Pro Max"],
  ["ipad-mini", "iPad Mini"],
  // Android: narrowest common width, and a standard Pixel
  ["galaxy-s24", "Galaxy S24"],
  ["pixel-7", "Pixel 7"],
  // Desktop
  ["desktop-safari", "Desktop Safari"],
  ["desktop-firefox", "Desktop Firefox"],
  ["desktop-chrome", "Desktop Chrome"],
];

const projects = matrix
  .map(([name, device]) => ({ name, profile: devices[device] }))
  .filter(({ profile }) => engines.includes(profile.defaultBrowserType))
  .map(({ name, profile }) => ({
    name,
    use: {
      ...profile,
      ...(profile.defaultBrowserType === "chromium" && chromiumPath
        ? { launchOptions: { executablePath: chromiumPath } }
        : {}),
    },
  }));

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [["github"], ["list"], ["json", { outputFile: "playwright-report/results.json" }]]
    : "list",
  use: {
    baseURL: liveUrl ?? "http://127.0.0.1:4321",
    trace: "retain-on-failure",
    // A failed layout test attaches the page as it looked, readable from the
    // report or by an agent without opening the trace viewer.
    screenshot: "only-on-failure",
  },
  projects,
  webServer: liveUrl
    ? undefined
    : {
        command: "npm run preview -- --host 127.0.0.1 --port 4321",
        url: "http://127.0.0.1:4321",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
