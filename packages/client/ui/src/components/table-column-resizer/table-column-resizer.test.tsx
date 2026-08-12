import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Table } from '../table/table.component.js';
import { TableColumnResizer } from './table-column-resizer.component.js';
import { useColumnWidths } from '../table/use-column-widths.js';
import type { Column } from '../table/table.types.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * Three ways to move a border, and the reason there are three: a drag serves
 * one group, arrows serve another, and WCAG 2.5.7 is about the third — people
 * who use a pointer and cannot hold a button while moving it. Each is proved
 * here, and so is the thing that makes the third real: that a click does not
 * resize by zero.
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
  { key: 'name', header: 'Città', rowHeader: true, width: '200px' },
  { key: 'region', header: 'Regione' },
];

function Resizable(props: { onWidths?: (w: Record<string, string>) => void }) {
  const widths = useColumnWidths({ onWidthsChange: props.onWidths });
  return (
    <Table
      caption="Città"
      rows={cities}
      columns={columns}
      getRowId={(city) => city.id}
      resizableColumns
      {...widths.props}
    />
  );
}

/** A width that goes nowhere: these renders are about what is announced. */
const noop = () => undefined;

const handle = () => screen.getByRole('separator', { name: 'Resize Città' });
const cell = () => screen.getAllByRole('columnheader')[0];
const measured = () => Math.round(cell().getBoundingClientRect().width);

describe('a column resize handle', () => {
  it('is a focusable separator carrying the width it moves', async () => {
    render(<Resizable />);

    // A window splitter is the nearest pattern ARIA has: the one role that
    // means "a divider the user can move", and it takes a value while it is at
    // it — so a screen reader can report the width without seeing the column.
    const grip = handle();
    expect(grip).toHaveAttribute('aria-orientation', 'vertical');
    expect(grip).toHaveAttribute('tabindex', '0');
    await waitFor(() =>
      expect(grip).toHaveAttribute('aria-valuenow', String(measured())),
    );
    expect(grip).toHaveAttribute('aria-valuemin', '48');
  });

  it('says which column it divides', async () => {
    render(<Resizable />);

    // A splitter is required to say what it divides, and the objection to
    // leaving it out was that a table has no element meaning "the column" — it
    // has one meaning the head of that column, which is the same column and is
    // already on screen.
    const target = handle().getAttribute('aria-controls');
    expect(target).toBeTruthy();
    expect(document.getElementById(target as string)).toBe(cell());
  });

  it('is not on the last column, whose trailing edge is the table', async () => {
    render(<Resizable />);

    // A handle there would resize the TABLE, which is a different thing wearing
    // the same grip.
    expect(screen.getAllByRole('separator')).toHaveLength(1);
    expect(
      screen.queryByRole('separator', { name: /Regione/ }),
    ).not.toBeInTheDocument();
  });

  it('resizes from the keyboard, which is the whole reason it is a tab stop', async () => {
    const onWidths = vi.fn();
    render(<Resizable onWidths={onWidths} />);

    handle().focus();
    await browser.keyboard('{ArrowRight}');
    await waitFor(() => expect(onWidths).toHaveBeenCalled());
    expect(onWidths.mock.lastCall?.[0]).toEqual({ name: '216px' });

    await browser.keyboard('{Shift>}{ArrowRight}{/Shift}');
    // A bigger step with Shift, because sixteen pixels at a time across a wide
    // column is a key held down rather than a control used.
    await waitFor(() =>
      expect(onWidths.mock.lastCall?.[0]).toEqual({ name: '280px' }),
    );

    await browser.keyboard('{ArrowLeft}');
    await waitFor(() =>
      expect(onWidths.mock.lastCall?.[0]).toEqual({ name: '264px' }),
    );
  });

  it('refuses to shrink a column into nothing', async () => {
    const onWidths = vi.fn();
    render(<Resizable onWidths={onWidths} />);

    handle().focus();
    await browser.keyboard('{Home}');

    // Below some width a column shows nothing and the reader has no way back
    // except finding a handle that is no longer where they left it.
    await waitFor(() =>
      expect(onWidths.mock.lastCall?.[0]).toEqual({ name: '48px' }),
    );
  });

  it('puts the column back where it was declared', async () => {
    const onWidths = vi.fn();
    render(<Resizable onWidths={onWidths} />);

    handle().focus();
    await browser.keyboard('{ArrowRight}');
    await waitFor(() => expect(onWidths).toHaveBeenCalled());

    await browser.keyboard('{Enter}');
    // EMPTY, not the declared value copied back: the column already holds
    // `width: '200px'`, and a second copy is a second thing to keep in step.
    await waitFor(() => expect(onWidths.mock.lastCall?.[0]).toEqual({}));
  });

  it('reports one width for a whole drag, not one per pixel', async () => {
    const onWidths = vi.fn();
    render(<Resizable onWidths={onWidths} />);

    const grip = handle();
    const box = grip.getBoundingClientRect();
    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    grip.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        pointerId: 1,
        clientX: from.x,
        clientY: from.y,
      }),
    );
    for (const step of [20, 40, 60]) {
      document.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerId: 1,
          clientX: from.x + step,
          clientY: from.y,
        }),
      );
    }
    // Painted straight to the DOM while the gesture runs — a width is what the
    // browser recomputes sixty times a second, and routing that through React
    // re-renders every row to move one border.
    expect(measured()).toBe(260);
    expect(onWidths).not.toHaveBeenCalled();

    document.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 1,
        clientX: from.x + 60,
        clientY: from.y,
      }),
    );
    await waitFor(() =>
      expect(onWidths.mock.lastCall?.[0]).toEqual({ name: '260px' }),
    );
    expect(onWidths).toHaveBeenCalledTimes(1);
  });

  it('is operable by a pointer that never drags — the criterion the drag fails', async () => {
    const onWidths = vi.fn();
    render(<Resizable onWidths={onWidths} />);

    const grip = handle();
    const box = grip.getBoundingClientRect();
    const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    // A CLICK, not a drag: press and release without travelling.
    grip.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        pointerId: 1,
        clientX: at.x,
        clientY: at.y,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 1,
        clientX: at.x,
        clientY: at.y,
      }),
    );

    // It latched instead of resizing by zero, and it SAYS so: a mode nobody is
    // told about is a mode nobody knows they are in.
    await waitFor(() => expect(grip).toHaveAttribute('data-mode', 'adjust'));
    expect(document.querySelector('[role="status"]')).toHaveTextContent(
      /Placing the border of Città/,
    );

    // The pointer now moves the border with nothing held down.
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 1,
        clientX: at.x + 40,
        clientY: at.y,
      }),
    );
    expect(measured()).toBe(240);
    expect(onWidths).not.toHaveBeenCalled();

    // And the next press finishes it. ON THE GRIP, which is where it lands in
    // life: the border follows the pointer, so the handle is under it when the
    // reader presses to finish. Dispatching this on `document` was how the
    // first version of this test passed while the mode could not be left at
    // all — the same event reached the handle's own `pointerdown`, found the
    // gesture settled, started a new one, and re-latched on release.
    grip.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        pointerId: 1,
        clientX: at.x + 40,
        clientY: at.y,
      }),
    );
    await waitFor(() =>
      expect(onWidths.mock.lastCall?.[0]).toEqual({ name: '240px' }),
    );
    expect(grip).not.toHaveAttribute('data-mode');

    // AND IT STAYS FINISHED. A free pointer move now moves the pointer, not the
    // column.
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 1,
        clientX: at.x + 140,
        clientY: at.y,
      }),
    );
    expect(measured()).toBe(240);
  });

  it('reports nothing when the border ends where it started', async () => {
    const onWidths = vi.fn();
    render(<Resizable onWidths={onWidths} />);

    const grip = handle();
    const box = grip.getBoundingClientRect();
    const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    const press = (target: Element, clientX: number) =>
      target.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          button: 0,
          pointerId: 1,
          clientX,
          clientY: at.y,
        }),
      );

    press(grip, at.x);
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 1,
        clientX: at.x,
        clientY: at.y,
      }),
    );
    await waitFor(() => expect(grip).toHaveAttribute('data-mode', 'adjust'));

    // Placed back where it already was. Not merely redundant: a double-click
    // arrives as exactly this, and a reported width would overwrite the
    // declaration the second click is about to restore.
    press(grip, at.x);

    await waitFor(() => expect(grip).not.toHaveAttribute('data-mode'));
    expect(onWidths).not.toHaveBeenCalled();
  });

  it('reports the width it painted, not the one the table measured back', async () => {
    const onWidths = vi.fn();
    render(<Resizable onWidths={onWidths} />);

    const grip = handle();
    const box = grip.getBoundingClientRect();
    const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    grip.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        pointerId: 1,
        clientX: at.x,
        clientY: at.y,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 1,
        clientX: at.x + 50,
        clientY: at.y,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 1,
        clientX: at.x + 50,
        clientY: at.y,
      }),
    );

    await waitFor(() =>
      expect(onWidths.mock.lastCall?.[0]).toEqual({ name: '250px' }),
    );
    // AND THE VALUE IT ANNOUNCES CATCHES UP. The observer is told to stay quiet
    // for the whole gesture and the committed width is already on screen, so
    // nothing makes it fire again — `aria-valuetext` kept reporting the width
    // from before the drag, and it takes precedence over `aria-valuenow`.
    await waitFor(() =>
      expect(grip).toHaveAttribute('aria-valuetext', '250 pixels'),
    );
    expect(grip).toHaveAttribute('aria-valuenow', '250');
  });

  it('survives a pointer the browser takes away', async () => {
    const onWidths = vi.fn();
    render(<Resizable onWidths={onWidths} />);

    const grip = handle();
    const box = grip.getBoundingClientRect();
    const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    grip.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        pointerId: 1,
        clientX: at.x,
        clientY: at.y,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 1,
        clientX: at.x + 60,
        clientY: at.y,
      }),
    );
    // The browser taking over for a scroll, a system gesture, the window losing
    // the device: no `pointerup` ever comes. Without a handler the gesture
    // never ended — the handle was dead for the life of the mount and a later
    // move still repainted the column.
    document.dispatchEvent(
      new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 }),
    );

    await waitFor(() => expect(measured()).toBe(200));
    expect(onWidths).not.toHaveBeenCalled();

    document.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 1,
        clientX: at.x + 200,
        clientY: at.y,
      }),
    );
    expect(measured()).toBe(200);

    // And it still works afterwards.
    grip.focus();
    await browser.keyboard('{ArrowRight}');
    await waitFor(() =>
      expect(onWidths.mock.lastCall?.[0]).toEqual({ name: '216px' }),
    );
  });

  it('ignores a second finger', async () => {
    const onWidths = vi.fn();
    render(<Resizable onWidths={onWidths} />);

    const grip = handle();
    const box = grip.getBoundingClientRect();
    const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    grip.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        pointerId: 1,
        clientX: at.x,
        clientY: at.y,
      }),
    );
    // A pinch begun near the boundary, or a second cursor: it drove the column
    // to wherever that pointer happened to be, and committed there.
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 2,
        clientX: 10,
        clientY: at.y,
      }),
    );
    expect(measured()).toBe(200);

    document.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 2,
        clientX: 10,
        clientY: at.y,
      }),
    );
    expect(onWidths).not.toHaveBeenCalled();
  });

  it('places the border from the press itself, which is all a finger can do', async () => {
    const onWidths = vi.fn();
    render(<Resizable onWidths={onWidths} />);

    const grip = handle();
    const box = grip.getBoundingClientRect();
    const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    // Tap to latch.
    grip.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        pointerId: 1,
        pointerType: 'touch',
        clientX: at.x,
        clientY: at.y,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 1,
        pointerType: 'touch',
        clientX: at.x,
        clientY: at.y,
      }),
    );
    await waitFor(() => expect(grip).toHaveAttribute('data-mode', 'adjust'));

    // AND NOW TAP WHERE THE BORDER GOES — with NO `pointermove` in between,
    // because a touch pointer only moves while it is touching and touching is
    // the drag. The first version moved the border on hover and used this press
    // only to stop, so on a real touchscreen the reader was told to "move the
    // pointer" and the second tap committed the width unchanged: the criterion
    // was unmet for exactly the people it is written for.
    cell().dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        pointerId: 2,
        pointerType: 'touch',
        clientX: at.x + 70,
        clientY: at.y,
      }),
    );

    await waitFor(() =>
      expect(onWidths.mock.lastCall?.[0]).toEqual({ name: '270px' }),
    );
    expect(grip).not.toHaveAttribute('data-mode');
  });

  it('leaves the latched mode alone when the press is somewhere else', async () => {
    const onWidths = vi.fn();
    render(
      <>
        <button type="button">altrove</button>
        <Resizable onWidths={onWidths} />
      </>,
    );

    const grip = handle();
    const box = grip.getBoundingClientRect();
    const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    grip.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        pointerId: 1,
        clientX: at.x,
        clientY: at.y,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 1,
        clientX: at.x,
        clientY: at.y,
      }),
    );
    await waitFor(() => expect(grip).toHaveAttribute('data-mode', 'adjust'));

    // A press outside the table is somebody going elsewhere, not a border
    // being placed six hundred pixels away.
    screen.getByRole('button', { name: 'altrove' }).dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        pointerId: 1,
        clientX: 10,
        clientY: 10,
      }),
    );

    await waitFor(() => expect(grip).not.toHaveAttribute('data-mode'));
    expect(onWidths).not.toHaveBeenCalled();
    expect(measured()).toBe(200);
  });

  it('never widens a column past what the other columns need to exist', async () => {
    const onWidths = vi.fn();
    render(<Resizable onWidths={onWidths} />);

    const grip = handle();
    grip.focus();
    await browser.keyboard('{End}');

    // `End` used to mean the whole table: measured, a three-column table went
    // to `[968, 0, 0]` and the other two rendered nothing, with `Escape` no
    // help and `Enter` — the only way back — named nowhere the reader could
    // see it.
    const table = screen.getByRole('table').getBoundingClientRect().width;
    await waitFor(() => expect(onWidths).toHaveBeenCalled());
    const chosen = Number(
      String(onWidths.mock.lastCall?.[0].name).replace('px', ''),
    );
    expect(chosen).toBeLessThanOrEqual(Math.round(table) - 48);
    expect(grip.getAttribute('aria-valuemax')).toBe(String(chosen));
  });

  it('will not let the arrows walk through that ceiling', async () => {
    const onWidths = vi.fn();
    render(<Resizable onWidths={onWidths} />);

    const grip = handle();
    grip.focus();
    // The one path the ceiling exists to protect was the one that ignored it:
    // measured, twenty-five larger steps chose 1800 against an `aria-valuemax`
    // of 366, left the other column rendering nothing, and announced a
    // `valuenow` outside its own range.
    for (let i = 0; i < 25; i += 1)
      await browser.keyboard('{Shift>}{ArrowRight}{/Shift}');

    await waitFor(() => expect(onWidths).toHaveBeenCalled());
    const chosen = Number(
      String(onWidths.mock.lastCall?.[0].name).replace('px', ''),
    );
    const ceiling = Number(grip.getAttribute('aria-valuemax'));
    expect(chosen).toBeLessThanOrEqual(ceiling);
    expect(measured()).toBeLessThanOrEqual(ceiling);
    // Every other column still exists.
    const others = screen.getAllByRole('columnheader').slice(1);
    for (const other of others) {
      expect(Math.round(other.getBoundingClientRect().width)).toBeGreaterThan(
        0,
      );
    }
  });

  it('holds the ceiling still under a width that outgrew the table', async () => {
    const { unmount } = render(<Resizable />);
    const honest = Number(
      await waitFor(() => {
        const value = handle().getAttribute('aria-valuemax');
        expect(value).toBeTruthy();
        return value;
      }),
    );
    unmount();

    function Restored(props: { sticky?: boolean; width?: number }) {
      return (
        <Table
          caption="Città"
          rows={cities}
          columns={columns}
          getRowId={(city) => city.id}
          resizableColumns
          stickyHeader={props.sticky}
          scrollProps={
            props.width == null
              ? undefined
              : { style: { inlineSize: `${props.width}px` } }
          }
          columnWidths={{ name: '1800px' }}
          onColumnResize={noop}
        />
      );
    }
    const bare = render(<Restored />);

    // Read off the table, the guard followed the thing it was guarding:
    // measured, a width of 1800px restored from storage grew the TABLE to 1800
    // and the ceiling with it, from 366 to 1752 — so from then on even the
    // paths that do clamp conceded the inflated figure, and `End` would have
    // confirmed it.
    expect(measured()).toBe(1800);
    await waitFor(() =>
      expect(Number(handle().getAttribute('aria-valuemax'))).toBe(honest),
    );
    bare.unmount();

    // And through the other box. `stickyHeader` puts a scroll wrapper between
    // the table and its container, and THAT is what holds the table — not the
    // nearest positioned ancestor, which is a fact about positioning and can
    // be the body. Constrained to 300px the two disagree, and the wrapper is
    // the one the reader can see.
    render(<Restored sticky width={300} />);
    const scroll = document.querySelector('[data-table-scroll]');
    expect(scroll).not.toBeNull();
    expect((scroll as HTMLElement).clientWidth).toBe(300);
    await waitFor(() =>
      expect(Number(handle().getAttribute('aria-valuemax'))).toBe(300 - 48),
    );
  });

  it('promises Enter only where Enter does something', async () => {
    // `onReset` is optional and `Enter` is wired to it alone. `Table` always
    // supplies one, so this is the hand-placed path — where the single hint
    // promised a way back from `End` that did not exist, announced to precisely
    // the reader who cannot check by looking.
    const { unmount } = render(
      <table>
        <thead>
          <tr>
            <th id="c">
              Città
              <TableColumnResizer label="Città" controls="c" onResize={noop} />
            </th>
          </tr>
        </thead>
      </table>,
    );
    const bare = document.getElementById(
      handle().getAttribute('aria-describedby') as string,
    );
    expect(bare?.textContent).toContain('End');
    expect(bare?.textContent).not.toContain('Enter');
    unmount();

    render(<Resizable />);
    const wired = document.getElementById(
      handle().getAttribute('aria-describedby') as string,
    );
    expect(wired?.textContent).toContain('Enter');
  });

  it('gives the column back on Escape, mid-gesture', async () => {
    const onWidths = vi.fn();
    render(<Resizable onWidths={onWidths} />);

    const grip = handle();
    const box = grip.getBoundingClientRect();
    const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    grip.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        pointerId: 1,
        clientX: at.x,
        clientY: at.y,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 1,
        clientX: at.x + 80,
        clientY: at.y,
      }),
    );
    expect(measured()).toBe(280);

    await browser.keyboard('{Escape}');

    // Back where it started, and nothing reported: an abandoned gesture is not
    // a choice.
    await waitFor(() => expect(measured()).toBe(200));
    expect(onWidths).not.toHaveBeenCalled();
    // AND THE CELL IS REACT'S AGAIN. Writing the measured pixels back instead
    // of what React had written left a fixed width that React never overwrote,
    // because its own prop had not changed — a relative column silently stopped
    // following its container.
    expect(cell().style.inlineSize).toBe('200px');
  });

  it('gives a relative column back to its container on Escape', async () => {
    function Relative() {
      const widths = useColumnWidths();
      return (
        <Table
          caption="Città"
          rows={cities}
          columns={[
            { key: 'name', header: 'Città', rowHeader: true, width: '40%' },
            { key: 'region', header: 'Regione' },
          ]}
          getRowId={(city) => city.id}
          resizableColumns
          {...widths.props}
        />
      );
    }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Relative />);

    const grip = handle();
    const box = grip.getBoundingClientRect();
    const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    grip.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        pointerId: 1,
        clientX: at.x,
        clientY: at.y,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 1,
        clientX: at.x + 80,
        clientY: at.y,
      }),
    );
    await browser.keyboard('{Escape}');

    // Verbatim, not measured: `'40%'` is what React wrote and what it still
    // believes, so anything else here is a value nothing will ever correct.
    await waitFor(() => expect(cell().style.inlineSize).toBe('40%'));
    warn.mockRestore();
  });

  it('restores the declared width on a double click', async () => {
    const onWidths = vi.fn();
    render(<Resizable onWidths={onWidths} />);

    handle().focus();
    await browser.keyboard('{ArrowRight}');
    await waitFor(() => expect(onWidths).toHaveBeenCalled());

    // The gesture every table with draggable borders has taught people to
    // expect — and the one a `preventDefault()` on `pointerdown` would silently
    // remove, because that is what suppresses the compatibility mouse events a
    // `dblclick` is built from.
    await browser.dblClick(handle());
    await waitFor(() => expect(onWidths.mock.lastCall?.[0]).toEqual({}));
  });

  it('speaks the reader’s language', async () => {
    renderUi(<Resizable />, { locale: 'it' });

    expect(
      screen.getByRole('separator', { name: 'Ridimensiona Città' }),
    ).toBeInTheDocument();
  });

  it('has no violations', async () => {
    const { container } = render(<Resizable />);

    await expectNoA11yViolations(container);
  });
});

describe('a resizable table', () => {
  it('names the header cell itself, so the handle does not join the column', async () => {
    render(<Resizable />);

    // Same rule the filter trigger established: a `columnheader` is named from
    // its contents, and the handle's own "Resize Città" would otherwise be read
    // before every cell in the column.
    expect(cell()).toHaveAttribute('aria-label', 'Città');
  });

  it('is in a fixed layout before anything has been dragged', async () => {
    render(<Resizable />);

    // Under the automatic algorithm a width is a suggestion the browser
    // overrides whenever the content is wider — so the first drag would move
    // the border and the column would spring back, which reads as the handle
    // being broken.
    expect(screen.getByRole('table')).toHaveAttribute('data-layout', 'fixed');
    expect(screen.getByRole('table')).toHaveAttribute('data-resizable', '');
  });

  it('lets one column opt out of a resizable table', async () => {
    function Mixed() {
      const widths = useColumnWidths();
      return (
        <Table
          caption="Città"
          rows={cities}
          columns={[
            { key: 'name', header: 'Città', rowHeader: true, resizable: false },
            { key: 'region', header: 'Regione' },
            { key: 'id', header: 'Id' },
          ]}
          getRowId={(city) => city.id}
          resizableColumns
          {...widths.props}
        />
      );
    }
    render(<Mixed />);

    // One rule, `column.resizable ?? resizableColumns` — not two facts that can
    // disagree. `name` opted out; `id` is last and never gets one.
    expect(screen.getAllByRole('separator')).toHaveLength(1);
    expect(
      screen.getByRole('separator', { name: 'Resize Regione' }),
    ).toBeInTheDocument();
  });

  it('draws nothing when the mark has nobody listening', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Table
        caption="Città"
        rows={cities}
        columns={columns}
        getRowId={(city) => city.id}
        resizableColumns
      />,
    );

    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('`onColumnResize`'),
    );
    warn.mockRestore();
  });

  it('warns about a relative width the handle cannot give back', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    function Relative() {
      const widths = useColumnWidths();
      return (
        <Table
          caption="Città"
          rows={cities}
          columns={[
            { key: 'name', header: 'Città', rowHeader: true, width: '40%' },
            { key: 'region', header: 'Regione' },
          ]}
          getRowId={(city) => city.id}
          resizableColumns
          {...widths.props}
        />
      );
    }
    render(<Relative />);

    // The gesture measures the rendered column and reports pixels, so the first
    // drag replaces `40%` with a fixed width and it stops following the
    // container — which looks like the handle breaking the layout.
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('relative'));
    warn.mockRestore();
  });

  it('overrides the declared width, and gives it back when reset', async () => {
    function Controlled() {
      const [widths, setWidths] = useState<Record<string, string>>({
        name: '320px',
      });
      return (
        <Table
          caption="Città"
          rows={cities}
          columns={columns}
          getRowId={(city) => city.id}
          resizableColumns
          columnWidths={widths}
          onColumnResize={(key, width) =>
            setWidths((previous) => {
              const next = { ...previous };
              if (width === '') delete next[key];
              else next[key] = width;
              return next;
            })
          }
        />
      );
    }
    render(<Controlled />);

    expect(measured()).toBe(320);

    handle().focus();
    await browser.keyboard('{Enter}');
    // Back to the column's own `200px`, which it never stopped holding.
    await waitFor(() => expect(measured()).toBe(200));
  });
});
