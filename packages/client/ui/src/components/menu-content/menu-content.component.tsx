import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent,
} from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useAnchored } from '../../primitives/use-anchored.js';
import { useUiAdapters } from '../../i18n/provider.js';
import { useMenuPart } from '../menu/menu.context.js';
import type { MenuItemData } from '../menu/menu.context.js';
import type { Descendant } from '../../primitives/use-descendants.types.js';
import type { MenuContentProps } from './menu-content.types.js';
import styles from './menu-content.module.css';

/**
 * The next item that can actually take the focus, walking from `from` in
 * `step`s and wrapping — a menu is a ring, so Down on the last goes to the
 * first and a user holding the arrow never hits a wall.
 *
 * `from` may be `-1`, meaning "nowhere yet": the menu has just opened, or the
 * focus is on something inside the surface that is not an item. Written as an
 * explicit start rather than as arithmetic on `-1`, which is how the first
 * version skipped the last item on ArrowUp from a non-item.
 */
function step(
  items: Descendant<MenuItemData>[],
  from: number,
  direction: 1 | -1,
): HTMLElement | null {
  const count = items.length;
  if (count === 0) return null;

  const start =
    from >= 0 && from < count
      ? from
      : // Nowhere yet: Down starts before the first, Up starts after the last.
        direction === 1
        ? -1
        : count;

  for (let hop = 1; hop <= count; hop += 1) {
    const index = (((start + hop * direction) % count) + count) % count;
    const candidate = items[index];
    if (candidate && !candidate.data.disabled) return candidate.element;
  }
  return null;
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
const TYPEAHEAD_WINDOW = 1000;

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
  const declared = data.textValue ?? element.getAttribute('aria-label');
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
    if (candidate === undefined || candidate.data.disabled) continue;
    // Sliced by CHARACTER, not by code unit, so a name beginning with an emoji
    // or a surrogate pair is compared whole rather than cut in half.
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
function byPrefix(
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
 * The surface, and the keyboard contract the platform does not provide.
 *
 * Measured in all three engines: opening with `popovertarget` leaves the focus
 * on the trigger, the arrows do nothing, and `Tab` walks into the items. A menu
 * is ONE tab stop with the arrows moving between items, so all of that is here.
 *
 * THE SURFACE ITSELF IS FOCUSABLE, and that is not decoration. The handler
 * below lives on the surface, so it only hears a key while the focus is inside
 * it — and the focus was measured falling out from under it three ways: a menu
 * whose items are all disabled, a menu whose items have not arrived yet, and
 * the focused item becoming `disabled` or unmounting, each of which drops the
 * focus on `<body>` and leaves the menu open with a dead keyboard. When there
 * is no item to hold the focus, the surface holds it.
 */
function MenuContent(props: MenuContentProps) {
  const { className, children, ref, onKeyDown, ...rest } = props;
  const menu = useMenuPart('MenuContent');
  const surface = useRef<HTMLDivElement>(null);

  const items = menu?.items;
  const reportOpen = menu?.reportOpen;
  const close = menu?.close;

  useAnchored(menu?.anchor ?? null, surface, {
    placement: menu?.placement ?? 'bottom-start',
    open: menu?.open ?? false,
    onAnchorLost: useCallback(() => close?.(), [close]),
  });

  /**
   * Where the focus goes when it opens. The trigger leaves its intent on the
   * element itself — `last` when the user pressed ArrowUp, which the APG asks
   * for and is the only way to reach the end of a long menu in one key — and it
   * is spent here, so the next open starts at the top again.
   */
  const query = useRef('');
  const queryTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // The locale is an adapter the design system already requires, and typing is
  // the one place a component has to compare two strings the way its user's
  // language does. Read tolerantly: a component that merely ASKS for an adapter
  // must not require the provider to exist.
  const locale = useUiAdapters()?.i18n.locale;
  const collator = useMemo(
    // `base` sensitivity is what makes "e" find "Élève": it settles case and
    // accents together, which no pair of lowercasing rules can.
    () => new Intl.Collator(locale, { usage: 'search', sensitivity: 'base' }),
    [locale],
  );

  const takeOpenAt = useCallback((node: HTMLElement): 'first' | 'last' => {
    const at = node.dataset.openAt === 'last' ? 'last' : 'first';
    delete node.dataset.openAt;
    return at;
  }, []);

  /** Focus an item, or the surface when there is no item to focus. */
  const focus = useCallback((element: HTMLElement | null) => {
    (element ?? surface.current)?.focus();
  }, []);

  const reportedOpen = useRef(false);

  useEffect(() => {
    const node = surface.current;
    if (!node || !reportOpen || !items) return;

    const onToggle = (event: Event) => {
      const isOpen =
        (event as Event & { newState?: string }).newState === 'open';
      reportedOpen.current = isOpen;
      reportOpen(isOpen);

      // A search does not outlive the menu it was typed into. Closing is not
      // unmounting — the surface stays in the document — so nothing else was
      // ever going to clear this, and a quick Escape-and-reopen left the next
      // menu answering to half a word typed at the last one.
      if (!isOpen) {
        clearTimeout(queryTimer.current);
        query.current = '';
      }

      // The platform opens the surface and stops there — measured, the focus
      // stayed on the trigger in Chromium and Firefox and on `<body>` in
      // WebKit. A menu that opens without a focused item cannot be used from
      // the keyboard at all.
      if (isOpen) {
        const all = items.items();
        const at = takeOpenAt(node);
        focus(at === 'last' ? step(all, -1, -1) : step(all, -1, 1));
      }
    };

    // READ FIRST, then subscribe. A click that lands before React has hydrated
    // — which is the whole point of a declarative trigger — has already fired
    // `toggle`, so a component that only subscribed would never learn the menu
    // was open: no item focused, the arrows dead, and `aria-expanded` saying
    // "false" over an open menu. The same defect the Popover shipped once.
    if (node.matches(':popover-open')) {
      reportedOpen.current = true;
      reportOpen(true);
      const all = items.items();
      const at = takeOpenAt(node);
      focus(at === 'last' ? step(all, -1, -1) : step(all, -1, 1));
    }

    node.addEventListener('toggle', onToggle);
    return () => {
      node.removeEventListener('toggle', onToggle);
      // Unmounted while open: nothing will ever fire `toggle` again, and the
      // trigger would go on saying `aria-expanded="true"` for a menu that is
      // not there — measured, with `close()` unable to repair it because the
      // element it looks up is gone. Asked of our own bookkeeping and not of
      // the element: by the time a cleanup runs, React has taken the node out
      // and the platform has already closed the popover, so `:popover-open`
      // says no and the repair never happened.
      if (reportedOpen.current) {
        reportedOpen.current = false;
        reportOpen(false);
      }
    };
  }, [reportOpen, items, focus, takeOpenAt]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || !items) return;

      const all = items.items();
      const current = items.indexOf(document.activeElement as HTMLElement);

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          focus(step(all, current, 1));
          break;
        case 'ArrowUp':
          event.preventDefault();
          focus(step(all, current, -1));
          break;
        case 'Home':
          event.preventDefault();
          focus(step(all, -1, 1));
          break;
        case 'End':
          event.preventDefault();
          focus(step(all, -1, -1));
          break;
        case 'Tab':
          // A menu is one tab stop: Tab leaves it rather than walking through
          // it, which is what the platform does when nobody intervenes.
          close?.();
          break;
        default: {
          // TYPEAHEAD, and only for a key that is ours to take. A printable
          // character is TEXT, and text belongs to whatever holds the focus:
          // measured, a field a consumer had put inside the surface could not
          // be typed into AT ALL, every character swallowed and the focus
          // pulled onto a command. The arrows stay unconditional — inside a
          // menu they are navigation, not text.
          if (event.target !== event.currentTarget && current < 0) break;
          // By CHARACTER: `length` counts code units, so an astral one — an
          // emoji, CJK Ext-B — reads as two and was dropped.
          if ([...event.key].length !== 1) break;
          // Nothing a modifier has turned into a shortcut. AltGr is the
          // exception the guard has to know about: Windows delivers it as
          // Ctrl+Alt, and it is how every Polish, Czech and Croatian diacritic
          // is typed — so those letters reached nothing at all. No web shortcut
          // uses Ctrl+Alt+letter, which is why the pair alone is enough where
          // `getModifierState` is not reported.
          const altGraph =
            event.getModifierState('AltGraph') ||
            (event.ctrlKey && event.altKey);
          if ((event.metaKey || event.ctrlKey || event.altKey) && !altGraph) {
            break;
          }

          // Searched BEFORE the key is committed, because whether Space belongs
          // to the search is the answer to that search: it does while the
          // search still finds something — `Copy link` cannot be reached
          // without one — and otherwise it is the command's own key. Asking
          // instead whether a search was merely RUNNING left a slow typist who
          // pressed "d", "e", Space with the focus unmoved and the command not
          // run, because "de " matches nothing.
          const next = query.current + event.key;
          const match = byPrefix(all, next, current, collator);
          if (event.key === ' ' && !match) break;

          event.preventDefault();
          query.current = next;
          clearTimeout(queryTimer.current);
          queryTimer.current = setTimeout(() => {
            query.current = '';
          }, TYPEAHEAD_WINDOW);

          // NOT `focus(...)`: that falls back to the surface when there is
          // nothing, and a search that found nothing would then pull the focus
          // off the command the user was on.
          match?.focus();
          break;
        }
      }
    },
    [onKeyDown, items, focus, close, collator],
  );

  // TAKE THE FOCUS BACK, on every render, because the ways it escapes do not
  // announce themselves: removing the focused element does NOT fire `blur` —
  // measured, the focus simply reappears on `<body>` — and neither does
  // disabling it. A handler would never run. Only `<body>` is repaired: focus
  // that went somewhere real went there for a reason.
  useEffect(() => {
    const node = surface.current;
    if (!node || !node.matches(':popover-open')) return;
    if (document.activeElement === document.body) node.focus();
  });

  return (
    <div
      // Before the spread, and only what the consumer may reasonably want to
      // change: the name, if they have a better one than the trigger's.
      aria-labelledby={menu?.anchor?.id || undefined}
      {...rest}
      ref={mergeRefs(surface, items?.rootRef, ref)}
      // NOT overridable, and both for the same reason: the trigger's
      // `popovertarget` points at this id, and `role="menu"` is the contract the
      // keyboard below implements. An earlier version had it backwards — the id
      // silently dropped, the role silently replaceable.
      id={menu?.surfaceId}
      role="menu"
      popover="auto"
      // Focusable but not tabbable: somewhere for the focus to live when no
      // item can hold it, which is what keeps the keyboard alive.
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className={cn(styles.content, className)}
    >
      {children}
    </div>
  );
}

export { MenuContent };
