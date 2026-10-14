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
