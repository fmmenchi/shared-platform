import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Tabs } from './tabs.component.js';
import { TabList } from '../tab-list/tab-list.component.js';
import { Tab } from '../tab/tab.component.js';
import { TabPanel } from '../tab-panel/tab-panel.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * The first component in this package with no native shell, so the roles, the
 * keyboard and the roving `tabindex` are all ours and all have to be proved.
 *
 * Two things here are not behaviour a query can see and are asserted anyway:
 * that exactly ONE tab is in the page's tab order, which is the whole point of
 * the pattern, and that every `aria-controls` resolves — an unmounted panel
 * leaves each unselected tab pointing at nothing, which axe reports and a
 * screen reader silently drops.
 */
const three = (props: Partial<React.ComponentProps<typeof Tabs>> = {}) => (
  <Tabs {...props}>
    <TabList aria-label="Sections">
      <Tab value="overview">Overview</Tab>
      <Tab value="usage">Usage</Tab>
      <Tab value="api">API</Tab>
    </TabList>
    <TabPanel value="overview">What it is</TabPanel>
    <TabPanel value="usage">How to use it</TabPanel>
    <TabPanel value="api">Every prop</TabPanel>
  </Tabs>
);

const tab = (name: string) => screen.getByRole('tab', { name });

/** The panels, `hidden` ones included — `getByRole` cannot see those. */
const panels = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[role="tabpanel"]'));

describe('Tabs', () => {
  it('renders the roles, and names the list', async () => {
    render(three());

    const list = screen.getByRole('tablist', { name: 'Sections' });
    expect(list).toBeInTheDocument();
    // ABSENT, not `"horizontal"`. That is the default for a tablist, and
    // stating a default is a second place for it to be wrong — a claim only a
    // test of the horizontal case can keep.
    expect(list).not.toHaveAttribute('aria-orientation');
    expect(list).toHaveAttribute('data-orientation', 'horizontal');
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    // One panel in the a11y tree: the others are `hidden`, which takes them out
    // of it. Three exist in the DOM.
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(panels()).toHaveLength(3);
  });

  it('selects the first tab when nothing says otherwise', async () => {
    render(three());

    // A tab list with no selection has no tab at `tabindex="0"`, so the whole
    // list is unreachable by Tab. The roving pattern's own failure mode, and
    // the reason this is guaranteed rather than left to the caller.
    await waitFor(() =>
      expect(tab('Overview')).toHaveAttribute('aria-selected', 'true'),
    );
    expect(screen.getByRole('tabpanel')).toHaveTextContent('What it is');
  });

  it('honours defaultValue, and reports changes', async () => {
    const onValueChange = vi.fn();
    render(three({ defaultValue: 'usage', onValueChange }));

    await waitFor(() =>
      expect(tab('Usage')).toHaveAttribute('aria-selected', 'true'),
    );

    await browser.click(tab('API'));
    expect(onValueChange).toHaveBeenCalledWith('api');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Every prop');
  });

  it('keeps exactly one tab in the page’s tab order', async () => {
    render(
      <>
        <button type="button">Before</button>
        {three()}
        <button type="button">After</button>
      </>,
    );
    await waitFor(() =>
      expect(tab('Overview')).toHaveAttribute('tabindex', '0'),
    );

    expect(tab('Usage')).toHaveAttribute('tabindex', '-1');
    expect(tab('API')).toHaveAttribute('tabindex', '-1');

    // Tab ENTERS the list and Tab LEAVES it: nine tabs are one stop on the way
    // down a page, not nine. The panel is the next stop because it takes the
    // focus itself.
    screen.getByRole('button', { name: 'Before' }).focus();
    await browser.keyboard('{Tab}');
    expect(document.activeElement).toBe(tab('Overview'));
    await browser.keyboard('{Tab}');
    expect(document.activeElement).toBe(screen.getByRole('tabpanel'));
    await browser.keyboard('{Tab}');
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'After' }),
    );
  });

  it('walks the ring with the arrows, and selects as it goes', async () => {
    render(three());
    await waitFor(() =>
      expect(tab('Overview')).toHaveAttribute('tabindex', '0'),
    );
    tab('Overview').focus();

    await browser.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(tab('Usage'));
    // `automatic`, the APG's recommendation: the reader hears each panel as
    // they reach it, with no second keystroke.
    expect(tab('Usage')).toHaveAttribute('aria-selected', 'true');

    await browser.keyboard('{ArrowRight}');
    await browser.keyboard('{ArrowRight}');
    // A RING. Right on the last goes to the first, so holding the key never
    // hits a wall.
    expect(document.activeElement).toBe(tab('Overview'));

    await browser.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(tab('API'));

    await browser.keyboard('{Home}');
    expect(document.activeElement).toBe(tab('Overview'));
    await browser.keyboard('{End}');
    expect(document.activeElement).toBe(tab('API'));
  });

  it('moves the focus without selecting when activation is manual', async () => {
    render(three({ activation: 'manual' }));
    await waitFor(() =>
      expect(tab('Overview')).toHaveAttribute('tabindex', '0'),
    );
    tab('Overview').focus();

    await browser.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(tab('Usage'));
    // For panels that cost something to show: selecting six on the way to the
    // seventh is the wrong thing to do to someone driving with the keyboard.
    expect(tab('Usage')).toHaveAttribute('aria-selected', 'false');
    expect(tab('Overview')).toHaveAttribute('aria-selected', 'true');

    await browser.keyboard('{Enter}');
    expect(tab('Usage')).toHaveAttribute('aria-selected', 'true');
  });

  it('walks ONTO a disabled tab and refuses to select it', async () => {
    render(
      <Tabs>
        <TabList aria-label="Sections">
          <Tab value="overview">Overview</Tab>
          <Tab value="usage" disabled>
            Usage
          </Tab>
          <Tab value="api">API</Tab>
        </TabList>
        <TabPanel value="overview">What it is</TabPanel>
        <TabPanel value="usage">How to use it</TabPanel>
        <TabPanel value="api">Every prop</TabPanel>
      </Tabs>,
    );
    await waitFor(() =>
      expect(tab('Overview')).toHaveAttribute('tabindex', '0'),
    );
    tab('Overview').focus();

    await browser.keyboard('{ArrowRight}');
    // The APG's "focusable but cannot be activated". A tab the arrows skip is
    // one its user is never told exists — and the native `disabled` attribute
    // would have skipped it.
    expect(document.activeElement).toBe(tab('Usage'));
    expect(tab('Usage')).toHaveAttribute('aria-disabled', 'true');
    expect(tab('Usage')).toHaveAttribute('aria-selected', 'false');
    expect(tab('Overview')).toHaveAttribute('aria-selected', 'true');

    // A DOM click rather than a driven one, and the reason is itself evidence:
    // Playwright refuses to click an `aria-disabled` element at all, so a
    // driven click here waits out its timeout. This still goes through React's
    // handler, which is the guard being tested.
    //
    // THE WAIT IS THE TEST. A raw `.click()` is not awaited, so an assertion on
    // the next line runs before React has re-rendered — measured by a reviewer:
    // clicking an ENABLED tab and asserting `aria-selected="false"` on the
    // following line also passes. Both assertions here were hollow, and would
    // have held with the guard deleted, with `select` deleted, with the whole
    // component inert. Clicking the ENABLED neighbour first proves the wait is
    // long enough to have seen a change if there had been one.
    tab('API').click();
    await waitFor(() =>
      expect(tab('API')).toHaveAttribute('aria-selected', 'true'),
    );

    tab('Usage').click();
    await waitFor(() =>
      expect(tab('API')).toHaveAttribute('aria-selected', 'true'),
    );
    expect(tab('Usage')).toHaveAttribute('aria-selected', 'false');
  });

  it('wires every tab to a panel that exists', async () => {
    render(three());
    await waitFor(() =>
      expect(tab('Overview')).toHaveAttribute('tabindex', '0'),
    );

    for (const name of ['Overview', 'Usage', 'API']) {
      const control = tab(name).getAttribute('aria-controls');
      expect(control).toBeTruthy();
      // EVERY tab, not just the selected one. Unmounting the inactive panels
      // would leave two of these three pointing at nothing — an invalid
      // reference that axe reports and a screen reader drops in silence.
      const panel = document.getElementById(control as string);
      expect(panel).not.toBeNull();
      expect(panel).toHaveAttribute('role', 'tabpanel');
      expect(panel?.getAttribute('aria-labelledby')).toBe(tab(name).id);
    }
  });

  it('keeps a hidden panel’s state, because it stays mounted', async () => {
    render(
      <Tabs>
        <TabList aria-label="Sections">
          <Tab value="a">A</Tab>
          <Tab value="b">B</Tab>
        </TabList>
        <TabPanel value="a">
          <input aria-label="Note" defaultValue="" />
        </TabPanel>
        <TabPanel value="b">Second</TabPanel>
      </Tabs>,
    );
    await waitFor(() => expect(tab('A')).toHaveAttribute('tabindex', '0'));

    const note = screen.getByLabelText('Note');
    await browser.fill(note, 'half written');

    await browser.click(tab('B'));
    await browser.click(tab('A'));
    // A half-filled form surviving a trip to another tab and back is the reason
    // the panels are hidden rather than unmounted.
    expect(screen.getByLabelText('Note')).toHaveValue('half written');
  });

  it('is driveable as a controlled component', async () => {
    function Controlled() {
      const [value, setValue] = useState('usage');
      return (
        <>
          <button type="button" onClick={() => setValue('api')}>
            Jump to API
          </button>
          {three({ value, onValueChange: setValue })}
        </>
      );
    }
    render(<Controlled />);

    await waitFor(() =>
      expect(tab('Usage')).toHaveAttribute('aria-selected', 'true'),
    );
    await browser.click(screen.getByRole('button', { name: 'Jump to API' }));
    expect(tab('API')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Every prop');
  });

  it('mirrors the arrows in a right-to-left page', async () => {
    renderUi(three(), { locale: 'ar' });
    await waitFor(() =>
      expect(tab('Overview')).toHaveAttribute('tabindex', '0'),
    );
    tab('Overview').focus();

    // The first tab is on the RIGHT, so ArrowLeft moves forward. Reading the
    // direction at the keystroke rather than at render is what lets a page
    // change it under a mounted component.
    await browser.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(tab('Usage'));
    await browser.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(tab('Overview'));
  });

  it('takes the other arrows when it runs vertically', async () => {
    render(three({ orientation: 'vertical' }));
    await waitFor(() =>
      expect(tab('Overview')).toHaveAttribute('tabindex', '0'),
    );
    tab('Overview').focus();

    expect(screen.getByRole('tablist')).toHaveAttribute(
      'aria-orientation',
      'vertical',
    );
    await browser.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(tab('Usage'));
    await browser.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(tab('Overview'));
  });

  it('says so when a value cannot be part of an id', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Tabs>
        <TabList aria-label="Sections">
          <Tab value="two words">Two words</Tab>
        </TabList>
        <TabPanel value="two words">Content</TabPanel>
      </Tabs>,
    );

    // `aria-controls` is a space-separated list of ids, so this does not make a
    // broken reference — it makes two, one of them to nothing at all.
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('cannot be part of an id'),
      ),
    );
    warn.mockRestore();
  });

  it('has no a11y violations, horizontal and vertical', async () => {
    const { container, rerender } = render(three());
    await waitFor(() =>
      expect(tab('Overview')).toHaveAttribute('tabindex', '0'),
    );
    await expectNoA11yViolations(container);

    rerender(three({ orientation: 'vertical' }));
    await expectNoA11yViolations(container);
  });
});

/**
 * WHAT THREE ADVERSARIAL REVIEWS FOUND, and what the fixes have to keep true.
 *
 * Every test here failed — or could not have been written — against the version
 * that enforced "there is always a selection" in a `useEffect`.
 */
describe('Tabs, after the reviews', () => {
  it('gives a NESTED tab list a selection, though it mounts inside a hidden panel', async () => {
    render(
      <Tabs>
        <TabList aria-label="Outer">
          <Tab value="first">First</Tab>
          <Tab value="second">Second</Tab>
        </TabList>
        <TabPanel value="first">Plain</TabPanel>
        <TabPanel value="second">
          <Tabs>
            <TabList aria-label="Inner">
              <Tab value="alpha">Alpha</Tab>
              <Tab value="beta">Beta</Tab>
            </TabList>
            <TabPanel value="alpha">Alpha panel</TabPanel>
            <TabPanel value="beta">Beta panel</TabPanel>
          </Tabs>
        </TabPanel>
      </Tabs>,
    );

    // The inner list mounts inside a `display: none` panel, so it has NO
    // visible descendants — the registry filters on `checkVisibility()`. The
    // effect that used to guarantee a selection bailed there and never ran
    // again, so opening the outer tab revealed a list with nothing selected and
    // no way in from the keyboard. Nested tabs are only possible BECAUSE the
    // panels stay mounted, so the headline decision produced the worst failure.
    await browser.click(tab('Second'));

    await waitFor(() =>
      expect(tab('Alpha')).toHaveAttribute('aria-selected', 'true'),
    );
    expect(tab('Alpha')).toHaveAttribute('tabindex', '0');
    expect(screen.getByText('Alpha panel')).toBeVisible();
  });

  it('keeps a tab stop when the selected tab is removed', async () => {
    function Removable() {
      const [showFirst, setShowFirst] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setShowFirst(false)}>
            Drop the first
          </button>
          <Tabs>
            <TabList aria-label="Sections">
              {showFirst && <Tab value="overview">Overview</Tab>}
              <Tab value="usage">Usage</Tab>
            </TabList>
            <TabPanel value="overview">What it is</TabPanel>
            <TabPanel value="usage">How to use it</TabPanel>
          </Tabs>
        </>
      );
    }
    render(<Removable />);
    await waitFor(() =>
      expect(tab('Overview')).toHaveAttribute('tabindex', '0'),
    );

    await browser.click(screen.getByRole('button', { name: 'Drop the first' }));

    // Nothing about a tab leaving changes the registry handle, the value or the
    // setter — so the effect could not see it, and the list dropped out of the
    // page's tab order entirely. Read from the children, it cannot.
    await waitFor(() => expect(tab('Usage')).toHaveAttribute('tabindex', '0'));
    expect(tab('Usage')).toHaveAttribute('aria-selected', 'true');
  });

  it('falls back for a controlled value that names no tab, and says so', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const onValueChange = vi.fn();
    render(three({ value: 'nothing-here', onValueChange }));

    // The fallback is PRESENTATION ONLY: a controlled consumer is never told
    // their own state is something else, so this cannot loop with a handler
    // that re-renders. What they get instead is a warning and a usable list.
    await waitFor(() =>
      expect(tab('Overview')).toHaveAttribute('tabindex', '0'),
    );
    expect(onValueChange).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('names no tab'),
      ),
    );
    warn.mockRestore();
  });

  it('does not report a change nobody made', async () => {
    const onValueChange = vi.fn();
    render(three({ onValueChange }));
    await waitFor(() =>
      expect(tab('Overview')).toHaveAttribute('aria-selected', 'true'),
    );

    // The first tab shows because nothing else does; that is not an event. The
    // version that selected it through the setter fired `onValueChange` on
    // mount — a phantom tab-change in anybody's analytics — and flipped the
    // component from uncontrolled to controlled on its own.
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('leaves the tab stop where the focus is, under manual activation', async () => {
    render(
      <>
        {three({ activation: 'manual' })}
        <button type="button">After</button>
      </>,
    );
    await waitFor(() =>
      expect(tab('Overview')).toHaveAttribute('tabindex', '0'),
    );
    tab('Overview').focus();

    await browser.keyboard('{ArrowRight}');
    await browser.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(tab('API'));
    expect(tab('Overview')).toHaveAttribute('aria-selected', 'true');

    // The roving index follows the FOCUS, not the selection. Tracking selection
    // sends the reader back to tab 1 on the way in, silently discarding two
    // arrow presses — in the one mode meant for panels that cost something.
    expect(tab('API')).toHaveAttribute('tabindex', '0');
    expect(tab('Overview')).toHaveAttribute('tabindex', '-1');
  });

  it('leaves the arrows alone for something that is not a tab', async () => {
    render(
      <Tabs>
        <TabList aria-label="Files">
          <Tab value="a">A</Tab>
          <Tab value="b">B</Tab>
          <input aria-label="Filter tabs" defaultValue="hello" />
        </TabList>
        <TabPanel value="a">First</TabPanel>
        <TabPanel value="b">Second</TabPanel>
      </Tabs>,
    );
    await waitFor(() => expect(tab('A')).toHaveAttribute('tabindex', '0'));

    const filter = screen.getByLabelText('Filter tabs') as HTMLInputElement;
    filter.focus();
    filter.setSelectionRange(5, 5);
    await browser.keyboard('{ArrowLeft}');

    // The handler is on the list and catches everything that bubbles. Without a
    // check that the keystroke came FROM a tab, arrowing in this field moved
    // the focus onto a tab instead of the caret — and Home left the text
    // altogether.
    expect(document.activeElement).toBe(filter);
    expect(filter).toHaveProperty('selectionStart', 4);

    await browser.keyboard('{Home}');
    expect(document.activeElement).toBe(filter);
  });

  it('shows a disabled tab when every tab is disabled, without selecting it', async () => {
    render(
      <Tabs>
        <TabList aria-label="Plans">
          <Tab value="a" disabled>
            A
          </Tab>
          <Tab value="b" disabled>
            B
          </Tab>
        </TabList>
        <TabPanel value="a">First</TabPanel>
        <TabPanel value="b">Second</TabPanel>
      </Tabs>,
    );

    // SOMETHING has to carry `tabindex="0"` or the list is unreachable, and
    // being focusable is not the same as being selected.
    await waitFor(() => expect(tab('A')).toHaveAttribute('tabindex', '0'));
    tab('A').focus();
    tab('B').click();
    // Waited, not read on the next line — see the disabled-click test above for
    // what an unawaited `.click()` is worth. B stays unselected because it is
    // disabled, not because nothing has happened yet.
    await waitFor(() => expect(tab('A')).toHaveAttribute('tabindex', '0'));
    expect(tab('B')).toHaveAttribute('aria-selected', 'false');
  });

  it('keeps the panels hidden against a consumer’s own display rule', async () => {
    const sheet = document.createElement('style');
    // UNLAYERED, like every ordinary consumer stylesheet — which is exactly why
    // the first version of the defence failed: it was written inside
    // `@layer fmmenchi`, and a layered rule loses to every unlayered one
    // whatever its specificity. Only a layered `!important` outranks this.
    sheet.textContent = '[role="tabpanel"] { display: grid; }';
    document.head.append(sheet);

    try {
      render(three());
      await waitFor(() =>
        expect(tab('Overview')).toHaveAttribute('tabindex', '0'),
      );

      expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
      const hidden = panels().filter((panel) => panel.hasAttribute('hidden'));
      expect(hidden).toHaveLength(2);
      for (const panel of hidden) {
        expect(getComputedStyle(panel).display).toBe('none');
      }
    } finally {
      sheet.remove();
    }
  });

  it('says when a panel has no tab to belong to', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Tabs>
        <TabList aria-label="Sections">
          <Tab value="a">A</Tab>
        </TabList>
        <TabPanel value="a">First</TabPanel>
        <TabPanel value="orphan">Nobody points at me</TabPanel>
      </Tabs>,
    );

    // Its `aria-labelledby` points at nothing, so it is announced unnamed. The
    // tab→panel direction was checked from the start; this is the way back.
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('no <Tab value="orphan">'),
      ),
    );
    warn.mockRestore();
  });

  it('does not dim the focus ring of a disabled tab', async () => {
    render(
      <Tabs>
        <TabList aria-label="Plans">
          <Tab value="free">Free</Tab>
          <Tab value="team" disabled>
            Team
          </Tab>
        </TabList>
        <TabPanel value="free">First</TabPanel>
        <TabPanel value="team">Second</TabPanel>
      </Tabs>,
    );
    await waitFor(() => expect(tab('Free')).toHaveAttribute('tabindex', '0'));

    // `opacity` applies to the whole rendering, the OUTLINE included — and this
    // component deliberately walks the arrows onto disabled tabs. At 0.5 the
    // focus ring measured 2.25:1, and WCAG 1.4.11 has no exemption for inactive
    // components. axe cannot see it either: it skips contrast checks entirely
    // on anything `aria-disabled`, which is why this is asserted by hand.
    expect(getComputedStyle(tab('Team')).opacity).toBe('1');
  });
});

/**
 * The seams a consumer is allowed to reach into, and the two keys the browser
 * would otherwise act on itself. All of these survived deletion in a mutation
 * run — the contract was documented and unguarded.
 */
describe('Tabs, the contract with the caller', () => {
  it('stops the browser acting on the keys it takes', async () => {
    render(three({ orientation: 'vertical' }));
    await waitFor(() =>
      expect(tab('Overview')).toHaveAttribute('tabindex', '0'),
    );
    tab('Overview').focus();

    const seen: boolean[] = [];
    const listen = (event: KeyboardEvent) => seen.push(event.defaultPrevented);
    document.addEventListener('keydown', listen);
    try {
      await browser.keyboard('{ArrowDown}');
      await browser.keyboard('{End}');
    } finally {
      document.removeEventListener('keydown', listen);
    }

    // Without this the page scrolls under a reader walking a vertical list, and
    // End jumps the document to the bottom on every tab change.
    expect(seen).toEqual([true, true]);
  });

  it('lets the caller pre-empt a click', async () => {
    const onClick = vi.fn((event: React.MouseEvent) => event.preventDefault());
    render(
      <Tabs>
        <TabList aria-label="Sections">
          <Tab value="a">A</Tab>
          <Tab value="b" onClick={onClick}>
            B
          </Tab>
        </TabList>
        <TabPanel value="a">First</TabPanel>
        <TabPanel value="b">Second</TabPanel>
      </Tabs>,
    );
    await waitFor(() => expect(tab('A')).toHaveAttribute('tabindex', '0'));

    await browser.click(tab('B'));
    expect(onClick).toHaveBeenCalledOnce();
    // The handler runs FIRST and its `preventDefault` is honoured — a tab that
    // guards an unsaved form can ask a question before the panel changes.
    expect(tab('B')).toHaveAttribute('aria-selected', 'false');
    expect(tab('A')).toHaveAttribute('aria-selected', 'true');
  });

  it('lets the caller pre-empt a key', async () => {
    const onKeyDown = vi.fn((event: React.KeyboardEvent) =>
      event.preventDefault(),
    );
    render(
      <Tabs>
        <TabList aria-label="Sections" onKeyDown={onKeyDown}>
          <Tab value="a">A</Tab>
          <Tab value="b">B</Tab>
        </TabList>
        <TabPanel value="a">First</TabPanel>
        <TabPanel value="b">Second</TabPanel>
      </Tabs>,
    );
    await waitFor(() => expect(tab('A')).toHaveAttribute('tabindex', '0'));
    tab('A').focus();

    await browser.keyboard('{ArrowRight}');
    expect(onKeyDown).toHaveBeenCalled();
    expect(document.activeElement).toBe(tab('A'));
  });

  it('does not put a scrollbar on the strip', async () => {
    render(three());
    await waitFor(() =>
      expect(tab('Overview')).toHaveAttribute('tabindex', '0'),
    );
    const list = screen.getByRole('tablist');

    // GEOMETRY, and it needs measuring because nothing else can see it. The
    // rail used to be a border, so the selected tab's marker could only sit on
    // it with a negative margin — which pushed the tab 1px past the list's
    // content edge. CSS then made `overflow-y` follow `overflow-x: auto` (an
    // axis that is not `visible` takes the other with it), and a 38px strip
    // grew a VERTICAL scrollbar: `scrollHeight` 38 against `clientHeight` 37.
    expect(list.scrollHeight).toBe(list.clientHeight);
    expect(list.scrollWidth).toBe(list.clientWidth);

    // And the marker's track still holds its space, so selecting does not
    // change a tab's height and shift the row.
    expect(tab('Usage').getBoundingClientRect().height).toBe(
      tab('Overview').getBoundingClientRect().height,
    );
  });

  it('shows no panel at all when every tab is disabled', async () => {
    render(
      <Tabs>
        <TabList aria-label="Plans">
          <Tab value="a" disabled>
            A
          </Tab>
          <Tab value="b" disabled>
            B
          </Tab>
        </TabList>
        <TabPanel value="a">First</TabPanel>
        <TabPanel value="b">Second</TabPanel>
      </Tabs>,
    );

    // Showing and being tabbable are two questions. A product that marked every
    // option unavailable should not find one of those panels open — but the
    // list must still be reachable, or a reader cannot even learn the options
    // are there.
    await waitFor(() => expect(tab('A')).toHaveAttribute('tabindex', '0'));
    expect(screen.queryAllByRole('tabpanel')).toHaveLength(0);
    expect(tab('A')).toHaveAttribute('aria-selected', 'false');
    expect(tab('B')).toHaveAttribute('aria-selected', 'false');
  });

  it('falls back to the first tab that can be used, not merely the first', async () => {
    render(
      <Tabs>
        <TabList aria-label="Plans">
          <Tab value="legacy" disabled>
            Legacy
          </Tab>
          <Tab value="current">Current</Tab>
        </TabList>
        <TabPanel value="legacy">Gone</TabPanel>
        <TabPanel value="current">Here</TabPanel>
      </Tabs>,
    );

    // A list whose FIRST tab is disabled is the only shape that tells these two
    // apart, and it is the shape a product reaches after retiring a plan.
    await waitFor(() =>
      expect(tab('Current')).toHaveAttribute('aria-selected', 'true'),
    );
    expect(tab('Current')).toHaveAttribute('tabindex', '0');
    expect(screen.getByText('Here')).toBeVisible();
  });
});
