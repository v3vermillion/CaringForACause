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

## 2. Where it goes

The site is organized by what a visitor came to do, not by org chart. Two audiences, two doors, one page each.

```
HEADER        mark + her lockup · About · Programs · Get involved · Contact · Donate
BANNER        her photos + tagline + headline + one sentence + Help me / Donate, then the wave     choose your path
TRUST         since 2015 · 501(c)(3) · Toys for Tots                      proof, in a glance (night band)
SEASON        one line: what's needed now + one link, then the wave       optional, off (decision 66); urgency, changes each season
PROGRAMS      tiles, Get help card, then 4 programs as rows               what exists, who qualifies, how to apply
GET INVOLVED  4 tabs: Sponsor · Donate · Volunteer · Partner              one action per supporter
ABOUT         her portrait + story + "Do More" video on request           why to trust it
MOMENTS       photo gallery (hidden until 4+ photos)                      the work, unposed
CONTACT       call · email · Facebook · start an application              reach her
FOOTER        lit mark · wordmark · Donate · "Never give up." · Explore · phone · email · Facebook · legal line   reach her, verify her

/apply        four-step application, sent by email                        families
/donate       frequency + amount, then the payment page or an email       donors
```

Rules that keep it premium rather than busy:

- One idea per section, one button per idea. No section asks two things.
- Real photos carry the emotion; they are never stock and never decorative filler.
- Every fact on the page is traceable (`facts.ts`). Unconfirmed details are kept off public builds by the launch check.
- Motion is used once, in the banner, and stops for people who prefer reduced motion.
- Everything must work on a 375-pixel phone first. Desktop is a widening, not a redesign.

## 3. Banner specification

Goal: within the first screen on a phone, a visitor sees real people, her name in her own lettering (in the bar), understands what the organization does, and can choose "Help me" or "Donate." See `docs/DESIGN.md` and decisions 26 and 51.

- **Background:** a slow, silent crossfade of four of her event photos (28-second cycle, 7 seconds each), each drifting slowly larger while it shows, under a night veil that keeps white text above 7:1. On phones it fills the banner, showing in a band above the words; on desktop it occupies the right side at close to its native width and the veil hides its edge. The wave at the foot of the banner cuts it. Under `prefers-reduced-motion`, the first photo stays still.
- **Words:** "Together we can." as the eyebrow, the headline (its last line in lavender italic), the subhead. All from her materials.
- **Doors:** two, the same size, side by side on every screen: "Help me" (signal) and "Donate" (a pale ring), each a pill. A test checks both fit an iPhone 12 mini and an iPhone 15 Safari screen.
- **Facts:** the trust line sits directly below the banner on the same ground.
