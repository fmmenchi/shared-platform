import type { MouseEvent } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useDescendant } from '../../primitives/use-descendants.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useTabsPart } from '../tabs/tabs.context.js';
import { isUsableInId, panelId, tabId } from '../tabs/tabs.ids.js';
import type { TabProps } from './tab.types.js';
import styles from './tab.module.css';

/**
 * One tab.
 *
 * A `<button type="button">` underneath, because it is a button: it is pressed,
 * it is not a destination, and starting from the element the browser already
 * makes operable is this package's first rule. `role="tab"` replaces what it is
 * announced as, never what it does.
 *
 * ROVING `tabindex`. Exactly one tab is in the page's tab order — the selected
 * one — so Tab enters the list, Tab leaves it, and the arrows move within it.
 * That is the pattern's whole point: a list of nine tabs is one stop on the way
 * down the page, not nine.
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
    ref,
    ...rest
  } = props;
  const context = useTabsPart('Tab');
  const register = useDescendant(context?.tabs ?? EMPTY, { value, disabled });

  useDevWarning(
    !isUsableInId(value),
    `Tab: value ${JSON.stringify(value)} cannot be part of an id. \`aria-controls\` is a space-separated list of ids, so a value with whitespace in it points at an element that does not exist.`,
  );

  const selected = context?.value === value;

  const activate = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (disabled) return;
    context?.select(value);
  };

  return (
    <button
      {...rest}
      ref={mergeRefs(ref, register)}
      type="button"
      role="tab"
      id={context ? tabId(context.baseId, value) : undefined}
      aria-selected={selected}
      // Only the selected tab's panel is on the page's own terms; the others
      // are `hidden`, which is what keeps every one of these references
      // resolvable.
      aria-controls={context ? panelId(context.baseId, value) : undefined}
      aria-disabled={disabled || undefined}
      tabIndex={selected ? 0 : -1}
      data-selected={selected || undefined}
      data-disabled={disabled || undefined}
      onClick={activate}
      className={cn(styles.tab, className)}
    >
      {children}
    </button>
  );
}

/**
 * A family for a `Tab` that has none, so the hook order never changes. The
 * orphan itself is reported by `useTabsPart`; this only keeps the render from
 * throwing on the way to that warning.
 */
const EMPTY = {
  rootRef: () => undefined,
  items: () => [],
  indexOf: () => -1,
  registry: {
    add: () => undefined,
    update: () => undefined,
    remove: () => undefined,
  },
};

export { Tab };
