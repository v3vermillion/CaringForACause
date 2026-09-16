# Caring for a Cause Supportive Services

Website for [Caring for a Cause Supportive Services Inc.](https://caring4acausesupportiveservices.com), a Central Indiana nonprofit founded in 2015 by Tamara Long-Ajimati.

**Status:** in development as a private preview. Search engines are blocked. Nothing on this site collects money or personal information yet.

- [Site plan](docs/SITE-PLAN.md): audiences, page structure, design tokens, open questions
- [Decisions](docs/DECISIONS.md): why the site is built this way

## Stack

- [Astro 7](https://astro.build), static output, TypeScript (strict)
- Self-hosted fonts: Bricolage Grotesque and Atkinson Hyperlegible Next
- Hosted on Cloudflare Workers static assets (`wrangler.jsonc`, `public/_headers`)
- GitHub Actions runs formatting, type checks, a build, 350 browser tests across 10 devices, and Lighthouse budgets on every push

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

## Quality checks

Every push and pull request must pass:

- **Browser tests** (`tests/site.spec.ts`, Playwright): 35 checks on 10 devices across all three browser engines: iPhone SE, 12 mini, 17, and 17 Pro Max, iPad mini, Galaxy S24, Pixel 7, and desktop Safari, Firefox, and Chrome. Every iPhone browser uses WebKit, so the WebKit runs cover iOS. Checks include a WCAG 2.2 AA accessibility scan with axe, 44px tap targets, font and image loading, no console errors, no sideways scrolling from 320 to 1440 px, keyboard-accessible tabs, the no-JavaScript fallback, video embeds, in-page links, search blocking, metadata, structured data, and the 404 page.
- **Lighthouse budgets** (`lighthouserc.json`, three runs): performance at least 95, accessibility 100, best practices and SEO at least 95, layout shift under 0.05. Reports are saved as a build artifact, not published.

Measured at setup (Lighthouse, local build): mobile performance 99, desktop 100, accessibility 100, best practices 100, SEO 100 with indexing enabled.

When a browser test fails or only passes on retry, CI posts a summary to an open GitHub issue labeled `ci-failure` (created automatically). Close the issue once the fix passes.

To run the browser tests locally the first time: `npx playwright install chromium webkit firefox`. To run one engine: `PW_ENGINES=chromium npm run test`.

**Supported browsers** are listed in the `browserslist` field of `package.json` (iOS and Safari 15+, plus current Chrome, Firefox, Edge, and Samsung Internet). Lightning CSS adds vendor prefixes for them at build time. Automated WebKit runs approximate Safari; check the live preview on a real iPhone before sending it.

## Live site check

`.github/workflows/live-check.yml` tests the deployed site every Monday and on demand (Actions → Live site check → Run workflow). It runs the full browser suite against the live URL, checks status codes, security headers, caching, and compression (`scripts/check-live-headers.sh`), and records Lighthouse scores. Results are posted to an open issue labeled `live-check`. To change the URL it checks, set a repository variable named `SITE_URL`.

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

The site is served as static files by Cloudflare Workers. Static requests are free and unlimited on the Free plan, so the site cannot be paused for traffic.

**Connect the repo (one time):**

1. In the Cloudflare dashboard, go to **Workers & Pages → Create → Import a repository**.
2. Authorize the Cloudflare GitHub app for **only this repository**.
3. Use these build settings:
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   - Root directory: `/`
4. Leave `PUBLIC_ALLOW_INDEXING` unset. The site stays hidden from search engines.
5. Nothing else to set: Cloudflare builds automatically use the workers.dev preview address for the canonical URL and link-preview image (see `astro.config.mjs`).
6. Deploy. The preview address is `caring-for-a-cause.<your-subdomain>.workers.dev`. Share it privately.

Every push to `main` redeploys automatically. Configuration lives in `wrangler.jsonc`; response headers live in `public/_headers`.

## Launch checklist

Complete only after Tamara approves the site.

- [ ] Confirm the open questions in [docs/SITE-PLAN.md](docs/SITE-PLAN.md#open-questions-for-tamara) and update `src/data/site.ts`
- [ ] Create her free donation page (e.g. Zeffy) in her name and set `links.donate`
- [ ] Create the family application and sponsor sign-up forms in her name and set their links
- [ ] Add hero and gallery photos she provides
- [ ] Add `@astrojs/sitemap` and reference it in `src/pages/robots.txt.ts`
- [ ] Add `caring4acausesupportiveservices.com` to Cloudflare and point it at the Worker (with her GoDaddy login)
- [ ] In the Worker's build variables, set `PUBLIC_ALLOW_INDEXING=true` and `PUBLIC_SITE_URL=https://caring4acausesupportiveservices.com`, then redeploy
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
