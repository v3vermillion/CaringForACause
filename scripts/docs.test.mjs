// The documents' cross-references hold: each decision has one number, in
// order, every "decision N" anywhere names one that exists, and every repo
// path the current docs name is in the repository. Decisions keep the paths
// of their day (a file they moved or removed), so their paths are not checked.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = join(import.meta.dirname, "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const walk = (dir) =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );

// "## 65. Title", or "## 43a. Title" for one inserted after its number.
const headings = [...read("docs/DECISIONS.md").matchAll(/^## (\d+)([a-z]?)\. /gm)].map(
  ([, number, letter]) => ({ number: Number(number), letter, id: number + letter }),
);
const docs = ["README.md", "CLAUDE.md", ...walk("docs").filter((file) => file.endsWith(".md"))];
const sources = [
  ...docs,
  ...["src", "scripts", "tests", ".github"].flatMap(walk),
  "astro.config.mjs",
  "playwright.config.ts",
].filter((file) => /\.(md|astro|ts|mjs|css|ya?ml|sh)$/.test(file));

describe("decisions", () => {
  it("are numbered once each, in order", () => {
    const ids = headings.map((h) => h.id);
    assert.deepEqual(
      ids.filter((id, i) => ids.indexOf(id) !== i),
      [],
      "a decision number is used twice",
    );
    const numbered = headings.filter((h) => !h.letter).map((h) => h.number);
    assert.deepEqual(
      numbered,
      numbered.map((_, i) => i + 1),
      "the decisions skip or repeat a number; a new one takes the next number",
    );
    for (const h of headings.filter((h) => h.letter)) {
      const before = headings[headings.indexOf(h) - 1];
      assert.equal(
        before?.number,
        h.number,
        `decision ${h.id} does not follow decision ${h.number}`,
      );
    }
  });

  it("are only cited by numbers that exist", () => {
    const numbers = new Set(headings.map((h) => h.number));
    const missing = sources.flatMap((file) =>
      [...read(file).matchAll(/\b[Dd]ecisions? (\d+)/g)]
        .filter(([, n]) => !numbers.has(Number(n)))
        .map(([cited]) => `${file}: "${cited}"`),
    );
    assert.deepEqual(missing, [], "these cite a decision that does not exist");
  });
});

describe("the current docs", () => {
  it("name only repository paths that exist", () => {
    const missing = docs
      .filter((file) => file !== "docs/DECISIONS.md")
      .flatMap((file) =>
        [...read(file).matchAll(/`((?:src|scripts|tests|public|docs|\.github)\/[^`\s*{}<>]+)`/g)]
          .filter(([, path]) => !existsSync(join(root, path.replace(/[:#].*$/, ""))))
          .map(([, path]) => `${file}: ${path}`),
      );
    assert.deepEqual(
      missing,
      [],
      "these paths are not in the repository: name the file as it is now, or leave a planned one out of backticks",
    );
  });
});
