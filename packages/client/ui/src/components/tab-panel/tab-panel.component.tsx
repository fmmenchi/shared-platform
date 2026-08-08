import { cn } from '../../util/cn.js';
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
 * which is an invalid reference — and one that axe reports and a screen reader
 * simply drops.
 *
 * What that costs, and it is worth knowing: the content of a hidden panel is
 * MOUNTED. If it fetches, it fetches on load, for all of them.
 *
 * `tabIndex=0` because the panel is what the tab controls and it may hold no
 * focusable content at all — in which case a reader who has selected a tab has
 * nothing to move to. The APG's example does the same on every panel.
 */
function TabPanel(props: TabPanelProps) {
  const { value, className, children, ...rest } = props;
  const context = useTabsPart('TabPanel');
  const selected = context?.value === value;

  return (
    <div
      {...rest}
      role="tabpanel"
      id={context ? panelId(context.baseId, value) : undefined}
      aria-labelledby={context ? tabId(context.baseId, value) : undefined}
      hidden={!selected}
      tabIndex={0}
      data-selected={selected || undefined}
      className={cn(styles.panel, className)}
    >
      {children}
    </div>
  );
}

export { TabPanel };
