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
    tab('Usage').click();
    expect(tab('Usage')).toHaveAttribute('aria-selected', 'false');
    expect(tab('Overview')).toHaveAttribute('aria-selected', 'true');
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
