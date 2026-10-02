# Site plan

The approved plan for the Caring for a Cause website rebuild. It records what the site shows, how the information is grouped, and why.

## Goal

Replace the current GoDaddy site with a fast, clear, phone-first site that helps two groups of people do one thing each:

- **Families** find out what help exists and how to ask for it.
- **Supporters** (sponsors, donors, volunteers, partners) find the one way they want to help.

The site is delivered to Tamara as a finished gift. Contact with her is kept to a minimum: one email with the preview, then small corrections.

## Audiences, in priority order

| Audience                | What they need                                          | Where they land                                        |
| ----------------------- | ------------------------------------------------------- | ------------------------------------------------------ |
| Families in need        | What programs exist, whether they qualify, how to apply | Hero "I need help" → Get help                          |
| Holiday sponsors        | How to sponsor a family, right now                      | Get involved → Sponsor tab (the season strip, when on) |
| Donors                  | A way to give, proof it's a real nonprofit              | Donate button → Donate tab, proof line                 |
| Volunteers and stylists | How to sign up                                          | Get involved → Volunteer or Partner tab                |
| Funders and press       | Who runs it, mission, EIN                               | About, trust strip                                     |

## Grouping logic

1. **Split by intent, not by org chart.** The first decision a visitor makes is "get help" or "give help," so the hero offers exactly those two doors.
2. **Programs are rows in a list, not tabs, with jump tiles on top.** On a phone, tabs hide programs people would otherwise scroll past; the tiles show all of them at a glance and jump to each. Holiday Assistance is featured first because it is her largest program and the current season.
3. **Get involved uses tabs.** Each supporter needs only one of four options, so tabs keep the section short. Without JavaScript, all four panels show in order.
4. **One source of truth.** Every word, link, and date lives in `src/data/site.ts`. Seasonal changes never touch layout code.
5. **Nothing half-built ships.** Values not set up yet (donation page, online application) are `null`, and buttons fall back to email. Inactive programs and an empty gallery are hidden.

## Page structure

Three pages. The home page is the route map; the two doors lead to their own pages.

```
┌───────────────────────────────────────────────┐
│ Header (night): mark + her lockup   About ·   │  sticky; phone: mark, lockup,
│   Programs · Get involved · Contact  [Donate] │  Donate, corner-wedge menu:
│                                               │  Help me · the four · Donate
├───────────────────────────────────────────────┤
│ BANNER (her photos, crossfading, night veil)  │
│  — Together we can. —                         │  eyebrow
│  Headline (serif, last line lavender italic)  │
│  subhead                                      │
│  ( Help me › )  ( Donate › )   equal pills    │  → /apply, /donate
│ ~~~ wave: violet and crimson ribbons ~~~~~~~~ │
├───────────────────────────────────────────────┤
│ Holiday Meals · Gifts · Diapers · School      │  night band: program strip
│  Supplies (her neon icons, a title each)      │  → each opens its program
│ — since 2015 · 501(c)(3) + EIN · Toys for Tots — │  proof line; ends a phone's first screen
│ Seasonal strip (night)     Sponsor a family → │  optional, off (decision 66)
│ ~~~ wave ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ │
├───────────────────────────────────────────────┤
│ OUR PROGRAMS (paper, her mark as a watermark) │
│  jump tiles                                   │
│  ┌ Get help (night) ─────────────────────┐    │  #get-help
│  │ who can apply  [Start an application] │    │
│  │                [Call] Email us →      │    │
│  └───────────────────────────────────────┘    │
│  Holiday Assistance · Diaper Drive ·          │  alternating rows,
│  Back-to-School ▸ list · Free Haircuts ▸ player│  one click-to-play video
├───────────────────────────────────────────────┤
│ ╱ diagonal edge ╱                             │
│ GET INVOLVED (lilac)                          │
│  [Sponsor] [Donate] [Volunteer] [Partner]     │  tabs
│ ~~~ wave ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ │
│ ABOUT (night, lit): portrait · Meet Tamara ·  │  video loads on request
│               [▶ Watch her story]             │
│ ~~~ wave ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ │
├───────────────────────────────────────────────┤
│ Gallery strip (hidden until 4+ photos)        │
├───────────────────────────────────────────────┤
│ FOOTER (near-black, from her reference):      │  #contact is its Connect column
│ lit mark · her lockup artwork · [Donate] ·    │
│ Never give up.  │  Explore: Help me · About ·│
│ Programs · Get involved │                     │
│ Connect with us: phone · email · Facebook     │
│ ── lit rule ── mark │ legal name │ city ·     │
│ serving area │ © year                         │
└───────────────────────────────────────────────┘

/apply    Help me: a night opener ending in the wave, then one sheet of
          four steps (about you · household · what you need · review and
          send), each opening "Step N of 4", sent by email, one row per
          child; on desktop a night aside offers the phone and email
/donate   Donate: a night opener, and beside it on desktop (crossing the
          wave; under it on phones) the chooser: once or monthly, four
          amounts and a "$ Other" field, the gift in the button, then the
          payment page (`links.donate`) or an email with the gift written in
/404      Page not found: the night opener with the banner's two doors
```

On phones every two-column block stacks, the two doors stay side by side under the headline, and the tabs and program tiles scroll sideways inside the page gutter.

**Deep links:** `/#get-help`, `/#programs`, `/#get-involved`, `/#about`, `/#contact`, each program slug (for example `/#holiday-assistance`), and each tab (`/#sponsor`, `/#donate`, `/#volunteer`, `/#partner`) opens that tab directly.

## Design tokens

Brand colors are sampled from the final logo file.

| Token          | Hex       | Use                                 | Contrast                             |
| -------------- | --------- | ----------------------------------- | ------------------------------------ |
| `--purple`     | `#6008D7` | Brand, buttons, headings            | White on it 8.4:1; on paper 7.9:1    |
| `--crimson`    | `#BA010C` | Heart, Donate button on paper       | White on it 6.8:1; on paper 6.4:1    |
| `--signal`     | `#E2202C` | The one crimson on night: "Help me" | White on it 4.6:1 (large, bold text) |
| `--night`      | `#1B0F2E` | Hero, dark cards, page openers      | White on it 18.2:1                   |
| `--night-soft` | `#C9B6F2` | Secondary text on night             | 9.9:1                                |
| `--paper`      | `#FAF7FD` | Page background                     |                                      |
| `--lilac`      | `#EFE6FA` | Get involved section                |                                      |
| `--ink`        | `#22172E` | Body text                           | 16.1:1 on paper                      |
| `--muted`      | `#5B4E68` | Secondary text                      | 7.2:1 on paper                       |

All text pairings pass WCAG AA; most pass AAA.

**Marks:** her lettering and the heart-and-hands mark are inline SVG tracings of her logo files (`src/assets/brand/`, decision 29). Her lockup (the script over "Supportive Services") is in the header and in the footer, in the same lit lavender; the mark appears in the header, the menu, the footer (lit, and drawn in lines in the record), and the link preview. The menu and the footer sit on the near-black navy of the owner's references rather than on `--night`. The logo's purple measures about 2.2:1 against `--night`, so the full logo is never placed directly on the dark background.

**Type:**

- **Bricolage Grotesque** (headings, buttons, labels): sturdy, friendly, and distinct from the logo's script.
- **Literata** (the banner headline, in bold with one line in bold italic; the phone menu and the footer): the serif of the owner's references.
- **Atkinson Hyperlegible Next** (body): designed by the Braille Institute for low-vision readers, which suits an audience reading on older phones. Its slashed zero is intentional and keeps phone numbers and the EIN unambiguous.
- 18px base size, major-third scale, with the lede step and the larger steps set per device class so a phone's title stands clear of its lede. Every font is self-hosted, with no third-party requests. Her lettering is the wordmark itself, so no script typeface is loaded.

**Signature element:** the serif headline with its lavender line and the two equal doors over the crossfading photos, handed to the page by the wave. Everything else stays quiet: one button shape, three radii, list rows with dividers instead of a grid of identical cards, and no scroll animations.

## Open questions for Tamara

Contact details, location, and photo permission are tracked as pending facts in `src/data/site.ts`; that list is the source of truth, and every build log prints it. The rest are planning questions.

Ask these in the follow-up after she sees the preview. Every one has a safe default in place.

1. Which phone number is current? The site uses (317) 886-0724; Idealist lists (317) 358-6450.
2. Which email should be public? The site uses caringforacause2015@gmail.com; she also lists Caring4acause2015@gmail.com.
3. Is the Free Bike Program still running? It is hidden until confirmed.
4. Which Facebook page is current? Two pages appear in public listings.
5. Can she share event photos for the hero and gallery?
6. Holiday dates and application windows for this season.
7. Does she serve Hamilton County, Indianapolis (Marion County), or both? This affects wording and grant eligibility.
8. Does she want a donation page (Zeffy, free) and an online family application set up in her name?
9. Is the organization volunteer-run? The banner no longer says so until she confirms it.

## Milestones

1. **Setup (done):** repo, tooling, CI, content model, full homepage built from her existing content, Cloudflare hosting config.
2. **Quality gates (done):** browser tests, accessibility scan, Lighthouse budgets, structured data, sharing image, web manifest.
3. **Polish:** hero photo, gallery photos, final copy pass, purpose-made icon-only logo.
4. **Preview:** deploy to the private Cloudflare `workers.dev` address with indexing blocked; send her the preview email.
5. **Corrections:** apply her answers to the open questions.
6. **Launch:** create the Zeffy donation page and forms in her name, connect her GoDaddy domain through Cloudflare, enable indexing, add a sitemap, and retire her old 2021 Netlify site.
7. **Handoff:** transfer the repo and the Cloudflare Worker and domain to her accounts, and revoke all access tokens.
