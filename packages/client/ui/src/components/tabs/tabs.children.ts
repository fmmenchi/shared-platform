import { Children, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Tab } from '../tab/tab.component.js';
import type { TabProps } from '../tab/tab.types.js';

/** What a tab is, read from the element rather than from the DOM. */
export interface KnownTab {
  value: string;
  disabled: boolean;
}

/**
 * The tabs, READ IN RENDER from the elements the caller wrote.
 *
 * The first version asked the DOM instead, in an effect, and three reviews
 * measured what that cost. The invariant it guarded — there is always a
 * selected tab, or the whole list drops out of the page's tab order — was
 * enforced by a `useEffect` whose dependency list structurally cannot observe
 * the thing it guards:
 *
 *   - a `Tabs` inside a NON-SELECTED `TabPanel` mounts with no visible
 *     descendants at all (the registry filters on `checkVisibility()`), the
 *     effect bailed, and nothing ever re-ran it — so opening the outer tab
 *     revealed an inner list with no selection and no way in from the keyboard.
 *     Nested tabs are only possible BECAUSE the panels stay mounted, so the
 *     component's own headline decision produced its worst failure;
 *   - a tab unmounting changes neither the registry handle nor the value nor
 *     the setter, so the effect could not see the selected tab leave;
 *   - and how often it ran at all depended on whether the CALLER had inlined
 *     `onValueChange`, since an inline arrow gives the setter a new identity
 *     every render. The same code was correct or broken according to a
 *     stylistic choice made in somebody else's file.
 *
 * Reading the children answers all three at once, before the first paint and on
 * the server, with no effect, no dependency array and no possibility of a loop.
 * The price is the one this package has already paid twice — in the Card's
 * slots and in `AppLayoutNav`'s — that a `Tab` rendered by a component of your
 * own is a `Tab` this cannot see. Fragments and plain elements are walked
 * through, which covers everything short of that.
 */
export function readTabs(
  children: ReactNode,
  into: KnownTab[] = [],
): KnownTab[] {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;

    if (child.type === Tab) {
      const { value, disabled = false } = (child as ReactElement<TabProps>)
        .props;
      into.push({ value, disabled });
      return;
    }

    const { children: nested } = (
      child as ReactElement<{ children?: ReactNode }>
    ).props;
    if (nested !== undefined) readTabs(nested, into);
  });

  return into;
}

/**
 * The tab that should be SHOWING — the first one that can actually be used.
 *
 * `undefined` when every tab is disabled, and that is the point: showing the
 * panel of a tab the product has marked unavailable is the opposite of what it
 * asked for. The list stays reachable anyway, because the tab STOP is a
 * separate question — see `firstTab`.
 */
export function fallbackTab(known: KnownTab[]): KnownTab | undefined {
  return known.find((tab) => !tab.disabled);
}

/**
 * The tab that should carry `tabindex="0"` when none is showing.
 *
 * Disabled or not: something has to be in the page's tab order or the whole
 * list is unreachable by Tab, and being focusable has never meant being
 * selected — this component's whole position on disabled tabs is that they are
 * reachable precisely so a reader can learn they exist.
 */
export function firstTab(known: KnownTab[]): KnownTab | undefined {
  return known[0];
}
