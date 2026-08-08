import { cn } from '../../util/cn.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useTabsPart } from '../tabs/tabs.context.js';
import { panelId, tabId } from '../tabs/tabs.ids.js';
import type { TabPanelProps } from './tab-panel.types.js';
import styles from './tab-panel.module.css';

/**
 * What a tab shows.
 *
 * IT STAYS MOUNTED AND GOES `hidden`, which is the APG's own example and is not
 * the mistake this package made in the page shell. There, two copies of the
 * SAME navigation were rendered and one was hidden — duplicate ids, doubled
 * effects, diverging state. Panels are not copies of each other: they are
 * different content, and keeping them means a half-filled form or a scrolled
 * list survives a trip to another tab and back.
 *
 * It also keeps every `aria-controls` on the tabs resolvable. An unmounted
 * panel leaves each unselected tab pointing at an element that does not exist,
 * which is an invalid reference — one that axe reports and a screen reader
 * simply drops.
 *
 * What that costs, and it is worth knowing: the content of a hidden panel is
 * MOUNTED. If it fetches, it fetches on load, for all of them.
 *
 * `tabIndex=0` because the panel may hold nothing focusable at all, in which
 * case a reader who has just selected a tab has nowhere to move to. The APG
 * makes it CONDITIONAL on that — a panel whose first child is already focusable
 * does not need the stop and is better without it — and no render-time answer
 * to "does this subtree contain a tabbable" exists, so the default is the safe
 * one and it is written BEFORE the spread: pass `tabIndex={-1}` and yours wins.
 */
function TabPanel(props: TabPanelProps) {
  const { value, className, children, ...rest } = props;
  const context = useTabsPart('TabPanel');
  const selected = context?.value === value;

  useDevWarning(
    'id' in rest,
    'TabPanel: `id` is derived from `value` and cannot be set — its tab points at it with `aria-controls`. Anything of yours wired to a hand-written id here would break silently.',
  );
  useDevWarning(
    context != null && !context.hasTab(value),
    `TabPanel: no <Tab value=${JSON.stringify(value)}> to belong to, so its \`aria-labelledby\` points at nothing and it is announced unnamed.`,
  );

  return (
    <div
      tabIndex={0}
      {...rest}
      role="tabpanel"
      id={context ? panelId(context.baseId, value) : undefined}
      aria-labelledby={context ? tabId(context.baseId, value) : undefined}
      hidden={!selected}
      data-selected={selected || undefined}
      className={cn(styles.panel, className)}
    >
      {children}
    </div>
  );
}

export { TabPanel };
