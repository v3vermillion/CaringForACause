import { test } from "@playwright/test";

// Temporary diagnostic: measures the header bar in Firefox and tries candidate
// fixes for the lockup width. Prints to stdout; never fails. Not for merging.
test("firefox header bar diagnostic", async ({ page, browserName }) => {
  test.skip(browserName !== "firefox", "Firefox only");
  const out: string[] = [];
  for (const [w, h] of [
    [393, 659],
    [360, 780],
    [440, 763],
    [540, 720],
    [768, 1024],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/");
    await page.evaluate(async () => {
      await Promise.all(Array.from(document.fonts).map((f) => f.load()));
      await document.fonts.ready;
    });
    const data = await page.evaluate(() => {
      const r = (sel: string) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { x: +b.x.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2) };
      };
      const probe = document.createElement("div");
      probe.style.cssText = "position:absolute;width:calc(100 * var(--sp));height:1px;";
      document.body.append(probe);
      const sp100 = probe.getBoundingClientRect().width;
      probe.remove();
      const lockup = document.querySelector(".site-header .brand-lockup") as SVGSVGElement;
      const cs = getComputedStyle(lockup);
      const measure = () => ({
        bar: r(".site-header .bar"),
        brand: r(".site-header .brand"),
        icon: r(".site-header .brand-icon"),
        lockup: r(".site-header .brand-lockup"),
        donate: r(".site-header .donate"),
        wedge: r("[data-menu-open]"),
        nav: r(".site-header .inline-nav"),
      });
      const apply = (css: string) => {
        const s = document.createElement("style");
        s.textContent = css;
        document.head.append(s);
        const m = measure();
        s.remove();
        return m;
      };
      return {
        innerWidth,
        htmlClientWidth: document.documentElement.clientWidth,
        bodyClientWidth: document.body.clientWidth,
        sp100,
        lockupComputed: {
          width: cs.width,
          maxWidth: cs.maxWidth,
          flex: cs.flex,
          minWidth: cs.minWidth,
          display: cs.display,
        },
        brandComputed: (() => {
          const b = getComputedStyle(document.querySelector(".site-header .brand")!);
          return { flex: b.flex, minWidth: b.minWidth, display: b.display, width: b.width };
        })(),
        wrap: r(".site-header .wrap"),
        baseline: measure(),
        noScrollbar: apply("html{scrollbar-width:none}"),
        lockupMaxNone: apply(".site-header .brand-lockup{max-width:none}"),
        brandFlexNone: apply(".site-header .brand{flex:none}"),
        brandMinAuto: apply(".site-header .brand{min-width:auto}"),
        lockupMinContent: apply(".site-header .brand-lockup{min-width:max-content}"),
        wedgeNoNegMargins: apply(".site-header .menu-button{margin-left:0;margin-right:0}"),
      };
    });
    out.push(`### ${w}x${h}\n${JSON.stringify(data)}`);
  }
  console.log("FIREFOX-DIAGNOSTIC-BEGIN\n" + out.join("\n") + "\nFIREFOX-DIAGNOSTIC-END");
});
