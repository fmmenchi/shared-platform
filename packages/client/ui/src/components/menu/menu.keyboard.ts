import type { MenuItemData } from './menu.context.js';
import type { Descendant } from '../../primitives/use-descendants.types.js';

/*
 * WHICH COMMAND A KEY MEANS. Given the items, where the focus is, and what was
 * typed, these answer with an element and touch nothing — no focus moved, no
 * event consumed, no state. `MenuContent` owns all of that; this owns the
 * arithmetic and the comparison.
 *
 * Two reasons for the seam, and neither is tidiness. The first is that these
 * are the parts a real keyboard cannot fully reach: an astral character never
 * arrives as `event.key` in the test harness, and a multi-character search from
 * "no command has the focus" cannot be typed, because the first character
 * always moves the focus onto one. Called directly, both are ordinary
 * arguments. The second is that the day a Select or a Combobox wants typeahead,
 * this is what it wants — but it stays HERE until one of them exists and
 * confirms the shape, which is the same rule `useAnchored` states about itself.
 * Everything below is typed to a menu's own items, and generalising it now
 * would mean guessing at a caller nobody has written.
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

/** The first command, and the last. A menu's two ends. */
export function first(items: Descendant<MenuItemData>[]): HTMLElement | null {
  return items[0]?.element ?? null;
}

export function last(items: Descendant<MenuItemData>[]): HTMLElement | null {
  return items[items.length - 1]?.element ?? null;
}

/**
 * The command `direction` away from `from`, wrapping — a menu is a ring, so
 * Down on the last goes to the first and a user holding the arrow never hits a
 * wall.
 *
 * Nothing is stepped OVER. A disabled command is `aria-disabled` and focusable
 * (the APG's "focusable but cannot be activated"), so the arrows walk onto it
 * like any other: with `role="menu"` a screen reader is in focus mode, and a
 * command the arrows skip is one its user is never told about.
 */
export function step(
  items: Descendant<MenuItemData>[],
  from: number,
  direction: 1 | -1,
): HTMLElement | null {
  const count = items.length;
  if (count === 0) return null;

  // Nowhere yet — the menu has just opened, or the focus is on the surface
  // because no command can hold it. Said outright, rather than as arithmetic on
  // `-1`: treating it as an index is how the first version answered ArrowUp
  // with the second-to-last command.
  if (from < 0) return direction === 1 ? first(items) : last(items);

  return items[(from + direction + count) % count]?.element ?? null;
}

/**
 * How long a typed run stays one search.
 *
 * Radix and React Aria both use a second, and a slower typist is exactly who
 * the buffer is for: at half that, someone driving a head pointer types "c",
 * "u" as two one-letter searches, lands on the wrong command, and is told
 * nothing about why. The APG has no figure — its own menu-button example has no
 * buffer at all, matching a single character and always advancing.
 */
export const TYPEAHEAD_WINDOW = 1000;

/**
 * What typing at a command should match: the name it is ANNOUNCED by, because
 * that is the name the user has heard and is now typing.
 *
 * Reading `children` is not it — a command is `<MenuItem><Icon />Delete</…>` as
 * often as not, and its children are an array whose text is not a string, so a
 * label collected from the props was the empty string for every command with an
 * icon. Reading the element's text alone is not it either: `aria-hidden`
 * decoration is IN the text and is not in the name, so a leading `<span
 * aria-hidden>🗑</span>` made "Delete" unmatchable while a screen reader went on
 * announcing it "Delete".
 *
 * So: what the author declared, else the name they gave it, else its text
 * without what the accessibility tree ignores. An icon that carries its own
 * name — an `<svg>` with a `<title>`, which this design system's icon port
 * sanctions — is IN the name and so is in here; that is why `textValue` exists.
 */
function labelOf({ element, data }: Descendant<MenuItemData>): string {
  return nameOf(element, data.textValue);
}

/**
 * The name a command is ANNOUNCED by, from the element alone — what typeahead
 * matches, and what the way back out of a submenu calls the command that
 * opened it. Those two disagreeing is how a submenu came to announce itself
 * "Back to" for an icon-only trigger, and "Back to 🗑Share" for a decorated
 * one, while typing had the right answer all along.
 */
export function nameOf(element: Element, textValue?: string): string {
  const declared = textValue ?? element.getAttribute('aria-label');
  return (declared ?? visibleText(element)).trim();
}

/** The element's text, skipping what is hidden from the accessibility tree. */
function visibleText(element: Element): string {
  let text = '';
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) text += node.nodeValue ?? '';
    else if (node instanceof Element) {
      if (node.getAttribute('aria-hidden') === 'true') continue;
      text += visibleText(node);
    }
  }
  return text;
}

/**
 * The first command at or after `from` whose name begins with `needle`,
 * wrapping. `excludeCurrent` starts the search one PAST the focus, which is
 * what "the next command starting with…" means.
 *
 * The comparison is the locale's, not `toLowerCase`'s. Measured: "Élève" does
 * not start with "e", "Ładuj" does not start with "l", so on a French or Polish
 * menu the accented commands answered to no keystroke at all — and lowercasing
 * per-locale cannot fix it, since Turkish maps "I" to "ı" and then breaks the
 * user who types "i". A collator at base sensitivity settles case, accents,
 * "ß"/"ss" and Arabic hamza forms in one primitive, and keeps "ı" and "i"
 * distinct in Turkish, where they are different letters.
 */
function firstMatch(
  items: Descendant<MenuItemData>[],
  needle: string,
  from: number,
  collator: Intl.Collator,
  excludeCurrent: boolean,
): HTMLElement | null {
  const count = items.length;
  const chars = [...needle];
  // After the focus, or at the top when nothing holds it. One expression rather
  // than a branch per case: `from` is `-1` when the surface itself has the
  // focus, and both readings of that are "start at the first command".
  const start = Math.max(from + (excludeCurrent ? 1 : 0), 0);

  for (let hop = 0; hop < count; hop += 1) {
    const candidate = items[(start + hop) % count];
    if (candidate === undefined) continue;
    // Sliced by CHARACTER, not by code unit. It reads like a precaution and it
    // is a behaviour: measured, the collator equates "𝐀" with "a" at base
    // sensitivity, so a command called "𝐀rchive" answers to an ordinary "a" —
    // while a head cut after one code UNIT is half a surrogate pair, which
    // matches nothing. The two agree wherever the name and what was typed are
    // the same shape, which is why only the mixed case shows the difference.
    const head = [...labelOf(candidate)].slice(0, chars.length).join('');
    if (collator.compare(head, needle) === 0) return candidate.element;
  }
  return null;
}

/**
 * The item to go to for what has been typed. `null` when nothing matches, which
 * must leave the focus where it is: a mistyped letter moving the focus
 * somewhere arbitrary is worse than a mistyped letter doing nothing.
 */
export function byPrefix(
  items: Descendant<MenuItemData>[],
  query: string,
  from: number,
  collator: Intl.Collator,
): HTMLElement | null {
  const chars = [...query];

  // WHAT WAS TYPED, first. A single character always moves on — that is what
  // the APG's "the NEXT item whose label begins with it" means, and its own
  // example does it unconditionally. Asking instead whether the buffer was a
  // repeat made the answer depend on typing SPEED: presses further apart than
  // the window each arrive as a fresh one-letter search, which matched the
  // command the focus was already on, so pressing "c" at a human pace on a menu
  // of three "c" commands never left the first one.
  const direct = firstMatch(items, query, from, collator, chars.length === 1);
  if (direct) return direct;

  // Only when nothing answers to what was typed is a run of one letter a user
  // WALKING the commands that share it. Deciding that up front — on the shape
  // of the buffer alone — broke every language where a doubled letter starts a
  // word: a Dutch user typing "Aanmaken" was thrown to "Archiveren" on the
  // second "a", which a screen reader reads out, mid-word.
  const repeated = chars.length > 1 && chars.every((c) => c === chars[0]);
  return repeated
    ? firstMatch(items, chars[0] as string, from, collator, true)
    : null;
}

/**
 * Whether a key is the user TYPING at the menu, rather than a shortcut or a
 * key the browser owns.
 *
 * Two of the three tests here cannot be written against a real keyboard, which
 * is most of why this is a function rather than four lines inside a handler:
 * the harness will not deliver an astral `key`, and it cannot produce AltGr at
 * all — measured, `{AltGraph>}` sets neither modifier, so a test written with
 * it passes whether the guard exists or not.
 */
export function isSearchKey(event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  // Narrowed to the ONE modifier this asks about, so React's synthetic event —
  // whose `getModifierState` takes a union of known keys and not any string —
  // is assignable. A wider parameter here rejects the only caller there is.
  getModifierState: (key: 'AltGraph') => boolean;
}): boolean {
  // By CHARACTER: `length` counts code units, so an astral one — an emoji, CJK
  // Ext-B — reads as two and was dropped.
  if ([...event.key].length !== 1) return false;

  // AltGr is the exception a modifier guard has to know about: Windows delivers
  // it as Ctrl+Alt, and it is how every Polish, Czech and Croatian diacritic is
  // typed — so those letters reached nothing at all. No web shortcut uses
  // Ctrl+Alt+letter, which is why the pair alone is enough where
  // `getModifierState` is not reported.
  const altGraph =
    event.getModifierState('AltGraph') || (event.ctrlKey && event.altKey);
  return !((event.metaKey || event.ctrlKey || event.altKey) && !altGraph);
}
