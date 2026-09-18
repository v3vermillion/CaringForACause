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

**Decision:** All CSS is inlined into the page, and the two above-the-fold font files are preloaded.

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
