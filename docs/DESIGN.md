# Design language

How the site looks and why, so every section, and everything added later (the AI assistant, client portals), feels like one thing. Read with `docs/CONTENT-MAP.md`.

## The idea

Night purple is the world; her real photos are the light in it; crimson is the signal that says "here." Everything else is quiet. The site should feel like the care she gives: deliberate, warm, and never careless.

## Materials

Three materials, each with a job. Use them by job, not by mood.

| Material   | What it is                                                                                                  | Where it's used                                                                                | Rules                                                                                                                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Night**  | `--night` #1B0F2E, deepening to `--night-2` #150B26, with at most one soft radial purple glow               | The banner's veil, Get help card, About, page openers                                          | One glow per surface, never two competing. Text on it is white or `--night-soft`. The menu and the footer are darker, the near-black of the owner's references, and lit as they paint them (decisions 44 and 48). |
| **Glass**  | White at 10% over night, 12–14 px blur, a 1 px white hairline at 35%                                        | The "Donate" door, "Call" and "Donate" buttons on night                                        | Only over night. Never more than two glass elements in view.                                                                                                                                                      |
| **Signal** | `--signal` #E2202C with its own soft glow (`0 14px 40px rgb(226 32 44 / .4)`); `--crimson` #BA010C on paper | "Help me" door, "Start an application", the menu's Help me, header Donate, the footer's Donate | One signal per screen. It marks the action she most wants taken. It is red, never pink or rose.                                                                                                                   |

Paper (`--paper`) and lilac sections stay clean: high contrast, no effects. The seasonal strip is lilac, never louder than the banner above it.

## Brand marks

Both marks are vector tracings of her logo files, made once by `scripts/brand/trace-brand.py`, then reduced to integer coordinates with `npx svgo --multipass -p 0 src/assets/brand/*.svg` (a quarter of the traced size, no visible change at any size the site uses), and kept in `src/assets/brand/`:

- **The lockup** (`wordmark-lockup.svg`) is her script "Caring For A Cause" over "SUPPORTIVE SERVICES" in spaced capitals. It is the first thing on the banner, over her photos, and appears again in the footer, both times in the same lit lavender with a violet glow (decisions 45 and 49). Its paint is rendered once per page (`BrandPaint.astro`). The plain script wordmark (`wordmark.svg`) inherits `color`, so it is purple on paper if ever needed there.
- **The heart-and-hands mark** (`mark.svg`) is flat: logo purple ring, crimson heart, violet hands, white keylines. It lives in the header, the menu, the footer, and the favicon. It is never blown up as an illustration. Where a reference lights or dims it (the menu's watermark, the footer's lit mark and its line-drawn seal), its four fills are recoloured in CSS and nothing is redrawn. The footer's lettering is her lockup artwork, traced with its own gradients (`wordmark-lockup.svg`, decision 45).

Nothing else is drawn. The mark is not a container for buttons.

## The header

The bar is the one place the brand's own artwork frames the page: a light lavender lens with a sweep of her logo's violet and crimson bands painted behind its left end (an inline SVG in `src/components/SiteHeader.astro`, decorative and hidden from assistive technology), the heart-and-hands mark with a white glow, her name, the Donate pill (a deep crimson gradient with a pale ring and a pink glow, painted by a pseudo-element inside a 44px link), and on phones and tablets the wedge in the top-right corner, deep purple with a lighter violet band and a crimson hairline along its cut. It was rebuilt from her banner artwork rather than from the site's flat materials, so it is the one surface that layers gradients and glows; nothing else on the site does. Every size in it is a multiple of `--sp`, so it is the same bar on every device of a class; only the sweep's length follows the bar's height, so on a wide screen it sits in the left end. The glow under the Donate pill is placed from the bar's right edge in reference pixels, not in percent of the bar: a percent position is a different place on every width, and the glow was stranded mid-bar on tablets and desktops. The rule for any painted decoration: position and size it from the element it belongs to, in the class's reference pixels, never in percent of a box whose width varies inside the class. A browser test screenshots the bar on every page at the reference device and the edges of each class, scales each to the reference's size, and requires the pictures to match pixel for pixel within what antialiasing at another scale changes ("the header is the same picture on every phone/tablet/desktop"); that is what catches a stranded background, which the geometry tests cannot see. The letter f in the name is the one glyph from another face (`public/fonts/brand-f.woff2`, an Inter subset with only that letter, under the OFL), because her artwork's f is straight-stemmed where Bricolage's hooks; every other glyph is Bricolage.

## The footer

The footer is the second surface built from the owner's own picture (decision 48), and it follows the header's rules. On desktop it is the reference: her lit mark over her lockup artwork (decision 45), the glossy Donate pill and her sign-off, centred in the first column; Explore and Connect with us behind hairline dividers, their heads in the bold serif over a short lavender-to-crimson rule; a rule lit violet to magenta across the whole width, flaring white-pink where the Explore column starts; and the record as one line, her mark drawn in lavender lines, the legal name, a pin with the city and the service area, the copyright. Every desktop size is the reference's, converted to rem at the content column's width, so the picture fills the page's column and starts at the page's left edge like every section. Phones stack the parts in one column and tablets centre the lockup over the two lists; all three are one picture per class. The glows are sized in rem from the corners they belong to, per class, never in percent of the width. The serif is the menu's Literata; the sans of the links and contact details is a small Assistant subset, chosen by measuring the reference's words against 38 open faces.

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

The mechanism is the same in every class: a reference pixel and every size a multiple of it. `--rp` sizes the banner's words on phones (one pixel of the 393px reference) and tablets (the same words, scaled so the column is 56% of the screen); `--sp` sizes the header, the two strips, and (through the root font size) every rem on the site: the phone reference on phones, the 768px tablet reference on tablets, the 1280px reference on desktop; `--u` sizes the desktop banner. All are set in `src/styles/global.css` except `--u`, which lives in the banner. Phones and tablets scale by width because a phone's height changes as its address bar collapses; the phone scale stops growing at 1.15 (about 450px, the largest phone), and the content column stops with it, so a wider phone-class window shows the largest phone's page centred. On tablets and desktop the banner, the trust facts, and the season strip fill the first screen (a tablet's or desktop browser's bars don't change the height while scrolling), with the words centred in the banner's room. The desktop banner scales by height because the first screen must end at the strip, bounded by the width too so a tall portrait screen (an iPad Pro 12.9 upright) keeps the three-line headline; below seven tenths (a desktop window shorter than about 660px) the banner stops shrinking and the strip drops just under the fold. The floors are the 44px tap targets: the header's name and Donate button and the season strip's link never drop below 44px, so on phones narrower than 393px and tablets narrower than 768px those are a few pixels (up to about 8px at 320px) taller than pure scale.

Because every size derives from the screen, browser zoom does not scale text linearly: zooming in narrows the CSS viewport, which moves the page into the next class down (a zoomed desktop becomes the tablet layout, then the phone layout), and the text grows in those steps. Nothing is lost at 200%; it is the phone page.

When editing the banner or the strips: change the reference numbers, never add a size that isn't a multiple of the class's reference pixel, or it will drift between devices. Two browser tests guard this on every push: one compares the banner's composition, line breaks included, between devices of each class; the other checks each device in the matrix, at its own screen size, against its class's promise. Run `npm run test` and look at the device screenshots before sending anything.

## Every screen by device

The rest of the site keeps the same promise: a section approved on the class's reference screen (a 393px phone, a 768px tablet, a 1280px desktop) is the same picture, scaled, on every device of the class, on every page. The root font size is `16 * var(--sp)`, so every rem on the site follows the class scale, and the rules for what may be written in a stylesheet follow from that:

- **Sizes are rem.** Radii, rules, icons, borders, and offsets are rem, never px: a px size stays the same while everything around it scales, and the composition drifts. The only px are the 44px tap-target floors (`max(44px, 3rem)` and so on), the 1px floor on a hairline (`--hairline`), and the caps on the scale itself. The footer's two lists are the one place the floor is held under `(pointer: coarse)` instead of at every width: eight rows floored at once made the footer taller than the same layout scaled, and 44px is a minimum for fingers, not for a mouse. A row is 2.75rem otherwise, which is 44px at the class's reference width.
- **No viewport-width formulas in type or spacing.** The large type steps and the section spacing (`--step-2` to `--step-4`, `--space-xl`) are one rem value per class rather than a `clamp()` with a `vw` term, because a `vw` term keeps growing where the scale stops (a phone-class window past 450px, a desktop past 2560px). Each value is what the old formula gave on the reference screen, so nothing moved.
- **Breakpoints are the class edges only,** 36rem and 56rem. A breakpoint inside a class (a two-column form at 40rem, say) would give the class two layouts; the form, the contact cards, and the program tiles now change at 36rem, and at the small end of the tablet class they are the 768px layout at three quarters.
- **No floor on the scale.** A minimum root font size would hold the text while the column kept shrinking, and paragraphs would rewrap. The smallest text is at each class's narrowest width: a 13px root on a 320px phone, 12px on a 576px tablet, 11.2px in an 896px desktop window (no laptop is that narrow; a half-screen window on a 1920px monitor gives 12px). Browser zoom still enlarges everything.
- **Rings, not borders, on shrink-wrapped controls.** A button, a choice pill, or a tab is as wide as its text plus padding; a border on it snaps to whole pixels and would shift the next control by a pixel between devices. Their 0.125rem ring is an inset box-shadow, and the padding includes its width. Form fields keep real borders (their width comes from the grid, not the border).
- **The column stops with the scale.** `--wide` and `--gutter` are written as plain `min()` and `max()` (Chromium computes `100% - 2 * var(--gutter)` as zero when the gutter nests a `calc()` around a `min()`).

One browser test checks all of it on every push ("every phone/tablet/desktop shows the same page composition"): on each page, every element under the first screen (headings, paragraphs, list items, links, buttons, form controls, images, and the boxes around them) must sit at the same place, at the same size, in the same font size, on the reference device and on the class's edges (320 to 540px, 576 to 834px, 896 to 2560px), to within two reference pixels; a control at its 44px floor is exempt, and what sits under one may move down by its growth. Anything else, a px margin, a `vw` size, a breakpoint inside a class, fails the build. The check needs layout that scales linearly (a paragraph at seven tenths must be seven tenths as wide and tall, or it wraps for a reason that is not the stylesheet's). Only Chromium does, and only above device scale 1, where it positions glyphs fractionally; Firefox rounds line heights and WebKit wraps small text differently, and on CI both flipped lines the stylesheet did not. So the pages are measured in Chromium at device scale 2, with a probe that confirms the text is linear there; the drift it catches is in the stylesheet, so one exact engine is enough, and the header's pixel comparison and every other check still run in all three engines.

## Motion

One orchestrated moment: the banner photos crossfade (seven seconds each). Everything else moves only in response to a person: doors and cards lift 2 px on hover, the menu fades in, items stagger in. All of it stops under `prefers-reduced-motion`.

## Type

- **Bricolage Grotesque** for anything that should be read as a voice: the headline, doors, headings, labels, buttons.
- **Atkinson Hyperlegible Next** for anything that should be read as information.
- **Literata** (a display-size subset, `public/fonts/serif.woff2`) for the two surfaces built from her references, the phone menu and the footer, and **Assistant** (`public/fonts/footer-sans.woff2`) for the footer's links and contact details, the closest open face to the reference's.
- Her lettering is the wordmark itself, so no script typeface is loaded. Her phrases are set in Bricolage ("Together we can.") and, in the footer, the serif ("Never give up.").
- The page's first words are her name, then one sentence that says what she does, then a choice: "Help me" / "Donate."
- Section openers are always the same: a small purple label, a heading, one lede line.
- Sentence case everywhere. No all-caps labels, no tracked-out eyebrows. (The spaced capitals under her script in the footer are her lockup artwork, an image, not set text.)

## Shape

Three radii and nothing else: pills (`--r-pill`) for buttons, chips and tabs; cards (`--r-card`, 1.25rem: 20px on the reference screen) for doors, panels and cards; images (`--r-img`, 0.875rem: 14px). Focus rings are purple on light surfaces and white on dark ones (`--focus`), never a third color.

## Decoration

Decoration must come from her: the heart-and-hands mark, the diagonal cut (from the header wedge), the header's sweep of her logo's bands, the caption pill with her tagline. The diagonal is the site's one geometric motif and may reappear as a section edge or a divider. Nothing generic (blobs, sparkles, confetti) is added to fill space.

## Words

Every sentence does one job. Plain verbs, her own phrases where they exist. Claims are facts with sources (`src/data/facts.ts`); anything unconfirmed stays off public builds.

## What "premium" means here

Not more effects. It means: the first screen routes people in one glance, everything is legible at arm's length, nothing is misaligned by a pixel (the header, every section, and the footer share one left edge, and a test checks it), every image is sharp for its size, the page loads in under two seconds on a cheap phone, and it works without JavaScript, with a keyboard, and with a screen reader. Luxury is care that holds up under inspection.
