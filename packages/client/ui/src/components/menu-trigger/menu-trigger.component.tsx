import type { ElementType } from 'react';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { Button } from '../button/button.component.js';
import { useMenuPart } from '../menu/menu.context.js';
import type { MenuTriggerProps } from './menu-trigger.types.js';

/**
 * Opens the menu — and there is no handler here to do it: `popovertarget` names
 * the surface and the browser toggles it, so the control works before React has
 * hydrated.
 *
 * `aria-haspopup="menu"` says what will appear and `aria-expanded` says whether
 * it has; both are things the platform keeps and does not expose. Unlike a
 * dialog's trigger this one stays live and reachable while the menu is open, so
 * `aria-expanded` describes something a screen reader user can act on.
 */
function MenuTrigger(props: MenuTriggerProps) {
  const { as, ref, ...rest } = props;
  const Component = (as ?? Button) as ElementType;
  const menu = useMenuPart('MenuTrigger');

  return (
    <Component
      type="button"
      {...rest}
      ref={mergeRefs(menu?.setAnchor, ref)}
      popoverTarget={menu?.surfaceId}
      aria-haspopup="menu"
      aria-controls={menu?.surfaceId}
      aria-expanded={menu?.open ?? false}
    />
  );
}

export { MenuTrigger };
