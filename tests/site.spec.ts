import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

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
  test("home page has no WCAG 2.2 AA violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
  });

  test("404 page has no WCAG 2.2 AA violations", async ({ page }) => {
    await page.goto("/404");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  test("skip link moves focus to main content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });

  test("every image has alt text", async ({ page }) => {
    await page.goto("/");
    const missing = await page.locator("img:not([alt])").count();
    expect(missing).toBe(0);
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
    const brand = await page.locator(".brand").boundingBox();
    const donate = await page.locator(".site-header .donate").boundingBox();
    expect(brand && donate).toBeTruthy();
    expect(Math.abs(brand!.y + brand!.height / 2 - (donate!.y + donate!.height / 2))).toBeLessThan(
      12,
    );
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
    await page.goto("/");
    const links = page.locator("a[target='_blank']");
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute("rel", /noopener/);
      await expect(link).toContainText("opens in a new tab");
    }
  });

  test("donate button opens the Donate tab", async ({ page }) => {
    await page.goto("/");
    await page.locator(".site-header .donate").click();
    await expect(page.locator("#tab-donate")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#donate")).toBeVisible();
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

  test("a tab link in the URL opens that tab", async ({ page }) => {
    await page.goto("/#volunteer");
    await expect(page.locator("#tab-volunteer")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#volunteer")).toBeVisible();
    await expect(page.locator("#sponsor")).toBeHidden();
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

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("all involvement options are visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("tablist")).toBeHidden();
    for (const id of ["sponsor", "donate", "volunteer", "partner"]) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
  });

  test("videos link to YouTube", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".yt-link").first()).toHaveAttribute(
      "href",
      /^https:\/\/www\.youtube\.com\/watch\?v=/,
    );
  });
});

test.describe("videos", () => {
  test("tapping a video loads the privacy-friendly player", async ({ page }) => {
    await page.route("https://www.youtube-nocookie.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<p>player</p>" }),
    );
    await page.goto("/");
    await page.locator("#holiday-assistance .yt-link").click();
    const iframe = page.locator("#holiday-assistance iframe");
    await expect(iframe).toHaveAttribute("src", /^https:\/\/www\.youtube-nocookie\.com\/embed\//);
    await expect(iframe).toHaveAttribute("title", /.+/);
  });
});

test.describe("search and sharing", () => {
  test("search engines are blocked by default", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    const robots = await request.get("/robots.txt");
    expect(await robots.text()).toContain("Disallow: /");
  });

  test("page has a title, description, canonical URL, and sharing image", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Caring for a Cause/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.{50,}/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://caring4acausesupportiveservices.com/",
    );
    const og = await page.locator('meta[property="og:image"]').getAttribute("content");
    const ogPath = new URL(og!).pathname;
    expect((await request.get(ogPath)).status()).toBe(200);
  });

  test("structured data describes the registered nonprofit", async ({ page }) => {
    await page.goto("/");
    const raw = await page.locator('script[type="application/ld+json"]').textContent();
    const data = JSON.parse(raw!);
    expect(data["@type"]).toBe("NGO");
    expect(data.taxID).toBe("47-4917287");
    expect(data.nonprofitStatus).toBe("Nonprofit501c3");
    expect(data.url).toBe("https://caring4acausesupportiveservices.com/");
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

  test("the page has exactly one h1", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("unknown pages return the custom 404", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page doesn't exist");
  });
});
