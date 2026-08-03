import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useAnchored } from '../../primitives/use-anchored.js';
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

/** How long a typed run stays one search. The APG's figure, and everyone's. */
const TYPEAHEAD_WINDOW = 500;

/**
 * The item whose text starts with what has been typed, searching forward from
 * `from` and wrapping. `null` when nothing matches, which must leave the focus
 * where it is: a mistyped letter moving the focus somewhere arbitrary is worse
 * than a mistyped letter doing nothing.
 *
 * The text is read from the ELEMENT, not from a label collected when the item
 * registered — an item is `<MenuItem><Icon />Delete</MenuItem>` as often as not,
 * and `children` there is an array whose text is not a string. What the user
 * SEES is in the DOM, and the DOM is what the user is looking at. `textValue`
 * overrides it for the one case the DOM gets wrong: other text, first.
 */
function byPrefix(
  items: Descendant<MenuItemData>[],
  query: string,
  from: number,
): HTMLElement | null {
  const count = items.length;
  if (count === 0 || query === '') return null;

  // The same letter over and over means "the next one starting with it", which
  // is how a user walks a menu of similar commands; anything else is a search
  // that may still be refining the item it is already on.
  const repeated = query.length > 1 && [...query].every((c) => c === query[0]);
  const needle = repeated ? query[0] : query;
  const start = repeated ? from + 1 : Math.max(from, 0);

  for (let hop = 0; hop < count; hop += 1) {
    const index = (((start + hop) % count) + count) % count;
    const candidate = items[index];
    if (candidate === undefined || candidate.data.disabled) continue;
    const text = (
      candidate.data.textValue ??
      candidate.element.textContent ??
      ''
    )
      .trim()
      .toLowerCase();
    if (text.startsWith(needle)) return candidate.element;
  }
  return null;
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
          // TYPEAHEAD. A printable character, and nothing that a modifier has
          // turned into a shortcut.
          if (event.key.length !== 1) break;
          if (event.metaKey || event.ctrlKey || event.altKey) break;
          // Space belongs to the search only while a search is running;
          // otherwise it activates the command, which is what it is for.
          if (event.key === ' ' && query.current === '') break;

          event.preventDefault();
          query.current += event.key.toLowerCase();
          clearTimeout(queryTimer.current);
          queryTimer.current = setTimeout(() => {
            query.current = '';
          }, TYPEAHEAD_WINDOW);

          // NOT `focus(...)`: that falls back to the surface when there is
          // nothing, and a search that found nothing would then pull the focus
          // off the command the user was on.
          byPrefix(all, query.current, current)?.focus();
          break;
        }
      }
    },
    [onKeyDown, items, focus, close],
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

  // A search that outlives the menu would greet the next open half-typed.
  useEffect(() => () => clearTimeout(queryTimer.current), []);

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
