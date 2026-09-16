// @ts-check
import { defineConfig } from "astro/config";

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
});
