// Unit tests for the rules the pages derive from the content (src/data/derive.ts):
// content edits the README invites must build.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { crossfade, defaultAmount, scriptJson, visibleStrip } from "../src/data/derive.ts";
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

describe("banner crossfade", () => {
  // Each photo's opacity at time t of the cycle, from the keyframe stops and
  // the delay Hero.astro gives photo i (i × hold − fade), read linearly.
  const opacity = (count, i, t) => {
    const { cycle, hold, fade, stops } = crossfade(count);
    const p = (((((t - (i * hold - fade)) % cycle) + cycle) % cycle) / cycle) * 100;
    if (p <= stops.shown) return p / stops.shown;
    if (p <= stops.held) return 1;
    if (p <= stops.gone) return (stops.gone - p) / (stops.gone - stops.held);
    return 0;
  };
  const moments = (count) => {
    const { cycle } = crossfade(count);
    return Array.from({ length: 2000 }, (_, k) => (k / 2000) * cycle);
  };

  for (const count of [2, 3, 4, 5, 6]) {
    it(`never leaves the banner without a photo (${count} photos)`, () => {
      for (const t of moments(count)) {
        const most = Math.max(...Array.from({ length: count }, (_, i) => opacity(count, i, t)));
        // Halfway through a crossfade both photos are at a half.
        assert.ok(most > 0.499, `no photo at ${t.toFixed(2)}s of ${count}`);
      }
    });

    it(`shows every photo on its own (${count} photos)`, () => {
      for (let i = 0; i < count; i++) {
        // A later photo is drawn over an earlier one.
        const alone = moments(count).some(
          (t) =>
            opacity(count, i, t) === 1 &&
            Array.from({ length: count - i - 1 }, (_, k) => opacity(count, i + 1 + k, t)).every(
              (o) => o === 0,
            ),
        );
        assert.ok(alone, `photo ${i + 1} of ${count} is never seen on its own`);
      }
    });
  }

  it("keeps the approved timing for four photos", () => {
    const { cycle, stops } = crossfade(4);
    assert.equal(cycle, 28);
    assert.deepEqual(stops, { shown: 8, held: 25, gone: 33 });
  });

  it("writes keyframes for the banner as it is, and none for one photo", () => {
    assert.match(
      crossfade(4).keyframes,
      /@keyframes crossfade\{0%\{opacity:0\}8%,25%\{opacity:1\}33%,100%/,
    );
    assert.equal(crossfade(1).keyframes, "");
  });
});

describe("structured data", () => {
  it("cannot end its script element early", () => {
    const text = scriptJson({ name: "A </script><script>alert(1)</script> B" });
    assert.ok(!text.includes("<"));
    assert.deepEqual(JSON.parse(text), { name: "A </script><script>alert(1)</script> B" });
  });
});
