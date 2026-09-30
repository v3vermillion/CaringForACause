// Publish gate: checks the built site in dist/ and exits non-zero on any
// problem. It runs as the last step of `npm run build`, so Cloudflare (which
// runs `npm run build`) publishes nothing when a check fails, and the last
// good deployment stays live.
//
// Usage: node scripts/validate-build.mjs [distDir]
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";

export const PRODUCTION_ORIGIN = "https://caring4acausesupportiveservices.com";
/** Every page the site publishes, checked one by one. */
export const PAGES = ["index.html", "donate/index.html", "apply/index.html", "404.html"];
const REQUIRED_FILES = [
  ...PAGES,
  "robots.txt",
  "_headers",
  "og-image.jpg",
  "site.webmanifest",
  "favicon-32.png",
  "apple-touch-icon.png",
  "icon-512.png",
];
const REQUIRED_HEADERS = [
  "Content-Security-Policy",
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Referrer-Policy",
];
const PLACEHOLDERS = [
  /\(000\) 000-0000/,
  /lorem ipsum/i,
  /\bTODO\b/,
  /\bundefined\b/,
  /\[object Object\]/,
];

/**
 * Every viewport-height unit in the CSS that is not a plain `vh` inside a
 * `@media (min-width: …)` block of at least 36rem (576px), the tablet and
 * desktop layouts, where the browser's bars don't change the height while
 * scrolling. Media blocks are found by matching braces.
 */
export const DESKTOP_MIN_WIDTH_PX = 576;

export function viewportUnitsOutsideDesktop(html) {
  const desktopRanges = [];
  const media = /@media[^{]*\bmin-width\s*:\s*([0-9.]+)(rem|em|px)[^{]*\{/g;
  let m;
  while ((m = media.exec(html))) {
    const px = parseFloat(m[1]) * (m[2] === "px" ? 1 : 16);
    if (px < DESKTOP_MIN_WIDTH_PX) continue;
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < html.length && depth > 0) {
      if (html[i] === "{") depth++;
      else if (html[i] === "}") depth--;
      i++;
    }
    desktopRanges.push([m.index, i]);
  }
  const found = [];
  const unit = /[0-9.]+(?:[sdl]?vh)\b/g;
  while ((m = unit.exec(html))) {
    const plainVh = !/[sdl]vh$/.test(m[0]);
    const inDesktop = desktopRanges.some(([a, b]) => m.index > a && m.index < b);
    if (!(plainVh && inDesktop)) found.push(m[0]);
  }
  return found;
}

/**
 * @param {string} dist  Path to the built site.
 * @param {{ allowIndexing: boolean }} options
 * @returns {string[]} Problems found. Empty means the build may publish.
 */
export function validateBuild(dist, { allowIndexing }) {
  const errors = [];
  const fail = (msg) => errors.push(msg);
  const read = (file) => readFileSync(join(dist, file), "utf8");

  for (const file of REQUIRED_FILES) {
    if (!existsSync(join(dist, file))) fail(`Missing file: ${file}`);
  }
  if (!existsSync(join(dist, "index.html"))) return errors;

  // Links written as /#section point at the home page from every page.
  const homeIds = new Set(
    parse(read("index.html"))
      .querySelectorAll("[id]")
      .map((el) => el.getAttribute("id")),
  );
  const robotsTxt = existsSync(join(dist, "robots.txt")) ? read("robots.txt") : "";

  for (const page of PAGES) {
    if (!existsSync(join(dist, page))) continue;
    const name = page === "index.html" ? "Home page" : page;
    const raw = read(page);
    const doc = parse(raw);
    const meta = (selector) => doc.querySelector(selector)?.getAttribute("content") ?? "";

    // Page basics
    if (!doc.querySelector("title")?.text.trim()) fail(`${name} has no <title>`);
    if (meta('meta[name="description"]').length < 50)
      fail(`${name}: meta description is missing or too short`);
    const h1s = doc.querySelectorAll("h1").length;
    if (h1s !== 1) fail(`${name} must have exactly one <h1> (found ${h1s})`);

    if (!/^([0-9a-f]{7}|local)$/.test(meta('meta[name="version"]')))
      fail(`${name}: missing build version meta tag`);

    // Canonical URL and link preview
    const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";
    let origin = "";
    try {
      origin = new URL(canonical).origin;
    } catch {
      fail(`${name}: canonical URL is not absolute: "${canonical}"`);
    }
    const ogImage = meta('meta[property="og:image"]');
    try {
      const og = new URL(ogImage);
      if (og.origin !== origin)
        fail(`${name}: og:image (${ogImage}) is not on the canonical host (${origin})`);
      if (!existsSync(join(dist, og.pathname)))
        fail(`${name}: og:image file not in build: ${og.pathname}`);
    } catch {
      fail(`${name}: og:image is missing or not absolute: "${ogImage}"`);
    }
    if (meta('meta[name="twitter:image"]') !== ogImage)
      fail(`${name}: twitter:image does not match og:image`);

    // Search indexing must match the setting, and only production may be indexed
    const robotsMeta = meta('meta[name="robots"]');
    if (allowIndexing) {
      if (robotsMeta !== "index, follow")
        fail(`Indexing is on but ${name} robots meta is "${robotsMeta}"`);
      if (origin && origin !== PRODUCTION_ORIGIN) {
        fail(
          `Indexing is on for ${origin}; only ${PRODUCTION_ORIGIN} may be indexed. Set PUBLIC_SITE_URL.`,
        );
      }
    } else if (robotsMeta !== "noindex, nofollow") {
      fail(`Indexing is off but ${name} robots meta is "${robotsMeta}"`);
    }

    // Structured data
    const ld = doc.querySelector('script[type="application/ld+json"]');
    try {
      const data = JSON.parse(ld?.text ?? "");
      if (data["@type"] !== "NGO")
        fail(`${name}: structured data @type is "${data["@type"]}", expected "NGO"`);
      if (!/^\d{2}-\d{7}$/.test(data.taxID ?? ""))
        fail(`${name}: structured data taxID (EIN) is missing or malformed`);
      if (page === "index.html" && data.url !== canonical)
        fail("Structured data url does not match the canonical URL");
    } catch {
      fail(`${name}: structured data is missing or is not valid JSON`);
    }

    // IDs and in-page links
    const ids = doc.querySelectorAll("[id]").map((el) => el.getAttribute("id"));
    const seen = new Set();
    for (const id of ids) {
      if (seen.has(id)) fail(`${name}: duplicate id: #${id}`);
      seen.add(id);
    }
    for (const a of doc.querySelectorAll("a[href]")) {
      const href = a.getAttribute("href");
      const match = href.match(/^(\/?)#(.+)$/);
      if (match) {
        const id = decodeURIComponent(match[2]);
        const targets = match[1] ? homeIds : seen;
        if (!targets.has(id)) fail(`${name}: link ${href} has no matching element`);
      }
      if (a.getAttribute("target") === "_blank" && !/noopener/.test(a.getAttribute("rel") ?? "")) {
        fail(`${name}: link ${href} opens a new tab without rel="noopener"`);
      }
      if (!href || href === "#") fail(`${name}: empty link: "${a.text.trim()}"`);
    }

    // Images: alt text present, local files exist
    for (const img of doc.querySelectorAll("img")) {
      if (img.getAttribute("alt") === undefined)
        fail(`${name}: image without alt attribute: ${img.getAttribute("src")}`);
    }
    const localRefs = new Set();
    for (const el of doc.querySelectorAll(
      "img[src], source[srcset], img[srcset], link[href], link[imagesrcset]",
    )) {
      for (const attr of ["src", "srcset", "href", "imagesrcset"]) {
        const value = el.getAttribute(attr);
        if (!value) continue;
        for (const part of value.split(",")) {
          const url = part.trim().split(/\s+/)[0];
          if (url.startsWith("/") && !url.startsWith("//")) localRefs.add(url.split(/[?#]/)[0]);
        }
      }
    }
    for (const url of localRefs) {
      if (url !== "/" && !existsSync(join(dist, url)))
        fail(`${name}: referenced file missing from build: ${url}`);
    }

    // Leftover placeholder text
    const text = doc.querySelector("body")?.text ?? "";
    for (const pattern of PLACEHOLDERS) {
      if (pattern.test(text)) fail(`${name}: placeholder text found on the page: ${pattern}`);
    }

    // Viewport-height units (vh, svh, dvh, lvh) make phone layouts resize as the
    // browser's address bar collapses, which looks like photos zooming on scroll.
    // Plain vh is allowed only inside a min-width media block of 36rem or more
    // (tablets and desktop, where the bars don't collapse); everything else is blocked.
    const cssUnits = viewportUnitsOutsideDesktop(raw);
    if (cssUnits.length > 0)
      fail(
        `${name}: viewport-height units in CSS cause scroll zoom on phones: ${[...new Set(cssUnits)].join(", ")}`,
      );
  }

  // robots.txt must agree with the indexing setting
  if (allowIndexing) {
    if (/Disallow: \/\s*$/m.test(robotsTxt)) fail("Indexing is on but robots.txt blocks crawlers");
  } else if (!/User-agent: \*\nDisallow: \//.test(robotsTxt)) {
    fail("Indexing is off but robots.txt does not block crawlers");
  }

  // Security headers
  const headers = existsSync(join(dist, "_headers")) ? read("_headers") : "";
  for (const name of REQUIRED_HEADERS) {
    if (!headers.includes(`${name}:`)) fail(`_headers is missing ${name}`);
  }

  return errors;
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dist = process.argv[2] ?? "dist";
  const allowIndexing = process.env.PUBLIC_ALLOW_INDEXING === "true";
  const errors = validateBuild(dist, { allowIndexing });
  if (errors.length > 0) {
    console.error(`\nBuild validation failed (${errors.length}). Nothing will be published:\n`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    console.error("");
    process.exit(1);
  }
  console.log(`Build validation passed (indexing ${allowIndexing ? "on" : "off"}).`);
}
