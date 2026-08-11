import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Table } from './table.component.js';
import { useTableFilters } from './use-table-filters.js';
import type { Column } from './table.types.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * The seam between the column model and the trigger: which columns get one,
 * what it is called, that the cell keeps being a header cell with a control
 * inside it, and that a column marked filterable with nobody listening draws
 * nothing rather than a dead button.
 *
 * The matching is proved in `filter.test.ts`, the state in
 * `use-table-filters.test.tsx`, and the control's own behaviour in
 * `table-filter-trigger.test.tsx` — not here, through a table.
 */
interface City {
  id: string;
  name: string;
  region: string;
}

const cities: City[] = [
  { id: '1', name: 'Milano', region: 'Lombardia' },
  { id: '2', name: 'Torino', region: 'Piemonte' },
  { id: '3', name: 'Monza', region: 'Lombardia' },
];

const columns: Column<City>[] = [
  { key: 'name', header: 'Città', rowHeader: true, sortable: true },
  { key: 'region', header: 'Regione', filterable: true },
];

function Filtered() {
  const filters = useTableFilters(cities);
  return (
    <Table
      caption="Città"
      rows={filters.rows}
      columns={columns}
      getRowId={(city) => city.id}
      {...filters.props}
    />
  );
}

const names = () =>
  screen.getAllByRole('rowheader').map((cell) => cell.textContent);

describe('a filterable table', () => {
  it('puts a trigger only on the columns that asked for one', async () => {
    render(<Filtered />);

    expect(
      screen.getByRole('button', { name: 'Filter Regione' }),
    ).toBeInTheDocument();
    // `name` is sortable and NOT filterable: the two marks are independent, and
    // a table that put a funnel on every column would be the "one control per
    // column" design this one exists instead of.
    expect(
      screen.queryByRole('button', { name: /Filter Città/ }),
    ).not.toBeInTheDocument();
  });

  it('keeps the cell a column header while it holds two controls', async () => {
    render(<Filtered />);

    // The wrapper is a `<span>` INSIDE the cell for exactly this reason:
    // `display: flex` on a `<th>` drops its `columnheader` role in Chromium.
    const headers = screen.getAllByRole('columnheader');
    expect(headers.map((th) => th.textContent)).toEqual([
      'Città',
      expect.stringContaining('Regione'),
    ]);
  });

  it('narrows the rows when a filter is applied, and restores them when cleared', async () => {
    render(<Filtered />);

    expect(names()).toEqual(['Milano', 'Torino', 'Monza']);

    await browser.click(screen.getByRole('button', { name: 'Filter Regione' }));
    const field = screen.getByRole('textbox', { name: 'Regione' });
    await browser.fill(field, 'lombardia');
    await browser.keyboard('{Enter}');

    // Case-folded, which is the whole reason the engine is ours.
    await waitFor(() => expect(names()).toEqual(['Milano', 'Monza']));

    await browser.click(
      screen.getByRole('button', { name: /Filter Regione, currently/ }),
    );
    await browser.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(names()).toHaveLength(3));
  });

  it('says which column is filtered, from the trigger itself', async () => {
    render(<Filtered />);

    await browser.click(screen.getByRole('button', { name: 'Filter Regione' }));
    await browser.fill(screen.getByRole('textbox', { name: 'Regione' }), 'Pie');
    await browser.keyboard('{Enter}');

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Filter Regione, currently Pie' }),
      ).toBeInTheDocument(),
    );
  });

  it('draws nothing when the mark has nobody listening', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Table
        caption="Città"
        rows={cities}
        columns={columns}
        getRowId={(city) => city.id}
      />,
    );

    // The same rule the sort trigger follows: a control that reports an intent
    // nobody handles looks like state and holds none.
    expect(
      screen.queryByRole('button', { name: /Filter/ }),
    ).not.toBeInTheDocument();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('`onFilterApply`'),
    );
    warn.mockRestore();
  });

  it('warns when the trigger would be named after a developer identifier', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Table
        caption="Città"
        rows={cities}
        columns={[
          { key: 'name', header: 'Città', rowHeader: true },
          { key: 'region', header: <em>Regione</em>, filterable: true },
        ]}
        getRowId={(city) => city.id}
        filters={{}}
        onFilterApply={() => undefined}
      />,
    );

    // "Filter region" — the property name, untranslated, read out inside
    // localized copy. The same failure the sorted column warns about, in a
    // control rather than in an announcement.
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('`label`'));
    warn.mockRestore();
  });

  it('names the header cell itself, so the control does not join the column', async () => {
    render(<Filtered />);

    // A `columnheader` is named FROM ITS CONTENTS, and a name is computed for
    // each descendant — so the trigger's own "Filter Regione, currently
    // Lombardia" became part of the column's name and was read before every
    // cell under it. Measured against Chromium's AX tree: with the attribute
    // the name is "Regione", without it "Regione Filter Regione".
    //
    // ASSERTED ON THE ATTRIBUTE, not on the name, and that is the point:
    // `dom-accessibility-api` — what `toHaveAccessibleName` and axe use here —
    // computes the cell as "Regione" either way, so the suite is blind to the
    // defect. This is the one thing about it a test can see.
    const [, regione] = screen.getAllByRole('columnheader');
    expect(regione).toHaveAttribute('aria-label', 'Regione');
    expect(screen.getAllByRole('columnheader')[0]).not.toHaveAttribute(
      'aria-label',
    );
  });

  it('warns about a column still carrying the prop this release renamed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Table
        caption="Città"
        rows={cities}
        // A mapped or spread source gets no excess-property check, so the
        // rename lands as SILENCE — the announcement falls back to the key.
        columns={
          [
            { key: 'name', header: 'Città', rowHeader: true, sortLabel: 'X' },
          ] as unknown as Column<City>[]
        }
        getRowId={(city) => city.id}
      />,
    );

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('`sortLabel`'));
    warn.mockRestore();
  });

  it('has no violations with a control in the header', async () => {
    const { container } = render(<Filtered />);

    await expectNoA11yViolations(container);
  });
});
