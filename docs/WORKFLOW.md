# How changes ship

See `docs/APPROACH.md` for how decisions are made and `CLAUDE.md` for the rules automated changes follow. Every change follows the same path. Each layer catches a different kind of problem.

| Layer                                 | Where                                                                                   | What it stops                                                                                                                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Branch and pull request            | GitHub ruleset on `main`                                                                | Direct pushes, force pushes, deleting `main`. Only squash merges are allowed.                                                                                                             |
| 2. Required check                     | GitHub Actions `CI` → "Format, types, build, and browser tests (10 devices, 3 engines)" | Formatting, type errors, a failing publish gate, and any browser test (accessibility, layout, tabs, videos, metadata) on the 10-device matrix. The branch must be up to date with `main`. |
| 3. Lighthouse budgets                 | GitHub Actions `CI` (reported, not required)                                            | Speed, accessibility, and SEO regressions. Not required because scores vary slightly between runs.                                                                                        |
| 4. Publish gate                       | `npm run build`, run by Cloudflare                                                      | Anything `scripts/validate-build.mjs` finds wrong in the built site. A failed build publishes nothing; the last good version stays live.                                                  |
| 5. Deploy confirmation and live check | GitHub Actions `Live site check`, after every merge                                     | Cloudflare not publishing the merged commit within 20 minutes, and any problem on the live site: status codes, headers, link preview, browser tests, Lighthouse. Also runs every Monday.  |

## Steps for each change

1. Switch to `main`, update it (`git switch main && git pull --ff-only`), confirm it matches `origin/main`, then create a branch named for the change (for example `content/holiday-dates`, `fix/tab-focus`, `chore/deps`). Never branch from whatever happens to be checked out.
2. Make the change. Content edits go in `src/data/site.ts`; photos go in `src/assets/photos/` with metadata stripped.
3. Run `npm run verify` locally when possible.
4. Push the branch and open a pull request. Fill in the checklist in the template.
5. Before merging, confirm the pull request's list of changed files matches the intended change. Anything unexpected means the branch started from the wrong place; stop and fix that first.
6. Wait for the required check. If it fails, CI posts a summary to the open `ci-failure` issue; fix and push again.
7. Squash-merge once the check passes.
8. The branch deletes itself when the pull request merges (automatic branch deletion is on). A branch whose pull request is closed without merging, or that never had one, is deleted by hand.
9. Confirm the `Live site check` run for the merge commit passes. Results are posted to the open `live-check` issue.

## Dependency updates

`.github/dependabot.yml` opens pull requests on a monthly schedule: one grouped pull request for minor and patch npm updates, one per major npm update, and one grouped pull request for GitHub Actions. New releases wait 7 days (30 for major npm versions) before Dependabot proposes them; security fixes are never delayed. Each pull request must pass the required check like any other change.

To handle one: confirm the changed files are only `package.json`, `package-lock.json`, or workflow files, wait for the check, then squash-merge (the branch deletes itself). For a major update, read the package's release notes first. If a Dependabot branch falls behind `main`, comment `@dependabot rebase` on the pull request.

Two packages are held at their current major version in `.github/dependabot.yml`: `typescript` (the type checker, `@astrojs/check`, supports TypeScript 5 and 6 only) and `@types/node` (its major must match the Node version in `.nvmrc`). Lift each hold when that constraint changes.

## When something fails

- **Required check fails:** the change cannot merge. Read the `ci-failure` issue, fix on the same branch, push. A failing browser test leaves a screenshot and a trace in its part's `test-results-<part>` artifact (the part's devices are in its name on the pull request); a test marked skipped is not a failure (see README, browser tests).
- **Cloudflare build fails (publish gate):** nothing is published and the site keeps the last good version. The `Live site check` run fails at "Wait for Cloudflare to publish this commit". Read the build log in Cloudflare → Workers & Pages → caring-for-a-cause → Deployments, fix on a new branch.
- **Live check fails after a successful deploy:** the change is live. Fix forward on a new branch, or revert the merge commit through a pull request.
- **Emergency:** a repository admin can temporarily disable the ruleset (Settings → Rules → Rulesets). Re-enable it immediately after.

## Decisions that need the owner

Ask before: changing contact details, prices, dates, or program descriptions; adding or removing photos of identifiable people; enabling search indexing; connecting the domain; creating accounts, forms, or donation pages; deleting anything the owner created.
