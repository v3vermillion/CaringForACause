# Decisions

Short records of the technical choices behind this site, so anyone taking it over knows why it is built this way.

## 1. Astro, static output, no UI framework

**Decision:** Astro 7 generating plain HTML and CSS. No React or other framework.

**Why:** The site is content with two small interactive pieces (tabs and video embeds). Astro ships almost no JavaScript, so pages load fast on older phones and slow connections. Both scripts are a few lines of plain TypeScript and the page works without them.

**Revisit if:** the automated holiday application and sponsor-matching system is built. That belongs in a separate app (Next.js), linked from this site.

## 2. One content file

**Decision:** All copy, links, dates, and contact details live in `src/data/site.ts`, typed with TypeScript.

**Why:** Seasonal updates are the only routine changes. Keeping them in one typed file means they never touch layout code, and `npm run check` catches mistakes like a missing field before anything deploys.

## 3. Netlify hosting

**Decision:** Deploy on Netlify's free tier, configured in `netlify.toml`.

**Why:** Free static hosting with preview URLs, simple custom domain setup for her GoDaddy domain, and security and cache headers set in one file. Tamara's old site already used Netlify, so the account type is familiar.

## 4. Search engines blocked by default

**Decision:** `noindex` meta tag and a `Disallow: /` robots.txt unless `PUBLIC_ALLOW_INDEXING` is exactly `"true"`. Netlify preview and branch deploys force it off.

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

**Decision:** `npm run verify` (formatting, type checks, build) runs locally and in GitHub Actions on every push and pull request.

**Why:** The site will be handed off. Automated checks keep future edits, including AI-assisted ones, from breaking the build.
