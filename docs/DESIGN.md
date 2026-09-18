# Design language

How the site looks and why, so every section, and everything added later (the AI assistant, client portals), feels like one thing. Read with `docs/CONTENT-MAP.md`.

## The idea

Night purple is the world; her real photos are the light in it; crimson is the signal that says "here." Everything else is quiet. The site should feel like the care she gives: deliberate, warm, and never careless.

## Materials

Three materials, each with a job. Use them by job, not by mood.

| Material   | What it is                                                                                                  | Where it's used                                                           | Rules                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Night**  | `--night` #1B0F2E, deepening to `--night-2` #150B26, with at most one soft radial purple glow               | The banner's veil, Get help card, About, page openers, menu, footer       | One glow per surface, never two competing. Text on it is white or `--night-soft`.               |
| **Glass**  | White at 10% over night, 12–14 px blur, a 1 px white hairline at 35%                                        | The "Donate" door, "Call" and "Donate" buttons on night                   | Only over night. Never more than two glass elements in view.                                    |
| **Signal** | `--signal` #E2202C with its own soft glow (`0 14px 40px rgb(226 32 44 / .4)`); `--crimson` #BA010C on paper | "Help me" door, "Start an application", the menu's Help me, header Donate | One signal per screen. It marks the action she most wants taken. It is red, never pink or rose. |

Paper (`--paper`) and lilac sections stay clean: high contrast, no effects. The seasonal strip is lilac, never louder than the banner above it.

## Brand marks

Both marks are vector tracings of her logo files, made once by `scripts/brand/trace-brand.py`, then reduced to integer coordinates with `npx svgo --multipass -p 0 src/assets/brand/*.svg` (a quarter of the traced size, no visible change at any size the site uses), and kept in `src/assets/brand/`:

- **The wordmark** (`wordmark.svg`) is her calligraphic "Caring For A Cause" lettering. It is the first thing on the banner, white over her photos, and appears again in the footer. It inherits `color`, so it is purple on paper if ever needed there.
- **The heart-and-hands mark** (`mark.svg`) is flat: logo purple ring, crimson heart, violet hands, white keylines. It lives in the header, the menu, the footer, and the favicon. It is never blown up as an illustration.

Nothing else is drawn. The mark is not a container for buttons.

## Photos

- Her own photos only. Never stock, never AI-generated, never presented as something they aren't.
- The banner is the one place words sit on photos, and only under a night veil heavy enough that white text stays above 7:1. Everywhere else, photos sit in framed panels and text sits beside or below them.
- Photos are slightly desaturated (0.85) on night so they belong to the purple world, and untouched in light sections.
- Crops keep faces in the top third (each banner photo has a `focus` point in `src/data/site.ts`). The words start just under the header on every screen, the phone veil is heavier at the top, and both doors fit the first screen on an iPhone 15 and a 1366 × 768 laptop. On desktop the banner's photo occupies the right side at close to its native 720 px width and the veil hides its left edge.
- Every image is served at its rendered size or larger on a 2× screen (`sizes` and `widths` are set per placement).

## Stability on phones, a full first screen on desktop

On phones nothing is sized with viewport-height units (`vh`, `svh`, `dvh`, `lvh`). The address bar collapses as you scroll, the viewport height changes, and anything tied to it resizes, which makes photos look like they zoom while scrolling. Sections are sized by their content and photos by aspect ratio, and a browser test resizes a phone viewport and checks the first screen holds still.

On tablets and desktop (36rem and up) the browser's bars don't change the height while scrolling, so the home page's first screen is the one place a plain `vh` is used: the banner, the trust facts, and the season strip together fill the screen below the header (`src/pages/index.astro`). The banner is one composition scaled to the screen: every size in it is a multiple of `--u`, one pixel of the reference layout (a 1280 × 800 screen), between three quarters and double. Change the banner by changing the reference numbers in `src/components/Hero.astro`; never add a size there that isn't in `--u`, or it will drift between screens. The content column is 90% of the screen at every size (`--wide`, `--gutter`), so the left edge everything shares is 5% in on every device. The publish gate allows plain `vh` only inside a `min-width` media block of at least 36rem and rejects every other viewport-height unit.

## The first screen by device

Three device classes, each with a promise a browser test checks on every device in the matrix at its own screen size (`tests/site.spec.ts`, "this device's first screen keeps its promise"):

| Class   | Width        | The first screen                                                                                                                                                                                                                             |
| ------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phone   | under 576px  | The 393px-wide reference layout (an iPhone 15) scaled by screen width: her lettering just under the header, the sentence, both doors stacked, all on the first screen. Every phone shows the same picture; never sized by the screen height. |
| Tablet  | 576 to 895px | The phone's words, unchanged, scaled so their column is 56% of the screen, with her photo on the right as on desktop; the banner fills the first screen so it ends at the season strip, as on desktop.                                       |
| Desktop | 896px and up | The 1280 × 800 reference layout scaled by screen height, then the trust facts and the season strip, ending exactly at the fold. Tablets in landscape are desktop.                                                                            |

The mechanism is the same in every class: a reference pixel and every size a multiple of it. `--rp` sizes the banner's words on phones (one pixel of the 393px reference) and tablets (the same words, scaled so the column is 56% of the screen); `--sp` sizes the header and the two strips (the phone reference on phones, the 768px tablet reference on tablets, 1px on desktop); `--u` sizes the desktop banner. Both are set in `src/styles/global.css` except `--u`, which lives in the banner. Phones and tablets scale by width because a phone's height changes as its address bar collapses; the phone scale stops growing at 1.15 (about 450px, the largest phone), so a wider window keeps the largest phone layout in a left-aligned column. On tablets and desktop the banner, the trust facts, and the season strip fill the first screen (a tablet's or desktop browser's bars don't change the height while scrolling), with the words centred in the banner's room. Desktop scales by height because the first screen must end at the strip, bounded by the width too so a tall portrait screen (an iPad Pro 12.9 upright) keeps the three-line headline. The floors are the 44px tap targets: the header's name and Donate button and the season strip's link never drop below 44px, so on phones narrower than 393px and tablets narrower than 768px those are a few pixels (up to about 8px at 320px) taller than pure scale. The desktop header does not scale; it is fixed chrome, 61px tall.

Because every size derives from the screen, browser zoom does not scale the banner's text linearly: zooming in narrows the CSS viewport, which moves the page into the next class down (a zoomed desktop becomes the tablet layout, then the phone layout), and the text grows in those steps. Nothing is lost at 200%; it is the phone banner. Body text elsewhere on the page stays in rem and zooms normally.

When editing the banner or the strips: change the reference numbers, never add a size that isn't a multiple of the class's reference pixel, or it will drift between devices. Two browser tests guard this on every push: one compares the banner's composition, line breaks included, between devices of each class; the other checks each device in the matrix, at its own screen size, against its class's promise. Run `npm run test` and look at the device screenshots before sending anything.

## Motion

One orchestrated moment: the banner photos crossfade (seven seconds each). Everything else moves only in response to a person: doors and cards lift 2 px on hover, the menu fades in, items stagger in. All of it stops under `prefers-reduced-motion`.

## Type

- **Bricolage Grotesque** for anything that should be read as a voice: the headline, doors, headings, labels, buttons, menu.
- **Atkinson Hyperlegible Next** for anything that should be read as information.
- Her lettering is the wordmark itself, so no script typeface is loaded. Her phrases ("Together we can.", "Never give up.") are set in Bricolage.
- The page's first words are her name, then one sentence that says what she does, then a choice: "Help me" / "Donate."
- Section openers are always the same: a small purple label, a heading, one lede line.
- Sentence case everywhere. No all-caps labels, no tracked-out eyebrows.

## Shape

Three radii and nothing else: pills (`--r-pill`) for buttons, chips and tabs; cards (`--r-card`, 20 px) for doors, panels and cards; images (`--r-img`, 14 px). Focus rings are purple on light surfaces and white on dark ones (`--focus`), never a third color.

## Decoration

Decoration must come from her: the heart-and-hands mark, the diagonal cut (from the header wedge), the caption pill with her tagline. The diagonal is the site's one geometric motif and may reappear as a section edge or a divider. Nothing generic (blobs, sparkles, confetti) is added to fill space.

## Words

Every sentence does one job. Plain verbs, her own phrases where they exist. Claims are facts with sources (`src/data/facts.ts`); anything unconfirmed stays off public builds.

## What "premium" means here

Not more effects. It means: the first screen routes people in one glance, everything is legible at arm's length, nothing is misaligned by a pixel (the header, every section, and the footer share one left edge, and a test checks it), every image is sharp for its size, the page loads in under two seconds on a cheap phone, and it works without JavaScript, with a keyboard, and with a screen reader. Luxury is care that holds up under inspection.
