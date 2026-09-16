// Unit tests for the fact status model (src/data/facts.ts).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertLaunchReady,
  claim,
  needsConfirmation,
  orgPublished,
  pendingFacts,
  publicRecord,
  show,
} from "../src/data/facts.ts";
import { facts } from "../src/data/site.ts";

describe("fact status", () => {
  const settled = {
    ein: publicRecord("47-4917287", "IRS"),
    area: orgPublished("Central Indiana", "site"),
  };
  const pending = { phone: needsConfirmation("(317) 555-0100", "site", "Which number?") };

  it("returns values", () => {
    assert.equal(claim(settled.ein), "47-4917287");
    assert.equal(show(pending.phone), "(317) 555-0100");
  });

  it("lists only unconfirmed facts", () => {
    assert.deepEqual(pendingFacts({ ...settled, ...pending }), [
      { name: "phone", value: "(317) 555-0100", source: "site", question: "Which number?" },
    ]);
  });

  it("allows a preview build with unconfirmed facts", () => {
    assert.doesNotThrow(() => assertLaunchReady({ ...settled, ...pending }, false));
  });

  it("blocks a launch build with unconfirmed facts and names each question", () => {
    assert.throws(
      () => assertLaunchReady({ ...settled, ...pending }, true),
      /Launch blocked: 1 fact\(s\).*\n.*\n\s+- phone: Which number\?/,
    );
  });

  it("allows a launch build once everything is settled", () => {
    assert.doesNotThrow(() => assertLaunchReady(settled, true));
  });
});

describe("site facts", () => {
  it("every fact names a source", () => {
    for (const [name, f] of Object.entries(facts)) {
      assert.ok(f.source.trim().length > 10, `${name} needs a specific source`);
    }
  });

  it("every unconfirmed fact asks a question", () => {
    for (const p of pendingFacts(facts)) {
      assert.match(p.question, /\?$/, `${p.name} should ask a question`);
    }
  });

  it("the EIN is well formed", () => {
    assert.match(claim(facts.ein), /^\d{2}-\d{7}$/);
  });
});
