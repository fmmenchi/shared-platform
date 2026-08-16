import { foldForSearch } from '../filtering/filter.js';

/**
 * The default match: does this label contain what was typed?
 *
 * CASE- AND ACCENT-INSENSITIVE, because a person typing "jose" is looking for
 * "José" and a person typing "muller" is looking for "Müller" — and a default
 * that fails them looks to the reader like the record is not there.
 *
 * IT FOLDS WITH `foldForSearch`, THE PACKAGE'S OWN, and the version this
 * replaces is worth recording because it was written twenty lines from a table
 * that already answered it. The first one was `NFD` plus a blind
 * `\p{Diacritic}` strip — "the one-line form of it that needs no table and no
 * dependency", as its comment put it — and `filtering/filter.ts` had already
 * met that exact defect, documented it, fixed it and pinned it with a
 * regression test: the Japanese voiced sound marks ARE `Diacritic=Yes`, so
 * stripping the class blindly folds バス (bus) to ハス (lotus) and ガス (gas) to
 * カス. A filter that conflates them is a false-positive engine, and the
 * combobox shipped one.
 *
 * The shared fold also brings what the hand-rolled one never had: ß expanded to
 * ss (JavaScript exposes simple lowercase, so "Straße" did not contain
 * "strasse"), a word-final ς normalised to σ, `NFKD` so a ligature and a
 * full-width Ａ fold too, and the case mapping taken in the READER's locale
 * rather than the runtime's.
 *
 * THE LOCALE IS WHY THIS IS OURS, which is `useTableFilters`' phrase for the
 * same fact. And it is the reason `foldForSearch` is exported from the package
 * root at all — the comment there says folding it yourself "is how one column
 * starts disagreeing with the others". A combobox and a table on one screen,
 * disagreeing about whether "Straße" contains "strasse", is that sentence
 * coming true one component over.
 *
 * It is a DEFAULT and not a policy: what a match means belongs to the consumer
 * (`filter`), who may know about synonyms, codes, a fuzzy score or a server
 * that already answered. This is only what a combobox should do when nobody has
 * said otherwise.
 *
 * HERE AND NOT IN `components/combobox/`, which is where it was written. ADR-0029
 * calls the fold part of what two combobox-shaped controls share, and `Combobox`
 * itself no longer uses it — `useComboboxList` does. Left in the component's
 * folder it was the package's first RUNTIME import from a primitive back into a
 * component, so deleting or renaming one of the two consumers would have broken
 * the shared layer, and the second component's build entry would have pulled a
 * module out of the first component's folder.
 */
export function matches(label: string, query: string, locale: string): boolean {
  return foldForSearch(label, locale).includes(foldForSearch(query, locale));
}

/**
 * Does this label ALREADY SAY what was typed? The question behind the offer to
 * create, and it has to be asked with the same fold as the match above.
 *
 * Asked with a plain `toLocaleLowerCase()` — which is how it shipped — the two
 * disagreed, and an adversarial review measured the disagreement on this
 * package's own fixture: typing `malaga` left `Málaga` in the list AND offered
 * `Create “malaga”` one row under it, so the obvious action was to create a
 * duplicate of a record visible on the same screen. A trailing space was worse:
 * the filter dropped every row, so nothing said it, so the offer appeared alone.
 * Hence the trim as well — a query is text a person typed, and the space at the
 * end of it is not part of what they meant.
 *
 * THIS ONE CANNOT BE OVERRIDDEN, which is why its fold matters more than the
 * match's. A consumer may replace `filter`; the duplicate check runs either
 * way. Under the old blind strip, a catalogue holding バス suppressed the offer
 * to create ハス — a false duplicate, with no public API to say otherwise.
 */
export function says(label: string, query: string, locale: string): boolean {
  return foldForSearch(label, locale) === foldForSearch(query.trim(), locale);
}
