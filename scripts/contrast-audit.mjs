// Measures the text spots the axe scan cannot judge for contrast: text on
// gradients, photos and translucent surfaces (decision 84). Needs the built
// preview: `npm run preview`, then `node scripts/contrast-audit.mjs phone`
// (393px class) or `desktop` (1280px class).
//
// Two passes per page. The quick pass screenshots each unjudged spot with
// its text made transparent and takes the worst contrast between the text
// colour and ANY pixel in the spot's box — decoration included, so it
// over-flags. The precise pass re-measures each flag at the glyph pixels
// only: a shot with the text and one without, diffed; a pixel the text
// meaningfully covers is a glyph pixel, and the contrast is taken against
// the background image's pixel there, so antialiasing never blends in. A
// spot over the banner montage is measured once per photo. Exits non-zero
// if any spot measures under its WCAG threshold (4.5:1, or 3:1 for large
// text).
import { chromium } from "playwright-core";
import { AxeBuilder } from "@axe-core/playwright";

const mode = process.argv[2] ?? "phone";
const vp = mode === "desktop" ? { width: 1280, height: 800 } : { width: 393, height: 660 };
const base = process.env.PREVIEW_URL ?? "http://localhost:4321";
const pages = ["/", "/apply/", "/donate/", "/404"];

const MONTAGE = "[class*=montage] img, [class*=crossfade] img, [class*=slides] img";

function parseColor(s) {
  const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  return m ? { rgb: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] } : null;
}
const lin = (v) => ((v /= 255), v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const luminance = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
function contrast(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Hide (or restore) the element's own text so only its background shows. */
async function setTextTransparent(handle, on) {
  await handle.evaluate((el, on) => {
    const flip = (node, key) => {
      if (on) {
        node.dataset[key] = node.getAttribute("style") ?? "";
        node.style.setProperty("color", "transparent", "important");
        node.style.setProperty("text-shadow", "none", "important");
      } else {
        node.setAttribute("style", node.dataset[key] || "");
        delete node.dataset[key];
      }
    };
    flip(el, "auditStyle");
    for (const child of el.querySelectorAll("*")) flip(child, "auditStyleChild");
  }, on);
}

/** Decode a PNG in the page and report extreme pixels, or glyph-diff stats. */
async function readPixels(page, args) {
  return page.evaluate(async ({ shotA, shotB, fg }) => {
    const load = async (b64) => {
      const img = new Image();
      img.src = "data:image/png;base64," + b64;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      return g.getImageData(0, 0, c.width, c.height).data;
    };
    const lin = (v) => ((v /= 255), v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const a = await load(shotA);
    if (!shotB) {
      // Quick pass: the lightest and darkest pixel of the background shot.
      let minL = 2,
        maxL = -1,
        minC = null,
        maxC = null;
      for (let i = 0; i < a.length; i += 4) {
        const L = lum(a[i], a[i + 1], a[i + 2]);
        if (L < minL) ((minL = L), (minC = [a[i], a[i + 1], a[i + 2]]));
        if (L > maxL) ((maxL = L), (maxC = [a[i], a[i + 1], a[i + 2]]));
      }
      return { minC, maxC };
    }
    // Precise pass: pixels where the two shots differ enough are glyph
    // pixels; measure the text colour against the BACKGROUND shot there.
    const b = await load(shotB);
    const Lf = lum(...fg);
    let worst = Infinity,
      worstBg = null,
      glyphs = 0;
    for (let i = 0; i < a.length; i += 4) {
      const d =
        Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
      if (d < 90) continue;
      glyphs++;
      const Lb = lum(b[i], b[i + 1], b[i + 2]);
      const c = (Math.max(Lf, Lb) + 0.05) / (Math.min(Lf, Lb) + 0.05);
      if (c < worst) ((worst = c), (worstBg = [b[i], b[i + 1], b[i + 2]]));
    }
    return { worst, worstBg, glyphs };
  }, args);
}

const montageVariants = (page) =>
  page.evaluate((sel) => document.querySelectorAll(sel).length, MONTAGE);
const showMontagePhoto = (page, i) =>
  page.evaluate(
    ({ sel, i }) => {
      [...document.querySelectorAll(sel)].forEach((im, j) => {
        if (i < 0) {
          im.style.removeProperty("opacity");
        } else {
          im.style.setProperty("opacity", j === i ? "1" : "0", "important");
        }
      });
    },
    { sel: MONTAGE, i },
  );

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: vp,
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});
const page = await context.newPage();
const failures = [];
let measured = 0;

for (const path of pages) {
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.addStyleTag({
    content:
      "*,*::before,*::after{animation-play-state:paused !important;transition:none !important;caret-color:transparent !important}",
  });
  const axe = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
  const nodes = [
    ...(axe.incomplete.find((r) => r.id === "color-contrast")?.nodes ?? []),
    ...(axe.violations.find((r) => r.id === "color-contrast")?.nodes ?? []),
  ];
  const seen = new Set();
  console.log(`${path}: ${nodes.length} spots the scan could not judge`);
  for (const node of nodes) {
    const sel = node.target[0];
    if (typeof sel !== "string" || seen.has(sel)) continue;
    seen.add(sel);
    let handle;
    try {
      handle = await page.locator(sel).first().elementHandle({ timeout: 3000 });
      if (!handle) continue;
      const info = await handle.evaluate((el) => {
        el.scrollIntoView({ block: "center", behavior: "instant" });
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const mid = [
          Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1),
          Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1),
        ];
        const overMontage = !!document
          .elementsFromPoint(...mid)
          .find(
            (e) =>
              e.matches?.("img") &&
              e.closest("[class*=montage],[class*=crossfade],[class*=slides]"),
          );
        return {
          color: cs.color,
          fontSize: parseFloat(cs.fontSize),
          fontWeight: parseInt(cs.fontWeight) || 400,
          text: el.textContent.replace(/\s+/g, " ").trim().slice(0, 40),
          visible: r.width > 2 && r.height > 2 && cs.visibility !== "hidden",
          overMontage,
        };
      });
      const color = parseColor(info.color);
      if (!info.visible || !info.text || !color) continue;
      await page.waitForTimeout(60);
      const clip = await handle.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const x = Math.max(0, r.x - 2);
        const y = Math.max(0, r.y - 2);
        return {
          x,
          y,
          width: Math.floor(Math.min(r.width + 4, innerWidth - x)),
          height: Math.floor(r.height + 4),
        };
      });
      if (clip.width < 2 || clip.height < 2) continue;
      const large = info.fontSize >= 24 || (info.fontSize >= 18.66 && info.fontWeight >= 700);
      const needed = large ? 3 : 4.5;

      const variants = info.overMontage ? await montageVariants(page) : 0;
      let worst = Infinity;
      let worstBg = null;
      let worstVariant = "static";
      for (let v = 0; v < Math.max(1, variants); v++) {
        if (variants) {
          await showMontagePhoto(page, v);
          await page.waitForTimeout(120);
        }
        // Quick pass on the background-only shot.
        await setTextTransparent(handle, true);
        await page.waitForTimeout(40);
        const bare = (await page.screenshot({ clip })).toString("base64");
        await setTextTransparent(handle, false);
        const quick = await readPixels(page, { shotA: bare, shotB: null, fg: null });
        const quickWorst = Math.min(
          ...[quick.minC, quick.maxC].filter(Boolean).map((bg) => contrast(color.rgb, bg)),
        );
        if (quickWorst >= needed) {
          if (quickWorst < worst) ((worst = quickWorst), (worstBg = null));
          continue;
        }
        // Precise pass at the glyph pixels.
        const withText = (await page.screenshot({ clip })).toString("base64");
        await setTextTransparent(handle, true);
        await page.waitForTimeout(40);
        const noText = (await page.screenshot({ clip })).toString("base64");
        await setTextTransparent(handle, false);
        const fine = await readPixels(page, { shotA: withText, shotB: noText, fg: color.rgb });
        const w = fine.glyphs > 0 ? fine.worst : quickWorst;
        if (w < worst)
          ((worst = w),
            (worstBg = fine.worstBg),
            (worstVariant = variants ? `photo ${v + 1}` : "static"));
      }
      if (variants) await showMontagePhoto(page, -1);
      measured++;
      const ratio = Math.round(worst * 100) / 100;
      if (worst < needed) {
        failures.push({ page: path, sel, text: info.text, ratio, needed, worstBg, worstVariant });
        console.log(
          `  FAIL ${ratio}:1 (needs ${needed}:1) ${sel} "${info.text}" on ${worstVariant}`,
        );
      }
    } catch (error) {
      console.log(`  skip ${sel}: ${String(error).split("\n")[0].slice(0, 100)}`);
    } finally {
      await handle?.dispose();
    }
  }
}
await browser.close();
console.log(`\n${mode}: measured ${measured} spots; ${failures.length} under threshold.`);
process.exit(failures.length ? 1 : 0);
