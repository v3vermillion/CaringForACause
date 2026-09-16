# Caring for a Cause Supportive Services

Website for [Caring for a Cause Supportive Services Inc.](https://caring4acausesupportiveservices.com), a Central Indiana nonprofit founded in 2015 by Tamara Long-Ajimati.

**Status:** in development as a private preview. Search engines are blocked. Nothing on this site collects money or personal information yet.

- [Site plan](docs/SITE-PLAN.md): audiences, page structure, design tokens, open questions
- [Approach](docs/APPROACH.md): the principles every change follows
- [Decisions](docs/DECISIONS.md): why the site is built this way
- [Workflow](docs/WORKFLOW.md): how every change is checked and shipped

## Stack

- [Astro 7](https://astro.build), static output, TypeScript (strict)
- Self-hosted fonts: Bricolage Grotesque and Atkinson Hyperlegible Next
- Hosted on Cloudflare Workers static assets (`wrangler.jsonc`, `public/_headers`)
- GitHub Actions runs formatting, type checks, the gated build, browser tests on 10 devices, and Lighthouse budgets on every push

Requires Node.js 22.12 or later (see `.nvmrc`).

## Quick start

```sh
npm ci
npm run dev        # http://localhost:4321
```

| Command           | What it does                                         |
| ----------------- | ---------------------------------------------------- |
| `npm run dev`     | Start the local dev server                           |
| `npm run build`   | Build the site into `dist/`                          |
| `npm run preview` | Serve the built site locally                         |
| `npm run check`   | Type-check all files                                 |
| `npm run format`  | Format all files with Prettier                       |
| `npm run verify`  | Formatting check, type check, and build (same as CI) |

## Editing content

Everything visitors read lives in **`src/data/site.ts`**. Common updates:

| To change                                          | Edit                                                            |
| -------------------------------------------------- | --------------------------------------------------------------- |
| The strip under the hero                           | `seasonalBanner` (set `active: false` to hide it)               |
| Phone, email, Facebook                             | `contact`                                                       |
| Donation page, online application, sponsor sign-up | `links`                                                         |
| A program's text, or hide a program                | `programs` (set `active: false`)                                |
| Get involved tabs                                  | `getInvolved.tabs`                                              |
| Gallery photos                                     | Add files to `src/assets/gallery/`, then list them in `gallery` |

Run `npm run verify` after editing. It catches missing fields and typos in field names.

**Links set to `null`** are not set up yet. Their buttons automatically email Tamara instead.

### Facts and confirmation

Every factual claim (legal name, EIN, founding year, phone, email, and so on) is in the `facts` record in `src/data/site.ts`, with its source and a status:

- `publicRecord(...)`: verified in an official source such as IRS data.
- `orgPublished(...)`: stated on the organization's own current website.
- `needsConfirmation(..., question)`: conflicting or outdated; ask Tamara.

Statements of fact on the page only accept confirmed values, so an unconfirmed fact used as a claim is a type error. Contact details may show while unconfirmed, because the preview needs them, and every build log lists what's still pending. While search indexing is off, every page shows a preview notice. **A launch build (`PUBLIC_ALLOW_INDEXING=true`) fails until every fact is confirmed**, and lists the questions to ask.

When Tamara confirms a detail, change it to `orgPublished(...)` with her confirmation as the source.

## Quality checks

**What blocks publishing:** Cloudflare runs `npm run build`, which fails, and publishes nothing, if the type check or `scripts/validate-build.mjs` finds a problem: missing files, broken in-page links or images, missing alt text, placeholder text, a wrong or missing link-preview image, invalid structured data, missing security headers, or search indexing that doesn't match its setting (indexing is only ever allowed on the production domain). The last good deployment stays live.

**What GitHub Actions checks** on every push and pull request. The browser-test check is required by the `main` ruleset, so nothing reaches `main` (and therefore Cloudflare) without passing it. Lighthouse reports results but is not required, because scores vary slightly between runs.

- **Browser tests** (`tests/site.spec.ts`, Playwright): 37 checks on each of 10 devices across all three browser engines: iPhone SE, 12 mini, 17, and 17 Pro Max, iPad mini, Galaxy S24, Pixel 7, and desktop Safari, Firefox, and Chrome. Every iPhone browser uses WebKit, so the WebKit runs cover iOS. Checks include a WCAG 2.2 AA accessibility scan with axe, 44px tap targets, font and image loading, no console errors, no sideways scrolling from 320 to 1440 px, keyboard-accessible tabs, the no-JavaScript fallback, video embeds, in-page links, search blocking, metadata, structured data, and the 404 page.
- **Lighthouse budgets** (`lighthouserc.json`, three runs): performance at least 95, accessibility 100, best practices at least 95, every SEO audit except "is crawlable" (search blocking is intentional on the preview), layout shift under 0.05. Reports are saved as a build artifact, not published.

Measured at setup (Lighthouse, local build): mobile performance 99, desktop 100, accessibility 100, best practices 100, SEO 100 with indexing enabled.

When a browser test fails or only passes on retry, CI posts a summary to an open GitHub issue labeled `ci-failure` (created automatically). Close the issue once the fix passes.

To run the browser tests locally the first time: `npx playwright install chromium webkit firefox`. To run one engine: `PW_ENGINES=chromium npm run test`.

**Supported browsers** are listed in the `browserslist` field of `package.json` (iOS and Safari 15+, plus current Chrome, Firefox, Edge, and Samsung Internet). Lightning CSS adds vendor prefixes for them at build time. Automated WebKit runs approximate Safari; check the live preview on a real iPhone before sending it.

**Branch rules:** a GitHub ruleset on `main` (requires GitHub Pro for this private repository) blocks direct and force pushes, allows only squash-merged pull requests, and requires the **Format, types, build, and browser tests (10 devices, 3 engines)** check with the branch up to date. The bypass list is empty. See `docs/WORKFLOW.md`.

## Live site check

`.github/workflows/live-check.yml` runs after every merge to `main`, every Monday, and on demand (Actions → Live site check → Run workflow). After a merge, it first waits until the live page's `version` tag matches the merged commit, which confirms Cloudflare published it. It runs the full browser suite against the live URL, checks status codes, security headers, caching, and compression (`scripts/check-live-headers.sh`), and records Lighthouse scores. Results are posted to an open issue labeled `live-check`. To change the URL it checks, set a repository variable named `SITE_URL`.

## Project structure

```
src/
  data/site.ts          All content
  pages/index.astro     Home page (section order)
  pages/404.astro       Not-found page
  pages/robots.txt.ts   Crawler rules (blocked unless indexing is enabled)
  layouts/Base.astro    <head>, fonts, meta tags
  components/           One file per page section
  styles/global.css     Design tokens and shared styles
  assets/brand/         Logo and icon (optimized at build time)
  assets/photos/        Event photos (metadata stripped)
public/                 Icons, sharing image, web manifest, _headers (security and cache rules)
tests/                  Browser tests
docs/                   Plan and decisions
```

## Deploying (Cloudflare)

The site is served as static files by Cloudflare Workers. Static requests are free and unlimited on the Free plan, so the site cannot be paused for traffic. Configuration lives in `wrangler.jsonc`; response headers live in `public/_headers`.

### How deploys work

Cloudflare Workers Builds deploys every commit on `main`, running `npm run build` and then `npx wrangler deploy`. Deploys are gated twice:

1. **Before `main`:** the ruleset only lets a pull request merge after the full browser-test check passes.
2. **During the build:** `npm run build` type-checks and validates the site; if it fails, nothing is published and the last good version stays live.

Other branches are not built. Cloudflare builds automatically use the workers.dev preview address for the canonical URL and link-preview image (see `astro.config.mjs`).

Every page includes `<meta name="version">` with the commit it was built from. After each merge, the live site check waits for that tag to match, which confirms the deploy happened.

This is the only deploy path. Don't add a second one (for example, a GitHub Actions job with a Cloudflare API token) without disconnecting Workers Builds first.

## Launch checklist

Complete only after Tamara approves the site.

- [ ] Confirm every pending fact (listed in the build log) and update `src/data/site.ts`; the launch build refuses to run until this is done
- [ ] Create her free donation page (e.g. Zeffy) in her name and set `links.donate`
- [ ] Create the family application and sponsor sign-up forms in her name and set their links
- [ ] Add hero and gallery photos she provides
- [ ] Add `@astrojs/sitemap` and reference it in `src/pages/robots.txt.ts`
- [ ] Add `caring4acausesupportiveservices.com` to Cloudflare and point it at the Worker (with her GoDaddy login)
- [ ] In the Worker's build variables (Cloudflare → Settings → Build), set `PUBLIC_ALLOW_INDEXING=true` and `PUBLIC_SITE_URL=https://caring4acausesupportiveservices.com`; set the GitHub repository variable `SITE_URL` to the same address; then redeploy
- [ ] Add a `Strict-Transport-Security` header in `public/_headers` once the site is served only from her HTTPS domain
- [ ] Check the live site on a phone: every button, tab, video, and link
- [ ] Take down or redirect the old `caringforacauseindy.netlify.app` site

## Handoff checklist

- [ ] Transfer this repository to Tamara's GitHub account
- [ ] Move the Worker and domain to her Cloudflare account
- [ ] Confirm the domain, donation, and form accounts are all in her name
- [ ] Revoke every personal access token used during the build
- [ ] Walk her through editing `src/data/site.ts`

## Ownership

Built as a volunteer gift. On handoff, all code, content, and accounts belong to Caring for a Cause Supportive Services Inc.
