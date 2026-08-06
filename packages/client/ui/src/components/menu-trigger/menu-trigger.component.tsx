import {
  useCallback,
  useId,
  type ElementType,
  type KeyboardEvent,
} from 'react';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { Button } from '../button/button.component.js';
import { useMenuPart } from '../menu/menu.context.js';
import type { MenuTriggerProps } from './menu-trigger.types.js';

/**
 * Opens the menu. `popovertarget` names the surface and the browser toggles it,
 * so a click works before React has hydrated and there is no handler for it.
 *
 * The ARROWS are ours, because the platform has none: the APG asks that Down
 * opens at the first command and Up at the LAST, which is the only way to reach
 * the end of a long menu in one key.
 *
 * `aria-haspopup="menu"` says what will appear and `aria-expanded` whether it
 * has — both things the platform keeps and does not expose. There is
 * deliberately no `aria-controls`: the pattern does not ask for it, and the DOM
 * adjacency it prescribes — the surface is the trigger's next sibling — already
 * carries the association. (An earlier note here blamed axe for being unable to
 * verify it; that was wrong, `aria-valid-attr-value` exempts a hidden target
 * when the element carries `aria-expanded`. The conclusion stood on the wrong
 * reason.)
 */
function MenuTrigger(props: MenuTriggerProps) {
  const { as, ref, onKeyDown, ...rest } = props;
  const Component = (as ?? Button) as ElementType;
  const menu = useMenuPart('MenuTrigger');
  const id = useId();

  const surfaceId = menu?.surfaceId;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

      event.preventDefault();
      const surface = surfaceId ? document.getElementById(surfaceId) : null;
      if (!surface) return;

      // Written ON THE SURFACE, not into React state: the `toggle` that follows
      // fires before a re-render, so a state update here would be read by a
      // handler still closed over the previous value — measured, ArrowUp opened
      // at the first command instead of the last. The DOM is the one place both
      // sides can see immediately.
      surface.dataset.openAt = event.key === 'ArrowUp' ? 'last' : 'first';
      surface.showPopover();
    },
    [onKeyDown, surfaceId],
  );

  return (
    <Component
      type="button"
      {...rest}
      ref={mergeRefs(menu?.setAnchor, ref)}
      id={id}
      popoverTarget={surfaceId}
      aria-haspopup="menu"
      aria-expanded={menu?.open ?? false}
      onKeyDown={handleKeyDown}
    />
  );
}

export { MenuTrigger };
