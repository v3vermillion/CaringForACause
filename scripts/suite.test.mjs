// Rules the browser tests keep, each learned from a test that broke it:
// - A page a test rewrites is fetched through fetchPage, which asks for an
//   encoding Playwright decodes (the live site sends Firefox zstd).
// - Every scroll a test makes names its behavior: the page scrolls smoothly,
//   so a default scroll is still moving when the test measures.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const spec = readFileSync(join(import.meta.dirname, "..", "tests", "site.spec.ts"), "utf8");
const line = (index) => spec.slice(0, index).split("\n").length;

describe("the browser tests", () => {
  it("fetch a page to rewrite only through fetchPage", () => {
    const helper = spec.indexOf("const fetchPage = ");
    const direct = [...spec.matchAll(/route\.fetch\(/g)]
      .filter((m) => helper < 0 || m.index < helper || m.index > helper + 200)
      .map((m) => line(m.index));
    assert.ok(helper >= 0, "fetchPage is missing from the spec");
    assert.deepEqual(direct, [], "these lines call route.fetch( directly; use fetchPage(route)");
  });

  it("name the behavior of every scroll they make", () => {
    const unnamed = [...spec.matchAll(/\b(scrollTo|scrollBy|scrollIntoView)\(/g)]
      .filter((m) => {
        // The call's own arguments: up to the parenthesis that closes it.
        let depth = 0;
        let end = m.index + m[0].length - 1;
        do {
          if (spec[end] === "(") depth++;
          if (spec[end] === ")") depth--;
          end++;
        } while (depth > 0 && end < spec.length);
        return !/behavior:/.test(spec.slice(m.index, end));
      })
      .map((m) => `line ${line(m.index)}: ${m[1]}`);
    assert.deepEqual(
      unnamed,
      [],
      'give each scroll { behavior: "instant" } (or "smooth" on purpose)',
    );
  });
});
