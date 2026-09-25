# CLAUDE.md

Website for Caring for a Cause Supportive Services Inc., a volunteer-run
nonprofit in Central Indiana. Static Astro 7 site on Cloudflare Workers.

Read first, in order: `docs/APPROACH.md` (how to think), `README.md` (how to
work), `docs/DECISIONS.md` (why things are the way they are),
`docs/SITE-PLAN.md` (what the page shows).

## Rules

- Content and claims live in `src/data/site.ts`. Factual claims use the
  `facts` record with a source and status (`src/data/facts.ts`). Use
  `claim()` for statements of fact and `show()` only for contact details.
  Never add a claim without a source; never mark something confirmed that
  the organization hasn't confirmed.
- Don't invent copy, numbers, history, or quotes. Don't use stock photos.
- Work on a branch and open a pull request; `main` rejects direct pushes.
  Always create the branch from a freshly updated `main`, and before merging
  check that the pull request's changed files match the intended change.
- There is one deploy path (Cloudflare Workers Builds on `main`). Don't add
  another.
- Run `npm run verify` before proposing a change. First time:
  `npx playwright install chromium webkit firefox`.
- Look before you run the suite. The `playwright` MCP server in `.mcp.json`
  opens a headless Chromium: after any change that can move pixels, start
  `npm run preview`, screenshot `/` (and the page you changed) at 390, 768,
  and 1280 wide, and compare with the owner's references in `docs/reference/`
  and with the page before the change. Fix what you can see first; the tests
  are for what you can't.
- Don't change `PUBLIC_ALLOW_INDEXING`, `PUBLIC_SITE_URL`, secrets, or
  Cloudflare settings unless asked.
- Update README and `docs/DECISIONS.md` in the same change when behavior
  changes.
