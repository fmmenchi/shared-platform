import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
} from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useAnchored } from '../../primitives/use-anchored.js';
import { useOpenMirror } from '../../primitives/use-open-mirror.js';
import { useDirection, useMessages } from '../../i18n/provider.js';
import { menuContentMessages } from './menu-content.messages.js';
import { useMenuPart } from '../menu/menu.context.js';
import type { MenuItemData } from '../menu/menu.context.js';
import { first, last, inlineEnd, nameOf, step } from '../menu/menu.keyboard.js';
import { useTypeahead } from '../menu/use-typeahead.js';
import {
  useDescendant,
  emptyDescendants,
} from '../../primitives/use-descendants.js';
import type { MenuContentProps } from './menu-content.types.js';
import styles from './menu-content.module.css';

/**
 * The surface, and the keyboard contract the platform does not provide.
 *
 * Measured in all three engines: opening with `popovertarget` leaves the focus
 * on the trigger, the arrows do nothing, and `Tab` walks into the items. A menu
 * is ONE tab stop with the arrows moving between items, so all of that is here.
 *
 * THE SURFACE ITSELF IS FOCUSABLE, and that is not decoration. The handler
 * below lives on the surface, so it only hears a key while the focus is inside
 * it — and the focus was measured falling out from under it: a menu whose items
 * have not arrived yet, and the focused item unmounting, each of which drops
 * the focus on `<body>` and leaves the menu open with a dead keyboard. When
 * there is no item to hold the focus, the surface holds it.
 */
function MenuContent(props: MenuContentProps) {
  const { className, children, ref, onKeyDown, ...rest } = props;
  const menu = useMenuPart('MenuContent');
  const surface = useRef<HTMLDivElement>(null);

  const items = menu?.items;
  const reportOpen = menu?.reportOpen;
  const close = menu?.close;
  const direction = useDirection();
  const t = useMessages(menuContentMessages);
  // INSIDE another surface, and the one thing that follows from it: a way back
  // to the command that opened it. Not "has a family above it" — a menu of a
  // MENUBAR has one of those and is still a top-level surface.
  const nested = menu?.nested ?? false;
  const family = menu?.parent ?? null;
  const anchor = menu?.anchor ?? null;

  // What the command that opened this menu is CALLED, by the same rule typing
  // uses: its `aria-label`, else its text without the decoration the
  // accessibility tree ignores. Reading `textContent` instead announced "Back
  // to" for an icon-only trigger and "Back to 🗑Share" for a decorated one.
  const anchorName = anchor ? nameOf(anchor) : '';

  /**
   * The two facts the close path needs, held where reading them costs the
   * subscription NOTHING.
   *
   * `useOpenMirror` requires a stable callback and says why: a new identity
   * resubscribes, and the cleanup reports CLOSED on the way past. The anchor is
   * an element the family hands down, and this used to hold the parent's whole
   * context object — which is re-made whenever its active command changes, so
   * putting it in the dependency list, which is what the exhaustive-deps rule
   * asked for, meant that moving the pointer anywhere in the parent menu tore
   * the subscription down and built it again. Measured: a phantom close+open
   * pair reached the consumer's `onOpenChange` twice, and the focus was dragged
   * back to the submenu's first command. With a submenu open you could not move
   * in the menu that owned it.
   */
  const latest = useRef({ nested, anchor });
  useEffect(() => {
    latest.current = { nested, anchor };
  });

  useAnchored(menu?.anchor ?? null, surface, {
    placement: menu?.placement ?? 'bottom-start',
    open: menu?.open ?? false,
    onAnchorLost: useCallback(() => close?.(), [close]),
  });

  // Typing to reach a command, which a menubar owes identically — one hook, so
  // the two cannot drift on the rules that make it correct.
  const typeahead = useTypeahead();

  /** Focus a command, or the surface when there is no command to focus. */
  const focus = useCallback((element: HTMLElement | null) => {
    (element ?? surface.current)?.focus();
  }, []);

  /**
   * WHAT THE PLATFORM DID, and what this menu does about it.
   *
   * On OPENING, the focus. The platform opens the surface and stops there —
   * measured in all three engines, the focus stayed on the trigger in Chromium
   * and Firefox and on `<body>` in WebKit, and a menu that opens without a
   * focused command cannot be used from the keyboard at all. The trigger leaves
   * its intent on the element itself — `last` when the user pressed ArrowUp,
   * which the APG asks for and is the only way to reach the end of a long menu
   * in one key — and it is spent here, so the next open starts at the top
   * again. On the element and not in React state: the `toggle` that follows the
   * trigger's `showPopover()` fires BEFORE a re-render, so a state update would
   * be read by a handler still closed over the previous value.
   *
   * On CLOSING, the search. A search does not outlive the menu it was typed
   * into — and closing is not unmounting, the surface stays in the document, so
   * nothing else was ever going to clear it: measured, a quick Escape-and-
   * reopen left the next menu answering to half a word typed at the last one.
   */
  const report = useCallback(
    (open: boolean) => {
      reportOpen?.(open);

      if (!open) {
        typeahead.clear();

        // A SUBMENU hands the focus back itself, which the APG asks for and
        // the platform does not do: measured in Chromium, Gecko and WebKit,
        // closing a NESTED popover drops the focus on `<body>` instead of
        // returning it to the invoker — while a top-level one is returned
        // correctly, so the menu's own Escape needs nothing and only this
        // level does.
        //
        // Not conditioned on where the focus IS: `toggle` arrives before the
        // platform has dropped it, so asking here answers about the frame
        // before — measured, the command was still focused and the repair
        // never ran.
        //
        // Nor on whether the command is still on screen, which an earlier
        // version guarded on at length: when the whole stack goes, the command
        // is inside a closed popover, and focusing an element in a closed
        // popover is a NO-OP — measured in all three engines, the focus stays
        // exactly where the platform put it. The guard could not be given a
        // failing test because there is nothing for it to prevent.
        if (latest.current.nested) latest.current.anchor?.focus();
        return;
      }

      const node = surface.current;
      const at = node?.dataset.openAt;
      if (node) delete node.dataset.openAt;
      // Everything but the way out: a submenu opens on the first thing the
      // user came for, not on the door they came through.
      const all = (items?.items() ?? []).filter((c) => !c.data.back);
      focus(at === 'last' ? last(all) : first(all));
    },
    [reportOpen, items, focus, typeahead],
  );

  useOpenMirror(surface, report);

  /**
   * Back to the menu this one opened from: close a level, and hand the focus to
   * the command that led here. The same thing the inline arrow does — one
   * function, so the row and the key cannot drift apart.
   */
  /**
   * The way back is a COMMAND of this menu, registered like any other, so the
   * arrows reach it where it is drawn — a `role="menuitem"` the arrows skip is
   * exactly what this package refuses elsewhere. Registered unconditionally and
   * ATTACHED only when it is drawn: a part that is not rendered is not a
   * descendant, which is what the visibility filter in `useDescendants` is for.
   */
  const backId = useId();
  const backRef = useDescendant(items ?? emptyDescendants<MenuItemData>(), {
    id: backId,
    back: true,
  });
  const setActiveId = menu?.setActiveId;
  const onBackFocus = useCallback(
    () => setActiveId?.(backId),
    [setActiveId, backId],
  );

  const goBack = useCallback(() => {
    // Only the close. The focus comes back through the mirror above, which is
    // the same path `Escape` and a tap outside take — one mechanism for one
    // outcome, rather than two that happen to agree.
    close?.();
  }, [close]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || !items) return;

      const all = items.items();
      // ONE walk, not two: `indexOf` walks and filters the subtree again, and
      // that filter now resolves a style per node.
      const current = all.findIndex(
        (candidate) => candidate.element === document.activeElement,
      );

      // Hoisted out of the `switch`, and not for taste: a `case` whose value is
      // a conditional expression makes the React Compiler give up on the WHOLE
      // component — `ConditionalExpression cannot be safely reordered`, measured
      // by running the compiler over every source in this package. It was the
      // only file of fifty-nine that did not compile, so the one with the most
      // hooks in the family was also the only one memoizing nothing.
      const backKey = inlineEnd(direction).back;

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
          focus(first(all));
          break;
        case 'End':
          event.preventDefault();
          focus(last(all));
          break;
        case backKey: {
          // BACK, in a submenu only — elsewhere the inline arrows are nobody's
          // and a consumer may want them. One level, like Escape: the command
          // that opened this gets the focus, and the platform's own close
          // would have taken it there anyway.
          //
          // And only when the key was aimed at one of OUR commands: measured, a
          // field a consumer had put inside a submenu could not be walked with
          // the caret — the arrow moved nothing and destroyed the surface. The
          // same guard typing already has, for the same reason.
          // AIMED AT ONE OF OUR COMMANDS, asked FIRST — before the bar rule
          // below, which would otherwise hand the key upward and let the bar
          // take it. Measured: a field a consumer had put inside a menu could
          // not be walked with the caret, the arrow moving nothing and
          // destroying the surface. The bar asks the same question again for
          // the keys that do reach it.
          if (event.target !== event.currentTarget && current < 0) break;
          // On a HORIZONTAL bar this key is the bar's: it walks the commands
          // along it, closing this menu and opening the next — so nothing is
          // done here and nothing is prevented, and the event reaches the bar
          // by bubbling. A submenu, and a menu of a VERTICAL bar, both go back
          // one level the way they came.
          if (!family || family.bar === 'horizontal') break;
          event.preventDefault();
          goBack();
          break;
        }
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

          const match = typeahead.search(event, all, current);
          // Not a search at all — the key belongs to whoever has the focus.
          if (match === undefined) break;

          event.preventDefault();
          // NOT `focus(...)`: that falls back to the surface when there is
          // nothing, and a search that found nothing would then pull the focus
          // off the command the user was on.
          match?.focus();
          break;
        }
      }
    },
    [onKeyDown, items, focus, close, typeahead, direction, family, goBack],
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
      {/* THE WAY BACK, and it exists only where the arrows do not: on a touch
          screen the parent steps aside for the submenu it opened, so without
          this the only way out would be to close the lot. `display: none`
          everywhere else, which is also what keeps it out of the keyboard's
          walk — a part that is not rendered is not a descendant.

          The word on it is the command that opened this menu, read from that
          element rather than passed down: the DOM already holds it, and a copy
          in a context is a copy that can be wrong. */}
      {nested && (
        <button
          type="button"
          role="menuitem"
          ref={backRef}
          className={styles.back}
          tabIndex={menu?.activeId === backId ? 0 : -1}
          data-active={menu?.activeId === backId ? '' : undefined}
          aria-label={t('back', { name: anchorName })}
          onFocus={onBackFocus}
          onClick={goBack}
        >
          <span aria-hidden="true">{direction === 'rtl' ? '›' : '‹'}</span>
          {anchorName}
        </button>
      )}
      {children}
    </div>
  );
}

export { MenuContent };
