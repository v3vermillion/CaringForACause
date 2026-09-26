import { test } from "@playwright/test";

// Temporary diagnostic: on WebKit, time scrollIntoViewIfNeeded on every
// photo the loading test visits, sample the page's scroll position and the
// image's box afterwards, and try the candidate fix. Prints; never fails.
test("webkit photo scroll diagnostic", async ({ page, browserName }) => {
  test.skip(browserName !== "webkit", "WebKit only");
  test.setTimeout(300_000);
  const out: Record<string, unknown>[] = [];
  const sample = () =>
    page.evaluate(async () => {
      const tops: number[] = [];
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        tops.push(Math.round(document.scrollingElement!.scrollTop));
      }
      return {
        scrollTops: new Set(tops).size,
        top0: tops[0],
        top29: tops[29],
        play: !!document.querySelector(".montage.play"),
        behavior: getComputedStyle(document.documentElement).scrollBehavior,
      };
    });
  const run = async (
    label: string,
    scroller: (img: import("@playwright/test").Locator) => Promise<unknown>,
  ) => {
    await page.goto("/");
    const imgs = [
      page.locator(".hero .montage .slide img").first(),
      ...(await page.locator("img.photo:not([data-panel] img)").all()),
    ];
    for (const img of imgs) {
      const t0 = Date.now();
      let err = "";
      try {
        await scroller(img);
      } catch (e) {
        err = String(e).split("\n")[0].slice(0, 90);
      }
      const ms = Date.now() - t0;
      const rect = await img.evaluate(async (el) => {
        const r: string[] = [];
        for (let i = 0; i < 30; i++) {
          await new Promise((res) => requestAnimationFrame(res));
          const b = el.getBoundingClientRect();
          r.push([b.x, b.y, b.width, b.height].map((v) => +v.toFixed(2)).join(","));
        }
        return {
          src: (el as HTMLImageElement).currentSrc.split("/").pop()?.split(".")[0],
          distinct: new Set(r).size,
          r0: r[0],
          r29: r[29],
          complete: (el as HTMLImageElement).complete,
        };
      });
      out.push({ label, ...rect, ms, err, ...(await sample()) });
    }
  };
  await run("scrollIntoViewIfNeeded", (img) => img.scrollIntoViewIfNeeded({ timeout: 12_000 }));
  await run("evaluate scrollIntoView instant", (img) =>
    img.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" })),
  );
  await run("scrollIntoViewIfNeeded, scroll-behavior auto", async (img) => {
    await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
    await img.scrollIntoViewIfNeeded({ timeout: 12_000 });
  });
  console.log(
    "WEBKIT-DIAGNOSTIC-BEGIN\n" +
      out.map((o) => JSON.stringify(o)).join("\n") +
      "\nWEBKIT-DIAGNOSTIC-END",
  );
});
