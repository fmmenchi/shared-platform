import { useCallback, useId, useRef, type KeyboardEvent } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useNavPart } from '../nav/nav.context.js';
import type { NavGroupProps } from './nav-group.types.js';
import styles from './nav-group.module.css';

/**
 * A set of links that opens.
 *
 * A DISCLOSURE, which is the whole pattern: a `<button>` with `aria-expanded`
 * and `aria-controls`, and a list it shows. Nothing here is a `menuitem`, so a
 * screen reader announces "button, collapsed" — which is what it is — instead
 * of announcing a set of links as a set of commands.
 *
 * The button is a real button, so `Enter` and `Space` open it with no handler
 * of ours. What we add is what the pattern asks for and the platform does not:
 * `Escape` closes the group and puts the focus back on the button that opens
 * it, because the focus is somewhere inside the list by then.
 */
function NavGroup(props: NavGroupProps) {
  const { label, children, className, onClick, onKeyDown, ref, ...rest } =
    props;
  const nav = useNavPart('NavGroup');
  const id = useId();
  const listId = `${id}-list`;
  const button = useRef<HTMLButtonElement>(null);

  const open = nav?.open.includes(id) ?? false;
  const toggle = nav?.toggle;
  const close = nav?.close;

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      toggle?.(id);
    },
    [onClick, toggle, id],
  );

  // On the ITEM, not on the button: by the time Escape is pressed the focus is
  // usually on a link inside the list, and a handler on the button would never
  // hear it. The consumer's own `onKeyDown` stays on the button, where they put
  // it, and is not this.
  const handleEscape = useCallback(
    (event: KeyboardEvent<HTMLLIElement>) => {
      if (event.defaultPrevented || event.key !== 'Escape' || !open) return;
      // "If a dropdown is open, closes it and sets focus on the button that
      // controls that dropdown" (APG). The focus is inside the list by now, so
      // nothing else would bring it back.
      event.preventDefault();
      close?.(id);
      button.current?.focus();
    },
    [open, close, id],
  );

  return (
    <li className={styles.item} onKeyDown={handleEscape}>
      <button
        type="button"
        {...rest}
        ref={mergeRefs(button, ref)}
        aria-expanded={open}
        aria-controls={listId}
        onClick={handleClick}
        className={cn(styles.button, className)}
      >
        {label}
      </button>
      {/* Always rendered, hidden when closed: `aria-controls` pointing at an
          element that does not exist yet refers to nothing, and the button
          would announce a relationship it does not have. */}
      <ul id={listId} hidden={!open} className={styles.list}>
        {children}
      </ul>
    </li>
  );
}

export { NavGroup };
