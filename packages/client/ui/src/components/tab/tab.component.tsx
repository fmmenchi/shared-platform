import type { FocusEvent, MouseEvent } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import {
  emptyDescendants,
  useDescendant,
} from '../../primitives/use-descendants.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useTabsPart } from '../tabs/tabs.context.js';
import type { TabData } from '../tabs/tabs.context.js';
import { isUsableInId, panelId, tabId } from '../tabs/tabs.ids.js';
import type { TabProps } from './tab.types.js';
import styles from './tab.module.css';

/** One `Tab` outside a family, so the hook order never changes. */
const ORPHAN = emptyDescendants<TabData>();

/**
 * One tab.
 *
 * A `<button type="button">` underneath, because it is a button: it is pressed,
 * it is not a destination, and starting from the element the browser already
 * makes operable is this package's first rule. `role="tab"` replaces what it is
 * announced as, never what it does — and the native button is why Enter AND
 * Space both work with no key handling of our own.
 *
 * ROVING `tabindex`, and it follows the FOCUS rather than the selection.
 * Exactly one tab is in the page's tab order, so Tab enters the list, Tab
 * leaves it, and the arrows move within it — a list of nine tabs is one stop on
 * the way down the page, not nine. Under manual activation the two come apart:
 * arrowing from tab 1 to tab 3 without activating leaves the selection on 1,
 * and a tab stop tracking selection would send the reader back to 1 when they
 * returned, discarding two keystrokes in the one mode meant for panels that
 * cost something.
 *
 * DISABLED IS `aria-disabled`, never the native attribute, which would take the
 * tab out of the focus order and out of the arrows' reach — leaving a reader
 * with no way to learn it is there. It stays focusable and refuses to activate.
 */
function Tab(props: TabProps) {
  const {
    value,
    disabled = false,
    className,
    children,
    onClick,
    onFocus,
    ref,
    ...rest
  } = props;
  const context = useTabsPart('Tab');
  const register = useDescendant(context?.tabs ?? ORPHAN, { value, disabled });

  useDevWarning(
    !isUsableInId(value),
    `Tab: value ${JSON.stringify(value)} cannot be part of an id. \`aria-controls\` is a space-separated list of ids, so a value with whitespace in it points at an element that does not exist.`,
  );
  useDevWarning(
    'id' in rest,
    'Tab: `id` is derived from `value` and cannot be set — the panel points back at it. Anything of yours wired to a hand-written id here would break silently.',
  );

  const selected = context?.value === value;
  const isTabStop = context ? context.tabStop === value : true;

  const activate = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    context?.select(value);
  };

  const took = (event: FocusEvent<HTMLButtonElement>) => {
    onFocus?.(event);
    context?.setTabStop(value);
  };

  return (
    <button
      {...rest}
      ref={mergeRefs(ref, register)}
      type="button"
      role="tab"
      id={context ? tabId(context.baseId, value) : undefined}
      aria-selected={selected}
      // On EVERY tab, not just the selected one, and it always resolves: the
      // panels stay mounted and go `hidden`, so there is no unselected tab
      // pointing at an element that does not exist.
      aria-controls={context ? panelId(context.baseId, value) : undefined}
      aria-disabled={disabled || undefined}
      tabIndex={isTabStop ? 0 : -1}
      data-selected={selected || undefined}
      data-disabled={disabled || undefined}
      onClick={activate}
      onFocus={took}
      className={cn(styles.tab, className)}
    >
      {children}
    </button>
  );
}

export { Tab };
