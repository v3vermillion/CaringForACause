import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { claim } from "../src/data/facts";
import {
  about,
  facts,
  getInvolved,
  hero,
  links,
  navigation,
  org,
  programStrip,
  seasonalBanner,
} from "../src/data/site";

// The content the tests expect comes from the content file, so a content
// edit (a confirmed year, a renamed section) never needs a test edit. The
// tests still check where and how each value appears.
const sectionLabels = navigation.items.map((item) => item.label);

// A test that sets its own viewport measures the stylesheet, not the device,
// so it runs once per engine, on that engine's desktop project. The device
// projects keep every test that runs at the device's own screen size. This
// holds while the only pointer-dependent rules are the footer's 44px rows
// (vertical, not measured by these tests) and the form fields' 16px text
// under a touch pointer (checked on the phone projects by "no field makes iOS
// zoom"; these tests measure the page as a mouse sees it); a rule on
// (pointer) or (hover) that changes the first screen or a width would need
// its test on a phone project again.
const oncePerEngine = (testInfo: import("@playwright/test").TestInfo) =>
  test.skip(!testInfo.project.name.startsWith("desktop-"), "runs once per engine");

// The site address the build should report: the deployed URL when testing a
// live site, otherwise the production domain used by local and CI builds.
const expectedSite = process.env.PLAYWRIGHT_BASE_URL
  ? new URL("/", process.env.PLAYWRIGHT_BASE_URL).href
  : "https://caring4acausesupportiveservices.com/";

const pages = ["/", "/donate", "/apply"];

// Fetches a page for a test to rewrite before the browser gets it.
// Playwright's own fetch decodes gzip, deflate and br, not zstd. The deployed
// site answers Firefox's accept-encoding (which lists zstd) with zstd, and the
// page would be rewritten and fulfilled as undecoded bytes; so the fetch asks
// for an encoding Playwright decodes.
const fetchPage = (route: import("@playwright/test").Route) =>
  route.fetch({
    headers: { ...route.request().headers(), "accept-encoding": "gzip, deflate, br" },
  });

// The one host that may be indexed (scripts/validate-build.mjs).
const PRODUCTION_ORIGIN = "https://caring4acausesupportiveservices.com";

// The Get involved tab whose button leads to the giving page.
const donateTab = getInvolved.tabs.find((tab) => tab.id === "donate")!;

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

  // A link's arrow and an error's "!" are decoration: not part of the name.
  test("decorative arrows are not read aloud", async ({ page }) => {
    await page.goto("/apply");
    await expect(page.locator(".side .arrow-link")).toHaveAccessibleName("Email us");
  });

  test("headings and the proof line keep a space between their parts", async ({ page }) => {
    await page.goto("/");
    // What a screen reader or a copy reads: the text outside aria-hidden.
    const read = (selector: string) =>
      page.locator(selector).evaluate((el) => {
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let text = "";
        for (let node = walk.nextNode(); node; node = walk.nextNode()) {
          if (!node.parentElement?.closest("[aria-hidden='true']")) text += node.textContent;
        }
        return text.replace(/\s+/g, " ").trim();
      });
    expect(await read("h1")).toBe(`${hero.headline} ${hero.headlineAccent}`);
    expect(await read(".strip .facts")).toBe(
      [
        `Helping families since ${claim(facts.founded)}`,
        `${claim(facts.taxExempt).section} nonprofit, EIN ${claim(facts.ein)}`,
        `Partnered with ${claim(facts.toysForTotsPartner)}`,
      ].join(" "),
    );
  });

  test("a video's keyboard ring is drawn inside its rounded frame", async ({ page }) => {
    await page.goto("/");
    // The frame clips at its rounded edge: a ring outside the box is cut
    // away, so its offset and width together must stay inside it.
    const poster = page.locator("#haircuts .yt-link");
    await poster.focus();
    await page.keyboard.press("Shift");
    expect(
      await poster.evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          ring: el.matches(":focus-visible") && s.outlineStyle !== "none",
          reach: parseFloat(s.outlineOffset) + parseFloat(s.outlineWidth),
        };
      }),
    ).toEqual({ ring: true, reach: 0 });
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

  // Her lockup is drawn twice on the home page (banner and footer); its paint
  // is rendered once per page, so no gradient id is repeated.
  for (const path of [...pages, "/404"]) {
    test(`${path} repeats no id`, async ({ page }) => {
      await page.goto(path);
      const repeated = await page.evaluate(() => {
        const ids = [...document.querySelectorAll("[id]")].map((el) => el.id);
        return ids.filter((id, i) => ids.indexOf(id) !== i);
      });
      expect(repeated).toEqual([]);
    });
  }
});

// Windows high contrast (forced colours) drops backgrounds and shadows. The
// phone menu's button, a chosen chip and the chosen tab must still show.
// Chromium emulates forced colours; the stylesheet is the same everywhere.
test.describe("high contrast", () => {
  test.use({ forcedColors: "active" });

  test("keeps the menu button, the chosen tab and chosen chips visible", async ({
    page,
    browserName,
  }, testInfo) => {
    oncePerEngine(testInfo);
    test.skip(browserName !== "chromium", "forced colours are emulated in Chromium");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const [line, bar] = await page
      .locator("[data-menu-open] .lines i")
      .first()
      .evaluate((el) => [
        getComputedStyle(el).backgroundColor,
        getComputedStyle(el.closest(".site-header")!).backgroundColor,
      ]);
    expect(line, "the menu button's lines").not.toBe(bar);
    await expect(page.locator("[role=tab][aria-selected=true]")).toHaveCSS(
      "outline-style",
      "solid",
    );
    await page.goto("/donate");
    await expect(page.locator(".choice:has(input[name=frequency]:checked)")).toHaveCSS(
      "outline-style",
      "solid",
    );
    await expect(page.locator(".card .go")).not.toHaveCSS("border-top-width", "0px");
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
      ".strip .item",
      ".yt-link",
      ".arrow-link",
      ".tile",
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
    // The header carries her mark and her lockup; the lockup names the link.
    await expect(page.locator(".site-header .brand svg")).toHaveCount(2);
    await expect(page.locator(".site-header svg.brand-lockup")).toHaveCount(1);
    await expect(page.locator(".site-header svg.brand-lockup")).toHaveAccessibleName(org.name);
    await expect(page.locator(".hero svg.brand-lockup")).toHaveCount(0);
    // Every lockup (the bar, the phone menu, the footer) takes the shared
    // paint, which is on the page once.
    await expect(page.locator("#lockup-script, #lockup-caps")).toHaveCount(2);
    await expect(page.locator('svg.brand-lockup path[fill="url(#lockup-script)"]')).toHaveCount(3);
    await expect(page.locator(".site-footer .brand svg")).toHaveCount(2);
  });

  test("the banner photo and every photo load in a supported format", async ({ page }) => {
    // Scrolled with an instant, in-page scrollIntoView rather than the
    // locator's scrollIntoViewIfNeeded, which first waits for the image to
    // hold still: the banner photo drifts for nine seconds once the montage
    // starts, and on WebKit that wait ran to 8.7s before a smooth scroll of
    // the rest, which outlasted the test on a slow runner (decision 57).
    const loaded = async (img: import("@playwright/test").Locator) => {
      await img.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
      await expect
        .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), {
          timeout: 15_000,
        })
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

  // The banner's doors are links and hold the 44px floor wherever the scale
  // would make their pills shorter (a 320px phone, a short laptop window);
  // the composition and fold tests check that nothing moves for it.
  test("the doors are never shorter than 44px", async ({ page }, testInfo) => {
    oncePerEngine(testInfo);
    for (const [width, height] of [
      [320, 640],
      [896, 600],
      [1024, 600],
      [1366, 657],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      for (const door of [".door--help", ".door--give"]) {
        const box = (await page.locator(door).boundingBox())!;
        expect(box.height, `${door} at ${width} × ${height}`).toBeGreaterThanOrEqual(43.5);
      }
    }
  });

  // iOS zooms into a field whose text is under 16px when it is focused. Under
  // a finger every field holds 16px, at the narrowest phone and on a phone
  // on its side, including the application's copy box and the gift's amount.
  test("no field makes iOS zoom when it is focused", async ({ page, isMobile }) => {
    test.skip(!isMobile, "only a touch screen zooms into a field");
    for (const [width, height] of [
      [320, 640],
      [640, 360],
    ] as const) {
      await page.setViewportSize({ width, height });
      for (const path of ["/apply", "/donate"]) {
        await page.goto(path);
        const sizes = await page.evaluate(() => {
          document.querySelector<HTMLElement>("[data-done]")?.removeAttribute("hidden");
          return [
            ...document.querySelectorAll(
              "input:not([type=radio]):not([type=checkbox]), select, textarea",
            ),
          ].map(
            (el) =>
              `${el.id || el.getAttribute("name") || el.tagName} ${parseFloat(getComputedStyle(el).fontSize)}`,
          );
        });
        for (const entry of sizes) {
          expect(
            Number(entry.split(" ").pop()),
            `${path} ${entry} at ${width}`,
          ).toBeGreaterThanOrEqual(16);
        }
      }
    }
  });

  // The focus rule changes the field's colour, not its whole background: a
  // dropdown's arrow is its background image.
  test("a dropdown keeps its arrow when it is focused", async ({ page }) => {
    await page.goto("/apply");
    const arrow = await page.evaluate(() => {
      document.querySelector<HTMLElement>("[data-step=household]")!.hidden = false;
      const select = document.querySelector<HTMLSelectElement>("#county")!;
      select.focus();
      return getComputedStyle(select).backgroundImage;
    });
    expect(arrow).toContain("svg");
  });

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

  test("the footer's record stays on the page with a longer place and wider text", async ({
    page,
  }) => {
    await page.goto("/");
    // A city the owner may confirm, and WCAG 1.4.12's text spacing as a
    // reader's own stylesheet sets it.
    await page.locator(".where .city").evaluate((el) => {
      el.textContent = "Noblesville and Indianapolis, Indiana";
    });
    await page.addStyleTag({
      content:
        "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }",
    });
    const record = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      const parts = [".legal .name", ".where .city", ".where .serving", ".copyright"].map((s) =>
        document.querySelector(s)!.getBoundingClientRect(),
      );
      const meet = (a: DOMRect, b: DOMRect) =>
        a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      return {
        offPage: parts.some((box) => box.left < 0 || box.right > width),
        overlap: parts.some((a, i) => parts.slice(i + 1).some((b) => meet(a, b))),
      };
    });
    expect(record).toEqual({ offPage: false, overlap: false });
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
          eyebrow: box(".hero .tagline"),
          door: box(".door--help"),
        };
      });
    const before = await measure();
    await page.setViewportSize({ width: 390, height: 750 }); // bars collapsed
    await page.waitForTimeout(100);
    const after = await measure();
    expect(after).toEqual(before);
  });

  // The bar's shape (inline links on wide screens, the wedge on phones) is
  // set by the head's html.js mark, not by the page's script: on a slow load
  // the page paints before that script runs, and a bar that changed shape
  // then would move the whole page (decision 55). So the bar must lay out
  // the same with the page's module scripts removed as with them run.
  test("the bar has its final shape before the page's script runs", async ({ page }) => {
    const shape = () =>
      page.evaluate(() => {
        const r = (sel: string) => {
          const b = document.querySelector(sel)?.getBoundingClientRect();
          return b ? [b.x, b.y, b.width, b.height].map(Math.round) : null;
        };
        return {
          bar: r(".site-header"),
          brand: r(".site-header .brand"),
          nav: r(".site-header .inline-nav"),
          donate: r(".site-header .donate"),
          wedge: r("[data-menu-open]"),
          // Only where the page starts: its height changes below the fold
          // when the involvement tabs take over from the stacked panels.
          main: r("main")?.slice(0, 2),
        };
      });
    await page.route("**/", async (route) => {
      const response = await fetchPage(route);
      const html = (await response.text()).replace(
        /<script type="module"[^>]*>[\s\S]*?<\/script>/g,
        "",
      );
      await route.fulfill({ response, body: html, headers: { "content-type": "text/html" } });
    });
    await page.goto("/");
    await fontsSettled(page);
    expect(await page.evaluate(() => document.querySelector('script[type="module"]'))).toBeNull();
    const beforeScript = await shape();
    await page.unroute("**/");
    await page.goto("/");
    await fontsSettled(page);
    expect(await shape()).toEqual(beforeScript);
  });

  // Every device in the matrix, at its own screen size, gets the first screen
  // its class promises (see docs/DESIGN.md, "The first screen by device").
  test("this device's first screen keeps its promise", async ({ page }) => {
    await page.goto("/");
    await fontsSettled(page);
    const m = await page.evaluate(() => {
      const r = (sel: string) => document.querySelector(sel)?.getBoundingClientRect() ?? null;
      const header = r(".site-header")!;
      const lines = (sel: string) =>
        Math.round(
          r(sel)!.height / parseFloat(getComputedStyle(document.querySelector(sel)!).lineHeight),
        );
      return {
        width: innerWidth,
        height: innerHeight,
        wordsUnderHeader: r(".hero .tagline")!.top - header.bottom,
        helpBottom: r(".door--help")!.bottom,
        giveBottom: r(".door--give")!.bottom,
        sideBySide: r(".door--help")!.top === r(".door--give")!.top,
        seasonBottom: r("aside.banner")?.bottom ?? null,
        // The proof line's closing rule: the strip's bottom less its padding.
        proofBottom:
          r(".strip .facts")!.bottom -
          parseFloat(getComputedStyle(document.querySelector(".strip .facts")!).paddingBottom),
        stripBottom: r(".strip")!.bottom,
        // The reference's line breaks: "Holiday meals," / "gifts, and diapers"
        // / "for Central Indiana" / "families." (decision 51).
        headline: [lines(".hero h1 .lead"), lines(".hero h1 .accent")],
        sub: lines(".hero .sub"),
      };
    });
    // Every class: two doors side by side, the headline's two parts on two
    // lines each, the sentence on two.
    expect(m.sideBySide).toBe(true);
    expect(m.headline).toEqual([2, 2]);
    expect(m.sub).toBe(2);
    // What ends the first screen on tablets and desktop: the season strip
    // when it is on, otherwise the program strip (decision 66).
    const endsAt = seasonalBanner.active ? m.seasonBottom : m.stripBottom;
    if (seasonalBanner.active) expect(m.seasonBottom, "the season strip").not.toBeNull();
    if (m.width >= 896) {
      // Desktop: the scaled banner (the words sit 36 reference pixels under
      // the header, at most double), and the strip ends the first screen.
      expect(m.wordsUnderHeader).toBeLessThan(90);
      expect(Math.abs(endsAt! - m.height)).toBeLessThanOrEqual(2);
    } else if (m.width >= 576) {
      // Tablets: the phone's words beside the photo, both doors on screen, and
      // the strip ends the first screen.
      expect(m.helpBottom).toBeLessThanOrEqual(m.height);
      expect(m.giveBottom).toBeLessThanOrEqual(m.height);
      expect(Math.abs(endsAt! - m.height)).toBeLessThanOrEqual(2);
    } else {
      // Phones: a band of her photo above the words (40 reference pixels,
      // scaled by the width between 320 and 450px), both doors, and the
      // program strip with its proof line all fit (decision 66).
      expect(m.wordsUnderHeader).toBeGreaterThan(30);
      expect(m.wordsUnderHeader).toBeLessThan(60);
      expect(m.helpBottom).toBeLessThanOrEqual(m.height);
      expect(m.giveBottom).toBeLessThanOrEqual(m.height);
      expect(m.proofBottom, "the proof line").toBeLessThanOrEqual(m.height);
    }
  });

  // A phone's Safari screen with its bars showing: both doors, the four
  // programs, and the proof line all fit, with the strip ending at the fold
  // or just under it (decision 66).
  for (const [name, width, height] of [
    ["iPhone 12 mini", 375, 629],
    ["iPhone 15", 393, 660],
  ] as const) {
    test(`the banner and the proof line fit on an ${name} Safari screen`, async ({
      page,
    }, testInfo) => {
      oncePerEngine(testInfo);
      await page.setViewportSize({ width, height });
      await page.goto("/");
      await fontsSettled(page);
      const help = await page.locator(".door--help").boundingBox();
      const give = await page.locator(".door--give").boundingBox();
      expect(help!.y + help!.height).toBeLessThanOrEqual(height);
      expect(give!.y + give!.height).toBeLessThanOrEqual(height);
      const proof = page.locator(".strip .facts");
      const box = (await proof.boundingBox())!;
      const padding = await proof.evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));
      expect(box.y + box.height - padding, "the proof line's closing rule").toBeLessThanOrEqual(
        height,
      );
      const strip = (await page.locator(".strip").boundingBox())!;
      expect(strip.y + strip.height, "the strip's end").toBeLessThanOrEqual(height + 8);
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

  // On desktop the banner, the program strip, and the season strip (while it
  // is on; decision 66) fill the first screen exactly, whatever the screen
  // height (decisions 39 and 58).
  for (const [width, height] of [
    [1024, 768], // an iPad in landscape
    [1024, 1366], // an iPad Pro 12.9 upright: tall, so the width bounds the scale
    [1280, 800],
    [1366, 657],
    [1536, 730],
    [1920, 950],
  ]) {
    const last = seasonalBanner.active ? "the season strip" : "the program strip";
    test(`the first screen ends with ${last} at ${width} × ${height}`, async ({
      page,
    }, testInfo) => {
      oncePerEngine(testInfo);
      await page.setViewportSize({ width, height });
      await page.goto("/");
      // The season strip is seasonal content: while it is off, the program
      // strip ends the first screen instead.
      const strip = page.locator(seasonalBanner.active ? "aside.banner" : ".strip");
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
    await fontsSettled(page);
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
        eyebrow: share(r(".hero .tagline")),
        h1: share(r(".hero h1")),
        doors: share(r(".doors")),
        // The words start on the header's left edge, on every screen.
        left: r(".hero .content").left - r(".site-header .brand").left,
        lines: [lines(".hero h1"), lines(".hero .sub")],
        // The header as a share of the text block's height, and her lockup's width in it.
        header: r(".site-header").height / hero.height,
        lockup: r(".site-header .brand-lockup").width,
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
        for (const key of ["eyebrow", "h1", "doors"] as const) {
          expect(other[key][0], `${key} top at ${width}`).toBeCloseTo(ref[key][0], 2);
          expect(other[key][1], `${key} height at ${width}`).toBeCloseTo(ref[key][1], 2);
        }
        expect(other.left, `left edge at ${width}`).toBeCloseTo(0, 0);
        expect(ref.left, `left edge at ${reference[0]}`).toBeCloseTo(0, 0);
        expect(other.lines, `line breaks at ${width}`).toEqual(ref.lines);
        if (cls !== "desktop") {
          // Phones and tablets scale the header with the width; the lockup
          // must scale with it exactly (bounded on phones past 450px).
          const scale = (w: number) => (cls === "phone" ? Math.min(w / 393, 1.15) : w / 768);
          expect(other.header, `header at ${width}`).toBeCloseTo(ref.header, 2);
          // Within half a pixel of the reference's width.
          expect(other.lockup / scale(width), `lockup width at ${width}`).toBeCloseTo(
            ref.lockup / scale(reference[0]),
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
  // The header is painted, not only laid out: the glows behind the mark and
  // under the Donate pill, the wedge's hairlines. Its geometry is checked
  // above; this checks the picture. On the home page, the bar on each
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
    // Phones up to the 450px cap and desktops up to the 1600px cap: past
    // them the bar is wider than the column (docs/DESIGN.md), so it is not
    // the same picture and is not compared.
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
        [1600, 900],
      ],
    },
  ] as const) {
    test(`the header is the same picture on every ${cls}`, async ({ page }, testInfo) => {
      test.skip(!testInfo.project.name.startsWith("desktop-"), "runs once per engine");
      test.slow(); // a dozen page loads and screenshots
      // The bar is one component from the layout on every page, so the home
      // page is the whole picture; a second page would repeat the same
      // screenshots.
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
        [1600, 900],
        [1920, 950],
        [2560, 1300],
      ],
      scale: (w) => Math.min(w / 1280, 1.25),
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
    await expect(page.locator(".door--help")).toHaveAttribute("href", hero.doors.getHelp.href);
    await expect(page.locator(".door--give")).toHaveAttribute("href", hero.doors.donate.href);
  });

  test("subpages lead back to the home page through her lockup", async ({ page }) => {
    for (const path of ["/donate", "/apply"]) {
      await page.goto(path);
      await page.locator(".site-header .brand").click();
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

  // The footer's Explore is the map less Contact: its Connect column is the
  // Contact, and carries the id the Contact links lead to (decision 70).
  test("the footer draws the same map, with Donate as its one action", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".site-footer nav a")).toHaveText([
      navigation.help.label,
      ...sectionLabels.filter((label) => label !== "Contact"),
    ]);
    await expect(page.locator(".site-footer #contact")).toHaveCount(1);
    const donate = page.locator(".site-footer .donate");
    await expect(donate).toHaveText(navigation.donate.label);
    await expect(donate).toHaveAttribute("href", navigation.donate.href);
    // The one action is centred under her lettering, not left with the lockup.
    // The lettering is centred inside a link that spans its column, so its
    // own box is the measure (the link's edge is the page's).
    const wordmark = (await page.locator(".site-footer .brand svg.wordmark").boundingBox())!;
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

  test("the menu button says whether the menu is open", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the menu button only shows on phones");
    await page.goto("/");
    const button = page.locator("[data-menu-open]");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await button.click();
    await expect(page.locator("#menu")).toBeVisible();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(button).toHaveAttribute("aria-expanded", "false");
  });

  test("a browser without dialogs never leaves the closed menu in the page", async ({ page }) => {
    // Safari before 15.4 reads <dialog> as an unknown element, which no
    // built-in rule hides when closed.
    await page.route(/\/$/, async (route) => {
      const response = await fetchPage(route);
      const body = (await response.text()).replace(/<(\/?)dialog\b/g, "<$1x-dialog");
      await route.fulfill({ response, body });
    });
    await page.goto("/");
    await expect(page.locator(".site-header")).toHaveClass(/no-menu/);
    await expect(page.locator("#menu")).toHaveCSS("display", "none");
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
    // Reduced motion jumps instantly, which is when a scrolling focus() on
    // close would undo the jump.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.locator("[data-menu-open]").click();
    await page.locator("#menu .menu-list a", { hasText: "About" }).click();
    await expect(page.locator("#menu")).toBeHidden();
    expect(new URL(page.url()).hash).toBe("#about");
    // Returning focus to the menu button must not scroll the page back up
    // from the section the link just jumped to.
    await expect(page.locator("[data-menu-open]")).toBeFocused();
    await expect
      .poll(() => page.locator("#about").evaluate((el) => el.getBoundingClientRect().top))
      .toBeLessThan(120);
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

test.describe("the header's current section", () => {
  const current = (page: import("@playwright/test").Page) =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll(".inline-nav a[aria-current]"), (a) =>
        a.getAttribute("data-section"),
      ),
    );

  test("marks Contact at the end of the page", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() =>
      scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }),
    );
    await expect.poll(() => current(page)).toEqual(["contact"]);
  });

  test("marks nothing over the program strip", async ({ page }) => {
    await page.goto("/");
    // Every scroll here is instant: the page scrolls smoothly, and a box
    // measured while a scroll is still under way is measured in passing.
    await page.locator("#programs").evaluate((el) => el.scrollIntoView({ behavior: "instant" }));
    await expect.poll(() => current(page)).toEqual(["programs"]);
    // Back up until the strip crosses the middle of the window.
    await page.locator(".strip").evaluate((el) => {
      const box = el.getBoundingClientRect();
      scrollBy({ top: box.top + box.height / 2 - innerHeight * 0.475, behavior: "instant" });
    });
    await expect.poll(() => current(page)).toEqual([]);
  });

  test("marks nothing on the door pages, whose links lead away", async ({ page }) => {
    await page.goto("/donate");
    await page.evaluate(() =>
      scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }),
    );
    await page.waitForTimeout(300);
    expect(await current(page)).toEqual([]);
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

  // Section links scroll smoothly; wait until the page has stopped moving:
  // the same position three samples in a row, 120ms apart. (A waitForFunction
  // whose function returns a promise counts the promise itself as true and
  // waits for nothing; this runs inside the page instead.)
  const settled = (page: import("@playwright/test").Page) =>
    page.evaluate(async () => {
      const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));
      let same = 0;
      let last = window.scrollY;
      for (let i = 0; i < 60 && same < 3; i++) {
        await wait(120);
        if (window.scrollY === last) same++;
        else same = 0;
        last = window.scrollY;
      }
    });
  // Back to the top the way a reader gets there, with a key (after a section
  // link, a browser keeps the page on the section until the reader scrolls;
  // a script scroll does not count), then by script where the key does not
  // scroll (a phone has no Home key).
  const toTop = async (page: import("@playwright/test").Page) => {
    await settled(page);
    await page.keyboard.press("Home");
    await settled(page);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await settled(page);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  };

  // A section link: inline in the header on wide screens, in the menu on
  // phones and tablets, where the menu is opened first.
  const followSection = async (page: import("@playwright/test").Page, id: string) => {
    if ((await page.locator(`a[href="/#${id}"]:visible`).count()) === 0) {
      await page.locator("[data-menu-open]").click();
    }
    await page.locator(`a[href="/#${id}"]:visible`).first().click();
  };
  const followContact = (page: import("@playwright/test").Page) => followSection(page, "contact");

  // A section link lands on the section's own surface, with its content a
  // short way under the bar: the wave or the diagonal cut that opens the
  // section is scrolled under the bar, never shown first as a band under it
  // (decision 71). Contact is the footer's column at the page's end, where
  // the page lands as far as it can; it is checked by the tests above.
  test("a section link lands on the section's content, under the bar", async ({ page }) => {
    await page.goto("/");
    await fontsSettled(page);
    // The section is the link's target (an item's id can differ from it).
    const ids = navigation.items
      .filter((item) => item.id !== "contact")
      .map((item) => item.href.replace("/#", ""));
    // Where the page stands once it has stopped moving (two samples 150ms
    // apart agree): "landed" when the section's box (its wave or cut) starts
    // above the bar's edge and its content within a section space of the
    // bar, else the measurements, which the failure then shows.
    const landed = (id: string) =>
      page.evaluate(async (id) => {
        const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));
        const before = window.scrollY;
        await wait(150);
        if (window.scrollY !== before) return "moving";
        const bar = document.querySelector(".site-header")!.getBoundingClientRect().bottom;
        const section = document.getElementById(id)!;
        const content = section.querySelector(".wrap")!;
        const m = {
          sectionTop: section.getBoundingClientRect().top - bar,
          contentTop: content.getBoundingClientRect().top - bar,
          bar,
          scrollY: window.scrollY,
          pageHeight: document.documentElement.scrollHeight,
          viewportHeight: window.innerHeight,
          menuOpen: (document.getElementById("menu") as HTMLDialogElement).open,
        };
        const ok = m.sectionTop <= 0 && m.contentTop >= 16 && m.contentTop <= 120;
        return ok ? "landed" : JSON.stringify(m);
      }, id);
    for (const id of ids) {
      await followSection(page, id);
      // The scroll is smooth, and an engine may settle in steps: poll until
      // the page has stopped in the right place (a sample taken mid-scroll
      // reads as moving, never as landed).
      await expect
        .poll(() => landed(id), {
          message: `${id}: the section's content lands under the bar`,
          timeout: 10_000,
          intervals: [200, 300, 500],
        })
        .toBe("landed");
    }
  });

  // After a section link the fragment stays in the address, and a refresh
  // keeps the reader where they were instead of jumping back to the section
  // (Contact is the footer's contact column, the bottom of the page; decision
  // 70). See decision 50.
  test("a refresh after a section link keeps the reader where they were", async ({ page }) => {
    await page.goto("/");
    await followContact(page);
    await expect(page.locator("#contact")).toBeInViewport();
    expect(new URL(page.url()).hash).toBe("#contact");
    await toTop(page);
    await page.reload();
    await page.waitForLoadState("load");
    await settled(page);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(new URL(page.url()).hash).toBe("#contact");
  });

  test("a refresh on the section a link led to stays there", async ({ page }) => {
    await page.goto("/");
    await followContact(page);
    await expect(page.locator("#contact")).toBeInViewport();
    await settled(page);
    await page.reload();
    await page.waitForLoadState("load");
    await expect(page.locator("#contact")).toBeInViewport();
  });

  test("a refreshed tab link keeps its tab without jumping", async ({ page }) => {
    await page.goto("/#volunteer");
    await expect(page.locator("#volunteer")).toBeVisible();
    await expect(page.locator("#get-involved")).toBeInViewport();
    await toTop(page);
    await page.reload();
    await page.waitForLoadState("load");
    await settled(page);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page.locator("#tab-volunteer")).toHaveAttribute("aria-selected", "true");
    expect(new URL(page.url()).hash).toBe("#volunteer");
  });

  test("a section link from another page lands on its section", async ({ page }) => {
    await page.goto("/#contact");
    await expect(page.locator("#contact")).toBeInViewport();
    expect(new URL(page.url()).hash).toBe("#contact");
  });

  test("a tab link in the URL opens that tab", async ({ page }) => {
    await page.goto("/#volunteer");
    await expect(page.locator("#tab-volunteer")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#volunteer")).toBeVisible();
    await expect(page.locator("#sponsor")).toBeHidden();
  });

  test("the Donate tab leads to the donation page", async ({ page }) => {
    await page.goto("/#donate");
    await expect(page.locator("#donate .button")).toHaveAttribute("href", donateTab.action.href!);
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

  // A chosen way to help is written to the address and remembered for the
  // visit, and choosing never moves the page (decision 62).
  test("choosing a tab keeps the page still and records the choice", async ({ page }) => {
    await page.goto("/");
    await page.locator("#get-involved").scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    await page.locator("#tab-partner").click();
    await expect(page.locator("#partner")).toBeVisible();
    await expect(page.locator("#sponsor")).toBeHidden();
    expect(new URL(page.url()).hash).toBe("#partner");
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThan(2);
    expect(await page.evaluate(() => sessionStorage.getItem("involved-tab"))).toBe("partner");
    // Leaving for another page and coming back through the header keeps it.
    await page.goto("/donate");
    await page.locator(".site-header .brand").click();
    await expect(page.locator("#tab-partner")).toHaveAttribute("aria-selected", "true");
  });

  test("Tab from a tab lands on the panel's button, not the panel", async ({ page }) => {
    await page.goto("/");
    await page.locator("#tab-sponsor").focus();
    await page.keyboard.press("Tab");
    await expect(page.locator("#sponsor a.button")).toBeFocused();
  });

  test("a tab address read on Back does not move the page", async ({ page, browserName }) => {
    test.skip(
      browserName === "webkit",
      "WebKit itself scrolls to the address's element when it loads a page again from history, with or without the page's scripts",
    );
    // An unload listener keeps the page out of the back-forward cache, so
    // Back loads it again, as Firefox often does.
    await page.addInitScript(() => addEventListener("unload", () => {}));
    await page.goto("/");
    await page.locator("#tab-volunteer").evaluate((tab: HTMLElement) => tab.click());
    expect(new URL(page.url()).hash).toBe("#volunteer");
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.goto("/donate");
    await page.goBack();
    await expect(page.locator("#tab-volunteer")).toHaveAttribute("aria-selected", "true");
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test("an address with a stray % opens the page as usual", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/#%E0%A4%A");
    await expect(page.locator("#tab-sponsor")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#volunteer")).toBeHidden();
    await page.waitForLoadState("load");
    expect(new URL(page.url()).hash).toBe("#%E0%A4%A");
    expect(errors).toEqual([]);
  });

  test("Back after a page opened at a section is the browser's again", async ({ page }) => {
    await page.goto("/#programs");
    await page.waitForLoadState("load");
    await page.waitForTimeout(1200); // the layout's hold on the place ends
    const landed = await page.evaluate(() => Math.round(window.scrollY));
    await page.evaluate(() => scrollTo({ top: 600, behavior: "instant" }));
    await page.waitForTimeout(300); // the browser records the place as a reader's scroll ends
    await page.evaluate(() => (location.hash = "#about"));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1500);
    await page.goBack();
    // What each browser does on its own: Safari and Firefox return to the
    // place (Firefox a few dozen pixels off), Chrome to the section the
    // address names. Held by the page, Back left the reader at About.
    await expect
      .poll(async () => {
        const y = await page.evaluate(() => Math.round(window.scrollY));
        return Math.abs(y - 600) < 100 || Math.abs(y - landed) < 2;
      })
      .toBe(true);
  });

  test("the panel that leaves fades out quicker than the new one arrives", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-tabs]")).toHaveClass(/is-live/);
    const leaving = await page.evaluate(() => {
      document.querySelector<HTMLElement>("#tab-volunteer")!.click();
      const panel = document.querySelector(".panel.is-leaving");
      return panel && getComputedStyle(panel).transitionDuration;
    });
    expect(leaving).toBe("0.16s");
  });

  test("the thumb moves by transform, which every supported browser has", async ({ page }) => {
    await page.goto("/");
    await page.locator("#tab-partner").click();
    const thumb = page.locator(".thumb");
    // The translate property is Chrome 104 and later; transform is everywhere.
    expect(await thumb.evaluate((el) => getComputedStyle(el).translate)).toBe("none");
    await expect
      .poll(async () => {
        const [t, tab] = await Promise.all([
          thumb.boundingBox(),
          page.locator("#tab-partner").boundingBox(),
        ]);
        return Math.abs(t!.x - tab!.x);
      })
      .toBeLessThan(1);
  });
});

test.describe("the waves", () => {
  // Every wave hands one lit surface to the next with no line at its box's
  // edge (decision 67): on each side the paint 2px outside the box matches
  // the paint 2px inside it. Three columns clear of the Programs watermark
  // and the giving page's card, which cross those edges by design; the
  // banner wave's top edge is skipped, since the photo shows through it.
  // Measured on every engine: WebKit once painted a continuation's washes
  // nowhere, which Chromium never showed.
  test("every wave hands over without a seam", async ({ page }, testInfo) => {
    oncePerEngine(testInfo);
    // Six page loads and a capture per wave: about 16s in WebKit alone and
    // past 30s beside two other WebKit workers. The standard allowance for
    // slow tests (three times the limit); a real hang still fails.
    test.slow();
    const columns = [0.08, 0.25, 0.4];
    const seams: string[] = [];
    for (const [width, height] of [
      [393, 660],
      [1280, 800],
    ]) {
      await page.setViewportSize({ width, height });
      for (const path of pages) {
        await page.goto(path);
        await fontsSettled(page);
        const waves = page.locator(".wave");
        for (let i = 0; i < (await waves.count()); i++) {
          const wave = waves.nth(i);
          const isBanner = await wave.evaluate((el) => el.classList.contains("hero-wave"));
          // An instant scroll, then the box is read after the capture and
          // checked against the box before it: the page settles by a few
          // pixels after a scroll, and a box read on the wrong side of that
          // would sample the wrong rows.
          const place = () =>
            wave.evaluate(async (el) => {
              await new Promise((done) => requestAnimationFrame(() => done(null)));
              const r = el.getBoundingClientRect();
              return { top: r.top, bottom: r.bottom };
            });
          await wave.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
          let before = await place();
          let png: Buffer;
          let box: { top: number; bottom: number };
          for (let attempt = 0; ; attempt++) {
            png = await page.screenshot({ scale: "css", animations: "disabled" });
            box = await place();
            if (box.top === before.top || attempt === 3) break;
            before = box;
          }
          const steps = await page.evaluate(
            async ({ data, columns, edges, width }) => {
              const img = new Image();
              img.src = data;
              await img.decode();
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d")!;
              ctx.drawImage(img, 0, 0);
              const at = (x: number, y: number) => {
                const p = ctx.getImageData(x, y, 1, 1).data;
                return [p[0], p[1], p[2]];
              };
              const out: string[] = [];
              for (const edge of edges) {
                if (edge - 2 < 0 || edge + 2 >= img.height) continue;
                for (const fx of columns) {
                  const x = Math.round(width * fx);
                  const above = at(x, Math.round(edge) - 2);
                  const below = at(x, Math.round(edge) + 2);
                  const diff = Math.max(...above.map((v, k) => Math.abs(v - below[k])));
                  if (diff > 6)
                    out.push(`x=${fx} edge=${Math.round(edge)} ${above}->${below} (${diff})`);
                }
              }
              return out;
            },
            {
              data: "data:image/png;base64," + png!.toString("base64"),
              columns,
              edges: [...(isBanner ? [] : [box!.top]), box!.bottom],
              width,
            },
          );
          for (const s of steps) seams.push(`${width}px ${path} wave ${i}: ${s}`);
        }
      }
    }
    expect(seams, "colour steps at a wave box's edge").toEqual([]);
  });

  // The four program icons sit on the same fraction of a pixel (decision
  // 75): each is sized and placed in its box in whole pixels, so a screen
  // that rounds them cannot round one a pixel away from its neighbours, as
  // iOS Safari did to the middle two from one load to the next.
  test("the program icons share one pixel grid", async ({ page }, testInfo) => {
    oncePerEngine(testInfo);
    const off: string[] = [];
    for (const width of [375, 390, 393, 430, 768, 1024, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");
      await fontsSettled(page);
      const boxes = await page.evaluate(() =>
        [...document.querySelectorAll(".strip .pi")].map((el) => {
          const r = el.getBoundingClientRect();
          return { top: r.top, width: r.width, height: r.height };
        }),
      );
      const whole = (v: number) => Math.abs(v - Math.round(v)) < 0.01;
      for (const [i, b] of boxes.entries()) {
        if (!whole(b.width) || !whole(b.height))
          off.push(`${width}px icon ${i}: ${b.width} by ${b.height}`);
        if (!whole(b.top - boxes[0].top))
          off.push(`${width}px icon ${i}: ${b.top - boxes[0].top} below the first`);
      }
    }
    expect(off, "icons off the shared pixel grid").toEqual([]);
  });

  // No paint of the program strip reaches up over the banner (decision 73):
  // iOS Safari drew such a box over the animated banner in one frame and
  // under it in the next, so the seam flickered. Each section paints its own
  // half of the bloom.
  test("the strip's bloom stays inside the strip", async ({ page }, testInfo) => {
    oncePerEngine(testInfo);
    await page.goto("/");
    const top = await page.evaluate(
      () => getComputedStyle(document.querySelector(".strip")!, "::before").top,
    );
    expect(top).toBe("0px");
  });

  // What lies behind a wave's flat colour never shows through the edge row
  // of its box (decision 73). The drawing is stretched to a box that can end
  // on a fraction of a device pixel, and iOS Safari left that row part
  // covered: the banner's crossfading photos flickered through it as a
  // hairline above the program strip, and the paper showed as a white line
  // where the night band hands over to the programs. What lies behind is
  // painted white here so any leak is bright, the ribbons are hidden (their
  // foot can dip into the rows read) and the wave's flat colour, its first
  // path, stays; the rows are read at a phone's three device pixels to a CSS
  // pixel, at widths whose edges fall on different fractions of a pixel.
  test("no wave's edge lets what lies behind show through", async ({ browser }, testInfo) => {
    oncePerEngine(testInfo);
    // Fourteen page loads at three device pixels to a CSS pixel: about 16s
    // in WebKit alone and 26 to 30s beside two other WebKit workers, against
    // the 30s default. It gets the standard allowance for slow tests (three
    // times the limit); a real hang still fails.
    test.slow();
    const context = await browser.newContext({
      deviceScaleFactor: 3,
      baseURL: testInfo.project.use.baseURL,
    });
    const page = await context.newPage();
    const ribbonsOff = (wave: string) =>
      `${wave} svg > g, ${wave} svg > path:not(:first-of-type) { visibility: hidden !important; }`;
    const edges = [
      {
        name: "the banner's foot",
        css:
          ".montage { background: #fff !important; } .montage picture, .tint, .scrim { visibility: hidden !important; }" +
          ribbonsOff(".hero-wave"),
        y: () => document.querySelector(".hero")!.getBoundingClientRect().bottom,
      },
      {
        name: "the programs' top",
        css:
          "#programs { background: #fff !important; } #programs::before, #programs::after { visibility: hidden !important; }" +
          ribbonsOff("#programs .wave-in"),
        y: () => document.querySelector("#programs")!.getBoundingClientRect().top,
      },
    ];
    const leaks: string[] = [];
    for (const edge of edges) {
      for (const width of [375, 390, 393, 414, 430, 768, 1280]) {
        await page.setViewportSize({ width, height: width > 900 ? 800 : 844 });
        await page.goto("/");
        await fontsSettled(page);
        await page.addStyleTag({ content: edge.css });
        // Playwright passes edge.y to the page itself: the page's own eval
        // is refused by the live site's Content-Security-Policy.
        const before = await page.evaluate(edge.y);
        await page.evaluate(
          (top) => window.scrollTo({ top: scrollY + top - 200, behavior: "instant" }),
          before,
        );
        await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => done(null))));
        const y = await page.evaluate(edge.y);
        const png = await page.screenshot({
          clip: { x: 0, y: Math.floor(y) - 4, width, height: 8 },
          animations: "disabled",
        });
        const light = await page.evaluate(
          async (data) => {
            const img = new Image();
            img.src = data;
            await img.decode();
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0);
            const px = ctx.getImageData(0, 0, img.width, img.height).data;
            let worst = 0;
            for (let i = 0; i < px.length; i += 4)
              worst = Math.max(worst, px[i] + px[i + 1] + px[i + 2]);
            return worst;
          },
          "data:image/png;base64," + png.toString("base64"),
        );
        // The night and the strip's bloom sum to under 200; a leak of the
        // white behind reaches several hundred.
        if (light > 260) leaks.push(`${width}px: brightest ${light} at ${edge.name}`);
      }
    }
    await context.close();
    expect(leaks, "white behind a wave showing at its edge").toEqual([]);
  });
});

test.describe("the program strip", () => {
  // The four things the banner promises, each a link to its program, with
  // the proof line under them (decision 58).
  test("lists the four programs, each opening its program", async ({ page }) => {
    await page.goto("/");
    const items = page.locator(".strip .item");
    await expect(items).toHaveCount(programStrip.length);
    for (const [i, item] of programStrip.entries()) {
      await expect(items.nth(i).locator(".name")).toHaveText(item.title);
      await expect(items.nth(i)).toHaveAttribute("href", item.href);
      const target = item.href.replace("/#", "#");
      await expect(page.locator(target)).toHaveCount(1);
    }
    await expect(page.locator(".strip .pi")).toHaveCount(programStrip.length);
  });

  // From tablets up the proof is one line between two rules: the rules take
  // only the space the words leave, so the closing rule never wraps under
  // the tax ID.
  test("the proof line is one line from tablets up", async ({ page, viewport }) => {
    test.skip(!viewport || viewport.width < 576, "phones stack the proof");
    await page.goto("/");
    const proof = page.locator(".strip .facts");
    const [box, metrics] = await Promise.all([
      proof.boundingBox(),
      proof.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          lineHeight: parseFloat(style.lineHeight),
          // The box carries the strip's bottom spacing on tablets; only the
          // line itself is measured.
          padding: parseFloat(style.paddingTop) + parseFloat(style.paddingBottom),
        };
      }),
    ]);
    expect(box).not.toBeNull();
    expect(box!.height - metrics.padding).toBeLessThan(metrics.lineHeight * 1.6);
  });
});

test.describe("the banner's photos", () => {
  test("turning on Reduce Motion during the visit keeps the first photo", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".montage")).toHaveClass(/play/, { timeout: 8000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const imgs = page.locator(".montage .slide img");
    await expect(imgs.first()).toHaveCSS("opacity", "1");
    await expect(imgs.nth(1)).toHaveCSS("opacity", "0");
    expect(
      await page
        .evaluate(() =>
          Array.from(document.querySelectorAll(".montage img")).flatMap((img) =>
            img.getAnimations(),
          ),
        )
        .then((a) => a.length),
    ).toBe(0);
  });

  test("turning off Reduce Motion during the visit starts the crossfade", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForLoadState("load");
    await page.waitForTimeout(2000);
    await expect(page.locator(".montage")).not.toHaveClass(/play/);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(page.locator(".montage")).toHaveClass(/play/, { timeout: 5000 });
  });
});

test.describe("programs", () => {
  test("under Reduce Motion the checklist opens at once", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const list = page.locator("details.checklist").first();
    await list.scrollIntoViewIfNeeded();
    const heights = await list.evaluate(async (el: HTMLDetailsElement) => {
      el.open = true;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const first = el.getBoundingClientRect().height;
      await new Promise((done) => setTimeout(done, 600));
      return [first, el.getBoundingClientRect().height];
    });
    expect(heights[0]).toBe(heights[1]);
  });
});

test.describe("one home per fact", () => {
  // On the first screen each fact appears once: the tagline as the banner's
  // eyebrow, the service area in the headline's last line, the founding year
  // in the proof line. The subhead says what the organization is.
  test("the banner and the proof line do not repeat each other", async ({ page }) => {
    await page.goto("/");
    const area = claim(facts.serviceArea);
    const year = String(claim(facts.founded));
    const times = (text: string, part: string) => text.split(part).length - 1;
    const banner = await page.locator(".hero").innerText();
    expect(times(banner, area), `${area} in the banner`).toBe(1);
    expect(times(banner, year), `${year} in the banner`).toBe(0);
    const strip = await page.locator(".facts").innerText();
    expect(times(strip, year), `${year} in the proof line`).toBe(1);
    expect(times(strip, area), `${area} in the proof line`).toBe(0);
    // The banner sets the tagline in capitals; innerText reports it that way.
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(times(body, hero.tagline.toLowerCase()), `${hero.tagline} on the page`).toBe(1);
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

  test("each tab's button goes to its form, or asks for an email until the form exists", async ({
    page,
  }) => {
    await page.goto("/");
    for (const tab of getInvolved.tabs) {
      const button = page.locator(`#${tab.id} a.button`);
      if (tab.action.href) {
        await expect(button).toHaveAttribute("href", tab.action.href);
        // An outside form also says it opens in a new tab.
        await expect(button).toContainText(tab.action.label);
      } else {
        await expect(button).toHaveAttribute("href", /^mailto:/);
        await expect(button).toHaveText(tab.action.fallbackLabel);
      }
    }
  });

  test("sending the application says it goes by email", async ({ page }) => {
    await page.goto("/apply");
    await expect(page.locator("[data-send]")).toHaveText(/by email/i);
  });
});

test.describe("donation page", () => {
  // Until a payment page is set (links.donate) the button opens an email
  // that names the gift; once it is, the button goes there and the gift
  // rides along in its address.
  const byEmail = links.donate ? "" : " by email";
  const carries = (href: string, amount: string, frequency: string) => {
    if (links.donate) {
      const url = new URL(href);
      expect(url.searchParams.get("amount")).toBe(amount);
      expect(url.searchParams.get("frequency")).toBe(frequency);
    } else {
      const text = decodeURIComponent(href);
      expect(text).toContain(`$${amount}`);
      expect(text).toContain(frequency === "monthly" ? "monthly" : "one-time");
    }
  };

  test("the chosen amount and frequency travel with the giving link", async ({ page }) => {
    await page.goto("/donate");
    await page.locator("input[name=amount][value='100']").check();
    await page.locator("input[name=frequency][value=monthly]").check();
    await expect(page.locator("[data-summary]")).toHaveText("Your gift: $100 a month.");
    const go = page.locator(".go");
    // The button carries the gift, so the last thing read before the click confirms it.
    await expect(go).toHaveText(`Donate $100 a month${byEmail}`);
    carries((await go.getAttribute("href"))!, "100", "monthly");
  });

  test("the other amount is an always-visible field that acts as the fifth choice", async ({
    page,
  }) => {
    await page.goto("/donate");
    const other = page.locator("#other-amount");
    await expect(other).toBeVisible();
    await other.fill("75");
    await expect(page.locator("[data-summary]")).toHaveText("Your gift: $75.");
    await expect(page.locator(".go")).toHaveText(`Donate $75${byEmail}`);
    await expect(page.locator("input[name=amount]:checked")).toHaveCount(0);
    // Choosing a chip again empties the field.
    await page.locator("input[name=amount][value='25']").check();
    await expect(other).toHaveValue("");
    await expect(page.locator("[data-summary]")).toHaveText("Your gift: $25.");
  });

  test("states the nonprofit's EIN and tax status", async ({ page }) => {
    await page.goto("/donate");
    await expect(page.locator(".tax")).toContainText(claim(facts.ein));
    await expect(page.locator(".tax")).toContainText(claim(facts.taxExempt).section);
  });

  // A typed amount is taken as written: cents are kept, not dropped.
  test("an amount with cents is shown and sent as typed", async ({ page }) => {
    await page.goto("/donate");
    await page.locator("#other-amount").fill("12.75");
    await expect(page.locator("[data-summary]")).toHaveText("Your gift: $12.75.");
    await expect(page.locator(".go")).toHaveText(`Donate $12.75${byEmail}`);
    carries((await page.locator(".go").getAttribute("href"))!, "12.75", "once");
  });

  // Line breaks in an email link are CRLF (RFC 6068); some mail apps join
  // lines that are separated by a bare LF.
  test("the gift email's line breaks are CRLF", async ({ page }) => {
    test.skip(!!links.donate, "gifts go to the payment page, not by email");
    await page.goto("/donate");
    const before = (await page.locator(".go").getAttribute("href"))!;
    await page.locator("input[name=amount][value='100']").check();
    const after = (await page.locator(".go").getAttribute("href"))!;
    for (const href of [before, after]) {
      expect(href).toContain("%0D%0A");
      expect(href).not.toMatch(/(?<!%0D)%0A/);
    }
  });
});

// When Next or Send finds an error, the form focuses the first field and the
// site's smooth scrolling glides the page to it. On WebKit a tap during that
// glide only stops the scroll, so the tap is lost (the live check once saw
// "Clicking the checkbox did not change its state"). So the application tests
// press the form's buttons through this helper, which waits for the page to
// come to rest (six frames without scrolling) before the next tap. Smooth
// scrolling stays on, as visitors have it; turning it off with reduced motion
// was measured to slow these tests on WebKit by a third.
const pressAndSettle = async (page: import("@playwright/test").Page, selector: string) => {
  await page.locator(selector).click();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let last = scrollY;
        let still = 0;
        const tick = () => {
          still = scrollY === last ? still + 1 : 0;
          last = scrollY;
          if (still >= 6) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
};

test.describe("application page", () => {
  // Errors name the field, an email is required when it is the chosen way to
  // reach the family, Next says where it leads, and Enter never sends early
  // (decision 62).
  test("names its errors, asks for an email when chosen, and Enter only advances", async ({
    page,
  }) => {
    await page.goto("/apply");
    await expect(page.locator("[data-next]")).toHaveText("Next: Your household");
    await pressAndSettle(page, "[data-next]");
    await expect(page.locator(".field:has(#firstName) .error")).toHaveText(
      "Enter your first name.",
    );
    await expect(page.locator(".field:has(#phone) .error")).toHaveText("Enter your phone number.");
    await page.locator("input[name=contactMethod][value=Email]").check();
    await pressAndSettle(page, "[data-next]");
    await expect(page.locator("#email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(".field:has(#email) .error")).toHaveText(
      "Enter an email address, or choose Call or Text.",
    );
    await page.locator("input[name=contactMethod][value=Call]").check();
    await expect(page.locator("#email")).not.toHaveAttribute("aria-invalid", "true");
    await page.locator("#firstName").fill("Jane");
    await page.locator("#lastName").fill("Doe");
    await page.locator("#phone").fill("3175550100");
    await expect(page.locator("#phone")).toHaveValue("(317) 555-0100");
    await page.locator("#lastName").press("Enter");
    await expect(page.locator("[data-step=household]")).toBeVisible();
    await expect(page.locator("[data-done]")).toBeHidden();
    await expect(page.locator("[data-next]")).toHaveText("Next: What you need");
    // A passed step can be revisited from the progress bar.
    await page.locator(".progress [data-goto='0']").click();
    await expect(page.locator("[data-step=you]")).toBeVisible();
  });

  test("walks through four steps, validates each, and sends by email", async ({ page }) => {
    // The longest test in the suite: four steps, every field, the review and
    // the send. Since the form redesign (decision 62) it takes 20 to 28 s on
    // the iPhone projects in CI, too close to the 30 s default, so it gets
    // Playwright's standard allowance for slow tests (three times the limit).
    // A real hang still fails.
    test.slow();
    await page.goto("/apply");
    const form = page.locator("[data-apply]");
    await expect(form).toBeVisible();

    // Step 1: required fields block Next.
    await pressAndSettle(page, "[data-next]");
    await expect(page.locator("#firstName")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#firstName")).toBeFocused();
    await page.locator("#firstName").fill("Jane");
    await page.locator("#lastName").fill("Doe");
    await page.locator("#phone").fill("317");
    await pressAndSettle(page, "[data-next]");
    await expect(page.locator("#phone")).toHaveAttribute("aria-invalid", "true");
    await page.locator("#phone").fill("317-555-0100");
    await page.locator("input[name=contactMethod][value=Text]").check();
    await pressAndSettle(page, "[data-next]");

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
    await pressAndSettle(page, "[data-next]");

    // Step 3: at least one kind of help, with details that open on demand.
    await expect(page.locator("[data-step=needs]")).toBeVisible();
    await pressAndSettle(page, "[data-next]");
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
    await pressAndSettle(page, "[data-next]");

    // Step 4: review shows the answers; sending needs consent and opens email.
    await expect(page.locator("[data-step=review]")).toBeVisible();
    const review = page.locator("[data-review]");
    await expect(review).toContainText("Jane Doe");
    await expect(review).toContainText("Hamilton County");
    await expect(review).toContainText("Child 1");
    await expect(review).toContainText("Christmas");
    await expect(review).toContainText("Size 4");
    await pressAndSettle(page, "[data-send]");
    await expect(page.locator("[data-consent-error]")).toBeVisible();
    await page.locator("input[name=consent]").check();

    // Capture the mailto: link instead of leaving the page.
    await page.evaluate(() => {
      document.querySelector("[data-apply]")!.addEventListener("application:send", (event) => {
        event.preventDefault();
        (window as unknown as { __mail: string }).__mail = (event as CustomEvent<string>).detail;
      });
    });
    await pressAndSettle(page, "[data-send]");
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
    await pressAndSettle(page, "[data-next]");
    await expect(page.locator("[data-step=household]")).toBeVisible();
    await pressAndSettle(page, "[data-back]");
    await expect(page.locator("[data-step=you]")).toBeVisible();
    await expect(page.locator("#firstName")).toHaveValue("Jane");
  });

  test("does not steal focus when the page opens", async ({ page }) => {
    await page.goto("/apply");
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  });

  // People and autofill write a US number with its country code. The form
  // keeps the 1 in front instead of reading it as the first digit of the
  // area code, and never cuts a pasted number short.
  test("a phone number written with its country code is read correctly", async ({ page }) => {
    await page.goto("/apply");
    const phone = page.locator("#phone");
    for (const written of ["+1 (317) 555-0100", "1-317-555-0100", "+13175550100"]) {
      await phone.fill(written);
      await expect(phone, written).toHaveValue("1 (317) 555-0100");
      await phone.blur();
      await expect(page.locator(".field:has(#phone) .error"), written).toHaveCount(0);
    }
    await phone.fill("");
    await phone.pressSequentially("13175550100");
    await expect(phone).toHaveValue("1 (317) 555-0100");
  });

  // What is sent is what the family chose at the end: a kind of help they
  // unchecked takes its details with it, errors go away once corrected, and
  // the email's lines break the way mail apps expect.
  test("sends only the help still chosen, and clears errors once fixed", async ({ page }) => {
    test.slow();
    await page.goto("/apply");
    await page.locator("#firstName").fill("Jane");
    await page.locator("#lastName").fill("Doe");
    await page.locator("#phone").fill("+1 317 555 0100");
    await pressAndSettle(page, "[data-next]");
    await page.locator("#street").fill("1 Main St");
    await page.locator("#city").fill("Noblesville");
    await page.locator("#zip").fill("46060");
    await page.locator("#county").selectOption("Hamilton");
    await page.locator("#childCount").selectOption("1");
    await pressAndSettle(page, "[data-next]");
    // An unchosen age names the child it belongs to.
    await expect(page.locator(".field:has(#child-1-0) .error")).toHaveText(
      "Choose the age of child 1.",
    );
    await page.locator("#child-1-0").selectOption("4");
    await pressAndSettle(page, "[data-next]");
    await pressAndSettle(page, "[data-next]");
    await expect(page.locator("[data-needs-error]")).toBeVisible();
    await page.locator("input[name=need][data-toggle=diapers]").check();
    await expect(page.locator("[data-needs-error]")).toBeHidden();
    await page.locator("input[name=diaperSizes][value='Size 4']").check();
    await page.locator("input[name=need][data-toggle=diapers]").uncheck();
    await page.locator("input[name=need][data-toggle=holiday]").check();
    await pressAndSettle(page, "[data-next]");
    const review = page.locator("[data-review]");
    await expect(review).toContainText("(317) 555-0100");
    await expect(review).not.toContainText("Size 4");
    await expect(review).not.toContainText("Diaper");
    await pressAndSettle(page, "[data-send]");
    await expect(page.locator("[data-consent-error]")).toBeVisible();
    await page.locator("input[name=consent]").check();
    await expect(page.locator("[data-consent-error]")).toBeHidden();
    await page.evaluate(() => {
      document.querySelector("[data-apply]")!.addEventListener("application:send", (event) => {
        event.preventDefault();
        (window as unknown as { __mail: string }).__mail = (event as CustomEvent<string>).detail;
      });
    });
    await pressAndSettle(page, "[data-send]");
    const mail = await page.evaluate(() => (window as unknown as { __mail: string }).__mail);
    expect(mail).toContain("%0D%0A");
    expect(mail).not.toMatch(/(?<!%0D)%0A/);
    expect(decodeURIComponent(mail)).toContain("Phone: (317) 555-0100");
    expect(decodeURIComponent(mail)).not.toContain("Size 4");
  });

  // The copy box answers focus like every field, and the follow-up questions
  // ("Which sizes?") are labels like "Best way to reach you".
  test("the copy box shows focus, and follow-up questions read as labels", async ({ page }) => {
    await page.goto("/apply");
    const face = (sel: string) =>
      page
        .locator(sel)
        .first()
        .evaluate((el) => {
          const s = getComputedStyle(el);
          return `${s.fontFamily} ${s.fontWeight}`;
        });
    expect(await face(".sub > legend")).toBe(await face("fieldset.field > legend"));
    const states = await page.evaluate(() => {
      const done = document.querySelector<HTMLElement>("[data-done]")!;
      done.hidden = false;
      const box = done.querySelector("textarea")!;
      const look = () => {
        const s = getComputedStyle(box);
        return `${s.outlineStyle} ${s.outlineWidth} ${s.boxShadow}`;
      };
      const rest = look();
      box.focus();
      return { rest, focused: look() };
    });
    expect(states.focused).not.toBe(states.rest);
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

  // Without the script a choice of amount can't reach the link, so the page
  // offers one way to give that names no amount, and no choices that do
  // nothing.
  test("the donation page offers a way to give that names no amount", async ({ page }) => {
    await page.goto("/donate");
    const give = page.locator(".card a.button:visible");
    await expect(give).toHaveCount(1);
    await expect(give).not.toHaveText(/\$/);
    expect(decodeURIComponent((await give.getAttribute("href"))!)).not.toMatch(/\$\d/);
    await expect(page.locator(".card fieldset").first()).toBeHidden();
  });

  test("the desktop bar keeps its one row", async ({ page, viewport }) => {
    test.skip((viewport?.width ?? 0) < 896, "phones and tablets wrap the links under the brand");
    await page.goto("/");
    const centre = async (selector: string) => {
      const box = await page.locator(selector).first().boundingBox();
      return box!.y + box!.height / 2;
    };
    const bar = await centre(".site-header .brand");
    expect(Math.abs((await centre(".site-header .inline-nav")) - bar)).toBeLessThan(2);
    expect(Math.abs((await centre(".site-header .donate")) - bar)).toBeLessThan(2);
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

  test("her story's player is titled with the video's own title", async ({ page }) => {
    await page.route("https://www.youtube-nocookie.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<p>player</p>" }),
    );
    await page.goto("/");
    await page.locator("[data-watch]").click();
    await expect(page.locator("#about iframe")).toHaveAttribute("title", about.video.title);
  });
});

test.describe("search and sharing", () => {
  // Blocked everywhere until launch; after launch (PUBLIC_ALLOW_INDEXING),
  // the production domain alone is indexed. The page and robots.txt agree.
  test("search engines are blocked, except on the launched production site", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    const robotsMeta = await page.locator('meta[name="robots"]').getAttribute("content");
    const robots = await (await request.get("/robots.txt")).text();
    if (robotsMeta === "index, follow") {
      expect(new URL(page.url()).origin).toBe(PRODUCTION_ORIGIN);
      expect(robots).not.toMatch(/User-agent: \*\nDisallow: \//);
      return;
    }
    expect(robotsMeta).toBe("noindex, nofollow");
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
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("We can't find that page");
    // It answers any missing address, so it names no address of its own,
    // and it is never indexed, even after launch.
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expect(page.locator('meta[property="og:url"]')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    // Its doors are the banner's.
    await expect(page.locator(".button-row .button").first()).toHaveAttribute(
      "href",
      hero.doors.getHelp.href,
    );
  });
});
