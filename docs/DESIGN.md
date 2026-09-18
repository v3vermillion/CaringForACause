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

## Stability on phones

Nothing is sized with viewport-height units (`vh`, `svh`, `dvh`, `lvh`). On phones the address bar collapses as you scroll, the viewport height changes, and anything tied to it resizes, which makes photos look like they zoom while scrolling. Sections are sized by their content and photos by aspect ratio. The publish gate rejects builds that use these units, and a browser test resizes the viewport and checks the first screen holds still.

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
