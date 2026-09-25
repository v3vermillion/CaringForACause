# Decisions

Short records of the technical choices behind this site, so anyone taking it over knows why it is built this way.

## 1. Astro, static output, no UI framework

**Decision:** Astro 7 generating plain HTML and CSS. No React or other framework.

**Why:** The site is content with two small interactive pieces (tabs and video embeds). Astro ships almost no JavaScript, so pages load fast on older phones and slow connections. Both scripts are a few lines of plain TypeScript and the page works without them.

**Revisit if:** the automated holiday application and sponsor-matching system is built. That belongs in a separate app (Next.js), linked from this site.

## 2. One content file

**Decision:** All copy, links, dates, and contact details live in `src/data/site.ts`, typed with TypeScript.

**Why:** Seasonal updates are the only routine changes. Keeping them in one typed file means they never touch layout code, and the type check inside `npm run build` stops a mistake like a missing field before anything deploys (see decision 14).

## 3. Cloudflare Workers static assets for hosting

**Decision:** Serve the built `dist/` folder with Cloudflare Workers static assets, configured in `wrangler.jsonc`, with headers in `public/_headers`. Deployed by Workers Builds on every push to `main`.

**Why:** Requests to static assets are free and unlimited on Cloudflare's Free plan, so traffic can never pause the site. Netlify's Free plan (credit-based since September 2025) pauses every site on the account when credits run out, an unacceptable risk for a holiday-help site in December. Vercel's free plan is for personal, non-commercial use, and GitHub Pages requires a public repo on the free plan. Cloudflare now directs new static projects to Workers rather than Pages.

**Revisit if:** the site ever needs server code. Workers supports it, but it is metered.

## 4. Search engines blocked by default

**Decision:** `noindex` meta tag and a `Disallow: /` robots.txt unless `PUBLIC_ALLOW_INDEXING` is exactly `"true"`. It is set only in production build settings, at launch.

**Why:** The site is a surprise gift built with her name and logo. It must not appear in search results until she approves it and the domain is connected.

## 5. No live donations or forms until they are in her name

**Decision:** `links.donate`, `links.familyApplication`, and `links.sponsorSignup` are `null`. Buttons fall back to emailing her.

**Why:** Money and family information must go to accounts she owns. Nothing on the preview can collect either.

## 6. Self-hosted fonts

**Decision:** Fonts are installed from npm (`@fontsource`) and served from the site itself.

**Why:** No third-party requests, no layout shift from a slow font service, and a strict Content Security Policy.

## 7. Click-to-load YouTube videos

**Decision:** Videos show a thumbnail and load the player only when tapped, using `youtube-nocookie.com`.

**Why:** A full YouTube embed adds hundreds of kilobytes per video and sets cookies before a visitor chooses to watch. The page has four videos.

## 8. Logo on a light plate in the hero (superseded by 19)

**Decision:** The hero was dark with the full logo on a white circular plate.

**Why:** The logo's purple measures about 2.2:1 against the dark background, below the 3:1 minimum for graphics. Superseded: the full logo left the hero in decision 19 and lives in the header mark, link preview, and footer.

## 9. Interim icon

**Decision:** The favicon and header mark are the heart-and-hands shape extracted from the final logo.

**Why:** It reads clearly at small sizes. Replace it when a purpose-made icon-only version exists.

## 10. Quality gates

**Decision:** GitHub Actions runs two jobs on every push and pull request. The first checks formatting, types, the build, and the Playwright browser suite (every check on 10 devices across Chromium, WebKit, and Firefox, including an axe WCAG 2.2 AA scan). The second enforces Lighthouse budgets.

**Why:** The site will be handed off. Automated checks keep future edits, including AI-assisted ones, from quietly breaking layout, accessibility, or speed.

## 11. Inline CSS and preloaded fonts

**Decision:** All CSS is inlined into the page, and the font files the first paint uses are preloaded (the display face, the body face in both weights, and the header's one-glyph face; see decision 42 for why every one of them).

**Why:** Lighthouse showed the two stylesheet requests delayed first paint by about 0.8 seconds on mobile, and the headline (the largest element on screen) waited on its font. Inlining about 16 KB of CSS is the better trade for a one-page site. Mobile performance went from 97 to 99.

## 12. Structured data and sharing image

**Decision:** The page includes schema.org `NGO` data (legal name, EIN, 501(c)(3) status, founder, service area) and a 1200×630 sharing image.

**Why:** Search engines can show her as a registered nonprofit, and links shared by text or on Facebook show a proper preview instead of a small icon.

## 13. Browser support and iPhone safeguards

**Decision:** Support iOS and Safari 15+ and current Chrome, Firefox, Edge, and Samsung Internet, declared in `browserslist`. Lightning CSS prefixes and lowers CSS for those targets. The page disables iOS automatic phone-number detection, keeps a light color scheme, and gives every button, tab, and menu link a 44px tap target.

**Why:** Every iPhone browser uses Safari's engine, and older iOS versions need `-webkit-` prefixes (for example, the header's blur). iOS otherwise turns numbers such as the EIN into phone links, and Apple recommends 44-point tap targets.

## 14. The build is the publish gate

**Decision:** `npm run build` runs `astro check`, then `astro build`, then `scripts/validate-build.mjs`. If any step fails, the build fails, Cloudflare publishes nothing, and the last good deployment stays live. `scripts/validate-build.test.mjs` proves the gate blocks 11 kinds of breakage.

**Why:** Cloudflare Workers Builds deploys every push to `main` and cannot wait for GitHub Actions, so a failing CI run could not stop a deploy. Putting the gate inside the build command needs no dashboard changes, survives handoff, and cannot be skipped by pushing.

**What the gate checks:** type errors; required files; one `h1`; title and description; absolute canonical URL; link-preview image on the canonical host and present in the build; search indexing matching `PUBLIC_ALLOW_INDEXING`, with indexing allowed only on the production domain; valid `NGO` structured data; unique ids and working in-page links; alt text and existing files for every image; no placeholder text; required security headers; the 404 page.

**Limit:** browser tests (layout, accessibility, the 10-device matrix) need real browsers, which Cloudflare's build does not provide, so they run in GitHub Actions only. Decision 16 makes them a precondition by deploying from GitHub Actions after they pass.

## 15. Facts carry a source and a status

**Decision:** Factual claims live in a typed `facts` record (`src/data/facts.ts`, `src/data/site.ts`) as `publicRecord`, `orgPublished`, or `needsConfirmation`, each with a source. Statements of fact use `claim()`, which only accepts settled facts; contact details use `show()`. A launch build throws while anything is unconfirmed. Private previews show a non-dismissible notice, required by the build validator while indexing is off and forbidden once it is on.

**Why:** Unconfirmed details were comments the compiler, tests, and visitors couldn't see, while the page presented them as fact. Several public sources conflict (phone, email, Facebook page, city), and photos of children need permission. `src/data/facts.typecheck.ts` and `scripts/facts.test.mjs` prove the guards work.

## 16. Deploys are gated in GitHub Actions, and every page reports its version

**Status:** the `deploy` job is superseded by decision 17 and was removed. The version tag remains.

**Decision:** A `deploy` job runs only after browser tests and Lighthouse budgets pass, deploys with Wrangler, and confirms the live `<meta name="version">` matches the commit. Cloudflare Workers Builds remains the fallback path, still protected by the build gate.

**Why:** GitHub branch protection and rulesets aren't available for private repositories on the free plan, and Cloudflare can't wait for GitHub checks. Deploying from the workflow makes the full suite a real precondition at no cost. The version tag lets anyone confirm what is live.

**Trade-off:** The owner's GitHub repository needs one Cloudflare API token secret. Handoff instructions cover creating it.

## 17. Pull requests only, with deploy confirmation

**Decision:** A GitHub ruleset (GitHub Pro) requires a pull request, squash merging, and the browser-test check before anything reaches `main`, with no bypass list. After every merge, the live check waits for the page's `version` meta tag (the short commit from Cloudflare's `WORKERS_CI_COMMIT_SHA`) to match the merged commit. Merged branches are deleted as a process step rather than automatically. See `docs/WORKFLOW.md`.

**Relation to decision 16:** decision 16 was written when branch protection was unavailable. With the ruleset enforced, Cloudflare Workers Builds deploys only commits that passed the required check, so the workflow `deploy` job was removed to keep a single deploy path. Two paths would risk double deploys and conflicting settings.

**Why:** The build gate cannot run browser tests, so the ruleset makes them a precondition. An empty bypass list matters because automated changes use the owner's token: any bypass the owner has, automation has too. Confirming the deployed commit closes the last gap, where a merge could silently fail to publish.

## 18. Dependabot with cooldowns and grouping

**Decision:** Dependabot proposes npm and GitHub Actions updates monthly, grouped (minor and patch together, majors separately), with a 7-day cooldown (30 days for major npm versions). Security updates are grouped and never delayed.

**Why:** Outdated packages are the most common way a finished, rarely touched site becomes vulnerable. The `main` ruleset makes updates safe to accept, because each one must pass the full browser suite. Grouping and a monthly schedule keep the volume low for a solo maintainer, and the cooldown avoids adopting a release before problems with it surface.

## 19. Hero: real photos behind the two doors, doors on the first screen

**Decision:** The hero's background is a slow crossfade of four of the organization's own event photos (six seconds each), darkened and blended into the night purple. The full logo leaves the hero. On phones the doors sit side by side so a visitor on a 390-pixel screen sees the headline, real people, and both choices without scrolling; on desktop the montage becomes a framed panel so the 720-pixel photos are never upscaled across the full width. The first photo is preloaded and served at quality 55 (it sits under a dark veil). Under `prefers-reduced-motion` the first photo stays still. See `docs/CONTENT-MAP.md` section 3.

**Why:** Before, the first phone screen showed only the preview notice, header, and a 280-pixel logo; the two doors, the page's main choice, were a screen and a half down. Real faces on the first screen do more for trust than a logo, and the organization already publishes these photos. The crossfade is the page's single use of motion.

**Cost control:** only the first photo loads with the page (preloaded, 640 px wide, quality 50 under the dark veil). The other three stay hidden until the page has loaded, then the crossfade starts from the first photo without a dip. Mobile Lighthouse stays at about 99 (LCP 2.2 s on simulated slow 4G). Without JavaScript the first photo simply stays. The hero is sized for a real iPhone Safari screen (URL bar plus toolbar, about 660 px on an iPhone 15), where a first review on the device showed the doors cut off and the photo too bright behind the headline; the veil was darkened and brand-tinted and the vertical spacing tightened in response.

## 20. Programs: jump tiles, a dark Get help card, alternating rows

**Decision:** The programs section opens with one compact tile per program (photo, name, a three-to-five-word label) that jumps to that program; a scroll strip on phones, four across on desktop. The Get help card is the page's one dark card so families can't miss it. Program rows put the photo above the text on phones with a shorter 3:2 crop, and alternate photo sides on desktop.

**Why:** The section was four identical heading-text-photo blocks, about four phone screens long with no way to scan it. The tiles show the whole offering in one glance and let people jump; the varied rows are easier to read; the shorter phone crops cut the section's length. Labels are drawn from her published program descriptions, not invented.

## 21. Header: one row, a corner wedge, and a full-screen menu

**Decision:** On phones the header is a single row: mark and name, Donate, and a diagonal purple wedge cut into the top-right corner that opens the menu. The menu is a native `<dialog>` (modal, focus-trapped, Escape closes, focus returns to the button): dark, typographic, "Help me" first in crimson, one-line detail under each link, Donate and contact details at the bottom. Wide screens keep the inline links and also get the wedge. Without JavaScript the inline links show on every screen.

**Why:** The old two-row header plus the preview notice took about 160 px of the first screen. The single row saves a third of that and gives the brand a distinctive mark that isn't a template default. "Help me" first in the menu matches the hero: the site's job is to route people, and families come first.

## 22. The hero is a routing system; nothing is written on the photos

**Decision:** The first screen is, in order: the "Help me" door (crimson signal), the "I want to help" door (glass), the headline and subhead, then her photos in a framed panel with the glass hairline and her tagline "Together we can." as a caption pill. The crossfade stays; the photos carry no text. Desktop puts the doors and caption beside the panel. The design language is written down in `docs/DESIGN.md`.

**Why:** Text over a panning photo read as careless, and the site's job is to route people. A real-iPhone review also showed the hero "zooming" while scrolling: its height was tied to `100svh`, so it resized whenever the browser's bars collapsed and the cover-fit photo rescaled. The new hero uses no viewport-height units; the publish gate now rejects them, and a browser test checks the first screen holds still when the viewport height changes. "Help me" is now the first thing a visitor reads on every phone size, including the small iPhone SE, and the doors, headline, and the top of the photos all fit on an iPhone 15 Safari screen.

## 23. The identity block: her lettering, her mark holding "Help me"

**Decision:** The hero opens with "Caring for a Cause" and "Together / we can." set in Lobster, the open-licensed typeface her logo's lettering uses, so the wordmark is real text. The heart-and-hands mark is large, lit by a soft glow, and "Help me" sits in the palms as a crimson pill with the full signal treatment (glow, hairline edge, a slow breathing glow that stops under reduced motion). "I want to help" is a glass bar directly under the mark. The descriptive headline becomes the second heading below. The header pill reads "Give".

**Why:** The page's first words are now her name in her own lettering, and its first action is held by her own mark. That is the most branded first screen possible without inventing anything. It fits an iPhone 15 Safari screen with the top of "I want to help" showing.

## 24. The flow under the identity block

**Decision:** After "I want to help" comes her "Do More" video, dead center, click-to-play with a self-hosted poster; then the descriptive headline and subhead as the lead-in to Programs. The background deepens toward the bottom of the hero and continues into the trust facts, which are now glass pills on the same dark ground, before the purple season banner. The photo crossfade moved to Meet Tamara (now a dark section) as a framed panel with her tagline as the caption.

**Why:** The video is the one asset that shows the whole organization at once, so it sits where a visitor lands after choosing a door or reading her name. The facts as pills read as proof rather than a list, and keeping them dark makes the top of the page one continuous surface.

## 25. Refining the identity block to a finished standard

**Decision:** Four refinements after a real-iPhone review. (1) The mark is a night version with lit gradients, built for the dark background. (2) "Help me" moved into the open red space above the fingertips, set in her lettering with a white ring that echoes the logo's outlines, a top sheen, a white chevron disc, and the breathing glow; sized in container units. (3) On phones the header is the mark, Give centered, and the wedge; the name stays for screen readers. (4) The preview notice is one line, and the gap above the heart is tightened.

**Why:** The first version placed a generic pill across the fingers of a flat, print-colored mark. The most important button on the site now looks designed for its place, and the header no longer repeats the name the hero already shows.

## 26. The banner: her photos, her lettering, two equal doors

**Decision:** The hero is a photo banner again: the four event photos crossfade behind a night veil, her calligraphic wordmark (a vector tracing of her logo lettering) sits on it in white, then one sentence saying what she does, then two doors of equal size: "Help me" (signal, to `/apply`) and "Donate" (glass, to `/donate`), with a quiet third link to Get involved. On desktop the photo takes the right side at close to its native width and the veil hides its edge; on phones it fills the banner and the doors fit an iPhone 15 Safari screen (a test checks). The large heart-and-hands illustration, the Lobster typeface, the identity block, and the video in the hero are gone. Supersedes decisions 22 through 25.

**Why:** The identity block put a blown-up raster logo where a photograph belongs, made the two doors unequal, hid the sentence that explains the organization below a video, and read as cartoonish next to the sites it was measured against. Real people, her own lettering, and two equal choices are the strongest first screen her assets allow, and it is the structure the owner asked for.

## 27. Real pages for the two doors

**Decision:** `/apply` is a four-step application (about you, household, what you need, review and send) with choices as chips and selects, one row per child, and program-specific details that open only when chosen. `/donate` chooses a frequency and an amount and hands off to the payment page in `links.donate`; while that is unset, the button opens an email with the chosen gift written in. Both send by email (`mailto:`) because the site has no server and nothing may collect family or payment information outside accounts she owns (decision 5). Without JavaScript the application page explains how to apply by phone or email instead of showing a form that cannot send.

**Why:** Families and donors each needed a place to act, not a tab. Email keeps every answer in her inbox with no third-party account, and the pages are built so that setting one link (`links.donate`, `links.familyApplication`) upgrades them to a hosted portal or form later.

## 28. Navigation: About, Our programs, Get involved, Contact

**Decision:** One list in `src/data/site.ts` drives both the desktop links and the phone menu: About, Our programs, Get involved (a dropdown on desktop and a group of chips in the menu: Sponsor a family, Volunteer, Partner, Donate), Contact. The header's button is "Donate". The phone menu ends with the two doors and her phone and email. The wedge shows on phones only; desktop has the inline links, so there is no second menu.

**Why:** The previous header repeated the same links twice on desktop and led with "Help me" as a nav item while the hero already asked the same question. This is the order visitors use to orient, and Contact becomes a real section (`#contact`) with the doors repeated once more.

## 29. Vector brand marks and one crimson on dark

**Decision:** `scripts/brand/trace-brand.py` traces her logo files into `mark.svg` (flat colors) and `wordmark.svg` (inherits `color`), rendered inline through `src/components/Brand.astro`. `--signal` #E2202C is the only crimson on night surfaces; the earlier rose and salmon tints are removed. Focus rings use `--focus`, purple on light and white on dark. Three radii replace the six that had crept in. The video poster is cropped to a portrait (`tamara-portrait.jpg`) that leaves out the sponsor's burned-in caption, and the video plays in the About section when asked, not before.

**Why:** The largest brand element was a raster served below 2× and the crimson had drifted into pink, which the owner ruled out. Vector marks are sharp at every size, and one signal color keeps crimson meaning "here."

## 30. The publish gate checks every page

**Decision:** `scripts/validate-build.mjs` runs its page checks (title, description, one h1, canonical URL, link preview, indexing, preview notice, structured data, ids and in-page links, alt text, referenced files, placeholders, viewport units) on `index.html`, `donate/index.html`, `apply/index.html`, and `404.html`. Links written as `/#section` are checked against the home page's ids from any page. The browser suite covers the three pages, the dropdown, the menu's contents, the header-to-footer alignment, the door sizes, the phone-fold rule, and both forms end to end.

**Why:** A one-page gate would have let a broken donation page publish.

## 31. The footer carries only what belongs at the end

**Decision:** The footer is her marks, "Never give up.", phone, email, Facebook, and the legal record (legal name, city and service area, 501(c)(3) status with EIN and the deductibility line, copyright). The "Programs" and "Get involved" link columns and the repeated Help me / Donate buttons are gone.

**Why:** Those columns listed the same eight items a visitor had just scrolled past as jump tiles, full rows, and tabs, and the doors already appear in the banner, the menu, and the Contact section. A third listing at the end of the page is noise, not navigation.

## 32. One word for giving

**Decision:** Every entrance to giving and every action button that gives is labeled "Donate": the header pill, the banner door, the Get involved tab and its button, and the primary button on `/donate`, which reads "Donate by email" until `links.donate` exists and "Donate" after. The link under the banner doors is gone; the banner is two doors and nothing else. The season strip's button leads to the Sponsor tab and says exactly that. The four ways to help are laid out in one place, Get involved. On `/donate` the prose keeps its own voice ("Give to families in Central Indiana", "Choose your gift", "Other ways to give"), and the sentence explaining that online payments open once the giving page exists now sits above the button, so tapping it is an informed choice.

**Why:** Six entrances with three different words ("Donate", "Give online", "Sponsor a family, volunteer, or partner") made a donor hesitate about whether they led to the same place. Headings are not wayfinding; by the time someone reads them they have arrived, so flattening every "give" to "donate" would cost her voice without buying clarity.

## 33. Two videos, each with its own poster; the Donate tab hands off

**Decision:** The site shows two videos: her story in About and the haircut program in its own row, both as click-to-play players with a self-hosted poster (a still from the video or one of her own photos of that program), loading YouTube's player only when tapped. The Sponsor and Donate tabs' video cards are gone, and no image on the site is fetched from YouTube; the content-security policy no longer allows it, and a test watches for it. The Donate tab is the short version: heading, one sentence, the Donate button. `/donate` is the destination: choose a gift, donate, done; its "Other ways to give" cards are gone. The banner's subhead no longer says "volunteer-run"; that is an open question for Tamara.

**Why:** YouTube-hosted thumbnails were the broken images on the page, and a poster must honestly show what plays. The two removed videos were asks the page already makes in text, and a video is not what a donor needs at the moment of deciding. The tab and `/donate` had formed a loop (tab → page → "other ways" → tabs); one link out and one destination ends it. "Volunteer-run" is a claim no source confirms.

## 34. The footer does not repeat the EIN

**Decision:** The footer's legal record is the legal name, city and service area, and the copyright line. The 501(c)(3) status, EIN, and deductibility sentence appear where a donor decides: the trust strip on the home page and the donation card on `/donate`. Structured data still carries the EIN on every page.

**Why:** On `/donate` the footer sat about two hundred pixels below the donation card and repeated its last paragraph word for word. Saying it once, at the point of decision, reads as care; saying it twice reads as boilerplate.

## 35. A button says what it does

**Decision:** Until the payment page and the sponsor sign-up exist in her name, every button that opens an email draft says so: "Email us to sponsor", "Email us to volunteer" (if the volunteer form ever goes away), "Email us to partner", "Donate by email" on `/donate`, and "Send my application by email" on `/apply`. Each of those buttons carries a second label that appears only when the matching entry in `links` is set: "Sign up to sponsor", "Fill out the volunteer form", and "Donate" on `/donate`. The Donate tab, the header pill, and the banner door say "Donate" because they lead to `/donate`, a page that exists. A test checks that every email button on the home, donate, and apply pages says "email" and that no other button does.

**Why:** A button that says "Give online" or "Sign up" and then opens a mail app breaks the promise it just made, and a visitor who expected a form may abandon the draft. Naming the email keeps the promise small and true, and the switch is one line in `links` when the accounts are created.

## 36. Each fact has one home on the first screen

**Decision:** On the first screen, her tagline appears once, under the wordmark; the About portrait no longer carries it as a caption. The service area appears once, in the headline; the subhead and the Donate door no longer repeat it. The founding year appears once, in the trust strip ("Helping families since 2015"); the subhead no longer says it. The subhead says what the organization is, in her mission's words: "A nonprofit for families facing financial hardship." The city cannot go there yet: it is an unconfirmed fact, and the facts model accepts only settled facts in a statement (`claim()`), so "A nonprofit in Noblesville" waits for Tamara's answer to that open question; "volunteer-run" stays out per decision 33. Other pages and sections keep their own mentions where they do a job (the `/donate` heading, the footer's city line, the page title).

**Why:** "Central Indiana" was on the first screen four times and "2015" twice, within a few hundred pixels. Repetition on one screen reads as filler, and a subhead that restates the headline says nothing the headline didn't.

## 37. The brand SVGs carry integer coordinates

**Decision:** The traced `mark.svg` and `wordmark.svg` are run through svgo at integer precision after tracing (the command is in `docs/DESIGN.md` and at the end of the tracing script). The mark went from 29 kB to 7 kB and the wordmark from 26 kB to 8 kB; the home document, which inlines the mark three times and the wordmark twice, went from 218 kB to 115 kB.

**Why:** The Lighthouse budget (performance at or above 0.95 on the home page) was being met by a hair: median 0.93 to 0.95 depending on the runner, because 139 kB of inline SVG had to arrive before the first paint. One decimal of precision on a 1,718-unit canvas is invisible at 3 rem, and the lettering at 32 rem shows no change either. With the smaller files the page scores 0.97 on every local run, first paint drops from 1.8 s to 1.35 s on simulated 4G, and the budget stops depending on the runner.

## 38. One navigation map

**Decision:** The header and the phone menu draw the same four links: About, Programs, Get involved, Contact. The desktop header shows them inline with the Donate button and no dropdown; "Get involved" scrolls to the section, whose tabs are the four ways to help. The phone menu is one list: Help me first (in the signal colour), the four sections, Donate last, and nothing else. The one-line descriptions, the sub-items, and the phone and email are gone from the menu; contact details live in the Contact section it links to. This supersedes the dropdown and menu groups of decision 28 and the menu's details, doors, and contact line of decision 21.

**Why:** The desktop dropdown listed five items and the phone menu thirteen, for a page with four sections and two doors. Two maps of the same small site make it feel bigger and harder than it is. One list a visitor can hold in their head, with the two doors at either end, is the whole site.

## 39. The banner starts with her lettering, and both doors fit the first screen

**Decision:** Below 36rem (where the doors stack), the banner's top padding is the standard `--space-m` instead of the 128-pixel-plus band of photo it had, so her wordmark sits just under the header and both doors fit an iPhone 15 Safari viewport (393 × 660). Because the words now start at the top of the photo, the phone veil is a step darker at the top (50% and 65% night at its first two stops instead of 35% and 55%); it reaches solid night at the same point. On desktop (56rem up) the banner, the trust facts, and the season strip together fill the first screen: a `first-screen` wrapper in `src/pages/index.astro` is `100vh` minus the header (and the preview notice while indexing is off, via `--top-chrome`), and the banner takes the rest. The banner is one composition at every size: every measurement in it (padding, wordmark, type sizes, gaps, the doors, the photo's left edge, and the veil's stops) is a multiple of `--u`, one pixel of the reference layout, a 1280 × 800 screen where the banner is 589px tall, so a 1366 × 768 laptop shows the same picture at about three quarters and a 1920 × 1080 monitor at about five quarters. The scale stops at three quarters (the type would get too small) and at double; below the floor the strip drops just under the fold. The trust facts and the season strip keep their own size (`--strips-h`), because the strip's link is a 44px tap target. The content column (`--wide`) is 90% of the screen, so the header, the banner's words, and every section start 5% in from the left edge on every device, instead of drifting toward the middle inside a fixed 72rem column on wide monitors. This is the one use of a viewport-height unit; the publish gate now allows plain `vh` only inside a `min-width` media block and still rejects `svh`, `dvh`, `lvh`, and any `vh` outside one (two gate tests prove it). Desktop browsers don't collapse their bars, so the height is stable; on an Android tablet in landscape `vh` is the bars-hidden height, which is also stable while scrolling. The three photos whose heads the shorter desktop crop would clip have their `focus` point raised in `src/data/site.ts`. The fold tests check both doors on the iPhone 15 and the 1366 laptop viewports, that the first screen ends exactly with the season strip at 1280 × 800, 1366 × 657, 1536 × 730, and 1920 × 950, and that the banner's parts sit at the same relative positions on a laptop and a monitor. Phones and tablets get the same construction by width: `--rp` is one pixel of the class's reference layout (a 393px-wide phone, a 768px-wide tablet), and every size in the banner and the two strips is a multiple of it, so every phone shows the iPhone 15 layout and every tablet the iPad mini layout, line breaks included. Tablets in portrait (36rem to 56rem) had kept a 128px-plus band of photo above the words that no other class had, then briefly had a third composition of their own (a two-line headline, doors side by side); they now show the phone's words unchanged in a column 56% of the screen with the photo beside it, and their first screen fills down to the season strip like desktop, so a tablet reads as a phone's words in a computer's frame. The gate therefore allows plain `vh` from 36rem up (tablet browsers don't change the height while scrolling either). The phone and tablet header scales the same way (the name's size, the mark, the Donate pill, the wedge), which also ends the Donate pill covering the name on screens 320 to 355px wide. Width scaling also fits both doors on an iPhone 12 mini (375 × 629), which had been 13px short. The phone scale stops at 1.15 so a window wider than a phone keeps the largest phone layout instead of growing without limit, and the desktop scale is bounded by width as well as height so a portrait screen 896px or wider (an iPad Pro 12.9 upright) keeps the reference's three-line headline rather than reflowing to four. The trust facts' hairline dividers appear only on desktop, where the three facts share one row. The content column is 90% of the screen at every size (`--wide`, `--gutter: 5vw`), so the shared left edge is 5% in on every device, not only above 1280px. The gate allows plain `vh` only inside a `min-width` block of at least 36rem, so a phone block can't reintroduce the scroll-zoom bug. One browser test runs on every device in the matrix at its own screen size and checks its class's promise (see `docs/DESIGN.md`, "The first screen by device").

**Why:** A review on a real iPhone showed the wordmark sitting in the middle of the screen with the Donate door a full screen below; the first view was mostly a band of veiled photo above the words. Measuring desktop sizes found the same problem: 128px of empty photo above the wordmark and the doors cut off by 67px on a 1366 × 768 laptop, the most common desktop size, with only 6px to spare at 1536 × 864. A first pass kept a 40rem minimum height, which left an empty band under the doors and showed only the top edge of the season strip at 1280 × 800, reading as a stray line at the fold; a content-sized banner fixed that one size but put the strip below the fold on shorter laptops and left a loose band of the next section on taller monitors. The owner asked for the same first screen on every computer: her lettering, the doors, the proof line, and the season's ask, ending at the fold, with nothing moved or resized between screens. A compact scale for laptops and centred slack for monitors were tried first and rejected for that reason: they were different compositions. Scaling the whole banner from one reference is the only way to get the same picture on every screen, and it is safe on desktop because the problem the rule guarded against (collapsing browser bars) doesn't exist there.

## 40. Every page is one composition per device class

**Decision:** The root font size is `16 * var(--sp)`, the class's reference pixel (one pixel of a 393px phone, a 768px tablet, or a 1280px desktop), so every rem on the site scales with the device the way the first screen already did, and a section approved on the reference screen is the same picture, scaled, on every device of its class and on every page. To keep that exact: radii, rules, icons, and the 2px borders became rem (a hairline is `--hairline`, one reference pixel with a 1px floor); the large type steps and the section spacing are one rem value per class instead of `clamp()` formulas with a `vw` term (each value is what the formula gave on the reference screen, so nothing moved); the three breakpoints inside the tablet class (a two-column form, the contact cards, and the program tiles at 40rem) moved to the class edge at 36rem; the rings on buttons, choice pills, and tabs are inset shadows rather than borders, because a border snaps to whole pixels and shifted the next control by a pixel; the content column stops growing where the scale stops (a phone-class window past 450px, a desktop past 2560px) and sits centred, instead of reflowing; and the desktop banner's floor is seven tenths, matching the site scale. There is no floor on the scale itself: a minimum root font would hold the text while the column kept shrinking, and paragraphs would rewrap, so the smallest text is at each class's narrowest width (13px on a 320px phone, 12px on a 576px tablet, 11.2px in an 896px desktop window). The 44px tap targets are the one exception that survives: a control the scale would make smaller stays 44px and everything under it moves down by that much. A browser test checks every page on the reference device and the edges of each class (320 to 540px, 576 to 834px, 896 to 2560px): every element under the first screen at the same place, size, and font size within two reference pixels, floors excepted (`docs/DESIGN.md`, "Every screen by device").

**Why:** The first screen had been made one composition per class (decision 39), and the owner asked for the same rigour across the whole site: what they approve on one screen must be what every device shows, each at its own size. Measuring every element on every page found the drift that plain rem and px CSS produces between devices of one class: sections rewrapping between 600 and 768px because of a 40rem breakpoint, a section's top padding growing with `vw` on a 540px phone while the text did not, icons and borders staying 18px and 2px while the text around them scaled, and buttons in a row creeping by a pixel per border. Each fix removes one source rather than tolerating it, so the test can be strict and stay meaningful. The alternative, a minimum font size for legibility at the narrow end of each class, was tried and rejected: it made the 896 to 1023px desktop window and the 576 to 623px tablet reflow, which is the one thing the owner asked never to happen.

## 41. The header is rebuilt from her banner artwork

**Decision:** The header bar is a light lavender lens with a sweep of her logo's violet and crimson bands painted behind its left end (an inline, decorative SVG), the mark with a white glow, her name, a glossy crimson Donate pill painted inside a 44px link, and on phones and tablets a deep purple wedge with a lighter violet band and a crimson hairline along its cut. The bar's height and every size in it stay multiples of `--sp`, so it is the same bar on every device of a class and the first screen's arithmetic (`--header-h`) is unchanged; the sweep alone follows the bar's height. The letter f in the name comes from a one-glyph Inter subset (`public/fonts/brand-f.woff2`, 1.2 KB, OFL, license beside it) because her artwork's f is straight-stemmed; every other glyph is Bricolage. The reference is the owner's banner image; the markup and styles were adapted from a draft the owner supplied, with its pixel sizes converted to the class scale. The draft placed the glow under the Donate pill in percent of the bar, which on tablets and desktops (where the pill sits at a different fraction of a wider bar) left a pink blur stranded under the navigation; it is now placed from the right edge in reference pixels, and the bar's height is floored at the pill's 44px tap target (`--header-h`) so a desktop window narrower than about 940px does not push the first screen's strip under the fold. A pixel-comparison test of the bar on every page and every class edge guards the painting, since the geometry tests cannot see a background.

**Why:** The owner asked for the banner in their artwork to replace the flat bar, at the same size, as a quality upgrade. The site's materials are otherwise flat (decision 1 and `docs/DESIGN.md`); the header is the one surface that carries her artwork's layering, because it is the brand itself rather than a section. Converting the draft's pixel sizes to `--sp` keeps decision 40's promise: the header on a 320px phone and a 440px phone is the same picture, scaled.

## 42. Nothing the first paint shows is moved afterwards

**Decision:** The application form is shown from the first paint for visitors with JavaScript, by a one-line inline script in the page head that marks the document (`html.js`) before anything is painted, with the form hidden only under `html:not(.js)`; it is no longer revealed by the page's own script. Every font face the first paint uses is preloaded, the bold body face and the header's one-glyph face included, not only the two largest.

**Why:** Lighthouse in CI measured a cumulative layout shift of 0.21 on the application page, three runs alike, on a commit that changed no page: the page's module script, which un-hid the form, ran after the first paint on that runner, and the footer jumped down by the form's height. The same race reproduced locally one run in three. A face that is not preloaded is requested only when layout first needs it, which on a slow machine is after the first paint too, and every bold label would move when it arrived. Both are the same rule: what the first paint shows must be the final layout. The form's no-JavaScript path (the noscript note) is unchanged, and Lighthouse now measures a shift of zero on every page in four runs of four.

## 43. The footer carries the map and the one action

**Decision:** The footer is three groups, side by side on desktop and stacked on a phone, with no rules between them. Her marks come first. On desktop they stack rather than sitting in a row: the heart hovers the footer's top left corner, half a gutter in from the left edge and the same distance down from the top, clear of both rather than flush to either, and lifted above the line the column heads start on so it reads as the region's anchor rather than as the first item in a row of three, and her lettering tucks up into the heart's point at the same left edge, where it has the whole column to itself instead of the leftover beside the heart. The two marks touch rather than sitting apart, so they read as one lockup. The column's width is her lettering's width, which is what makes the Donate button centred in the column and centred under her name the same thing. The button carries the banner door's own signal treatment, and "Never give up." sits under it. On a phone the marks stay in a row, where the lockup already fills the screen. "Explore" lists the same five entrances the header and the phone menu draw: Help me, About, Programs, Get involved, Contact, each with a chevron. "Connect with us" keeps the phone, email and Facebook rows. Each column head carries a short rule in the divider's gradient. The legal record stays a single colophon line.

The two lists hold their 44px floor under `(pointer: coarse)` rather than at every width; a row is 2.75rem otherwise, which is 44px at the reference width and scales with the class.

**Why:** This reverses decision 31, which took the link columns out. That decision was right about the columns as they were: two lists of the same eight items, duplicating the jump tiles and the tabs a visitor had just scrolled past. What goes back is different. It is one list, the same five entrances as every other navigation on the site (decision 38), so a visitor who has read to the end can move without scrolling back up, and the page's one action is there where the decision gets made rather than only at the top. The vertical rules of the second reference are left out: three groups with their own heads already read as three groups, and rules would box them. On the floor: eight rows each pinned to 44px made the footer 52 scaled pixels taller in an 896px window than the same layout at 1280, which the composition test caught; Apple's 44px is a minimum for fingers, so holding it where the pointer is coarse keeps the target on every touch device and lets the rows scale with the class everywhere else. It also tightens them, which is closer to the references' texture.

## 44. The footer takes the bottom of the screen

**Decision:** The page fills the window and the footer sits at the bottom of
it: `html` is 100% tall, `body` is at least that and lays its children out in
a column, and the footer takes the leftover space above it with
`margin-top: auto`. The height is a percentage, not a viewport unit, so the
publish gate's ban on those still holds. A browser test opens every page in a
window taller than it needs and checks that nothing shows under the footer.

**Why:** A page shorter than the window ended partway down it and left a band
of paper below the dark footer, which read as the page having failed to load
the rest. The 404 in a tall window showed 360 pixels of it. Pushing the footer
down changes nothing on a page that already fills the screen: every element on
every page measured identically before and after. The composition test
measures each page at its natural height for the same reason it exists, since
the distance the footer is pushed is a different number in every window.

## 44. The phone menu is rebuilt from the owner's reference

**Decision:** The phone menu keeps decision 38's map (Help me first, the four sections, Donate last, nothing else) and its dialog and script, and takes the owner's reference image as its picture. The header reads her short name with "Supportive Services" spaced out beneath it, beside her mark. The close control is a violet ring, 42 reference pixels, painted inside a 44px button, with no focus ring on a tap and a white one for the keyboard. Opening the menu focuses the dialog itself rather than the close button, because Safari otherwise draws the keyboard ring around the X on a tap, and the ring sits at offset 0 so the panel's scroll box never clips it at the screen edge. The name and "Supportive Services" are tracked slightly open (0.01em and 0.11em) so the lockup reads cleanly at phone size. On a portrait tablet (tablet width and at least 768px tall) the root font follows the 768px tablet reference, which left the phone-sized list filling only the top half of the screen, so the menu's own sizes there are scaled by 1.3; its last rule still ends above the watermark. Phones, phones in landscape, short windows, and desktop render exactly as before. In a portrait phone's browser the toolbars take about a fifth of the reference's height, and the list ran down into the watermark. There the rows tighten from 4.55rem toward 3.6rem and the mark eases to 90% of its size, coming in off the right edge, so the whole mark sits a small gap below the last rule; type and everything above the list are unchanged, and a phone tall enough for the reference renders exactly as it did. The height they share is the menu's own (a size container, `cqh`), not a viewport unit, so the publish gate's rule holds; browsers without container units keep the fixed sizes. Each row is a serif label and a chevron over a hairline that fades violet to rose; Help me is marked by a rose-to-violet bar, gradient lettering, a rose chevron, and a brighter rule. Behind the list sit three decorative, inline SVG layers: a magenta ribbon in the top corner, violet and crimson waves at the bottom left, and her mark as a dim watermark (its heart and hands recoloured, nothing redrawn). The serif is Literata at its display optical size, a 26 KB Latin subset in `public/fonts/menu-serif.woff2` (OFL, license beside it), chosen by scoring 30 serifs against the reference's lettering; it loads only when the menu opens, so the first paint does not wait for it. Every size is rem, so the menu scales with the device class like the rest of the site (decision 40). The top padding adds `env(safe-area-inset-top)` so the header clears the status bar when the site runs full screen.

**Why:** The owner asked for the menu in their reference image, matched as closely as the web allows. Measured at an iPhone 390-point width, the build lands within a pixel of the reference for the name, close ring, rows, rules, and chevrons (mean colour difference about 9 of 255 outside the status bar); the remaining difference is the reference's glossy redraw of her mark, which stays her real mark, and its painted glows. The reference's 42-pixel close circle is kept as a picture but not as a tap target, because 44px is the floor every control on the site holds.

## 45. The footer carries her full lockup in its own colours

**Decision:** The footer's lettering is her lockup artwork, the script "Caring For A Cause" over "SUPPORTIVE SERVICES" in spaced capitals, instead of the white script wordmark alone. It is a vector tracing of the owner's image (`scripts/brand/trace-lockup.py` writes `src/assets/brand/wordmark-lockup.svg`, 28 KB, about 11 KB gzipped), coloured with gradients sampled from the artwork: the script runs pale lavender at the top through violet to magenta in its descenders, and the capitals run lavender to magenta left to right. A soft violet drop shadow stands in for the artwork's glow. It takes the wordmark's place and size in the footer, so the footer layout is unchanged; the banner keeps the white wordmark. The public email is written in lower case.

**Why:** The owner supplied the lockup and asked for it in the footer. A tracing stays sharp at every size and costs a fraction of the 1.1 MB source image, and the source image's dark background would not have matched the footer's. The email address is the same address either way; lower case is how addresses are conventionally written.

## 46. A browser test that sets its own screen size runs once per engine

**Decision:** The browser tests split by what they measure. A test that runs at the device's own screen size (the first screen's promise, tap targets, overflow, the accessibility scan, the phone menu) runs on all 10 devices. A test that sets its own screen size (the fold on an iPhone 12 mini, an iPhone 15, and a 1366 laptop; the season strip at six desktop sizes; the banner's composition; the footer in a tall window; the first screen while the browser bars collapse) measures the stylesheet at that size, not the device, so it runs once per engine, on the desktop project, as the header's pixel comparison already did; it shows as skipped elsewhere. The sideways-scroll sweep keeps only the widths no device has (320, 390, 430, 1024, 1440) and stays on every device, because the footer's rows hold their 44px floor only for a coarse pointer, so a phone and a desktop are not the same page at one width. The header's pixel comparison covers the home page only, since the header and the preview notice come from the layout on every page. The words the tests expect (the founding year, the EIN, the menu's labels, the tagline) come from `src/data/site.ts`, so a content change never needs a test change (decision 2). Three checks that were passing without measuring anything now say so: the season-strip tests skip when the strip is off and fail when it is on but missing; every tap-target selector must match at least one element (the phone menu's button was tested nowhere, its selector matched nothing); and the page-composition guard's precondition, that Chromium positions text linearly at scale 2, is its own named test rather than a quiet skip. Chromium is launched with `--font-render-hinting=none`, which is what makes that true on Linux. A failing test saves a screenshot. The two CI jobs that run the suite get a limit with room in it (40 minutes for the pull-request check, 45 for the live check, which first waits up to 20 for Cloudflare), and the browsers are cached on the Playwright version instead of downloaded on every run.

**Why:** The set-size tests ran on all 10 devices and reached the same numbers 10 times: with the screen size set, the only variable left is the engine. That was about 120 of roughly 980 runs per check, and the header comparison, run against `/donate` as well, another 14 screenshots per engine for a picture the home page already gives. The three silent passes mattered more than the time: a guard that passes with nothing measured is not a gate (`docs/APPROACH.md`, 4), and the menu's button was the one control on the site whose 44px height nothing checked. The rule for what still runs everywhere was found by reading every media query on the site: the footer's `(pointer: coarse)` floor is the only rule a device changes at a fixed width; it is vertical, and none of the once-per-engine tests measure it. If a rule on `(pointer)` or `(hover)` ever changes the first screen or a width, that test goes back on a phone project; the helper's comment says so. The precondition test failed on its first CI run, and that was the finding: Linux Chromium hints glyphs to whole pixels, so the probe had been false on CI since the hour it was added (the run's skipped count rose by exactly three, the three composition tests, at 01:58 on 19 September, and no run since has reported a composition result), while it was true on the machine the guard was written on. The page-composition guard, decision 40, had never run on CI. Without hinting Chromium's text widths are fractional and scale linearly (the probe's ratio is 0.69925 against a 0.7 target with 0.002 of room), the layout is unchanged, and every Chromium test in the suite passes with the flag, the three composition tests included. The limits were raised because both jobs had been finishing within a minute or two of them on a slow runner (the check at 24 of 25 minutes, the live check at 29 of 30), and the first run of this change was cancelled at 25 with nothing failing; a limit is there to stop a hung runner, and Playwright's own per-test timeouts already bound the suite.

## 48. The footer is rebuilt from the owner's reference

**Decision:** The footer keeps decision 43's parts (her marks and the one action, the Explore map, Connect with us, the legal record) and takes the owner's reference picture as its composition. Three columns over one row on desktop: the lockup centred in the first (the mark lit with a blue-violet glow, her lockup artwork of decision 45, a glossy crimson Donate pill, "Never give up."), then Explore and Connect with us behind hairline dividers, each head in the bold serif over a short lavender-to-crimson rule. Under them a rule lit violet to magenta across the whole width with a white-pink flare where the Explore column starts, and the record as one line: her mark drawn in lines, the legal name, a pin with the city and the service area, the copyright, with short rules between. The ground is the reference's near-black navy, lit along its top edge and at the rule's ends. Every desktop size is the reference's, measured from the image and converted at 1152 / 949 (the content column over the reference's), so the picture fills the page's column and starts at the page's left edge like every section; the reference's own margins were 9.5% of its width. Phones stack the parts in one column with the lockup centred and the record as three centred rows; tablets centre the lockup above the two lists side by side and set the record in two rows. All three scale with the class (decision 40).

Three faces carry it. The serif is the phone menu's Literata subset, regenerated from the same source at the same optical size with weights 300 to 700 (the heads and the Donate are bold), the copyright sign and the bullet added, 31 KB against 26; the menu's glyphs are unchanged to the unit, and the file is now `public/fonts/serif.woff2`, declared in the global stylesheet as the site's serif and preloaded on every page, because the footer is on every page and the 404's is on the first screen. The links and contact details are set in a 7 KB subset of Assistant (OFL, `public/fonts/footer-sans.woff2`): the reference's sans was measured against 38 open faces by the width of each of its eight words per cap height, and Assistant matched within 3% where Inter, the header's f, ran 15% wide and would have pushed her address into the right gutter. The lettering is the traced lockup of decision 45, which is the lettering the reference shows (the same proportions to the percent), set at the reference's width with its script's top where the reference has it, and filled in the tones the reference shows it in (the script pale lavender to white, darkening to a muted violet in its tails, the capitals flat lavender), because the artwork's own gradients run to a magenta the reference does not carry; the fills are set in CSS and the traced paths are untouched. The mark is her flat mark recoloured (the ring, heart and hands lit; the record's copy in lavender lines), nothing redrawn. The footer, like the header and the menu, layers gradients and glows; each glow is sized in rem from the corner it belongs to, per class, by the header's rule. The Explore rows are 2.75rem on desktop, 44px on the reference screen, against the reference's 2.56rem, because every row is a tap target (the list is centred on the same middle row, so its head and last row sit at most 7 reference pixels from the reference's); the Connect rows are the reference's 3.55rem. The rows hold their 44px floor under a coarse pointer only, as decision 43 set, declared last so it wins over each class's own height at the same specificity, and as a floor (`max(44px, …)`) so a touch desktop keeps the reference's taller Connect rows. On tablets the Connect column's track is capped at the room left (`minmax(0, 1fr)`), because the address row fits it by a few pixels and a plain `1fr` track would grow with another engine's text metrics and push the column out of the page.

The test that checks the Donate is centred under her lettering now measures the lockup's own box, since the lockup is centred inside a link that spans its column so the link starts at the page's left edge like the header's.

**Why:** The owner supplied the picture and asked for it matched exactly on every device. Measured against it at the desktop reference, the mark, the heads, the rows' text, the icons, the pill, the lockup, the sign-off and every part of the record land within two reference pixels; what differs is recorded above (the 44px rows, the site's 5% gutter). The reference's own sans could not be identified, so it was chosen by measurement rather than by eye, the way the menu's serif was.
