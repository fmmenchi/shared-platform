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

/**
 * Which part a key means, given which way the family runs and which way the
 * page reads. `null` for a key that is none of ours — the caller must then
 * leave the event completely alone.
 *
 * THE LAYER ABOVE THE THREE WALKERS, and it moved here for the same reason they
 * did. `TabList` and `Toolbar` had it verbatim — the same `{forward, back}`
 * ternary, the same five-case `switch`, down to the same comments — and this
 * package's rule is that two consumers is when a policy moves, because a policy
 * copied N times needs N places to change. The menu's own version is NOT folded
 * in: `Menubar` carries an open surface along the bar as it walks, which is a
 * different thing to do with the same answer, and pulling it in here would have
 * bought one call site at the cost of a parameter nobody else passes.
 *
 * The DIRECTION is a parameter rather than a hook call because it must be read
 * at the keystroke: a page can change direction under a component that is
 * already mounted, and the answer is only needed at the moment a key arrives.
 */
export function arrowTarget<Data>(
  items: Descendant<Data>[],
  from: number,
  key: string,
  options: { orientation: 'horizontal' | 'vertical'; direction: 'ltr' | 'rtl' },
): HTMLElement | null {
  const { forward, back } =
    options.orientation === 'vertical'
      ? { forward: 'ArrowDown', back: 'ArrowUp' }
      : inlineEnd(options.direction);

  // The cases are expressions on purpose: `forward` and `back` are computed
  // from the orientation and the writing direction, and a `case` compares with
  // `===` like any other value. The nested ternary this replaced said the same
  // thing in a shape nobody reads twice.
  switch (key) {
    case forward:
      return step(items, from, 1);
    case back:
      return step(items, from, -1);
    case 'Home':
      return first(items);
    case 'End':
      return last(items);
    default:
      return null;
  }
}

/** The writing direction in force on an element, at the moment you ask. */
export function directionOf(element: Element): 'ltr' | 'rtl' {
  return getComputedStyle(element).direction === 'rtl' ? 'rtl' : 'ltr';
}
