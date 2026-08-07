import { useCallback, useId, useRef, useState, type MouseEvent } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useAnchored } from '../../primitives/use-anchored.js';
import { useOpenMirror } from '../../primitives/use-open-mirror.js';
import { useNavPart } from '../nav/nav.context.js';
import type { NavGroupProps } from './nav-group.types.js';
import styles from './nav-group.module.css';

/**
 * A set of links that opens.
 *
 * A DISCLOSURE, which is the whole pattern: a `<button>` with `aria-expanded`
 * and `aria-controls`, and a list it shows. Nothing here is a `menuitem`, so a
 * screen reader announces "button, collapsed" — which is what it is — instead
 * of announcing a set of links as a set of commands. The button is a real
 * button, so `Enter` and `Space` open it with no handler of ours.
 *
 * TWO FORMS, and they are not one mechanism with two skins.
 *
 * In a BAR the list is a surface over the page, so it is a `popover` and the
 * platform owns it. That is not a preference: measured in this package's own
 * browser, the hand-rolled version could not be closed AT ALL on Safari and
 * Firefox, because neither focuses a `<button>` on click, and a focus-out
 * handler is the only thing that was listening. The popover answers the same
 * four questions with nothing of ours running — a click outside dismisses it,
 * `Escape` dismisses it from anywhere including `<body>`, opening another
 * closes this one, and the invoker opens it before React has hydrated.
 *
 * In a SIDEBAR the list is part of the page: it opens in place, indented, and
 * nothing about it is transient. So it is `hidden` and a `useState`, and it
 * takes no `Escape` — a section of a page has no business swallowing the key
 * that closes the dialog it might be sitting in.
 */
function NavGroup(props: NavGroupProps) {
  // `onKeyDown` is deliberately NOT among these: it belongs to the consumer and
  // rides `...rest` onto the button. An earlier version destructured it out and
  // then never re-attached it, while the comment claimed the opposite — a prop
  // that typechecked, autocompleted, and silently did nothing.
  const { label, children, className, onClick, ref, ...rest } = props;
  const nav = useNavPart('NavGroup');
  const flyout = nav?.orientation === 'horizontal';

  const id = useId();
  const listId = `${id}-list`;
  const list = useRef<HTMLUListElement>(null);
  // STATE and not a ref: the anchor is what the geometry measures against, and
  // a ref would not report a new one.
  const [button, setButton] = useState<HTMLButtonElement | null>(null);

  // Two forms, two owners. The flyout's open-ness belongs to the platform and
  // this only mirrors it; the sidebar's has no platform fact behind it, so it
  // is held here.
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [inPlaceOpen, setInPlaceOpen] = useState(false);
  const open = flyout ? flyoutOpen : inPlaceOpen;

  // Which also covers the orientation CHANGING under an open flyout —
  // `orientation={wide ? 'horizontal' : 'vertical'}` being the obvious thing to
  // do with the prop. Measured rather than assumed: taking the `popover`
  // attribute off an open popover fires `toggle` with `closed`, so the mirror
  // hears it like any other close and the reconciliation this component was
  // about to grow is not needed.
  useOpenMirror(list, setFlyoutOpen);

  useAnchored(button, list, {
    placement: 'bottom-start',
    open: flyoutOpen,
    // The button gone from under an open flyout — a responsive bar collapsing,
    // a group unmounting — leaves a surface anchored to nothing.
    onAnchorLost: useCallback(() => list.current?.hidePopover(), []),
  });

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      // In a bar the click is the platform's — `popovertarget` toggles the
      // surface — so there is nothing here to do and nothing to undo.
      if (event.defaultPrevented || flyout) return;
      setInPlaceOpen((current) => !current);
    },
    [onClick, flyout],
  );

  // A DESTINATION CHOSEN closes the flyout. Nothing else would: a click INSIDE
  // a popover is not a light dismiss, and now that the router arrives through
  // the `Link` port the page does not unload either — so the panel would stay
  // open over the page it just navigated to. The sidebar keeps its section
  // open, which is the point of a sidebar.
  const handleListClick = useCallback((event: MouseEvent<HTMLUListElement>) => {
    if (!(event.target as Element).closest('a')) return;
    event.currentTarget.hidePopover();
  }, []);

  return (
    // Its own copy of the orientation, because this file's stylesheet cannot
    // select on `Nav`'s hashed class and must not select on a bare
    // `[data-orientation]`: that attribute is the convention for Tabs, Slider
    // and ToggleGroup across most component libraries, and this package is
    // published into pages that contain them.
    // Outside a `Nav` — which warns, and does not crash — it reads as the
    // sidebar form: a disclosure that works and looks like something, rather
    // than an unstyled button whose list appears with no indent to say what it
    // belongs to.
    <li
      className={styles.item}
      data-orientation={nav?.orientation ?? 'vertical'}
    >
      <button
        type="button"
        {...rest}
        ref={mergeRefs(setButton, ref)}
        // AFTER the spread: these are the disclosure contract, not opinions.
        aria-expanded={open}
        aria-controls={listId}
        popoverTarget={flyout ? listId : undefined}
        onClick={handleClick}
        className={cn(styles.button, className)}
      >
        {label}
      </button>
      {/* Always rendered, hidden when closed: `aria-controls` pointing at an
          element that does not exist yet refers to nothing, and the button
          would announce a relationship it does not have.

          `hidden` only in the sidebar — a popover is hidden by BEING closed,
          and `hidden` on one would fight the platform for the same display. */}
      <ul
        id={listId}
        ref={list}
        popover={flyout ? 'auto' : undefined}
        hidden={flyout ? undefined : !open}
        onClick={flyout ? handleListClick : undefined}
        className={styles.list}
      >
        {children}
      </ul>
    </li>
  );
}

export { NavGroup };
