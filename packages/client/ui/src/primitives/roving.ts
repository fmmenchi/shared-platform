import type { Descendant } from './use-descendants.types.js';

/**
 * Walking a family of parts with the arrow keys.
 *
 * Extracted from `menu.keyboard.ts` when Tabs became the second consumer, which
 * is the threshold this package already states for an abstraction earning its
 * place (see `part-context.tsx`). Nothing here ever looked at what a menu
 * command IS: the walkers only ever read `element`, so the family's data type
 * is a parameter and the menu's own file keeps its named exports.
 *
 * `inlineEnd` came with them on the second pass. Leaving it behind meant the
 * tab list importing `menu.keyboard.js` for it, and the built output showed
 * what that cost: a consumer importing only `@fmmenchi/ui/tab-list` shipped the
 * menu's `Intl.Collator` prefix matcher and its accessible-name walker.
 */

/**
 * Which side a submenu opens on, and which physical arrow means "into it".
 *
 * The submenu sits on the INLINE-END side — the way the reader reads — so both
 * answers come from the direction and neither is a prop. Pure, and separate
 * from the component, because the rendered side cannot be asserted: `flip()`
 * moves the surface when there is no room, so a menu near the edge of a phone
 * ends up on the other side whatever was asked for, and a test of the rendered
 * position measures the room rather than the rule.
 *
 * The keys deliberately do NOT follow the flip. The APG writes the contract in
 * physical arrows, and a key that changed meaning between two openings of the
 * same menu — because the window was narrower the second time — would be worse
 * than one that occasionally points away from the surface.
 */
export function inlineEnd(direction: 'ltr' | 'rtl'): {
  placement: 'left-start' | 'right-start';
  forward: 'ArrowLeft' | 'ArrowRight';
  back: 'ArrowLeft' | 'ArrowRight';
} {
  return direction === 'rtl'
    ? { placement: 'left-start', forward: 'ArrowLeft', back: 'ArrowRight' }
    : { placement: 'right-start', forward: 'ArrowRight', back: 'ArrowLeft' };
}

/** The first part, and the last — a family's two ends. */
export function first<Data>(items: Descendant<Data>[]): HTMLElement | null {
  return items[0]?.element ?? null;
}

export function last<Data>(items: Descendant<Data>[]): HTMLElement | null {
  return items[items.length - 1]?.element ?? null;
}

/**
 * The part `direction` away from `from`, WRAPPING — a menu and a tab list are
 * both rings, so Down on the last goes to the first and a user holding the
 * arrow never hits a wall. (The APG specifies the wrap for both patterns.)
 *
 * Nothing is stepped OVER. A disabled part is `aria-disabled` and focusable —
 * the APG's "focusable but cannot be activated" — so the arrows walk onto it
 * like any other: inside a `role="menu"` or a `role="tablist"` the reader is in
 * focus mode, and a part the arrows skip is one they are never told about.
 */
export function step<Data>(
  items: Descendant<Data>[],
  from: number,
  direction: 1 | -1,
): HTMLElement | null {
  const count = items.length;
  if (count === 0) return null;

  // Nowhere yet — the menu has just opened, or the focus is on the surface
  // because no part can hold it. Said outright, rather than as arithmetic on
  // `-1`: treating it as an index is how the first version answered ArrowUp
  // with the second-to-last command.
  if (from < 0) return direction === 1 ? first(items) : last(items);

  return items[(from + direction + count) % count]?.element ?? null;
}
