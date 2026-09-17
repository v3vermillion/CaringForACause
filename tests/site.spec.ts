import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The site address the build should report: the deployed URL when testing a
// live site, otherwise the production domain used by local and CI builds.
const expectedSite = process.env.PLAYWRIGHT_BASE_URL
  ? new URL("/", process.env.PLAYWRIGHT_BASE_URL).href
  : "https://caring4acausesupportiveservices.com/";

const pages = ["/", "/donate", "/apply"];

// YouTube thumbnails are external; stub them so tests are fast and offline-safe.
test.beforeEach(async ({ page }) => {
  await page.route("https://i.ytimg.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: "<svg xmlns='http://www.w3.org/2000/svg'/>",
    }),
  );
});

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
      ".site-header nav button",
      ".button",
      "[role=tab]",
      ".checklist summary",
      ".site-footer li a",
      ".door",
      ".video-link",
      ".arrow-link",
      ".tile",
      "#contact .card",
    ];
    for (const selector of selectors) {
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
    await expect(page.locator(".site-footer svg")).toHaveCount(2);
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
    for (const id of ["sponsor", "donate", "volunteer", "partner"]) {
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
  test("the first screen does not resize when the browser bars collapse", async ({ page }) => {
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

  test("both doors fit on an iPhone 15 Safari screen", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 660 });
    await page.goto("/");
    const help = await page.locator(".door--help").boundingBox();
    expect(help!.y + help!.height).toBeLessThanOrEqual(660);
  });
});

test.describe("layout", () => {
  for (const width of [320, 360, 390, 430, 768, 1024, 1280, 1440]) {
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

  test("the desktop Get involved dropdown opens, closes with Escape, and lists four options", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "the dropdown only shows on wide screens");
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    const button = page.locator("[data-submenu-button]");
    await expect(button).toBeVisible();
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    const links = page.locator("[data-submenu] a");
    await expect(links).toHaveCount(5);
    await expect(links.last()).toHaveAttribute("href", "/donate");
    await page.keyboard.press("Escape");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(button).toBeFocused();
  });
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
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(button).toBeFocused();
  });

  test("lists About, Our programs, Get involved with its options, and Contact", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "the menu button only shows on phones");
    await page.goto("/");
    await page.locator("[data-menu-open]").click();
    await expect(page.locator("#menu .menu-label")).toHaveText([
      "About",
      "Our programs",
      "Get involved",
      "Contact",
    ]);
    await expect(page.locator("#menu .menu-sub a")).toHaveText([
      "Sponsor a family",
      "Volunteer",
      "Partner",
      "Donate",
    ]);
    await expect(page.locator("#menu .menu-doors a")).toHaveText(["Help me", "Donate"]);
  });

  test("choosing a link closes the menu and reaches its target", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the menu button only shows on phones");
    await page.goto("/");
    await page.locator("[data-menu-open]").click();
    await page.locator("#menu .menu-list a").first().click();
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
    await expect(page.locator(".tax")).toContainText("47-4917287");
    await expect(page.locator(".tax")).toContainText("501(c)(3)");
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

  test("navigation links are visible inline, including the Get involved options", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".site-header .inline-nav a").first()).toBeVisible();
    await expect(
      page.locator(".site-header [data-submenu] li:not(.submenu-parent) a").first(),
    ).toBeVisible();
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
    await expect(page.locator(".video-link").first()).toHaveAttribute(
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
    expect(data.taxID).toBe("47-4917287");
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
