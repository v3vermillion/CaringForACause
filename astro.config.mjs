// @ts-check
import { defineConfig } from "astro/config";
import browserslist from "browserslist";
import { browserslistToTargets } from "lightningcss";

// Supported browsers come from the "browserslist" field in package.json.
// Lightning CSS adds vendor prefixes (e.g. -webkit-backdrop-filter for older
// iOS Safari) and lowers newer syntax for those browsers.
const targets = browserslistToTargets(browserslist());

// Static site. The production domain is set here so canonical URLs and
// absolute links are correct once her domain points at the new site.
export default defineConfig({
  site: "https://caring4acausesupportiveservices.com",
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
