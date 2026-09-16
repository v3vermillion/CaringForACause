/**
 * Every factual claim on the site carries where it came from and whether it is
 * settled. This keeps unconfirmed details from quietly shipping as fact.
 *
 * - "public-record": verified in an official third-party source (for example the IRS).
 * - "org-published": stated by the organization on its own current website.
 * - "needs-confirmation": conflicting or outdated sources; ask Tamara.
 *
 * Components that state something as fact (trust line, tax statement) accept
 * only `Settled` values, so passing an unconfirmed fact is a type error.
 * Contact details may render while unconfirmed, because the preview needs a way
 * to reach her, but the launch check refuses to turn on search indexing until
 * every fact is settled.
 */

export type FactStatus = "public-record" | "org-published" | "needs-confirmation";

type FactBase<T> = {
  readonly value: T;
  /** Where the value came from, specific enough to re-check. */
  readonly source: string;
};

export type Settled<T> = FactBase<T> & {
  readonly status: "public-record" | "org-published";
};

export type Pending<T> = FactBase<T> & {
  readonly status: "needs-confirmation";
  /** The question to ask the organization. */
  readonly question: string;
};

export type Fact<T> = Settled<T> | Pending<T>;

export const publicRecord = <T>(value: T, source: string): Settled<T> => ({
  value,
  source,
  status: "public-record",
});

export const orgPublished = <T>(value: T, source: string): Settled<T> => ({
  value,
  source,
  status: "org-published",
});

export const needsConfirmation = <T>(value: T, source: string, question: string): Pending<T> => ({
  value,
  source,
  question,
  status: "needs-confirmation",
});

/** Use for text stated as fact. Only settled facts are accepted. */
export const claim = <T>(fact: Settled<T>): T => fact.value;

/** Use for details the preview must show even before confirmation (contact info). */
export const show = <T>(fact: Fact<T>): T => fact.value;

export type PendingItem = { name: string; value: unknown; source: string; question: string };

/** Lists every unconfirmed fact in a record of named facts. */
export function pendingFacts(facts: Record<string, Fact<unknown>>): PendingItem[] {
  return Object.entries(facts)
    .filter(
      (entry): entry is [string, Pending<unknown>] => entry[1].status === "needs-confirmation",
    )
    .map(([name, f]) => ({ name, value: f.value, source: f.source, question: f.question }));
}

/**
 * Throws if the site is being built for public launch while any fact is
 * unconfirmed. Called during the build, so a failure publishes nothing.
 */
export function assertLaunchReady(facts: Record<string, Fact<unknown>>, launching: boolean): void {
  if (!launching) return;
  const pending = pendingFacts(facts);
  if (pending.length === 0) return;
  const list = pending.map((p) => `  - ${p.name}: ${p.question}`).join("\n");
  throw new Error(
    `Launch blocked: ${pending.length} fact(s) still need confirmation before search indexing can be enabled.\n` +
      `Confirm them and update src/data/site.ts:\n${list}`,
  );
}
