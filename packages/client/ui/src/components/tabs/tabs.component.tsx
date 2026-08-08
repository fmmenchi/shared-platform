import { useId, useState } from 'react';
import { cn } from '../../util/cn.js';
import { useControlled } from '../../primitives/use-controlled.js';
import { useDescendants } from '../../primitives/use-descendants.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { TabsContext } from './tabs.context.js';
import type { TabData, TabsContextValue } from './tabs.context.js';
import { fallbackTab, firstTab, readTabs } from './tabs.children.js';
import type { TabsProps } from './tabs.types.js';
import styles from './tabs.module.css';

/**
 * One panel at a time, chosen from a list of tabs.
 *
 * THE FIRST COMPONENT HERE WITH NO NATIVE SHELL. Everything else in this
 * package starts from an element the browser already implements — `<dialog>`,
 * `<details>`, `<select>` — and adds what is missing. HTML has nothing for
 * this, so the roles, the keyboard and the roving `tabindex` are all ours,
 * which is why they are assembled from primitives that already exist rather
 * than written again: `useDescendants` for tree order, `useControlled` for the
 * value, `step`/`first`/`last`/`inlineEnd` for the ring.
 *
 * THE VALUE IS OURS TO HOLD, and that is not the contradiction it looks like
 * next to this package's rule that the DOM keeps the state of controls it
 * draws. The rule is about controls the BROWSER paints — a checkbox's
 * `checked` survives `form.reset()` only because the DOM owns it. Nothing here
 * is painted by the browser, so there is no second copy to disagree with.
 *
 * THERE IS ALWAYS A TAB SHOWING, and it is worked out IN RENDER by reading the
 * children — see `tabs.children.ts` for the three ways the effect this replaced
 * could not see the thing it was guarding. The fallback is presentation only:
 * it is never announced through `onValueChange`, so an uncontrolled list does
 * not fire a change nobody made, and a controlled one is never told its own
 * state is something else.
 *
 * PAIRED BY VALUE, not by position. A tab points at its panel with
 * `aria-controls` and the panel points back with `aria-labelledby`, and both
 * ids are derived from the value — so the panels can be reordered among
 * themselves and reordering the tabs cannot mispair them. They must still
 * FOLLOW the tab list in the DOM: `aria-controls` moves no focus in any
 * browser, so Tab from a tab lands on whatever comes next in the document.
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

  const [value, setValue] = useControlled<string | undefined>({
    value: controlled,
    defaultValue,
    onChange: onValueChange as
      ((value: string | undefined) => void) | undefined,
    name: 'Tabs',
  });

  const known = readTabs(children);
  const matched = known.some((tab) => tab.value === value);
  // SHOWING and TAB STOP are two questions. With every tab disabled there is
  // nothing to show — a product that marked them all unavailable should not
  // find one of those panels open — but something must still hold
  // `tabindex="0"`, or the list drops out of the page's tab order entirely.
  const showing = matched ? value : fallbackTab(known)?.value;

  useDevWarning(
    value !== undefined && !matched && known.length > 0,
    `Tabs: value ${JSON.stringify(value)} names no tab, so the first usable one is showing instead. Left as it is, no tab would carry \`tabindex="0"\` and the whole list would be unreachable by Tab.`,
  );

  // The FOCUSED tab, which under manual activation is not the selected one.
  // Kept honest against the children on every render, so a tab that unmounts
  // cannot take the list's only tab stop with it.
  const [focused, setFocused] = useState<string | undefined>(undefined);
  const tabStop =
    focused !== undefined && known.some((tab) => tab.value === focused)
      ? focused
      : (showing ?? firstTab(known)?.value);

  // NO HAND-MEMOIZATION, which is this package's rule and here also the only
  // workable answer: `known` is a fresh array every render, so a dependency
  // list naming it would memoize nothing while telling the React Compiler it
  // had — which is exactly what it refused to compile ("existing memoization
  // could not be preserved"). Left plain, the compiler keys the whole context
  // on `children` and the handful of scalars, which is the honest dependency.
  const select = (next: string) => {
    // Focusable so it can be known about, never selectable: showing the panel
    // of a tab the product has marked unavailable is the opposite of what it
    // asked for.
    if (known.some((tab) => tab.value === next && tab.disabled)) return;
    setValue(next);
  };

  const hasTab = (candidate: string) =>
    known.some((tab) => tab.value === candidate);

  const baseId = useId();
  const tabs = useDescendants<TabData>();

  const context: TabsContextValue = {
    value: showing,
    select,
    tabStop,
    setTabStop: setFocused,
    hasTab,
    orientation,
    activation,
    baseId,
    tabs,
  };

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
