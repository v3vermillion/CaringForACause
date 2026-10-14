/**
 * Values the pages derive from the content in site.ts, kept here so the
 * content file stays content and the rules can be tested on their own
 * (scripts/content.test.mjs).
 */

/**
 * The strip items whose program is shown. A program set to `active: false`
 * takes its strip items with it, so hiding a program never leaves a link to
 * a section that isn't on the page.
 */
export function visibleStrip<T extends { href: string }>(
  items: readonly T[],
  programs: readonly { slug: string; active: boolean }[],
): T[] {
  const shown = new Set(programs.filter((p) => p.active).map((p) => `/#${p.slug}`));
  return items.filter((item) => shown.has(item.href));
}

/** The amount chosen when the giving page opens: the second, or the only one. */
export function defaultAmount(amounts: readonly number[]): number {
  if (amounts.length === 0) throw new Error("donatePage.amounts needs at least one amount");
  return amounts[Math.min(1, amounts.length - 1)]!;
}

/**
 * The banner's crossfade for a number of photos. Each photo holds the banner
 * for `hold` seconds and fades in over the first `fade` of them while the one
 * before fades out, so the cycle is `hold` seconds a photo and the keyframe
 * stops are fractions of it (at four photos: 8%, 25% and 33%). The keyframes
 * are written for the photos there are: fixed stops left a gap with three
 * photos and laid a fifth over the first. One photo has no crossfade.
 */
export function crossfade(count: number, hold = 7, fade = 2.24) {
  const cycle = count * hold;
  const at = (seconds: number) => +((seconds / cycle) * 100).toFixed(2);
  const stops = { shown: at(fade), held: at(hold), gone: at(hold + fade) };
  const keyframes =
    count < 2
      ? ""
      : `@keyframes crossfade{0%{opacity:0}${stops.shown}%,${stops.held}%{opacity:1}${stops.gone}%,100%{opacity:0}}` +
        `@keyframes drift{0%{transform:scale(1)}${stops.gone}%{transform:scale(1.085)}${+(stops.gone + 0.01).toFixed(2)}%,100%{transform:scale(1)}}`;
  return { cycle, hold, fade, stops, keyframes };
}

/**
 * JSON for a script element (the page's structured data): a "<" in the
 * content is written as <, so no text can close the script early.
 */
export function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
