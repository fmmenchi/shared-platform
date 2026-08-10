import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Table } from './table.component.js';
import type { Column } from './table.types.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * A sticky header is three things that are one decision — the position, the
 * scroller it needs to stick inside, and the keyboard obligation that scroller
 * takes on — so what is proved here is all three, plus the border model they
 * all rest on.
 */
interface Person {
  id: string;
  name: string;
  age: number;
}

const people: Person[] = Array.from({ length: 30 }, (_, index) => ({
  id: String(index),
  name: `Riga ${index}`,
  age: index,
}));

const columns: Column<Person>[] = [
  { key: 'name', header: 'Nome', rowHeader: true },
  { key: 'age', header: 'Età', align: 'end' },
];

/** Bounded, because an unbounded scroller does not scroll and proves nothing. */
function Bounded(props: { sticky?: boolean }) {
  return (
    <div style={{ blockSize: '120px' }}>
      <Table
        caption="Persone"
        rows={people}
        columns={columns}
        getRowId={(p) => p.id}
        stickyHeader={props.sticky}
      />
    </div>
  );
}

describe('a sticky header', () => {
  it('adds nothing at all when it is not asked for', async () => {
    render(<Bounded />);

    // No wrapper, no landmark, no tab stop: a table that does not scroll owes
    // none of them, and an element that does nothing is one the consumer pays
    // for on every page.
    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.getByRole('table').parentElement).not.toHaveAttribute(
      'tabindex',
    );
  });

  it('scrolls inside something of its own, rather than pinning to the viewport', async () => {
    render(<Bounded sticky />);

    const region = screen.getByRole('region');
    expect(region).toContainElement(screen.getByRole('table'));
    expect(getComputedStyle(region).overflow).not.toBe('visible');
    // `position: sticky` with nothing scrolling around it pins to the VIEWPORT,
    // so a table halfway down a page rides its header over the content above.
    expect(region.scrollHeight).toBeGreaterThan(region.clientHeight);
  });

  it('is reachable by keyboard, and says what it is', async () => {
    // A region that scrolls must take a tab stop: somebody who cannot use a
    // pointer has no other way to reach the rows below the fold. And a tab
    // stop with no name is an entry a screen reader reads as nothing — so it
    // borrows the one name the table already has.
    render(<Bounded sticky />);

    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toHaveAccessibleName('Persone');

    await browser.keyboard('{Tab}');
    expect(document.activeElement).toBe(region);
  });

  it('actually sticks, and is not see-through while it does', async () => {
    render(<Bounded sticky />);

    const [header] = screen.getAllByRole('columnheader');
    expect(getComputedStyle(header).position).toBe('sticky');
    // THE MOST REPORTED BUG OF THIS PATTERN: a transparent sticky header has
    // the rows scroll straight through it.
    expect(getComputedStyle(header).backgroundColor).not.toBe(
      'rgba(0, 0, 0, 0)',
    );
  });

  it('keeps the row separators the border model change could have eaten', async () => {
    // The separated model IGNORES a border set on a `<tr>` — silently, which is
    // rare enough in CSS to be worth a test. The rules moved to the cells with
    // the header; this is what notices if one of them moves back.
    render(<Bounded sticky />);

    const cell = document.querySelector('tbody td') as HTMLElement;
    expect(getComputedStyle(cell).borderBottomStyle).toBe('solid');
    expect(getComputedStyle(cell).borderBottomWidth).not.toBe('0px');
  });

  it('has no axe violations, in both themes', async () => {
    // `scrollable-region-focusable` is the rule this feature exists to satisfy,
    // and it only fires on a region that genuinely scrolls — hence the bounded
    // box above rather than a bare render.
    const light = render(<Bounded sticky />);
    await expectNoA11yViolations(light.container);
    light.unmount();

    const dark = renderUi(<Bounded sticky />, { theme: 'dark' });
    await expectNoA11yViolations(dark.container);
  });
});
