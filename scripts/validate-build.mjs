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
const REQUIRED_FILES = [
  "index.html",
  "404.html",
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

  const raw = read("index.html");
  const doc = parse(raw);
  const meta = (selector) => doc.querySelector(selector)?.getAttribute("content") ?? "";

  // Page basics
  if (!doc.querySelector("title")?.text.trim()) fail("Home page has no <title>");
  if (meta('meta[name="description"]').length < 50)
    fail("Meta description is missing or too short");
  const h1s = doc.querySelectorAll("h1").length;
  if (h1s !== 1) fail(`Home page must have exactly one <h1> (found ${h1s})`);

  if (!/^([0-9a-f]{7}|local)$/.test(meta('meta[name="version"]')))
    fail("Missing build version meta tag");

  // Canonical URL and link preview
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";
  let origin = "";
  try {
    origin = new URL(canonical).origin;
  } catch {
    fail(`Canonical URL is not absolute: "${canonical}"`);
  }
  const ogImage = meta('meta[property="og:image"]');
  try {
    const og = new URL(ogImage);
    if (og.origin !== origin)
      fail(`og:image (${ogImage}) is not on the canonical host (${origin})`);
    if (!existsSync(join(dist, og.pathname))) fail(`og:image file not in build: ${og.pathname}`);
  } catch {
    fail(`og:image is missing or not absolute: "${ogImage}"`);
  }
  if (meta('meta[name="twitter:image"]') !== ogImage) fail("twitter:image does not match og:image");

  // Search indexing must match the setting, and only production may be indexed
  const robotsMeta = meta('meta[name="robots"]');
  const robotsTxt = existsSync(join(dist, "robots.txt")) ? read("robots.txt") : "";
  if (allowIndexing) {
    if (robotsMeta !== "index, follow") fail(`Indexing is on but robots meta is "${robotsMeta}"`);
    if (/Disallow: \/\s*$/m.test(robotsTxt)) fail("Indexing is on but robots.txt blocks crawlers");
    if (origin && origin !== PRODUCTION_ORIGIN) {
      fail(
        `Indexing is on for ${origin}; only ${PRODUCTION_ORIGIN} may be indexed. Set PUBLIC_SITE_URL.`,
      );
    }
  } else {
    if (robotsMeta !== "noindex, nofollow")
      fail(`Indexing is off but robots meta is "${robotsMeta}"`);
    if (!/User-agent: \*\nDisallow: \//.test(robotsTxt))
      fail("Indexing is off but robots.txt does not block crawlers");
  }

  // Preview notice: required on the private preview, forbidden on the public site
  const notice = doc.querySelector("[data-preview-notice]");
  if (!allowIndexing && !notice) fail("Preview build is missing the preview notice");
  if (allowIndexing && notice) fail("Public build still shows the preview notice");

  // Structured data
  const ld = doc.querySelector('script[type="application/ld+json"]');
  try {
    const data = JSON.parse(ld?.text ?? "");
    if (data["@type"] !== "NGO")
      fail(`Structured data @type is "${data["@type"]}", expected "NGO"`);
    if (!/^\d{2}-\d{7}$/.test(data.taxID ?? ""))
      fail("Structured data taxID (EIN) is missing or malformed");
    if (data.url !== canonical) fail("Structured data url does not match the canonical URL");
  } catch {
    fail("Structured data is missing or is not valid JSON");
  }

  // IDs and in-page links
  const ids = doc.querySelectorAll("[id]").map((el) => el.getAttribute("id"));
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) fail(`Duplicate id: #${id}`);
    seen.add(id);
  }
  for (const a of doc.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href");
    const match = href.match(/^\/?#(.+)$/);
    if (match && !seen.has(decodeURIComponent(match[1])))
      fail(`Link ${href} has no matching element`);
    if (a.getAttribute("target") === "_blank" && !/noopener/.test(a.getAttribute("rel") ?? "")) {
      fail(`Link ${href} opens a new tab without rel="noopener"`);
    }
    if (!href || href === "#") fail(`Empty link: "${a.text.trim()}"`);
  }

  // Images: alt text present, local files exist
  for (const img of doc.querySelectorAll("img")) {
    if (img.getAttribute("alt") === undefined)
      fail(`Image without alt attribute: ${img.getAttribute("src")}`);
  }
  const localRefs = new Set();
  for (const el of doc.querySelectorAll("img[src], source[srcset], img[srcset], link[href]")) {
    for (const attr of ["src", "srcset", "href"]) {
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
      fail(`Referenced file missing from build: ${url}`);
  }

  // Leftover placeholder text
  const text = doc.querySelector("body")?.text ?? "";
  for (const pattern of PLACEHOLDERS) {
    if (pattern.test(text)) fail(`Placeholder text found on the page: ${pattern}`);
  }

  // Security headers
  const headers = existsSync(join(dist, "_headers")) ? read("_headers") : "";
  for (const name of REQUIRED_HEADERS) {
    if (!headers.includes(`${name}:`)) fail(`_headers is missing ${name}`);
  }

  // 404 page
  if (existsSync(join(dist, "404.html"))) {
    const notFound = parse(read("404.html"));
    if (notFound.querySelectorAll("h1").length !== 1) fail("404 page must have exactly one <h1>");
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
