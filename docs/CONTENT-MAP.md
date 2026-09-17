# Content map

Everything the site needs to carry for Caring for a Cause, where each piece lives, and why. This is the inventory the redesign is built from. Nothing here is invented: every line is either published by the organization, on public record, or marked as needing Tamara's confirmation (see `src/data/facts.ts`).

## 1. Everything Tamara needs on the site

### Identity

| Item                                                      | Status        | Source                     |
| --------------------------------------------------------- | ------------- | -------------------------- |
| Legal name: Caring for a Cause Supportive Services Inc.   | public record | IRS, GuideStar             |
| Short name: Caring for a Cause                            | org           | her website                |
| Logo (final redraw), heart mark, brand purple and crimson | org           | her logo                   |
| Tagline: "Together we can." / "Never give up."            | org           | her website                |
| Mission statement                                         | org           | her website                |
| Founder: Tamara Long-Ajimati                              | org           | Jiffy Lube "Do More" video |
| Founded 2015                                              | public record | IRS ruling Dec 2015        |
| 501(c)(3), EIN 47-4917287, donations tax-deductible       | public record | IRS                        |
| Service area: Central Indiana                             | org           | mission statement          |
| City: Noblesville (office once listed in Indianapolis)    | **confirm**   | GuideStar vs 2021 site     |

### Programs (what she does)

| Program                                                                                                             | Cadence                      | Who it serves                                                             | Assets                |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------- | --------------------- |
| Holiday Assistance: Thanksgiving, Christmas, Easter meals and gifts; Toys for Tots partner; sponsors adopt families | seasonal, yearly             | low-income families, households with children, seniors, anyone struggling | photos, sponsor video |
| Diaper Drive Initiative: monthly diapers plus partner referrals                                                     | monthly                      | families with babies and toddlers                                         | photo, TV news clip   |
| Operation Care Package / Back-to-School: hygiene and school supplies (33-item list)                                 | yearly                       | students                                                                  | photo, item checklist |
| Free Haircuts & Styles: volunteer barbers, stylists, makeup, face painting                                          | events                       | homeless and low-income families                                          | photos, video         |
| Free Bike Program                                                                                                   | **confirm** (2021 site only) |                                                                           |                       |

### Ways to get help (families)

- Who can apply, how to apply (call or email today; online form later, in her name)
- Application windows and pickup or delivery details per season: **confirm**
- What families receive (toys, clothes, gift cards, meals, wish-list items)

### Ways to give help (supporters)

- Sponsor a family (one or several, one holiday or all three)
- Donate money (Zeffy page in her name, later) or items (back-to-school list, diapers)
- Volunteer (existing Google Form)
- Partner: businesses, churches, organizations; barbers and stylists
- Amazon wish list, PayPal: **confirm** (old links are retired)

### Proof and story

- Founder story and the "Do More" feature video (2023 Jiffy Lube award)
- Local TV news segment on the diaper program
- Toys for Tots partnership
- Real event photos (9 today; more from her Facebook page pending)
- Impact numbers (families served, diapers given): **only if she provides them**

### Contact and legal

- Phone (two numbers in circulation): **confirm**
- Email (two addresses in circulation): **confirm**
- Facebook page (two pages in circulation): **confirm**; YouTube channel
- Mailing or office address: **confirm**
- EIN and deductibility statement, copyright, privacy note once forms exist

### Seasonal and operational

- Current-season notice (what is needed right now)
- Event dates and deadlines per season: **confirm**
- Preview notice (removed automatically at launch)

## 2. Where it goes

The page is organized by what a visitor came to do, not by org chart. Two audiences, two doors, one path each.

```
HEADER        mark + name, 4 links, Donate                    (always visible)
HERO          real photos + headline + the two doors           who we are, choose your path
SEASON        one line: what's needed now + one button         urgency, changes each season
TRUST         since 2015 · 501(c)(3) · Toys for Tots            proof, in a glance
PROGRAMS      Get help card, then 4 programs as tiles + rows   what exists, who qualifies, how to apply
GET INVOLVED  4 tabs: Sponsor · Donate · Volunteer · Partner   one action per supporter
MEET TAMARA   her photo + story + "Do More" video              why to trust it
MOMENTS       photo gallery (hidden until 3+ photos)           the work, unposed
FOOTER        "Never give up." · contact · legal · EIN         reach her, verify her
```

Rules that keep it premium rather than busy:

- One idea per section, one button per idea. No section asks two things.
- Real photos carry the emotion; they are never stock and never decorative filler.
- Every fact on the page is traceable (`facts.ts`). Unconfirmed details are kept off public builds by the launch check.
- Motion is used once, in the hero, and stops for people who prefer reduced motion.
- Everything must work on a 375-pixel phone first. Desktop is a widening, not a redesign.

## 3. Hero specification (fix 1 of 7)

Goal: within the first screen on a phone, a visitor sees real people, understands what the organization does, and can choose "I need help" or "I want to help."

- **Background:** a slow, silent crossfade of four of her event photos (24-second cycle, 6 seconds each), darkened and blended into the brand's night purple so white text stays above 7:1 contrast. On phones it fills the hero; on desktop it becomes a tall panel on the right so the 720-pixel photos are never upscaled past their quality. Under `prefers-reduced-motion`, the first photo stays still.
- **Logo:** the full logo leaves the hero (it lives in the header, the link preview, and the footer). Removing the 280-pixel plate is what brings the doors onto the first screen.
- **Copy:** headline unchanged; subhead unchanged.
- **Doors:** side by side on phones (two compact panels), stacked only under 360 pixels. "I need help" stays crimson, "I want to help" is a frosted-glass panel over the photos. Both are 44-pixel-plus tap targets.
- **Preview notice:** kept (required until launch) but reduced to one slim line.
- **Facts:** the trust strip stays directly below the hero.

Order of the remaining fixes: program tiles and rows → trust facts → Meet Tamara → gallery → screenshot tests.
