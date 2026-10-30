import { defineConfig, devices } from "@playwright/test";

/**
 * Tests run against the production build served by `npm run preview`, which
 * is Wrangler's local copy of Cloudflare: the site's own headers (its
 * Content-Security-Policy and caching), the /donate -> /donate/ redirect and
 * the 404 page, as the live site serves them (decision 77).
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
// CI runs the suite as five parts, each two devices in this order (ci.yml), so
// each pair puts a slow device with a quick one and the parts finish together.
const matrix: [name: string, device: keyof typeof devices][] = [
  // iPhone: smallest current screen, and a compact older model
  ["iphone-se", "iPhone SE (3rd gen)"],
  ["iphone-12-mini", "iPhone 12 Mini"],
  // iPhone standard, with Android's narrowest common width
  ["iphone-17", "iPhone 17"],
  ["galaxy-s24", "Galaxy S24"],
  // iPhone largest, with desktop Chrome
  ["iphone-17-pro-max", "iPhone 17 Pro Max"],
  ["desktop-chrome", "Desktop Chrome"],
  // iPad, with desktop Firefox
  ["ipad-mini", "iPad Mini"],
  ["desktop-firefox", "Desktop Firefox"],
  // A standard Pixel, with desktop Safari
  ["pixel-7", "Pixel 7"],
  ["desktop-safari", "Desktop Safari"],
];

const projects = matrix
  .map(([name, device]) => ({ name, profile: devices[device] }))
  .filter(({ profile }) => engines.includes(profile.defaultBrowserType))
  .map(({ name, profile }) => ({
    name,
    use: {
      ...profile,
      ...(profile.defaultBrowserType === "chromium"
        ? {
            launchOptions: {
              // Linux Chromium hints glyphs to whole pixels, so text widths
              // don't scale linearly and the page-composition guard cannot
              // run (see its precondition test). Without hinting the widths
              // are fractional and linear; the layout itself does not change.
              args: ["--font-render-hinting=none"],
              ...(chromiumPath ? { executablePath: chromiumPath } : {}),
            },
          }
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
    // Every test starts as a returning visitor: the welcome plays once per
    // browser (decision 87) and would cover the page. Its own tests clear this.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: new URL(liveUrl ?? "http://127.0.0.1:4321").origin,
          localStorage: [{ name: "cfac-welcome-seen", value: "1" }],
        },
      ],
    },
    trace: "retain-on-failure",
    // A failed layout test attaches the page as it looked, readable from the
    // report or by an agent without opening the trace viewer.
    screenshot: "only-on-failure",
  },
  projects,
  webServer: liveUrl
    ? undefined
    : {
        command: "npm run preview -- --ip 127.0.0.1",
        // The site reads no Request.cf, so Wrangler need not fetch one from
        // Cloudflare, and a test run sends no usage report: the server works
        // offline.
        env: { CLOUDFLARE_CF_FETCH_ENABLED: "false", WRANGLER_SEND_METRICS: "false" },
        url: "http://127.0.0.1:4321",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
