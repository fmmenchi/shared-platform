import type { KeyboardEvent } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { first, inlineEnd, last, step } from '../../primitives/roving.js';
import { useTabsPart } from '../tabs/tabs.context.js';
import type { TabListProps } from './tab-list.types.js';
import styles from './tab-list.module.css';

/**
 * The tabs, and the keyboard that walks them.
 *
 * A RING, like the menu's: the APG specifies the wrap for both, so holding an
 * arrow never hits a wall. Disabled tabs are walked ONTO rather than over —
 * `aria-disabled` and focusable, the APG's "focusable but cannot be activated"
 * — because inside a `tablist` the reader is in focus mode, and a tab the
 * arrows skip is one they are never told exists.
 *
 * WHICH ARROWS depends on the orientation, and on the writing direction: in a
 * right-to-left page the first tab is on the right, so ArrowLeft moves
 * forward. `inlineEnd` already answers that for the menu and answers it here.
 *
 * IT HOLDS NO STATE AND GUARANTEES NOTHING. "There is always a tab showing" —
 * without which no tab carries `tabindex="0"` and the whole list drops out of
 * the page's tab order — used to be enforced here, by an effect. It is now
 * worked out in render by `Tabs`, from the children: see `tabs.children.ts` for
 * the three ways an effect could not see the thing it was guarding.
 */
function TabList(props: TabListProps) {
  const { className, children, onKeyDown, ref, ...rest } = props;
  const context = useTabsPart('TabList');

  const tabs = context?.tabs;
  const select = context?.select;
  const activation = context?.activation;
  const orientation = context?.orientation ?? 'horizontal';

  useDevWarning(
    context != null && !props['aria-label'] && !props['aria-labelledby'],
    'TabList: give it an `aria-label` (or `aria-labelledby`). A tab list with no accessible name is announced as just "tab list".',
  );

  const onKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !tabs || !select) return;

    const items = tabs.items();
    if (items.length === 0) return;

    const current = document.activeElement as HTMLElement | null;
    const from = tabs.indexOf(current);
    // NOT FROM A TAB, so not ours. `step` reads a negative index as "nowhere
    // yet", which is right for a menu that has just opened and wrong for a
    // handler that catches everything bubbling out of the list: a filter field
    // or an "add tab" button inside the tab list is ordinary, and without this
    // line ArrowLeft in that field moved the focus onto a tab instead of the
    // caret, and Home jumped out of the text entirely.
    if (from < 0) return;

    // READ AT THE KEYSTROKE, not at render: a page can change direction under
    // a component that is already mounted, and this is the only moment the
    // answer is needed.
    const direction =
      getComputedStyle(event.currentTarget).direction === 'rtl' ? 'rtl' : 'ltr';
    const { forward, back } =
      orientation === 'vertical'
        ? { forward: 'ArrowDown', back: 'ArrowUp' }
        : inlineEnd(direction);

    // A SWITCH, and the cases are expressions on purpose: `forward` and `back`
    // are computed from the orientation and the writing direction, and JS
    // compares case labels with `===` like any other value. The nested ternary
    // this replaced said the same thing in a shape nobody reads twice.
    let target: HTMLElement | null = null;
    switch (event.key) {
      case forward:
        target = step(items, from, 1);
        break;
      case back:
        target = step(items, from, -1);
        break;
      case 'Home':
        target = first(items);
        break;
      case 'End':
        target = last(items);
        break;
      default:
        return;
    }

    if (!target) return;
    // Ours now: the arrows would otherwise also scroll the page, and Home/End
    // would jump the document out from under the reader.
    event.preventDefault();
    target.focus();

    if (activation !== 'automatic') return;
    const data = items.find((item) => item.element === target)?.data;
    // Focus moved, selection did not. A disabled tab is reachable so it can be
    // known about; selecting it would show a panel the product has said is not
    // available.
    if (data && !data.disabled) select(data.value);
  };

  return (
    <div
      {...rest}
      ref={mergeRefs(ref, tabs?.rootRef)}
      role="tablist"
      // Only when vertical: `horizontal` is the default for a tablist, and
      // stating a default is a second place for it to be wrong.
      aria-orientation={orientation === 'vertical' ? 'vertical' : undefined}
      data-orientation={orientation}
      onKeyDown={onKeys}
      className={cn(styles.list, className)}
    >
      {children}
    </div>
  );
}

export { TabList };
