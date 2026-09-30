# Approach

How this project is run. The README says what to do; this says how to think.
Read it before changing anything.

## Who this is for

A small, volunteer-run nonprofit whose founder is not a developer. Families in
hardship read the site on older phones. Every choice is judged by three
questions: does it help a family get help or a supporter give it, will it keep
working after handoff without a developer, and is it true?

## Principles

1. **Nothing false ships.** Every factual claim lives in `src/data/facts.ts`
   form with a source and a status. Unconfirmed details can appear in the
   private preview (the build log lists them), but a public build refuses to
   run until they are confirmed. Never state something as fact because it
   sounds right or appeared once online.
2. **Real over polished.** Use the organization's own photos and words. No
   stock photos presented as her work, no invented programs, numbers, quotes,
   or history. When copy needs a detail you don't have, leave it out.
3. **Evidence, not assumption.** Check the current state before acting: the
   live site, the docs, the build output. "It probably works" is not done.
   Verify on the engines people actually use (every iPhone browser is WebKit).
4. **Gates live where they can't be skipped.** `npm run build` type-checks,
   builds, and validates, so a bad build publishes nothing. The `main` ruleset
   requires the browser-test check before anything merges. A check that only
   reports (Lighthouse, the live check) is not a gate; say which is which.
5. **Tests prove the guard, not just the happy path.** Each gate has tests that
   break a copy on purpose and confirm it is caught.
6. **Protect the people in the photos and the data.** Strip photo metadata,
   never name people without permission, and send money and family
   information only to accounts the organization owns.
7. **Handoff is the product.** Prefer plain, static, low-maintenance choices.
   Content changes happen in one file. Anything that needs a secret, a paid
   plan, or a developer must be documented and justified.
8. **Explain before undoing.** Don't reverse a change someone else made
   without saying why first. Make the calls that are yours; report them
   plainly, including mistakes.
9. **Docs match reality.** When behavior changes, update README and
   `docs/DECISIONS.md` in the same change. A stale promise is a bug.

## How changes flow

1. Branch from a freshly updated `main` and open a pull request.
2. CI runs formatting, the gated build, gate and fact tests, the browser suite on
   10 devices across three engines, and Lighthouse budgets.
3. Check the changed-files list matches the intent, then squash-merge once the
   required check is green, and delete the branch.
4. Cloudflare publishes `main`. The live check waits for the merged commit to
   be live, re-tests the deployed site, and posts to an issue. It also runs
   weekly. See `docs/WORKFLOW.md`.

## Before calling something done

- `npm run verify` passes locally (or CI is green on the PR).
- Behavior was checked on the built or live site, not just in code.
- Docs and decisions reflect the change.
- Anything unconfirmed is recorded as a pending fact, not written as true.
