import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Table } from './table.component.js';
import { TableBody } from '../table-body/table-body.component.js';
import { TableCell } from '../table-cell/table-cell.component.js';
import { TableHead } from '../table-head/table-head.component.js';
import { TableHeaderCell } from '../table-header-cell/table-header-cell.component.js';
import { TableRow } from '../table-row/table-row.component.js';
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

/**
 * Bounded with a DEFINITE height, because an unbounded scroller does not
 * scroll and proves nothing — and `max-block-size` on the parent does not
 * work either: a percentage against an indefinite containing block resolves to
 * `none`.
 */
function Bounded(props: { sticky?: boolean; selectable?: boolean }) {
  const selection =
    props.selectable === true
      ? {
          selection: { mode: 'include' as const, ids: new Set<string>() },
          onRowSelectToggle: () => undefined,
          onSelectAllToggle: () => undefined,
        }
      : {};

  return (
    <div style={{ blockSize: '120px' }}>
      <Table
        caption="Persone"
        rows={people}
        columns={columns}
        getRowId={(p) => p.id}
        stickyHeader={props.sticky}
        {...selection}
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
    // BOTH ASSERTIONS USED TO BE THEATRE. `position === 'sticky'` restates the
    // stylesheet and passes even when a wrong containing block makes sticky do
    // nothing; `backgroundColor !== transparent` restates a declaration and
    // cannot see the bug its own comment names. These measure instead.
    render(<Bounded sticky />);

    const region = screen.getByRole('region');
    const [header] = screen.getAllByRole('columnheader');

    region.scrollTop = 200;
    const gap =
      header.getBoundingClientRect().top - region.getBoundingClientRect().top;
    expect(Math.abs(gap)).toBeLessThan(1);

    // A hit test, because "opaque" means the rows do not come through it.
    const box = header.getBoundingClientRect();
    expect(
      document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2,
      ),
    ).toBe(header);
  });

  it('is inert when there is nothing to scroll', async () => {
    // Unconstrained, nothing scrolls in either axis — and the wrapper was
    // still shipping a tab stop and a landmark over content that does not
    // move. The header is a no-op there; the wrapper was not.
    render(
      <Table
        caption="Persone"
        rows={people.slice(0, 2)}
        columns={columns}
        getRowId={(p) => p.id}
        stickyHeader
      />,
    );

    const wrapper = document.querySelector(
      '[data-table-scroll]',
    ) as HTMLElement;
    expect(wrapper).not.toHaveAttribute('tabindex');
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('does not reach into a table nested in one of its cells', async () => {
    // The rule moved from the row to the CELLS with the header, and as a
    // descendant selector it then reached an inner table's cells too —
    // harmless while it sat on a `<tr>`, because an inner table defaults to
    // `separate` and ignores a border there. Measured: the inner cell drew a
    // separator it never had.
    render(
      <Table caption="Fuori">
        <TableBody>
          <TableRow>
            <TableCell>
              {/* A PLAIN table, not one of ours — ours would style its own
                  cells, correctly, and prove nothing about the leak. */}
              <table>
                <tbody>
                  <tr>
                    <td data-inner="">Cella</td>
                  </tr>
                </tbody>
              </table>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    const inner = document.querySelector('[data-inner]') as HTMLElement;
    expect(getComputedStyle(inner).borderBottomWidth).toBe('0px');
  });

  it('works in composed mode, where the parts are the consumer’s', async () => {
    render(
      <div style={{ blockSize: '120px' }}>
        <Table caption="Persone" stickyHeader>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Nome</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {people.map((person) => (
              <TableRow key={person.id}>
                <TableCell>{person.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>,
    );

    expect(screen.getByRole('region')).toHaveAccessibleName('Persone');
    expect(
      getComputedStyle(screen.getAllByRole('columnheader')[0] as HTMLElement)
        .position,
    ).toBe('sticky');
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

  it('never scrolls a focused control underneath itself', async () => {
    // WCAG 2.4.11, and HOW you move is the whole finding. Programmatic
    // `.focus()` is safe — Chromium's scroll-into-view already avoids a sticky
    // element, measured at 14px of clearance. SEQUENTIAL focus navigation is
    // not: Shift+Tab up through the rows, the ordinary motion for reviewing a
    // list, buried the focused checkbox by 36px. Two readers of this component
    // reported the same defect as reproducing and as not reproducing, and that
    // is the difference between them.
    render(<Bounded sticky selectable />);

    const head = document.querySelector('thead th') as HTMLElement;
    const boxes = screen.getAllByRole('checkbox');

    (boxes[boxes.length - 1] as HTMLElement).focus();
    let worst = -999;
    const seen = new Set<Element>();
    for (let step = 0; step < 12; step += 1) {
      await browser.keyboard('{Shift>}{Tab}{/Shift}');
      const active = document.activeElement;
      if (!(active instanceof HTMLInputElement)) continue;
      seen.add(active);
      worst = Math.max(
        worst,
        head.getBoundingClientRect().bottom -
          active.getBoundingClientRect().top,
      );
    }
    const overlap = worst;

    // Not vacuous: the loop has to have actually moved through the rows.
    expect(seen.size).toBeGreaterThan(5);
    // A focus indicator behind an opaque band is no focus indicator. Measured
    // at +36px before the scroller was told how tall its own header is — a
    // checkbox 18px tall, buried twice over.
    expect(overlap).toBeLessThanOrEqual(0);
  });

  it('matches its markup', async () => {
    // The wrapper's shape is the new thing — what is on it, and that the table
    // is inside it rather than beside it. None of the three existing snapshots
    // renders `stickyHeader`, so it was recorded nowhere.
    const { container } = render(<Bounded sticky />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('has no axe violations, in both themes', async () => {
    // `scrollable-region-focusable` is the rule this feature exists to satisfy,
    // and it only fires on a region that genuinely scrolls — hence the bounded
    // box above rather than a bare render.
    // A matrix, and selection is in it: sticky × selection is the one shape
    // where a second landmark and a live region coexist with the scroller, and
    // it is also the only shape in which the obscured-focus defect exists.
    for (const theme of [undefined, 'dark']) {
      for (const selectable of [false, true]) {
        const view = renderUi(<Bounded sticky selectable={selectable} />, {
          theme,
        });
        await expectNoA11yViolations(view.container);
        view.unmount();
      }
    }
  });
});
