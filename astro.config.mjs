// @ts-check
import { defineConfig } from "astro/config";
import browserslist from "browserslist";
import { browserslistToTargets } from "lightningcss";

// Supported browsers come from the "browserslist" field in package.json.
// Lightning CSS adds vendor prefixes (e.g. -webkit-backdrop-filter for older
// iOS Safari) and lowers newer syntax for those browsers.
const targets = browserslistToTargets(browserslist());

// Absolute site address, used for the canonical URL and the link-preview image.
// Link previews (iMessage, Facebook, X) only work if that image URL is live, so
// Cloudflare builds (WORKERS_CI=1) use the workers.dev preview address until her
// domain is connected. At launch, set PUBLIC_SITE_URL to the production domain
// in the Worker's build variables (see README "Launch checklist").
const PRODUCTION_URL = "https://caring4acausesupportiveservices.com";
const PREVIEW_URL = "https://caring-for-a-cause.forgetraining.workers.dev";
const site = process.env.PUBLIC_SITE_URL || (process.env.WORKERS_CI ? PREVIEW_URL : PRODUCTION_URL);

export default defineConfig({
  site,
  output: "static",
  trailingSlash: "ignore",
  build: {
    // The site is one page with ~16 KB of CSS; inlining it removes
    // render-blocking requests and speeds up first paint.
    inlineStylesheets: "always",
  },
  vite: {
    css: {
      transformer: "lightningcss",
      lightningcss: { targets },
    },
    build: {
      cssMinify: "lightningcss",
      // The minify step uses these targets, not css.lightningcss.targets.
      // Keep them in line with the browserslist minimums in package.json.
      cssTarget: ["chrome100", "edge100", "firefox100", "safari15", "ios15"],
    },
  },
});
