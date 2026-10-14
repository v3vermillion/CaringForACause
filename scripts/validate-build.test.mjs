// Proves the publish gate blocks broken builds. Run after `npm run build`.
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { validateBuild } from "./validate-build.mjs";

const temps = [];
after(() => temps.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

/** Copies dist/ and applies a change to one file. */
function brokenBuild(file, change) {
  const dir = mkdtempSync(join(tmpdir(), "cfac-gate-"));
  temps.push(dir);
  cpSync("dist", dir, { recursive: true });
  if (file) writeFileSync(join(dir, file), change(readFileSync(join(dir, file), "utf8")));
  return dir;
}
const expectError = (dir, pattern, options = { allowIndexing: false }) => {
  const errors = validateBuild(dir, options);
  assert.ok(
    errors.some((e) => pattern.test(e)),
    `expected an error matching ${pattern}, got:\n${errors.join("\n") || "(none)"}`,
  );
};

describe("publish gate", () => {
  it("passes the real build", () => {
    assert.deepEqual(validateBuild("dist", { allowIndexing: false }), []);
  });

  it("blocks a build without noindex while indexing is off", () => {
    const dir = brokenBuild("index.html", (h) => h.replace("noindex, nofollow", "index, follow"));
    expectError(dir, /robots meta/);
  });

  it("blocks a build whose robots.txt allows crawlers while indexing is off", () => {
    const dir = brokenBuild("robots.txt", () => "User-agent: *\nAllow: /\n");
    expectError(dir, /robots\.txt does not block/);
  });

  it("blocks indexing on any host other than production", () => {
    const dir = brokenBuild("index.html", (h) =>
      h
        .replace("noindex, nofollow", "index, follow")
        .replaceAll("https://caring4acausesupportiveservices.com", "https://example.workers.dev"),
    );
    writeFileSync(join(dir, "robots.txt"), "User-agent: *\nAllow: /\n");
    expectError(dir, /only https:\/\/caring4acausesupportiveservices\.com may be indexed/, {
      allowIndexing: true,
    });
  });

  it("blocks a missing link-preview image", () => {
    const dir = brokenBuild(null);
    rmSync(join(dir, "og-image.jpg"));
    expectError(dir, /og-image\.jpg/);
  });

  it("blocks an in-page link with no target", () => {
    const dir = brokenBuild("index.html", (h) => h.replace('id="about"', 'id="abouts"'));
    expectError(dir, /\/#about has no matching element/);
  });

  it("checks every page, not only the home page", () => {
    const dir = brokenBuild("donate/index.html", (h) =>
      h.replace("</main>", "<h1>Again</h1></main>"),
    );
    expectError(dir, /donate\/index\.html must have exactly one <h1>/);
    const missing = brokenBuild(null);
    rmSync(join(missing, "apply"), { recursive: true });
    expectError(missing, /Missing file: apply\/index\.html/);
  });

  it("blocks a missing image file", () => {
    const dir = brokenBuild("index.html", (h) =>
      h.replace(/\/_astro\/[^"\s]+\.avif/, "/_astro/gone.avif"),
    );
    expectError(dir, /referenced file missing from build: \/_astro\/gone\.avif/i);
  });

  it("blocks an image without alt text", () => {
    const dir = brokenBuild("index.html", (h) => h.replace(/(<img\b[^>]*?)\s+alt="[^"]*"/, "$1"));
    expectError(dir, /image without alt attribute/i);
  });

  it("blocks placeholder text", () => {
    const dir = brokenBuild("index.html", (h) =>
      h.replace("</main>", "<p>(000) 000-0000</p></main>"),
    );
    expectError(dir, /placeholder text/i);
  });

  it("blocks invalid structured data", () => {
    const dir = brokenBuild("index.html", (h) => h.replace('"@type":"NGO"', '"@type":"Thing"'));
    expectError(dir, /expected "NGO"/);
  });

  it("blocks viewport-height units, which cause scroll zoom on phones", () => {
    const dir = brokenBuild("index.html", (h) =>
      h.replace("</style>", ".x{min-height:100svh}</style>"),
    );
    expectError(dir, /viewport-height units/i);
  });

  it("blocks plain vh outside a desktop media block", () => {
    const dir = brokenBuild("index.html", (h) => h.replace("</style>", ".x{height:100vh}</style>"));
    expectError(dir, /viewport-height units/i);
  });

  it("blocks vh inside a phone media block", () => {
    const dir = brokenBuild("index.html", (h) =>
      h.replace("</style>", "@media (min-width:30rem){.x{height:100vh}}</style>"),
    );
    expectError(dir, /viewport-height units/i);
  });

  it("blocks svh and dvh even inside a desktop media block", () => {
    const dir = brokenBuild("index.html", (h) =>
      h.replace("</style>", "@media (min-width:56rem){.x{height:100dvh}}</style>"),
    );
    expectError(dir, /viewport-height units/i);
  });

  it("blocks overflow: clip that Safari 15 would ignore", () => {
    const dir = brokenBuild("index.html", (h) =>
      h.replace("</style>", ".x{overflow:clip}</style>"),
    );
    expectError(dir, /overflow: clip outside @supports/);
    const fallback = brokenBuild("index.html", (h) =>
      h.replace(
        "</style>",
        ".x{overflow:hidden}@supports (overflow:clip){.x{overflow:clip}}</style>",
      ),
    );
    assert.ok(!validateBuild(fallback, { allowIndexing: false }).some((e) => /overflow/.test(e)));
  });

  it("blocks missing security headers", () => {
    const dir = brokenBuild("_headers", (h) => h.replace(/Content-Security-Policy:.*\n/, ""));
    expectError(dir, /missing Content-Security-Policy/);
  });

  it("blocks a link to a page that the host would redirect", () => {
    // Cloudflare answers /donate with a redirect to /donate/, the page itself.
    const dir = brokenBuild("index.html", (h) => h.replace('href="/donate/"', 'href="/donate"'));
    expectError(dir, /link \/donate is redirected by the host; write \/donate\//);
    const missing = brokenBuild("index.html", (h) =>
      h.replace('href="/donate/"', 'href="/donations/"'),
    );
    expectError(missing, /link \/donations\/ leads to no page in the build/);
  });

  it("blocks fonts served outside the hashed, long-cached assets", () => {
    const dir = brokenBuild("index.html", (h) =>
      h.replace(
        "</head>",
        '<link rel="preload" href="/fonts/x.woff2" as="font" type="font/woff2" crossorigin></head>',
      ),
    );
    expectError(dir, /font \/fonts\/x\.woff2 is not in \/_astro\//);
    const css = brokenBuild("index.html", (h) =>
      h.replace("</style>", '@font-face{font-family:X;src:url("/fonts/x.woff2")}</style>'),
    );
    expectError(css, /font \/fonts\/x\.woff2 is not in \/_astro\//);
  });

  it("keeps the not-found page out of search, with no address of its own", () => {
    const canonical = brokenBuild("404.html", (h) =>
      h.replace(
        "</head>",
        '<link rel="canonical" href="https://caring4acausesupportiveservices.com/404/"></head>',
      ),
    );
    expectError(canonical, /404\.html: the not-found page must not name a canonical URL/);
    const indexed = brokenBuild("404.html", (h) => h.replace("noindex, nofollow", "index, follow"));
    expectError(indexed, /404\.html: the not-found page must never be indexed/, {
      allowIndexing: true,
    });
  });

  it("blocks structured data that could end its script early", () => {
    // "</script>" ends it at once (and leaves broken JSON); "<!--" changes
    // how the rest of the script is read. Either is written \u003c.
    const closed = brokenBuild("index.html", (h) =>
      h.replace('"@type":"NGO"', '"@type":"NGO","note":"</script>"'),
    );
    expectError(closed, /structured data is missing or is not valid JSON/);
    const comment = brokenBuild("index.html", (h) =>
      h.replace('"@type":"NGO"', '"@type":"NGO","note":"<!--"'),
    );
    expectError(comment, /structured data has an unescaped "<"/);
  });

  it("blocks duplicate ids and a second h1", () => {
    const dir = brokenBuild("index.html", (h) =>
      h.replace("</main>", '<h1 id="about">Again</h1></main>'),
    );
    expectError(dir, /exactly one <h1>/);
    expectError(dir, /duplicate id: #about/);
  });
});
