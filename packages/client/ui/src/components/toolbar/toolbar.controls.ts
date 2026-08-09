import type { Descendant } from '../../primitives/use-descendants.types.js';

/**
 * The two questions a toolbar has to ask about a control it did not write:
 * whether it can hold the focus at all, and whether it wants the arrow keys
 * for itself. Both are DOM facts, both are pure, and both live here so they can
 * be proved without a toolbar around them — the same reason `roving.ts` is not
 * inside the menu.
 */

/**
 * Whether a control can hold the tab stop.
 *
 * NATIVE `disabled` IS NOT `aria-disabled`, and a toolbar is the first family
 * here that has to care. A `Tab` and a `MenuItem` are ours, and both take the
 * `aria-` form on purpose: focusable, walked onto, refusing to activate — so
 * "nothing is stepped over" holds, and `roving.ts` says so. A toolbar's
 * controls are the CONSUMER's, and our own `Button` takes the native attribute
 * (deliberately: it is what keeps a disabled submit out of implicit form
 * submission). A natively disabled control cannot be focused at all.
 *
 * Two things break if the bar ignores that, and the second is severe:
 *
 *   - the arrows land on it and nothing happens, because `focus()` on a
 *     disabled element is a no-op — the ring appears to be stuck;
 *   - and if it is the FIRST control, it is seeded the tab stop, renders
 *     `tabindex="0"` on an element that cannot take focus, and the entire bar
 *     drops out of the page's tab order. A toolbar no keyboard can reach, with
 *     nothing on screen to say so.
 *
 * `checkVisibility()` in `useDescendants` filters on exactly this reasoning —
 * an item nobody can SEE, offered to the keyboard as "the next one". This is
 * the same sentence with "focus" in it, and it is not in the primitive because
 * the menu and the tab list need the opposite answer.
 */
export function canHoldFocus(element: Element): boolean {
  return (
    !element.matches(':disabled') &&
    // `checkVisibility()` at its default — the one `useDescendants` already
    // applied — deliberately ignores `visibility`, because a menu that has
    // stepped aside for a submenu is still the family the focus comes back to.
    // A toolbar needs the opposite answer: `visibility: hidden` is unfocusable,
    // so seeding the stop onto one is the same catastrophe as seeding it onto a
    // disabled control, and it needs no state change to happen — it is there on
    // the first paint.
    element.checkVisibility({ visibilityProperty: true }) &&
    // The standard "a modal is open" treatment, applied to a region rather than
    // the page. Everything inside is unfocusable and nothing about the element
    // itself says so.
    element.closest('[inert]') === null
  );
}

/**
 * The controls the arrows walk, and the ones that keep a tab stop of their own.
 *
 * TWO ANSWERS, not one, and the split is what stops a field from stranding the
 * bar. The first version excluded a field from nothing and merely declined to
 * act on its keys — which read as a small, documented courtesy and was in fact
 * a keyboard trap: the arrows moved ONTO the field, every arrow (and `Home`,
 * and `End`) then did nothing, and because the tab stop follows the focus,
 * Shift+Tab came back to the field for the rest of the session. Every other
 * control on the bar became permanently unreachable without a mouse — WCAG
 * 2.1.1, in the shape the docs described as "the end of the line for that
 * direction". It was the end of the line in both.
 *
 * So a control that wants the arrows is taken OUT of the ring and given its own
 * `tabindex="0"`, which is the APG's second sanctioned answer: such an item is
 * reached and left with `Tab`. It costs one extra tab stop per field, which is
 * the honest price of putting a field on a toolbar, and it costs the ring
 * nothing.
 */
export function partition<Data>(items: Descendant<Data>[]): {
  ring: Descendant<Data>[];
  fields: Descendant<Data>[];
} {
  const ring: Descendant<Data>[] = [];
  const fields: Descendant<Data>[] = [];

  for (const item of items) {
    if (takesArrows(item.element)) fields.push(item);
    else if (canHoldFocus(item.element)) ring.push(item);
  }

  return { ring, fields };
}

/**
 * Input types that put a caret, a stepper, a thumb or a group under the arrow
 * keys. `radio` is one of them: a radio group's arrows are the PLATFORM's, and
 * a toolbar that took them would break a group it did not build.
 */
const ARROW_TYPES = new Set([
  'text',
  'search',
  'url',
  'tel',
  'email',
  'password',
  'number',
  'range',
  'radio',
  'date',
  'datetime-local',
  'month',
  'time',
  'week',
]);

/**
 * The same answers for a control a consumer BUILT rather than borrowed, where
 * the role is the only thing that says what its arrows do. Deliberately short:
 * a role is on this list because a control carrying it is a plausible thing to
 * put on a toolbar, not because the role exists.
 */
const ARROW_ROLES = new Set([
  'textbox',
  'searchbox',
  'combobox',
  'listbox',
  'slider',
  'spinbutton',
  'radio',
]);

/**
 * Whether the focused control wants the arrow keys for itself.
 *
 * A toolbar takes the arrows over from the browser, and the APG says outright
 * that some things it may contain — a text field, a spin button, a slider —
 * already use them. Taking them from those is not a small rudeness: the caret
 * stops moving in a search box, and a slider cannot be set at all.
 *
 * Neither of the two components that walk a family before this one had to
 * answer the question, because both own every part they walk. `TabList` guards
 * the neighbouring case — a key from something that is not a tab at all, which
 * its `from < 0` line drops — and `Menubar` asks whether the target `matches` a
 * command. A toolbar's parts are the CONSUMER's controls, so "not one of ours"
 * no longer covers it: the field IS a part, registered like any other.
 *
 * What follows from a `true` here is in `partition` above, and it is not "leave
 * the keys alone" — that was the first version, and it was a keyboard trap. The
 * control comes off the ring entirely and keeps a tab stop of its own.
 */
export function takesArrows(element: Element | null): boolean {
  if (!element) return false;

  const tag = element.tagName;
  // A `<select>` opens and steps with the arrows; a `<textarea>` moves a caret
  // in two dimensions, so neither orientation of a toolbar is safe to impose.
  if (tag === 'SELECT' || tag === 'TEXTAREA') return true;

  if (tag === 'INPUT') {
    // `type` reflects to a lowercase string and falls back to `text` for
    // anything unrecognised, which is the same fallback the browser applies to
    // the control itself.
    const type = (element as HTMLInputElement).type;
    return ARROW_TYPES.has(type);
  }

  // Editable content is a caret wherever it is, including on a `<div>`.
  if ((element as HTMLElement).isContentEditable) return true;

  const role = element.getAttribute('role');
  return role !== null && ARROW_ROLES.has(role);
}
