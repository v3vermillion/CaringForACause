# Caring for a Cause Supportive Services

Website for [Caring for a Cause Supportive Services Inc.](https://caring4acausesupportiveservices.com), a Central Indiana nonprofit founded in 2015 by Tamara Long-Ajimati.

**Status:** in development as a private preview. Search engines are blocked. Nothing on this site collects money or personal information yet.

- [Site plan](docs/SITE-PLAN.md): audiences, page structure, design tokens, open questions
- [Decisions](docs/DECISIONS.md): why the site is built this way

## Stack

- [Astro 7](https://astro.build), static output, TypeScript (strict)
- Self-hosted fonts: Bricolage Grotesque and Atkinson Hyperlegible Next
- Hosted on Cloudflare Workers static assets (`wrangler.jsonc`, `public/_headers`)
- GitHub Actions runs formatting, type checks, and a build on every push

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
  assets/gallery/       Event photos
public/                 Favicons, sharing image, _headers (security and cache rules)
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
5. Deploy. The preview address is `caring-for-a-cause.<your-subdomain>.workers.dev`. Share it privately.

Every push to `main` redeploys automatically. Configuration lives in `wrangler.jsonc`; response headers live in `public/_headers`.

## Launch checklist

Complete only after Tamara approves the site.

- [ ] Confirm the open questions in [docs/SITE-PLAN.md](docs/SITE-PLAN.md#open-questions-for-tamara) and update `src/data/site.ts`
- [ ] Create her free donation page (e.g. Zeffy) in her name and set `links.donate`
- [ ] Create the family application and sponsor sign-up forms in her name and set their links
- [ ] Add hero and gallery photos she provides
- [ ] Add `@astrojs/sitemap` and reference it in `src/pages/robots.txt.ts`
- [ ] Add `caring4acausesupportiveservices.com` to Cloudflare and point it at the Worker (with her GoDaddy login)
- [ ] Set the build variable `PUBLIC_ALLOW_INDEXING=true` in the Worker's build settings and redeploy
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
