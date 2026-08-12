import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Table } from './table.component.js';
import { useRowExpansion } from './use-row-expansion.js';
import type { Column } from './table.types.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * A row that opens a panel under it — the first thing the column model cannot
 * express, and the first place a `<table>`'s ARIA runs out.
 *
 * What is proved here is where the state went and why: `aria-expanded` is
 * meaningless on a row in a `table`, so it is on the BUTTON; the detail row
 * exists while it is shut so `aria-controls` always names something; and the
 * control is called after its own row, because a column of chevrons all called
 * "Show details" is a column a screen reader cannot navigate.
 */
interface City {
  id: string;
  name: string;
  region: string;
}

const cities: City[] = [
  { id: '1', name: 'Milano', region: 'Lombardia' },
  { id: '2', name: 'Torino', region: 'Piemonte' },
];

const columns: Column<City>[] = [
  { key: 'name', header: 'Città', rowHeader: true },
  { key: 'region', header: 'Regione' },
];

function Expandable(props: { detail?: (city: City) => React.ReactNode }) {
  const expansion = useRowExpansion();
  return (
    <Table
      caption="Città"
      rows={cities}
      columns={columns}
      getRowId={(city) => city.id}
      renderDetail={props.detail ?? ((city) => <p>Abitanti di {city.name}</p>)}
      {...expansion.props}
    />
  );
}

const trigger = (name: RegExp | string) => screen.getByRole('button', { name });

describe('an expandable table', () => {
  it('names each control after its own row', async () => {
    render(<Expandable />);

    // A column of chevrons all called "Show details" is five controls a screen
    // reader cannot tell apart — the defect the checkbox column already fixed.
    expect(trigger('Show details for Milano')).toBeInTheDocument();
    expect(trigger('Show details for Torino')).toBeInTheDocument();
  });

  it('puts the state on the button, because a row cannot carry it', async () => {
    render(<Expandable />);

    const control = trigger('Show details for Milano');
    // `aria-expanded` is listed for `row`, but only inside a `grid` or
    // `treegrid`; on a row in a `table` it is not announced. Writing it there
    // would be an attribute that reads as a promise and delivers nothing.
    expect(control).toHaveAttribute('aria-expanded', 'false');
    const row = control.closest('tr');
    expect(row).not.toHaveAttribute('aria-expanded');

    await browser.click(control);
    await waitFor(() =>
      expect(control).toHaveAttribute('aria-expanded', 'true'),
    );
  });

  it('always points at something', async () => {
    render(<Expandable />);

    const control = trigger('Show details for Milano');
    const target = control.getAttribute('aria-controls');
    // SHUT, and still in the document: a reference to an element that is not
    // there is a promise to nobody, which is why the row is `hidden` rather
    // than absent.
    expect(target).toBeTruthy();
    const detail = document.getElementById(target as string);
    expect(detail).toBeInstanceOf(HTMLTableRowElement);
    expect(detail).toHaveAttribute('hidden');

    await browser.click(control);
    await waitFor(() => expect(detail).not.toHaveAttribute('hidden'));
  });

  it('renders the detail only while it is open', async () => {
    const detail = vi.fn((city: City) => <p>Abitanti di {city.name}</p>);
    render(<Expandable detail={detail} />);

    // A consumer's `renderDetail` is a function — a nested table, a chart, a
    // query — and calling it for every shut row of a long table is work nobody
    // asked for.
    expect(detail).not.toHaveBeenCalled();

    await browser.click(trigger('Show details for Milano'));
    await waitFor(() => expect(detail).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Abitanti di Milano')).toBeVisible();
  });

  it('closes again, and the panel goes with it', async () => {
    render(<Expandable />);

    const control = trigger('Show details for Milano');
    await browser.click(control);
    await waitFor(() => expect(screen.getByText(/Abitanti/)).toBeVisible());

    await browser.click(control);
    await waitFor(() =>
      expect(screen.queryByText(/Abitanti/)).not.toBeInTheDocument(),
    );
    expect(control).toHaveAttribute('aria-expanded', 'false');
  });

  it('spans the detail across every column, control columns included', async () => {
    render(<Expandable />);

    await browser.click(trigger('Show details for Milano'));
    const detail = await screen.findByText(/Abitanti/);
    const cell = detail.closest('td');

    // A hand-written number is wrong the day a column is added, and a short
    // span leaves the panel under one column instead of across the table.
    expect(cell).toHaveAttribute('colspan', '3');
  });

  it('names the detail cell, because it is joined to every column header', async () => {
    render(<Expandable />);

    await browser.click(trigger('Show details for Milano'));
    const cell = (await screen.findByText(/Abitanti/)).closest('td');

    // A cell spanning every column is associated with EVERY column header, so
    // a reader hears them all before the content. Naming it is the one thing
    // that makes that bearable.
    expect(cell).toHaveAttribute('aria-label', 'Details for Milano');
  });

  it('draws nothing when the mark has nobody listening', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Table
        caption="Città"
        rows={cities}
        columns={columns}
        getRowId={(city) => city.id}
        expandedRows={new Set()}
      />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('`onRowExpandToggle`'),
    );
    warn.mockRestore();
  });

  it('draws nothing when there is nothing for it to open', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Table
        caption="Città"
        rows={cities}
        columns={columns}
        getRowId={(city) => city.id}
        expandedRows={new Set()}
        onRowExpandToggle={() => undefined}
      />,
    );

    // A chevron that opens an empty row is worse than no chevron: it reads as
    // data that is missing rather than as a feature that is not wired.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('`renderDetail`'),
    );
    warn.mockRestore();
  });

  it('keeps the empty message across the table when a control column is there', async () => {
    function Empty() {
      const expansion = useRowExpansion();
      return (
        <Table
          caption="Città"
          rows={[]}
          columns={columns}
          getRowId={(city: City) => city.id}
          renderDetail={() => null}
          {...expansion.props}
        />
      );
    }
    render(<Empty />);

    const cell = screen.getByRole('cell');
    expect(cell).toHaveAttribute('colspan', '3');
  });

  it('speaks the reader’s language', async () => {
    renderUi(<Expandable />, { locale: 'it' });

    expect(trigger('Mostra i dettagli di Milano')).toBeInTheDocument();
  });

  it('has no violations, open or shut', async () => {
    const { container } = render(<Expandable />);

    await expectNoA11yViolations(container);

    await browser.click(trigger('Show details for Milano'));
    await waitFor(() => expect(screen.getByText(/Abitanti/)).toBeVisible());
    await expectNoA11yViolations(container);
  });
});
