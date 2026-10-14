// Unit tests for the rules the pages derive from the content (src/data/derive.ts):
// content edits the README invites must build.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultAmount, visibleStrip } from "../src/data/derive.ts";
import { donatePage, programs, programStrip } from "../src/data/site.ts";

describe("program strip", () => {
  const strip = [
    { title: "A", href: "/#one" },
    { title: "B", href: "/#one" },
    { title: "C", href: "/#two" },
  ];

  it("keeps every item whose program is shown", () => {
    const list = [
      { slug: "one", active: true },
      { slug: "two", active: true },
    ];
    assert.deepEqual(visibleStrip(strip, list), strip);
  });

  it("drops the items of a hidden program", () => {
    const list = [
      { slug: "one", active: true },
      { slug: "two", active: false },
    ];
    assert.deepEqual(
      visibleStrip(strip, list).map((i) => i.title),
      ["A", "B"],
    );
  });

  it("shows every strip item with the content as it is", () => {
    assert.equal(visibleStrip(programStrip, programs).length, programStrip.length);
  });
});

describe("giving page", () => {
  it("opens on the second amount", () => {
    assert.equal(defaultAmount([25, 50, 100, 250]), 50);
  });

  it("opens on the only amount when there is one", () => {
    assert.equal(defaultAmount([100]), 100);
  });

  it("refuses an empty list", () => {
    assert.throws(() => defaultAmount([]), /at least one amount/);
  });

  it("works with the content as it is", () => {
    assert.ok(donatePage.amounts.includes(defaultAmount(donatePage.amounts)));
  });
});
