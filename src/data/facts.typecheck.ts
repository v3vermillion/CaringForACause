/**
 * Compile-time contract, checked by `astro check` (and so by every build).
 * If `claim()` ever accepted an unconfirmed fact, the @ts-expect-error lines
 * would become unused and the type check would fail.
 */
import { claim, needsConfirmation, orgPublished, publicRecord, show } from "./facts.ts";

const pending = needsConfirmation("x", "source", "question?");

// @ts-expect-error: an unconfirmed fact cannot be stated as fact.
claim(pending);
// @ts-expect-error: a plain value has no source or status.
claim("x");

// Allowed:
claim(publicRecord("x", "source"));
claim(orgPublished("x", "source"));
show(pending);
