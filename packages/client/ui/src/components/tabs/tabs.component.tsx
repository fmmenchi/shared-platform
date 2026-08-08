import { useId, useMemo } from 'react';
import { cn } from '../../util/cn.js';
import { useControlled } from '../../primitives/use-controlled.js';
import { useDescendants } from '../../primitives/use-descendants.js';
import { TabsContext } from './tabs.context.js';
import type { TabData, TabsContextValue } from './tabs.context.js';
import type { TabsProps } from './tabs.types.js';
import styles from './tabs.module.css';

/**
 * One panel at a time, chosen from a list of tabs.
 *
 * THE FIRST COMPONENT HERE WITH NO NATIVE SHELL. Everything else in this
 * package starts from an element the browser already implements — `<dialog>`,
 * `<details>`, `<select>` — and adds what is missing. HTML has nothing for
 * this, so the roles, the keyboard and the roving `tabindex` are all ours,
 * which is exactly why they are assembled from primitives that already exist
 * rather than written again: `useDescendants` for tree order, `useControlled`
 * for the value, `step`/`first`/`last` for the ring.
 *
 * THE VALUE IS OURS TO HOLD, and that is not the contradiction it looks like
 * next to this package's rule that the DOM keeps the state of controls it
 * draws. The rule is about controls the BROWSER paints — a checkbox's
 * `checked` survives `form.reset()` only because the DOM owns it. Nothing here
 * is painted by the browser, so there is no second copy to disagree with.
 *
 * PAIRED BY VALUE, not by position. A tab points at its panel with
 * `aria-controls` and the panel points back with `aria-labelledby`, and both
 * ids are derived from the value — so the panels can live anywhere in the tree,
 * in any order, and reordering the tabs cannot mispair them.
 */
function Tabs(props: TabsProps) {
  const {
    value: controlled,
    defaultValue,
    onValueChange,
    orientation = 'horizontal',
    activation = 'automatic',
    className,
    children,
    ...rest
  } = props;

  const [value, select] = useControlled<string | undefined>({
    value: controlled,
    defaultValue,
    onChange: onValueChange as
      ((value: string | undefined) => void) | undefined,
    name: 'Tabs',
  });

  const baseId = useId();
  const tabs = useDescendants<TabData>();

  const context = useMemo<TabsContextValue>(
    () => ({
      value,
      select: select as (value: string) => void,
      orientation,
      activation,
      baseId,
      tabs,
    }),
    [value, select, orientation, activation, baseId, tabs],
  );

  return (
    <TabsContext.Provider value={context}>
      <div
        {...rest}
        // The hook a consumer's own stylesheet can read, on the element they
        // were given — a hashed class from this file could not be named from
        // theirs.
        data-orientation={orientation}
        className={cn(styles.tabs, className)}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export { Tabs };
