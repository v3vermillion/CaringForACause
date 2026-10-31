// @ts-check
import { defineConfig } from "astro/config";
import browserslist from "browserslist";
import { browserslistToTargets } from "lightningcss";

// Supported browsers come from the "browserslist" field in package.json.
// Lightning CSS adds vendor prefixes (e.g. -webkit-backdrop-filter for older
// iOS Safari) and lowers newer syntax for those browsers.
const targets = browserslistToTargets(browserslist());

// Absolute site address, used for the canonical URL, the link-preview image and
// the structured data, which only a public (indexed) build names. A preview
// build names no address at all: the preview host is not the site's address,
// and naming it in every page put the account it runs under in the page source
// (decision 99). At launch, set PUBLIC_SITE_URL to the production domain in the
// Worker's build variables (see README "Launch checklist").
const PRODUCTION_URL = "https://caring4acausesupportiveservices.com";
const site = process.env.PUBLIC_SITE_URL || PRODUCTION_URL;

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
