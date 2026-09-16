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

## 8. Logo on a light plate in the hero

**Decision:** The hero is dark, and the full logo sits on a white circular plate.

**Why:** The logo's purple measures about 2.2:1 against the dark background, below the 3:1 minimum for graphics. The plate keeps her name legible. It can be removed with `logoPlate={false}`.

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
