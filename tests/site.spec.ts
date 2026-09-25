import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { claim } from "../src/data/facts";
import { facts, hero, navigation, seasonalBanner } from "../src/data/site";

// The content the tests expect comes from the content file, so a content
// edit (a confirmed year, a renamed section) never needs a test edit. The
// tests still check where and how each value appears.
const sectionLabels = navigation.items.map((item) => item.label);

// A test that sets its own viewport measures the stylesheet, not the device,
// so it runs once per engine, on that engine's desktop project. The device
// projects keep every test that runs at the device's own screen size. This
// holds while the only pointer-dependent rule is the footer's 44px rows
// (vertical, not measured by these tests); a rule on (pointer) or (hover)
// that changes the first screen or a width would need its test on a phone
// project again.
const oncePerEngine = (testInfo: import("@playwright/test").TestInfo) =>
  test.skip(!testInfo.project.name.startsWith("desktop-"), "runs once per engine");

// The site address the build should report: the deployed URL when testing a
// live site, otherwise the production domain used by local and CI builds.
const expectedSite = process.env.PLAYWRIGHT_BASE_URL
  ? new URL("/", process.env.PLAYWRIGHT_BASE_URL).href
  : "https://caring4acausesupportiveservices.com/";

const pages = ["/", "/donate", "/apply"];

test.describe("accessibility", () => {
  for (const path of pages) {
    test(`${path} has no WCAG 2.2 AA violations`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
    });
  }

  test("404 page has no WCAG 2.2 AA violations", async ({ page }) => {
    await page.goto("/404");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  test("skip link is the first thing keyboard users reach", async ({ page, browserName }) => {
    await page.goto("/");
    // Safari only tabs to links with Option+Tab unless the user changes a setting.
    await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });

  // Kept beside axe on purpose: axe skips hidden elements, so photos inside
  // the closed involvement panels are only checked here.
  test("every image has alt text", async ({ page }) => {
    await page.goto("/");
    const missing = await page.locator("img:not([alt])").count();
    expect(missing).toBe(0);
  });
});

test.describe("device compatibility", () => {
  for (const path of pages) {
    test(`no horizontal scrolling on ${path} at the device's own screen size`, async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
    });
  }

  test("buttons, tabs, doors, and menu links are at least 44px tall", async ({ page }) => {
    await page.goto("/");
    const selectors = [
      ".brand",
      ".site-header nav a",
      "[data-menu-open]",
      ".button",
      "[role=tab]",
      ".checklist summary",
      ".site-footer li a",
      ".door",
      ".yt-link",
      ".arrow-link",
      ".tile",
      "#contact .card",
    ];
    for (const selector of selectors) {
      // A renamed class would otherwise drop out of this check silently.
      expect(await page.locator(selector).count(), `${selector} is on the page`).toBeGreaterThan(0);
      for (const el of await page.locator(selector).all()) {
        if (!(await el.isVisible())) continue;
        const box = await el.boundingBox();
        // Allow half a pixel: Firefox reports sub-pixel heights such as 43.9998.
        expect(box!.height, `${selector} is ${box!.height}px tall`).toBeGreaterThanOrEqual(43.5);
      }
    }
  });

  test("iOS will not turn plain numbers into phone links", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('meta[name="format-detection"]')).toHaveAttribute(
      "content",
      /telephone=no/,
    );
  });

  test("web fonts load", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const loaded = await page.evaluate(() => ({
      display: document.fonts.check('800 1em "Bricolage Grotesque Variable"'),
      body: document.fonts.check('400 1em "Atkinson Hyperlegible Next"'),
    }));
    expect(loaded).toEqual({ display: true, body: true });
  });

  test("the brand marks are inline vector graphics", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".site-header .brand svg")).toHaveCount(1);
    await expect(page.locator(".hero svg.brand-wordmark")).toHaveCount(1);
    await expect(page.locator(".site-footer .brand svg")).toHaveCount(2);
  });

  test("the banner photo and every photo load in a supported format", async ({ page }) => {
    const loaded = async (img: import("@playwright/test").Locator) => {
      await img.scrollIntoViewIfNeeded();
      await expect
        .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
        .toBe(true);
    };
    await page.goto("/");
    await loaded(page.locator(".hero .montage .slide img").first());

    // Photos outside the tabs
    const outside = page.locator("img.photo:not([data-panel] img)");
    expect(await outside.count()).toBeGreaterThanOrEqual(5);
    for (const img of await outside.all()) await loaded(img);

    // Photos inside tabs only load once their tab is open
    for (const id of ["sponsor", "volunteer", "partner"]) {
      await page.locator(`#tab-${id}`).click();
      await loaded(page.locator(`#${id} img.photo`));
    }
  });

  for (const path of pages) {
    test(`${path} loads without console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      page.on("pageerror", (err) => errors.push(err.message));
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(errors).toEqual([]);
    });
  }

  test("the sticky header stays visible after scrolling", async ({ page }) => {
    await page.goto("/");
    // Scroll instantly: the page uses smooth scrolling, which would still be animating.
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight / 2, behavior: "instant" }),
    );
    await expect
      .poll(() => page.locator(".site-header").evaluate((el) => el.getBoundingClientRect().top))
      .toBe(0);
  });
});

test.describe("scrolling stability", () => {
  // On phones the browser's address bar collapses as you scroll, which changes
  // the viewport height. Nothing on the first screen may resize when that
  // happens, or photos appear to zoom while scrolling.
  test("the first screen does not resize when the browser bars collapse", async ({
    page,
  }, testInfo) => {
    oncePerEngine(testInfo);
    await page.setViewportSize({ width: 390, height: 664 });
    await page.goto("/");
    const measure = () =>
      page.evaluate(() => {
        const box = (sel: string) => {
          const r = document.querySelector(sel)!.getBoundingClientRect();
          return [Math.round(r.width), Math.round(r.height)];
        };
        return {
          hero: box(".hero"),
          photo: box(".hero .montage"),
          wordmark: box(".hero .brand-wordmark"),
          door: box(".door--help"),
        };
      });
    const before = await measure();
    await page.setViewportSize({ width: 390, height: 750 }); // bars collapsed
    await page.waitForTimeout(100);
    const after = await measure();
    expect(after).toEqual(before);
  });

  // Every device in the matrix, at its own screen size, gets the first screen
  // its class promises (see docs/DESIGN.md, "The first screen by device").
  test("this device's first screen keeps its promise", async ({ page }) => {
    await page.goto("/");
    const m = await page.evaluate(() => {
      const r = (sel: string) => document.querySelector(sel)?.getBoundingClientRect() ?? null;
      const header = r(".site-header")!;
      return {
        width: innerWidth,
        height: innerHeight,
        wordsUnderHeader: r(".hero .brand-wordmark")!.top - header.bottom,
        helpBottom: r(".door--help")!.bottom,
        giveBottom: r(".door--give")!.bottom,
        sideBySide: r(".door--help")!.top === r(".door--give")!.top,
        stripBottom: r("aside.banner")?.bottom ?? null,
      };
    });
    if (m.width >= 896) {
      // Desktop: the scaled banner (the words sit about 45 reference pixels
      // under the header, at most double), and the strip ends the first screen.
      expect(m.wordsUnderHeader).toBeLessThan(90);
      expect(m.sideBySide).toBe(true);
      if (seasonalBanner.active) expect(m.stripBottom, "the season strip").not.toBeNull();
      if (m.stripBottom !== null) expect(Math.abs(m.stripBottom - m.height)).toBeLessThanOrEqual(2);
    } else if (m.width >= 576) {
      // Tablets: the phone's words beside the photo, both doors on screen, and
      // the strip ends the first screen.
      expect(m.helpBottom).toBeLessThanOrEqual(m.height);
      expect(m.giveBottom).toBeLessThanOrEqual(m.height);
      expect(m.sideBySide).toBe(false);
      if (seasonalBanner.active) expect(m.stripBottom, "the season strip").not.toBeNull();
      if (m.stripBottom !== null) expect(Math.abs(m.stripBottom - m.height)).toBeLessThanOrEqual(2);
    } else {
      // Phones: the words start just under the header and both doors fit.
      expect(m.wordsUnderHeader).toBeLessThanOrEqual(32);
      expect(m.helpBottom).toBeLessThanOrEqual(m.height);
      expect(m.giveBottom).toBeLessThanOrEqual(m.height);
      expect(m.sideBySide).toBe(false);
    }
  });

  for (const [name, width, height] of [
    ["iPhone 12 mini", 375, 629],
    ["iPhone 15", 393, 660],
  ] as const) {
    test(`both doors fit on an ${name} Safari screen`, async ({ page }, testInfo) => {
      oncePerEngine(testInfo);
      await page.setViewportSize({ width, height });
      await page.goto("/");
      const help = await page.locator(".door--help").boundingBox();
      const give = await page.locator(".door--give").boundingBox();
      expect(help!.y + help!.height).toBeLessThanOrEqual(height);
      expect(give!.y + give!.height).toBeLessThanOrEqual(height);
    });
  }

  test("both doors fit on a 1366 × 768 laptop screen", async ({ page }, testInfo) => {
    oncePerEngine(testInfo);
    // The most common desktop size, with about 110px of browser chrome.
    await page.setViewportSize({ width: 1366, height: 657 });
    await page.goto("/");
    const help = await page.locator(".door--help").boundingBox();
    const give = await page.locator(".door--give").boundingBox();
    expect(help!.y + help!.height).toBeLessThanOrEqual(657);
    expect(give!.y + give!.height).toBeLessThanOrEqual(657);
  });

  // On desktop the banner, the trust facts, and the season strip fill the
  // first screen exactly, whatever the screen height (see decision 39).
  for (const [width, height] of [
    [1024, 768], // an iPad in landscape
    [1024, 1366], // an iPad Pro 12.9 upright: tall, so the width bounds the scale
    [1280, 800],
    [1366, 657],
    [1536, 730],
    [1920, 950],
  ]) {
    test(`the first screen ends with the season strip at ${width} × ${height}`, async ({
      page,
    }, testInfo) => {
      oncePerEngine(testInfo);
      // The strip is seasonal content: off, the test is skipped and says so
      // instead of passing with nothing measured.
      test.skip(!seasonalBanner.active, "the season strip is off this season");
      await page.setViewportSize({ width, height });
      await page.goto("/");
      const strip = page.locator("aside.banner");
      await expect(strip).toHaveCount(1);
      const box = await strip.boundingBox();
      expect(Math.abs(box!.y + box!.height - height)).toBeLessThanOrEqual(2);
      const give = await page.locator(".door--give").boundingBox();
      expect(give!.y + give!.height).toBeLessThan(box!.y);
    });
  }

  // Each device class shows one composition: every size in the banner is a
  // multiple of the class's reference pixel (phones and tablets by screen
  // width, desktop by screen height), so two devices of a class show the same
  // picture, line breaks included. Compared as shares of the banner's height.
  const shape = async (page: import("@playwright/test").Page, width: number, height: number) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    return page.evaluate(() => {
      const r = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
      const lines = (sel: string) =>
        Math.round(
          r(sel).height / parseFloat(getComputedStyle(document.querySelector(sel)!).lineHeight),
        );
      // Shares of the text block, not the banner: on desktop the banner can
      // have extra room around the block (a tall portrait screen), and the
      // composition is the block.
      const hero = r(".hero .content");
      const share = (b: DOMRect) => [(b.top - hero.top) / hero.height, b.height / hero.height];
      return {
        wordmark: share(r(".hero .brand-wordmark")),
        h1: share(r(".hero h1")),
        doors: share(r(".doors")),
        // Her lettering starts on the header's left edge, on every screen.
        left: r(".hero .brand-wordmark").left - r(".site-header .brand").left,
        lines: [lines(".hero h1"), lines(".hero .sub"), lines(".door--help .door-body")],
        // The header as a share of the text block's height, and its name's size.
        header: r(".site-header").height / hero.height,
        name: parseFloat(getComputedStyle(document.querySelector(".site-header .brand")!).fontSize),
      };
    });
  };
  for (const [cls, reference, others] of [
    [
      "phone",
      [393, 659],
      [
        [360, 780],
        [440, 763],
        [540, 720],
      ],
    ],
    [
      "tablet",
      [768, 1024],
      [
        [712, 1138],
        [834, 1194],
      ],
    ],
    [
      "desktop",
      [1280, 800],
      [
        [1366, 657],
        [1920, 950],
        [1024, 1366],
      ],
    ],
  ] as const) {
    test(`every ${cls} shows the same banner composition`, async ({ page }, testInfo) => {
      oncePerEngine(testInfo);
      const ref = await shape(page, reference[0], reference[1]);
      for (const [width, height] of others) {
        const other = await shape(page, width, height);
        for (const key of ["wordmark", "h1", "doors"] as const) {
          expect(other[key][0], `${key} top at ${width}`).toBeCloseTo(ref[key][0], 2);
          expect(other[key][1], `${key} height at ${width}`).toBeCloseTo(ref[key][1], 2);
        }
        expect(other.left, `left edge at ${width}`).toBeCloseTo(0, 0);
        expect(ref.left, `left edge at ${reference[0]}`).toBeCloseTo(0, 0);
        expect(other.lines, `line breaks at ${width}`).toEqual(ref.lines);
        if (cls !== "desktop") {
          // Phones and tablets scale the header with the width; the name's
          // size must scale with it exactly (bounded on phones past 450px).
          const scale = (w: number) => (cls === "phone" ? Math.min(w / 393, 1.15) : w / 768);
          expect(other.header, `header at ${width}`).toBeCloseTo(ref.header, 2);
          // Within half a pixel: Firefox rounds computed font sizes.
          expect(other.name / scale(width), `name size at ${width}`).toBeCloseTo(
            ref.name / scale(reference[0]),
            0,
          );
        }
      }
    });
  }
});

// Layout measurements need the web fonts in place: on a cold run the first
// page load can be measured before they arrive, and fallback-font widths
// wrap differently. Loading every declared face is deterministic, unlike
// document.fonts.ready alone, which resolves at once if no load has started.
const fontsSettled = (page: import("@playwright/test").Page) =>
  page.evaluate(async () => {
    await Promise.all(Array.from(document.fonts).map((face) => face.load()));
    await document.fonts.ready;
  });

test.describe("the header by device", () => {
  // The header is painted, not only laid out: a sweep of her logo's bands,
  // a glow under the Donate pill, the wedge's hairlines. Its geometry is
  // checked above; this checks the picture. On every page, the bar on each
  // device of a class, scaled to the class reference's size, must match the
  // reference bar pixel for pixel, within what text antialiasing at another
  // scale changes. A background placed in percent of the bar (a glow that
  // stays mid-bar while the pill moves) or a size not in --sp fails here.
  const bar = async (
    page: import("@playwright/test").Page,
    width: number,
    height: number,
    path: string,
  ) => {
    await page.setViewportSize({ width, height });
    await page.goto(path);
    await fontsSettled(page);
    const box = (await page.locator(".site-header").boundingBox())!;
    const png = await page.screenshot({
      clip: { x: 0, y: box.y, width, height: Math.round(box.height) },
      scale: "css",
      animations: "disabled",
    });
    return "data:image/png;base64," + png.toString("base64");
  };
  for (const { cls, reference, others } of [
    // Phones up to the 450px cap: past it the bar is wider than the column
    // (docs/DESIGN.md), so it is not the same picture and is not compared.
    {
      cls: "phone",
      reference: [393, 659],
      others: [
        [320, 568],
        [360, 780],
        [440, 763],
      ],
    },
    {
      cls: "tablet",
      reference: [768, 1024],
      others: [
        [576, 900],
        [712, 1138],
        [895, 1200],
      ],
    },
    {
      cls: "desktop",
      reference: [1280, 800],
      others: [
        [896, 700],
        [1024, 1366],
        [1366, 657],
        [1920, 950],
        [2560, 1300],
      ],
    },
  ] as const) {
    test(`the header is the same picture on every ${cls}`, async ({ page }, testInfo) => {
      test.skip(!testInfo.project.name.startsWith("desktop-"), "runs once per engine");
      test.slow(); // a dozen page loads and screenshots
      // The bar is one component from the layout on every page, and the
      // preview notice sits above it on every page too, so the home page is
      // the whole picture; a second page would repeat the same screenshots.
      for (const path of ["/"]) {
        const ref = await bar(page, reference[0], reference[1], path);
        for (const [width, height] of others) {
          const other = await bar(page, width, height, path);
          const result = await page.evaluate(
            async ([a, b, w, h]) => {
              const load = (src: string) =>
                new Promise<HTMLImageElement>((resolve) => {
                  const img = new Image();
                  img.onload = () => resolve(img);
                  img.src = src;
                });
              const [ia, ib] = await Promise.all([load(a), load(b)]);
              const pixels = (img: HTMLImageElement) => {
                const canvas = document.createElement("canvas");
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d")!;
                ctx.imageSmoothingQuality = "high";
                ctx.drawImage(img, 0, 0, w, h);
                return ctx.getImageData(0, 0, w, h).data;
              };
              const pa = pixels(ia);
              const pb = pixels(ib);
              let differing = 0;
              let sum = 0;
              for (let i = 0; i < pa.length; i += 4) {
                const d =
                  Math.abs(pa[i] - pb[i]) +
                  Math.abs(pa[i + 1] - pb[i + 1]) +
                  Math.abs(pa[i + 2] - pb[i + 2]);
                sum += d;
                if (d > 96) differing++;
              }
              const n = pa.length / 4;
              return { differing: (differing / n) * 100, mean: sum / n / 3 };
            },
            [ref, other, reference[0], 60] as const,
          );
          // Antialiasing at another scale moves 3 to 7% of the pixels by a
          // little (Chromium; Firefox's text rendering reaches a mean of 14);
          // a moved or missing part moves far more, by a lot.
          expect(result.differing, `pixels differing on ${path} at ${width}`).toBeLessThan(15);
          expect(result.mean, `mean difference on ${path} at ${width}`).toBeLessThan(20);
        }
      }
    });
  }
});

test.describe("every page by device", () => {
  // Layout must scale linearly for this test to mean anything: a paragraph
  // at seven tenths must be seven tenths as wide and tall, or it wraps or
  // stacks differently for a reason that is not the stylesheet's. Only
  // Chromium does, and only above device scale 1 (at scale 1 it positions
  // glyphs on whole pixels); Firefox rounds line heights and WebKit wraps
  // small text differently, so on CI they flipped lines the stylesheet did
  // not. The pages are measured in Chromium at scale 2 (layout is in CSS
  // pixels either way), with a probe that confirms the text is linear there.
  // The drift this catches is in the stylesheet, so one exact engine is
  // enough; the header's pixel comparison runs in all three.
  test.use({ deviceScaleFactor: 2 });
  const textScalesLinearly = (page: import("@playwright/test").Page) =>
    page.evaluate(() => {
      const probe = document.createElement("span");
      probe.textContent =
        "Caring for a Cause Supportive Services Inc. serves Central Indiana families.";
      probe.style.cssText = "position:absolute;white-space:nowrap;font:400 16px var(--font-body)";
      document.body.append(probe);
      const wide = probe.getBoundingClientRect().width;
      probe.style.fontSize = "11.2px";
      const narrow = probe.getBoundingClientRect().width;
      probe.remove();
      return Math.abs(narrow / wide - 0.7) < 0.002;
    });
  // Every size on the site is a multiple of its class's reference pixel (the
  // root font follows --sp, docs/DESIGN.md "Every screen by device"), so a
  // page approved on the reference device must be the same picture, scaled,
  // on every device of the class: every element at the same place, the same
  // size, the same font size, wrapping to the same lines. The one exception
  // is the 44px tap target: a control the scale would make smaller stays 44px,
  // and everything under it moves down by that much. The first screen of the
  // home page has its own tests above.
  type Box = {
    tag: string;
    x: number;
    y: number;
    w: number;
    h: number;
    fs: number;
    full: boolean; // spans the whole screen (a section's background)
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  const selector =
    "section, article, div, form, ul, ol, details, h1, h2, h3, h4, p, li, a, button, summary, label, input, select, textarea, img, svg, [role=tab]";
  const measure = async (
    page: import("@playwright/test").Page,
    width: number,
    height: number,
    path: string,
  ): Promise<Box[]> => {
    await page.setViewportSize({ width, height });
    await page.goto(path);
    await fontsSettled(page);
    return page.evaluate((selector) => {
      // The footer takes the bottom of the screen on a page shorter than the
      // window, which is a different distance on every window height. This
      // test is about the composition, so it measures the page at its
      // natural height and lets the sticky-footer test cover the rest.
      document.body.style.minHeight = "0";
      // Positions are measured from under the home page's first screen, or
      // from the top of main: the header has its own tests above.
      const first = document.querySelector(".first-screen");
      const origin =
        (first ?? document.querySelector("main"))!.getBoundingClientRect()[
          first ? "bottom" : "top"
        ] + scrollY;
      const left = document.querySelector("main .wrap")!.getBoundingClientRect().left;
      const boxes: Box[] = [];
      for (const el of document.querySelectorAll(
        `main :is(${selector}), footer :is(${selector})`,
      )) {
        if (first?.contains(el)) continue;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width === 0 || r.height === 0 || cs.visibility === "hidden" || cs.opacity === "0") {
          continue;
        }
        boxes.push({
          tag:
            el.tagName.toLowerCase() +
            (el.textContent ? ` "${el.textContent.trim().slice(0, 20)}"` : ""),
          x: r.left - left,
          y: r.top + scrollY - origin,
          w: r.width,
          h: r.height,
          fs: parseFloat(cs.fontSize),
          full: r.width >= innerWidth - 1,
          top: r.top + scrollY,
          bottom: r.bottom + scrollY,
          left: r.left,
          right: r.right,
        });
      }
      return boxes;
    }, selector);
  };
  // The length of the union of vertical intervals, so a row of floored
  // controls counts once.
  const unionHeight = (boxes: Box[]) => {
    const sorted = boxes.map((b) => [b.top, b.bottom]).sort((a, b) => a[0] - b[0]);
    let total = 0;
    let end = -Infinity;
    for (const [top, bottom] of sorted) {
      if (bottom <= end) continue;
      total += bottom - Math.max(top, end);
      end = bottom;
    }
    return total;
  };
  const inside = (outer: Box, inner: Box) =>
    outer !== inner &&
    outer.top <= inner.top + 0.5 &&
    outer.bottom >= inner.bottom - 0.5 &&
    outer.left <= inner.left + 0.5 &&
    outer.right >= inner.right - 0.5;
  const tolerance = 2; // reference pixels
  const area = (b: Box) => b.w * b.h;
  const classes: {
    cls: string;
    reference: [number, number];
    others: [number, number][];
    scale: (width: number) => number;
  }[] = [
    {
      cls: "phone",
      reference: [393, 659],
      others: [
        [320, 568],
        [360, 780],
        [440, 763],
        [540, 720],
      ],
      scale: (w) => Math.min(w / 393, 1.15),
    },
    {
      cls: "tablet",
      reference: [768, 1024],
      others: [
        [576, 900],
        [712, 1138],
        [834, 1194],
      ],
      scale: (w) => w / 768,
    },
    {
      cls: "desktop",
      reference: [1280, 800],
      others: [
        [896, 700],
        [1024, 1366],
        [1366, 657],
        [1920, 950],
        [2560, 1300],
      ],
      scale: (w) => Math.min(w / 1280, 2),
    },
  ];
  // The guard's precondition as one test of its own: if a browser update
  // stops positioning text linearly, this fails with a message that says the
  // page-composition guard is off, instead of the guard skipping quietly
  // (docs/APPROACH.md, 4). It surfaces on the Playwright update that caused it.
  test("Chromium still positions text linearly, so the page-composition guard is live", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chrome",
      "layout scales linearly in Chromium only",
    );
    await page.goto("/");
    await fontsSettled(page);
    expect(
      await textScalesLinearly(page),
      "text widths no longer scale linearly in this Chromium: the page-composition tests below are skipping, not passing",
    ).toBe(true);
  });

  for (const { cls, reference, others, scale } of classes) {
    test(`every ${cls} shows the same page composition`, async ({ page }, testInfo) => {
      // Sets its own viewports; Chromium only (see above).
      test.skip(
        testInfo.project.name !== "desktop-chrome",
        "layout scales linearly in Chromium only",
      );
      test.slow(); // two dozen page loads
      await page.goto("/");
      await fontsSettled(page);
      // The precondition has its own test above; here it only skips cleanly.
      test.skip(
        !(await textScalesLinearly(page)),
        "this engine positions glyphs on whole pixels, so text widths do not scale linearly",
      );
      const s0 = scale(reference[0]);
      for (const path of [...pages, "/404"]) {
        const ref = await measure(page, reference[0], reference[1], path);
        for (const [width, height] of others) {
          const at = `${path} at ${width} × ${height}`;
          const other = await measure(page, width, height, path);
          const s = scale(width);
          expect(
            other.map((b) => b.tag),
            `elements on ${at}`,
          ).toEqual(ref.map((b) => b.tag));
          // A control at its 44px floor (plus up to a hairline border each
          // side), which the scale would have made smaller.
          const floored = other.filter(
            (b, i) => b.h >= 43.25 && b.h <= 46.5 && (ref[i].h / s0) * s < b.h - 0.5,
          );
          // The innermost floored box of each (a details element around its
          // summary shares its box; the later one in document order is inside).
          const leaves = floored.filter((b, k) => !floored.some((c, m) => m > k && inside(b, c)));
          const growth = (subset: Box[]) =>
            unionHeight(subset) / s - unionHeight(subset.map((b) => ref[other.indexOf(b)])) / s0;
          const problems: string[] = [];
          other.forEach((b, i) => {
            const a = ref[i];
            const check = (key: "x" | "y" | "w" | "h" | "fs", allowance: number) => {
              const want = a[key] / s0;
              const got = b[key] / s;
              // Hairlines round to whole pixels and photos to whole rows, so
              // the position far down a page may be off by a fraction of a
              // percent; nothing else is allowed.
              const slack = key === "y" ? Math.abs(want) * 0.0005 : 0;
              if (Math.abs(want - got) > tolerance + allowance + slack) {
                problems.push(
                  `${b.tag} ${key}: ${want.toFixed(1)} expected, ${got.toFixed(1)} at ${width}`,
                );
              }
            };
            // A full-bleed box follows the screen, not the column, which on
            // a phone-class window past 450px is narrower than the screen.
            if (!b.full) {
              check("x", 0);
              check("w", 0);
            }
            check("fs", 0);
            // Height: a floored control is exempt; a box around floored
            // controls may grow by their growth.
            if (!floored.includes(b)) check("h", growth(leaves.filter((c) => inside(b, c))));
            // Position: everything under a floored control moves down by its
            // growth, and anything sharing a box with one (a heading centred
            // beside a stack of buttons) may move by the growth inside that box.
            const box = other
              .filter((c) => inside(c, b) && leaves.some((leaf) => inside(c, leaf)))
              .sort((c, d) => area(c) - area(d))[0];
            check("y", growth(leaves.filter((c) => c.top < b.bottom || (box && inside(box, c)))));
          });
          expect(problems, `composition on ${at}`).toEqual([]);
        }
      }
    });
  }
});

test.describe("layout", () => {
  // Widths no device in the matrix has (the matrix covers 360, 375, 402, 412,
  // 440, 768, and 1280 at each device's own size, above). This stays on every
  // project: the footer holds 44px rows only for a coarse pointer, so a
  // phone project and a desktop project are not the same page at one width.
  for (const width of [320, 390, 430, 1024, 1440]) {
    test(`no horizontal scrolling at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
    });
  }

  test("brand and Donate share the first header row", async ({ page }) => {
    await page.goto("/");
    const brand = await page.locator(".site-header .brand").boundingBox();
    const donate = await page.locator(".site-header .donate").boundingBox();
    expect(brand && donate).toBeTruthy();
    expect(Math.abs(brand!.y + brand!.height / 2 - (donate!.y + donate!.height / 2))).toBeLessThan(
      12,
    );
  });

  test("the header and every section share one left edge", async ({ page }) => {
    await page.goto("/");
    const left = async (sel: string) => (await page.locator(sel).first().boundingBox())!.x;
    const header = await left(".site-header .brand");
    for (const sel of [
      ".hero .content",
      "#programs h2",
      "#get-involved h2",
      ".site-footer .brand",
    ]) {
      expect(Math.abs((await left(sel)) - header), sel).toBeLessThan(1);
    }
  });

  test("the two doors have the same size", async ({ page }) => {
    await page.goto("/");
    const help = await page.locator(".door--help").boundingBox();
    const give = await page.locator(".door--give").boundingBox();
    expect(Math.abs(help!.width - give!.width)).toBeLessThan(1);
    expect(Math.abs(help!.height - give!.height)).toBeLessThan(1);
  });
});

test.describe("navigation", () => {
  test("every in-page link points to an element that exists", async ({ page }) => {
    await page.goto("/");
    const hrefs = await page.$$eval("a[href^='/#'], a[href^='#']", (links) =>
      links.map((a) => a.getAttribute("href")!),
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of new Set(hrefs)) {
      const id = href.split("#")[1]!;
      await expect(page.locator(`[id="${id}"]`), `missing target for ${href}`).toHaveCount(1);
    }
  });

  test("links that open a new tab are safe and announced", async ({ page }) => {
    for (const path of pages) {
      await page.goto(path);
      const links = page.locator("a[target='_blank']");
      for (const link of await links.all()) {
        await expect(link).toHaveAttribute("rel", /noopener/);
        await expect(link).toContainText("opens in a new tab");
      }
    }
  });

  test("the header Donate button opens the donation page", async ({ page }) => {
    await page.goto("/");
    await page.locator(".site-header .donate").click();
    await expect(page).toHaveURL(/\/donate\/?$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Give");
  });

  test("the hero doors open the application and donation pages", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".door--help")).toHaveAttribute("href", "/apply");
    await expect(page.locator(".door--give")).toHaveAttribute("href", "/donate");
  });

  test("subpages link back to the home page", async ({ page }) => {
    for (const path of ["/donate", "/apply"]) {
      await page.goto(path);
      await page.locator(".page-hero .back").click();
      await expect(page).toHaveURL(/\/$/);
    }
  });

  test("the desktop header is five plain links and no dropdown", async ({ page, isMobile }) => {
    test.skip(isMobile, "the inline links only show on wide screens");
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    const links = page.locator(".site-header .inline-nav a");
    await expect(links).toHaveText(sectionLabels);
    await expect(page.locator(".site-header button:not([data-menu-open])")).toHaveCount(0);
    await page.getByRole("link", { name: "Get involved", exact: true }).first().click();
    expect(new URL(page.url()).hash).toBe("#get-involved");
    await expect(page.locator("#get-involved")).toBeInViewport();
  });

  test("the footer draws the same map, with Donate as its one action", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".site-footer nav a")).toHaveText([
      navigation.help.label,
      ...sectionLabels,
    ]);
    const donate = page.locator(".site-footer .donate");
    await expect(donate).toHaveText(navigation.donate.label);
    await expect(donate).toHaveAttribute("href", navigation.donate.href);
    // The one action is centred under her lettering, not left with the lockup.
    // The lettering is centred inside a link that spans its column, so its
    // own box is the measure (the link's edge is the page's).
    const wordmark = (await page.locator(".site-footer svg.brand-wordmark").boundingBox())!;
    const button = (await donate.boundingBox())!;
    const inkCentre = wordmark.x + wordmark.width / 2;
    expect(Math.abs(button.x + button.width / 2 - inkCentre)).toBeLessThan(20);
  });

  // A page shorter than the window used to end partway down it, leaving a
  // band of paper under the dark footer. The footer now takes the bottom of
  // the screen however short the page is.
  for (const path of ["/", "/donate", "/apply", "/404"]) {
    test(`no paper shows under the footer on ${path} in a tall window`, async ({
      page,
    }, testInfo) => {
      oncePerEngine(testInfo);
      await page.setViewportSize({ width: 1280, height: 2000 });
      await page.goto(path);
      const gap = await page.evaluate(() => {
        const footer = document.querySelector(".site-footer")!.getBoundingClientRect();
        return window.innerHeight - (footer.bottom + window.scrollY);
      });
      expect(gap).toBeLessThanOrEqual(1);
    });
  }
});

test.describe("menu", () => {
  test("opens as a modal, traps focus, closes with Escape, and returns focus", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "the menu button only shows on phones");
    await page.goto("/");
    const button = page.locator("[data-menu-open]");
    await expect(button).toBeVisible();
    await button.click();
    const menu = page.locator("#menu");
    await expect(menu).toBeVisible();
    await expect(menu).toHaveAttribute("open", "");
    expect(await menu.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    // Focus starts on the dialog, not the close button, so no focus ring
    // is drawn around the X when the menu opens.
    await expect(menu).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(button).toBeFocused();
  });

  test("fills a portrait tablet and keeps the rules clear of the watermark", async ({
    page,
    isMobile,
    viewport,
  }) => {
    test.skip(
      !isMobile || !viewport || viewport.width < 576 || viewport.height < 768,
      "portrait tablets only",
    );
    await page.goto("/");
    await page.locator("[data-menu-open]").click();
    const list = await page.locator("#menu .menu-list").boundingBox();
    const mark = await page.locator("#menu .menu-watermark").boundingBox();
    expect(list && mark).toBeTruthy();
    expect(list!.y + list!.height).toBeGreaterThan(viewport!.height * 0.65);
    expect(list!.y + list!.height).toBeLessThan(mark!.y);
  });

  test("lists Help me, the four sections, and Donate, and nothing else", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "the menu button only shows on phones");
    await page.goto("/");
    await page.locator("[data-menu-open]").click();
    await expect(page.locator("#menu .menu-label")).toHaveText([
      navigation.help.label,
      ...sectionLabels,
      navigation.donate.label,
    ]);
    await expect(page.locator("#menu a")).toHaveCount(sectionLabels.length + 2);
    await expect(page.locator("#menu a").first()).toHaveAttribute("href", navigation.help.href);
    await expect(page.locator("#menu a").last()).toHaveAttribute("href", navigation.donate.href);
    await expect(page.locator("#menu a[href^='tel:'], #menu a[href^='mailto:']")).toHaveCount(0);
  });

  test("choosing a link closes the menu and reaches its target", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the menu button only shows on phones");
    await page.goto("/");
    await page.locator("[data-menu-open]").click();
    await page.locator("#menu .menu-list a", { hasText: "About" }).click();
    await expect(page.locator("#menu")).toBeHidden();
    expect(new URL(page.url()).hash).toBe("#about");
  });

  test("menu links and controls are at least 44px tall", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the menu button only shows on phones");
    await page.goto("/");
    await page.locator("[data-menu-open]").click();
    for (const el of await page.locator("#menu a, #menu button").all()) {
      const box = await el.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(43.5);
    }
  });

  test("open menu has no accessibility violations", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the menu button only shows on phones");
    await page.goto("/");
    await page.locator("[data-menu-open]").click();
    const results = await new AxeBuilder({ page })
      .include("#menu")
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe("get involved tabs", () => {
  test("first tab is selected and other panels are hidden", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("tab", { name: "Sponsor a family" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.locator("#sponsor")).toBeVisible();
    await expect(page.locator("#donate")).toBeHidden();
  });

  test("the page does not scroll to the tabs on load", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test("a tab link in the URL opens that tab", async ({ page }) => {
    await page.goto("/#volunteer");
    await expect(page.locator("#tab-volunteer")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#volunteer")).toBeVisible();
    await expect(page.locator("#sponsor")).toBeHidden();
  });

  test("the Donate tab leads to the donation page", async ({ page }) => {
    await page.goto("/#donate");
    await expect(page.locator("#donate .button")).toHaveAttribute("href", "/donate");
  });

  test("arrow keys, Home, and End move between tabs", async ({ page }) => {
    await page.goto("/");
    await page.locator("#tab-sponsor").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#tab-donate")).toBeFocused();
    await page.keyboard.press("End");
    await expect(page.locator("#tab-partner")).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#tab-sponsor")).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator("#tab-partner")).toBeFocused();
    await expect(page.locator("#partner")).toBeVisible();
  });
});

test.describe("one home per fact", () => {
  // On the first screen each fact appears once: the tagline under the
  // wordmark, the service area in the headline, the founding year in the
  // trust strip. The subhead says what the organization is.
  test("the banner and trust strip do not repeat each other", async ({ page }) => {
    await page.goto("/");
    const area = claim(facts.serviceArea);
    const year = String(claim(facts.founded));
    const times = (text: string, part: string) => text.split(part).length - 1;
    const banner = await page.locator(".hero").innerText();
    expect(times(banner, area), `${area} in the banner`).toBe(1);
    expect(times(banner, year), `${year} in the banner`).toBe(0);
    const strip = await page.locator(".facts").innerText();
    expect(times(strip, year), `${year} in the trust strip`).toBe(1);
    expect(times(strip, area), `${area} in the trust strip`).toBe(0);
    const body = await page.locator("body").innerText();
    expect(times(body, hero.tagline), `${hero.tagline} on the page`).toBe(1);
  });
});

test.describe("honest buttons", () => {
  // Until the payment page and sign-up forms exist in her name, buttons open
  // an email draft, and every such button says so. No button promises a
  // system that isn't there yet.
  for (const path of ["/", "/donate", "/apply"]) {
    test(`every button on ${path} that opens an email says so`, async ({ page }) => {
      await page.goto(path);
      const mailButtons = page.locator('a.button[href^="mailto:"]');
      const count = await mailButtons.count();
      for (let i = 0; i < count; i++) {
        await expect(mailButtons.nth(i)).toHaveText(/email/i);
      }
      const otherButtons = page.locator('a.button:not([href^="mailto:"])');
      const others = await otherButtons.count();
      for (let i = 0; i < others; i++) {
        await expect(otherButtons.nth(i)).not.toHaveText(/email us/i);
      }
    });
  }

  test("the sponsor and partner tabs ask for an email until their forms exist", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#sponsor a.button")).toHaveText("Email us to sponsor");
    await expect(page.locator("#partner a.button")).toHaveText("Email us to partner");
    await expect(page.locator("#volunteer a.button")).toHaveAttribute("href", /^https:/);
    await expect(page.locator("#donate a.button")).toHaveAttribute("href", "/donate");
  });

  test("sending the application says it goes by email", async ({ page }) => {
    await page.goto("/apply");
    await expect(page.locator("[data-send]")).toHaveText(/by email/i);
  });
});

test.describe("donation page", () => {
  test("the chosen amount and frequency travel with the giving link", async ({ page }) => {
    await page.goto("/donate");
    await page.locator("input[name=amount][value='100']").check();
    await page.locator("input[name=frequency][value=monthly]").check();
    await expect(page.locator("[data-summary]")).toHaveText("Your gift: $100, monthly.");
    const go = page.locator(".go");
    const href = decodeURIComponent((await go.getAttribute("href"))!);
    expect(href).toMatch(/\$100/);
    expect(href).toMatch(/monthly/);
  });

  test("Other reveals an amount field", async ({ page }) => {
    await page.goto("/donate");
    await expect(page.locator("#other-amount")).toBeHidden();
    await page.locator("input[name=amount][value=other]").check();
    await expect(page.locator("#other-amount")).toBeVisible();
    await page.locator("#other-amount").fill("75");
    await expect(page.locator("[data-summary]")).toHaveText("Your gift: $75, one time.");
  });

  test("states the nonprofit's EIN and tax status", async ({ page }) => {
    await page.goto("/donate");
    await expect(page.locator(".tax")).toContainText(claim(facts.ein));
    await expect(page.locator(".tax")).toContainText(claim(facts.taxExempt).section);
  });
});

test.describe("application page", () => {
  test("walks through four steps, validates each, and sends by email", async ({ page }) => {
    await page.goto("/apply");
    const form = page.locator("[data-apply]");
    await expect(form).toBeVisible();

    // Step 1: required fields block Next.
    await page.locator("[data-next]").click();
    await expect(page.locator("#firstName")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#firstName")).toBeFocused();
    await page.locator("#firstName").fill("Jane");
    await page.locator("#lastName").fill("Doe");
    await page.locator("#phone").fill("317");
    await page.locator("[data-next]").click();
    await expect(page.locator("#phone")).toHaveAttribute("aria-invalid", "true");
    await page.locator("#phone").fill("317-555-0100");
    await page.locator("input[name=contactMethod][value=Text]").check();
    await page.locator("[data-next]").click();

    // Step 2: household, with a row per child.
    await expect(page.locator("[data-step=household]")).toBeVisible();
    await expect(page.locator("[data-step=you]")).toBeHidden();
    await page.locator("#street").fill("1 Main St");
    await page.locator("#city").fill("Noblesville");
    await page.locator("#zip").fill("46060");
    await page.locator("#county").selectOption("Hamilton");
    await page.locator("#adults").selectOption("2");
    await page.locator("#childCount").selectOption("2");
    await expect(page.locator(".child-row")).toHaveCount(2);
    await page.locator("#child-1-0").selectOption("4");
    await page.locator("#child-2-0").selectOption("9");
    await page.locator("[data-next]").click();

    // Step 3: at least one kind of help, with details that open on demand.
    await expect(page.locator("[data-step=needs]")).toBeVisible();
    await page.locator("[data-next]").click();
    await expect(page.locator("[data-needs-error]")).toBeVisible();
    await expect(page.locator("[data-sub=holiday]")).toBeHidden();
    await page.locator("input[name=need][data-toggle=holiday]").check();
    await expect(page.locator("[data-sub=holiday]")).toBeVisible();
    await page.locator("input[name=holidays][value=Christmas]").check();
    await page.locator("input[name=need][data-toggle=diapers]").check();
    await page.locator("input[name=diaperSizes][value='Size 4']").check();
    // Opened groups must not push the page sideways on a phone.
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBe(0);
    await page.locator("[data-next]").click();

    // Step 4: review shows the answers; sending needs consent and opens email.
    await expect(page.locator("[data-step=review]")).toBeVisible();
    const review = page.locator("[data-review]");
    await expect(review).toContainText("Jane Doe");
    await expect(review).toContainText("Hamilton County");
    await expect(review).toContainText("Child 1");
    await expect(review).toContainText("Christmas");
    await expect(review).toContainText("Size 4");
    await page.locator("[data-send]").click();
    await expect(page.locator("[data-consent-error]")).toBeVisible();
    await page.locator("input[name=consent]").check();

    // Capture the mailto: link instead of leaving the page.
    await page.evaluate(() => {
      document.querySelector("[data-apply]")!.addEventListener("application:send", (event) => {
        event.preventDefault();
        (window as unknown as { __mail: string }).__mail = (event as CustomEvent<string>).detail;
      });
    });
    await page.locator("[data-send]").click();
    await expect(page.locator("[data-done]")).toBeVisible();
    await expect(page.locator("[data-done-text]")).toHaveValue(/Name: Jane Doe/);
    const mail = await page.evaluate(() => (window as unknown as { __mail: string }).__mail);
    expect(mail).toMatch(/^mailto:/);
    expect(decodeURIComponent(mail)).toContain("Holidays: Christmas");
  });

  test("Back returns to the previous step with answers kept", async ({ page }) => {
    await page.goto("/apply");
    await page.locator("#firstName").fill("Jane");
    await page.locator("#lastName").fill("Doe");
    await page.locator("#phone").fill("3175550100");
    await page.locator("[data-next]").click();
    await expect(page.locator("[data-step=household]")).toBeVisible();
    await page.locator("[data-back]").click();
    await expect(page.locator("[data-step=you]")).toBeVisible();
    await expect(page.locator("#firstName")).toHaveValue("Jane");
  });

  test("does not steal focus when the page opens", async ({ page }) => {
    await page.goto("/apply");
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("navigation links are visible inline", async ({ page }) => {
    await page.goto("/");
    const links = page.locator(".site-header .inline-nav a");
    await expect(links).toHaveCount(4);
    await expect(links.first()).toBeVisible();
    await expect(links.last()).toBeVisible();
    await expect(page.locator("[data-menu-open]")).toBeHidden();
  });

  test("all involvement options are visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("tablist")).toBeHidden();
    for (const id of ["sponsor", "donate", "volunteer", "partner"]) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
  });

  test("videos link to YouTube", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-watch]")).toHaveAttribute(
      "href",
      /^https:\/\/www\.youtube\.com\/watch\?v=/,
    );
    await expect(page.locator("#haircuts .yt-link")).toHaveAttribute(
      "href",
      /^https:\/\/www\.youtube\.com\/watch\?v=/,
    );
  });

  test("the application page explains how to apply instead of showing a form that can't send", async ({
    page,
  }) => {
    await page.goto("/apply");
    await expect(page.locator("[data-apply]")).toBeHidden();
    await expect(page.locator(".noscript")).toContainText("Call");
  });

  test("the donation page still offers a way to give", async ({ page }) => {
    await page.goto("/donate");
    await expect(page.locator(".go")).toBeVisible();
  });
});

test.describe("videos", () => {
  test("no image on the site is fetched from YouTube", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (request) => {
      if (/ytimg\.com|youtube\.com/.test(request.url())) external.push(request.url());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(external).toEqual([]);
  });

  test("the haircut video plays in place from its own poster", async ({ page }) => {
    await page.route("https://www.youtube-nocookie.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<p>player</p>" }),
    );
    await page.goto("/");
    const poster = page.locator("#haircuts .yt-link img");
    await poster.scrollIntoViewIfNeeded();
    await expect
      .poll(() => poster.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
      .toBe(true);
    const src = new URL(await poster.evaluate((el: HTMLImageElement) => el.currentSrc));
    expect(src.origin).toBe(new URL(page.url()).origin);
    expect(src.pathname).toMatch(/^\/_astro\//);
    await page.locator("#haircuts .yt-link").click();
    await expect(page.locator("#haircuts iframe")).toHaveAttribute(
      "src",
      /^https:\/\/www\.youtube-nocookie\.com\/embed\//,
    );
  });

  test("watching her story loads the privacy-friendly player on the page", async ({ page }) => {
    await page.route("https://www.youtube-nocookie.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<p>player</p>" }),
    );
    await page.goto("/");
    const button = page.locator("[data-watch]");
    await expect(button).not.toHaveAttribute("target", "_blank");
    await button.click();
    const iframe = page.locator("#about iframe");
    await expect(iframe).toHaveAttribute("src", /^https:\/\/www\.youtube-nocookie\.com\/embed\//);
    await expect(iframe).toHaveAttribute("title", /.+/);
  });
});

test.describe("preview notice", () => {
  const text = "Preview: some details are still being confirmed.";

  for (const path of pages) {
    test(`appears first on ${path}, with exact wording, and cannot be dismissed`, async ({
      page,
    }) => {
      await page.goto(path);
      const notice = page.locator("[data-preview-notice]");
      await expect(notice).toHaveText(text);
      await expect(notice).toHaveRole("complementary");
      await expect(notice).toBeVisible();
      await expect(notice.locator("button, a")).toHaveCount(0);
      // Above the header and the claims it qualifies
      const noticeBox = await notice.boundingBox();
      const headerBox = await page.locator(".site-header").boundingBox();
      expect(noticeBox!.y).toBeLessThan(headerBox!.y);
    });
  }

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });
    test("is still shown", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("[data-preview-notice]")).toHaveText(text);
    });
  });
});

test.describe("search and sharing", () => {
  test("search engines are blocked by default", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/User-agent: \*\nDisallow: \//);
    // Link-preview bots stay allowed so shared links show the logo.
    expect(robots).toContain("User-agent: facebookexternalhit");
    expect(robots).toContain("User-agent: Twitterbot");
  });

  test("page has a title, description, canonical URL, and sharing image", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Caring for a Cause/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.{50,}/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", expectedSite);
    const og = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(new URL(og!).origin).toBe(new URL(expectedSite).origin);
    const image = await request.get(new URL(og!).pathname);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toContain("image/jpeg");
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", og!);
  });

  test("subpages have their own titles and descriptions", async ({ page }) => {
    await page.goto("/donate");
    await expect(page).toHaveTitle(/^Donate \| Caring for a Cause/);
    await page.goto("/apply");
    await expect(page).toHaveTitle(/^Apply for help \| Caring for a Cause/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.{50,}/);
  });

  test("structured data describes the registered nonprofit", async ({ page }) => {
    await page.goto("/");
    const raw = await page.locator('script[type="application/ld+json"]').textContent();
    const data = JSON.parse(raw!);
    expect(data["@type"]).toBe("NGO");
    expect(data.taxID).toBe(claim(facts.ein));
    expect(data.nonprofitStatus).toBe("Nonprofit501c3");
    expect(data.url).toBe(expectedSite);
  });

  test("web manifest and icons load", async ({ request }) => {
    for (const path of [
      "/site.webmanifest",
      "/icon-512.png",
      "/apple-touch-icon.png",
      "/favicon-32.png",
    ]) {
      expect((await request.get(path)).status(), path).toBe(200);
    }
  });

  for (const path of pages) {
    test(`${path} has exactly one h1`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("h1")).toHaveCount(1);
    });
  }

  test("unknown pages return the custom 404", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page doesn't exist");
  });
});
