# Site plan

The approved plan for the Caring for a Cause website rebuild. It records what the site shows, how the information is grouped, and why.

## Goal

Replace the current GoDaddy site with a fast, clear, phone-first site that helps two groups of people do one thing each:

- **Families** find out what help exists and how to ask for it.
- **Supporters** (sponsors, donors, volunteers, partners) find the one way they want to help.

The site is delivered to Tamara as a finished gift. Contact with her is kept to a minimum: one email with the preview, then small corrections.

## Audiences, in priority order

| Audience                | What they need                                          | Where they land                         |
| ----------------------- | ------------------------------------------------------- | --------------------------------------- |
| Families in need        | What programs exist, whether they qualify, how to apply | Hero "I need help" → Get help           |
| Holiday sponsors        | How to sponsor a family, right now                      | Seasonal banner → Sponsor tab           |
| Donors                  | A way to give, proof it's a real nonprofit              | Donate button → Donate tab, trust facts |
| Volunteers and stylists | How to sign up                                          | Get involved → Volunteer or Partner tab |
| Funders and press       | Who runs it, mission, EIN                               | About, footer                           |

## Grouping logic

1. **Split by intent, not by org chart.** The first decision a visitor makes is "get help" or "give help," so the hero offers exactly those two doors.
2. **Programs are cards in a list, not tabs.** On a phone, tabs hide programs people would otherwise scroll past. Holiday Assistance is featured first because it is her largest program and the current season.
3. **Get involved uses tabs.** Each supporter needs only one of four options, so tabs keep the section short. Without JavaScript, all four panels show in order.
4. **One source of truth.** Every word, link, and date lives in `src/data/site.ts`. Seasonal changes never touch layout code.
5. **Nothing half-built ships.** Values not set up yet (donation page, online application) are `null`, and buttons fall back to email. Inactive programs and an empty gallery are hidden.

## Page structure

Single page, top to bottom:

```
┌───────────────────────────────────────────────┐
│ Header: mark + name     nav        [Donate]   │  sticky
├───────────────────────────────────────────────┤
│ HERO (night)                                  │
│  ( logo on light plate )   Headline           │
│                            Subhead            │
│                            [I need help]      │  crimson door
│                            [I want to help]   │  white door
├───────────────────────────────────────────────┤
│ Seasonal banner (purple)        [Sponsor]     │  optional
├───────────────────────────────────────────────┤
│ Trust facts: since 2015 / 501(c)(3) + EIN /   │
│              Toys for Tots partner            │
├───────────────────────────────────────────────┤
│ OUR PROGRAMS                                  │
│  Mission line                                 │
│  ┌ Get help ─────────────────────────────┐    │  #get-help
│  │ who can apply, how to apply  [Call][Email]│
│  └───────────────────────────────────────┘    │
│  Holiday Assistance (featured)   [video]      │
│  Diaper Drive                                 │
│  Back-to-School  ▸ collecting list            │
│  Free Haircuts & Styles          [video]      │
├───────────────────────────────────────────────┤
│ GET INVOLVED (lilac)                          │
│  [Sponsor] [Donate] [Volunteer] [Partner]     │  tabs
│  panel: heading, text, action   [video]       │
├───────────────────────────────────────────────┤
│ MEET TAMARA          [Do More video]          │
├───────────────────────────────────────────────┤
│ Gallery strip (hidden until photos are added) │
├───────────────────────────────────────────────┤
│ FOOTER (night): "Never give up." / contact /  │
│ legal name, EIN, service area                 │
└───────────────────────────────────────────────┘
```

On phones, every two-column block stacks, the hero logo sits above the headline, and the nav scrolls horizontally under the brand row.

**Deep links:** `/#get-help`, `/#programs`, `/#get-involved`, `/#about`, each program slug (for example `/#holiday-assistance`), and each tab (`/#sponsor`, `/#donate`, `/#volunteer`, `/#partner`) opens that tab directly.

## What was removed from the current site

- The duplicated "Our History" block and its template filler text.
- The empty "Can you assist us?" list and the "Team Work" images that don't load.
- The second email address (pending her confirmation of which one she uses).
- The link to the old 2021 Netlify site.
- The cartoon family image and the "Join Us" button that only linked to Facebook.

## Design tokens

Brand colors are sampled from the final logo file.

| Token          | Hex       | Use                          | Contrast                          |
| -------------- | --------- | ---------------------------- | --------------------------------- |
| `--purple`     | `#6008D7` | Brand, buttons, headings     | White on it 8.4:1; on paper 7.9:1 |
| `--crimson`    | `#BA010C` | Heart, "I need help," Donate | White on it 6.8:1; on paper 6.4:1 |
| `--night`      | `#1B0F2E` | Hero and footer              | White on it 18.2:1                |
| `--night-soft` | `#C9B6F2` | Secondary text on night      | 9.9:1                             |
| `--paper`      | `#FAF7FD` | Page background              |                                   |
| `--lilac`      | `#EFE6FA` | Get involved section         |                                   |
| `--ink`        | `#22172E` | Body text                    | 16.1:1 on paper                   |
| `--muted`      | `#5B4E68` | Secondary text               | 7.2:1 on paper                    |

All text pairings pass WCAG AA; most pass AAA.

**Logo on dark:** the logo's purple measures about 2.2:1 against `--night`, below the 3:1 minimum for graphics, so the hero places it on a light circular plate. To place it directly on the dark background instead, pass `logoPlate={false}` to `<Hero />` in `src/pages/index.astro`.

**Type:**

- **Bricolage Grotesque** (headings): sturdy, friendly, and distinct from the logo's script.
- **Atkinson Hyperlegible Next** (body): designed by the Braille Institute for low-vision readers, which suits an audience reading on older phones. Its slashed zero is intentional and keeps phone numbers and the EIN unambiguous.
- 18px base size, major-third scale. Both fonts are self-hosted, with no third-party requests.

**Signature element:** the two hero doors. Everything else stays quiet: one rounded button style, list rows with dividers instead of a grid of identical cards, and no scroll animations.

## Open questions for Tamara

Ask these in the follow-up after she sees the preview. Every one has a safe default in place.

1. Which phone number is current? The site uses (317) 886-0724; Idealist lists (317) 358-6450.
2. Which email should be public? The site uses Caringforacause2015@gmail.com; she also lists Caring4acause2015@gmail.com.
3. Is the Free Bike Program still running? It is hidden until confirmed.
4. Which Facebook page is current? Two pages appear in public listings.
5. Can she share event photos for the hero and gallery?
6. Holiday dates and application windows for this season.
7. Does she serve Hamilton County, Indianapolis (Marion County), or both? This affects wording and grant eligibility.
8. Does she want a donation page (Zeffy, free) and an online family application set up in her name?

## Milestones

1. **Setup (done):** repo, tooling, CI, content model, full homepage built from her existing content.
2. **Polish:** hero photo, gallery photos, final copy pass, icon-only logo, a larger social sharing image.
3. **Preview:** deploy to a private Netlify URL with indexing blocked; send her the preview email.
4. **Corrections:** apply her answers to the open questions.
5. **Launch:** create the Zeffy donation page and forms in her name, connect her GoDaddy domain, enable indexing, add a sitemap, and retire the old Netlify site.
6. **Handoff:** transfer the repo and Netlify site to her accounts and revoke all access tokens.
