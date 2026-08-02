import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useAnchored } from '../../primitives/use-anchored.js';
import { useMenuPart } from '../menu/menu.context.js';
import type { MenuItemData } from '../menu/menu.context.js';
import type { Descendant } from '../../primitives/use-descendants.types.js';
import type { MenuContentProps } from './menu-content.types.js';
import styles from './menu-content.module.css';

/** The first item that can actually take the focus, from `from` onwards. */
function enabledFrom(
  items: Descendant<MenuItemData>[],
  from: number,
  step: 1 | -1,
): HTMLElement | null {
  const count = items.length;
  for (let hop = 1; hop <= count; hop += 1) {
    // Wraps, because a menu is a ring: the APG says Down on the last item goes
    // to the first, and a user holding the arrow should never hit a wall.
    const index = (from + hop * step + count * (hop + 1)) % count;
    const candidate = items[index];
    if (candidate && !candidate.data.disabled) return candidate.element;
  }
  return null;
}

/**
 * The surface, and the keyboard contract the platform does not provide.
 *
 * Measured in all three engines: opening with `popovertarget` leaves the focus
 * on the trigger, the arrows do nothing, and `Tab` walks into the items. A menu
 * is ONE tab stop with the arrows moving between items, so all of that is here.
 */
function MenuContent(props: MenuContentProps) {
  const { className, children, ref, onKeyDown, ...rest } = props;
  const menu = useMenuPart('MenuContent');
  const surface = useRef<HTMLDivElement>(null);

  const items = menu?.items;
  const setActiveId = menu?.setActiveId;
  const reportOpen = menu?.reportOpen;
  const close = menu?.close;

  useAnchored(menu?.anchor ?? null, surface, {
    placement: menu?.placement ?? 'bottom-start',
    open: menu?.open ?? false,
    onAnchorLost: useCallback(() => close?.(), [close]),
  });

  const focus = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return;
      setActiveId?.(element.id);
      element.focus();
    },
    [setActiveId],
  );

  useEffect(() => {
    const node = surface.current;
    if (!node || !reportOpen || !items) return;

    const onToggle = (event: Event) => {
      const isOpen =
        (event as Event & { newState?: string }).newState === 'open';
      reportOpen(isOpen);

      // The platform opens the surface and stops there — measured, the focus
      // stayed on the trigger in Chromium and Firefox and on `<body>` in
      // WebKit. A menu that opens without a focused item cannot be used from
      // the keyboard at all.
      if (isOpen) focus(enabledFrom(items.items(), -1, 1));
      else setActiveId?.(null);
    };

    node.addEventListener('toggle', onToggle);
    return () => node.removeEventListener('toggle', onToggle);
  }, [reportOpen, items, focus, setActiveId]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || !items) return;

      const all = items.items();
      const current = items.indexOf(document.activeElement as HTMLElement);

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          focus(enabledFrom(all, current, 1));
          break;
        case 'ArrowUp':
          event.preventDefault();
          focus(enabledFrom(all, current, -1));
          break;
        case 'Home':
          event.preventDefault();
          focus(enabledFrom(all, -1, 1));
          break;
        case 'End':
          event.preventDefault();
          focus(enabledFrom(all, all.length, -1));
          break;
        case 'Tab':
          // A menu is one tab stop: Tab leaves it rather than walking through
          // it, which is what the platform does when nobody intervenes.
          close?.();
          break;
        default:
          break;
      }
    },
    [onKeyDown, items, focus, close],
  );

  return (
    <div
      role="menu"
      aria-labelledby={menu?.anchor?.id || undefined}
      {...rest}
      ref={mergeRefs(surface, items?.rootRef, ref)}
      id={menu?.surfaceId}
      popover="auto"
      onKeyDown={handleKeyDown}
      className={cn(styles.content, className)}
    >
      {children}
    </div>
  );
}

export { MenuContent };
