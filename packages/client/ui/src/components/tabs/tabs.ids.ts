/**
 * The two ids a tab and its panel point at each other with.
 *
 * DERIVED, not registered. A tab needs `aria-controls` on the panel and the
 * panel needs `aria-labelledby` on the tab, and the two are rendered in
 * different places — so a registry would mean one of them reading an id that
 * the other has not published yet, which is an effect-ordering problem for a
 * question that has an arithmetic answer.
 *
 * The pairing is by VALUE rather than by position, so reordering the tabs, or
 * rendering the panels somewhere else entirely, cannot mispair them.
 */
export const tabId = (base: string, value: string) => `${base}-tab-${value}`;
export const panelId = (base: string, value: string) =>
  `${base}-panel-${value}`;

/**
 * Whether a value can be part of an id at all.
 *
 * `aria-controls` is a SPACE-SEPARATED list of ids, so a value with a space in
 * it does not produce a broken reference — it produces two references, one to
 * an element that does not exist. HTML also forbids whitespace in `id`
 * outright. Cheap to check, silent and baffling when it happens.
 */
export const isUsableInId = (value: string) =>
  value.length > 0 && !/\s/.test(value);
