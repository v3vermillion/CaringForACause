# Design language

How the site looks and why, so every section, and everything added later (the AI assistant, client portals), feels like one thing. Read with `docs/CONTENT-MAP.md`.

## The idea

Night purple is the world; her real photos are the light in it; crimson is the signal that says "here." Everything else is quiet. The site should feel like the care she gives: deliberate, warm, and never careless.

## Materials

Three materials, each with a job. Use them by job, not by mood.

| Material   | What it is                                                                                                     | Where it's used                                                    | Rules                                                                                            |
| ---------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| **Night**  | `--night` #1B0F2E with one soft radial purple glow                                                             | Hero, Get help card, menu, footer                                  | One glow per surface, never two competing. Text on it is white or `--night-soft`.                |
| **Glass**  | White at 9–15% over night, 14–16 px blur, a 1 px "light on glass" gradient hairline (white → purple → crimson) | "I want to help" door, the photo panel edge, the menu close button | Only over night. Never over photos with text on top. Never more than two glass elements in view. |
| **Signal** | Crimson with a soft crimson glow (`0 14px 40px rgb(186 1 12 / .4)`)                                            | "Help me" door, Donate, primary calls in dark cards                | One signal per screen. It marks the action she most wants taken.                                 |

Paper (`--paper`) and lilac sections stay as they are: clean, high contrast, no effects.

## Neon and glow, precisely

"Neon" here means light, not color. The glow is always the element's own color bleeding softly into the dark, never a different color and never on text. The hairline gradient is the only place three colors meet, and it is 1 px wide. If something looks like a nightclub, it's over the line.

## Photos

- Her own photos only. Never stock, never AI-generated, never presented as something they aren't.
- **Nothing is written on a photo.** Photos sit in framed panels with the glass hairline; text sits beside or below them. The one exception is a small caption pill that overlaps the panel's edge.
- Photos are slightly desaturated (0.8–0.85) in dark sections so they belong to the purple world, and untouched in light sections.
- Crops keep faces in the top third on phones.

## Stability on phones

Nothing is sized with viewport-height units (`vh`, `svh`, `dvh`, `lvh`). On phones the address bar collapses as you scroll, the viewport height changes, and anything tied to it resizes, which makes photos look like they zoom while scrolling. Sections are sized by their content and photos by aspect ratio. The publish gate rejects builds that use these units, and a browser test resizes the viewport and checks the first screen holds still.

## Motion

One orchestrated moment: the hero photos crossfade (six seconds each). Everything else moves only in response to a person: doors lift 2 px on hover, the menu fades in, items stagger in. All of it stops under `prefers-reduced-motion`.

## Type

- **Lobster** (her logo's lettering) for the wordmark and her tagline only. Never for body text or buttons.
- **Bricolage Grotesque** for anything that should be read as a voice: doors, headings, menu.
- **Atkinson Hyperlegible Next** for anything that should be read as information.
- The page's first words are always a choice: "Help me" / "I want to help."
- Sentence case everywhere. No all-caps labels, no tracked-out eyebrows.

## Decoration

Decoration must come from her: the heart-and-hands mark, the diagonal cut (from the header wedge), the caption pill with her tagline. The diagonal is the site's one geometric motif and may reappear as a section edge or a divider. Nothing generic (blobs, sparkles, confetti) is added to fill space.

## Words

Every sentence does one job. Plain verbs, her own phrases where they exist ("Together we can.", "Never give up."). Claims are facts with sources (`src/data/facts.ts`); anything unconfirmed stays off public builds.

## What "premium" means here

Not more effects. It means: the first screen routes people in one glance, everything is legible at arm's length, nothing is misaligned by a pixel, every image is sharp for its size, the page loads in under two seconds on a cheap phone, and it works without JavaScript, with a keyboard, and with a screen reader. Luxury is care that holds up under inspection.
