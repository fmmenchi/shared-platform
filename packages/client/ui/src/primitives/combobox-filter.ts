/**
 * The default match: does this label contain what was typed?
 *
 * CASE- AND ACCENT-INSENSITIVE, because a person typing "jose" is looking for
 * "José" and a person typing "muller" is looking for "Müller" — and a default
 * that fails them looks to the reader like the record is not there. The fold is
 * `NFD` plus stripping the combining marks, which is the one-line form of it
 * that needs no table and no dependency.
 *
 * It is a DEFAULT and not a policy: what a match means belongs to the consumer
 * (`filter`), who may know about synonyms, codes, a fuzzy score or a server
 * that already answered. This is only what a combobox should do when nobody has
 * said otherwise.
 *
 * Not exported from the package. A consumer wanting this behaviour gets it by
 * passing nothing; a consumer wanting a variation of it writes theirs, and one
 * more helper on the public surface would be a second thing to keep in step.
 *
 * HERE AND NOT IN `components/combobox/`, which is where it was written. ADR-0029
 * calls the fold part of what two combobox-shaped controls share, and `Combobox`
 * itself no longer uses it — `useComboboxList` does. Left in the component's
 * folder it was the package's first RUNTIME import from a primitive back into a
 * component, so deleting or renaming one of the two consumers would have broken
 * the shared layer, and the second component's build entry would have pulled a
 * module out of the first component's folder. No lint rule catches that edge;
 * moving it costs one commit now and more after the second consumer exists,
 * which is the same argument that extracted the hook early.
 */
export function matches(label: string, query: string): boolean {
  return fold(label).includes(fold(query));
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
 */
export function says(label: string, query: string): boolean {
  return fold(label) === fold(query.trim());
}

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase();
}
