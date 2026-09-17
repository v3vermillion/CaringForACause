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
    const dir = brokenBuild("index.html", (h) => h.replace('id="get-help"', 'id="gethelp"'));
    expectError(dir, /\/#get-help has no matching element/);
  });

  it("blocks a missing image file", () => {
    const dir = brokenBuild("index.html", (h) =>
      h.replace(/\/_astro\/[^"\s]+\.avif/, "/_astro/gone.avif"),
    );
    expectError(dir, /Referenced file missing from build: \/_astro\/gone\.avif/);
  });

  it("blocks an image without alt text", () => {
    const dir = brokenBuild("index.html", (h) => h.replace(/(<img\b[^>]*?)\s+alt="[^"]*"/, "$1"));
    expectError(dir, /Image without alt attribute/);
  });

  it("blocks placeholder text", () => {
    const dir = brokenBuild("index.html", (h) =>
      h.replace("</main>", "<p>(000) 000-0000</p></main>"),
    );
    expectError(dir, /Placeholder text/);
  });

  it("blocks invalid structured data", () => {
    const dir = brokenBuild("index.html", (h) => h.replace('"@type":"NGO"', '"@type":"Thing"'));
    expectError(dir, /expected "NGO"/);
  });

  it("blocks viewport-height units, which cause scroll zoom on phones", () => {
    const dir = brokenBuild("index.html", (h) =>
      h.replace("</style>", ".x{min-height:100svh}</style>"),
    );
    expectError(dir, /Viewport-height units/);
  });

  it("blocks missing security headers", () => {
    const dir = brokenBuild("_headers", (h) => h.replace(/Content-Security-Policy:.*\n/, ""));
    expectError(dir, /missing Content-Security-Policy/);
  });

  it("blocks a preview build without the preview notice", () => {
    const dir = brokenBuild("index.html", (h) =>
      h.replace(/<aside[^>]*data-preview-notice[^>]*>.*?<\/aside>/s, ""),
    );
    expectError(dir, /missing the preview notice/);
  });

  it("blocks duplicate ids and a second h1", () => {
    const dir = brokenBuild("index.html", (h) =>
      h.replace("</main>", '<h1 id="about">Again</h1></main>'),
    );
    expectError(dir, /exactly one <h1>/);
    expectError(dir, /Duplicate id: #about/);
  });
});
