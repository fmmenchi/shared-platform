import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { TableFilterTrigger } from './table-filter-trigger.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * What is proved here is the bargain the design rests on: the state reaches a
 * reader who cannot see the glyph, the editor holds a DRAFT rather than
 * filtering as you type, and every way out that is not Apply discards.
 */
function Controlled(props: {
  initial?: string;
  onApply?: (v: string) => void;
}) {
  const [value, setValue] = useState(props.initial ?? '');
  return (
    <TableFilterTrigger
      label="Città"
      value={value}
      onApply={(next) => {
        setValue(next);
        props.onApply?.(next);
      }}
    />
  );
}

const trigger = () => screen.getByRole('button', { name: /Città/ });
const field = () => screen.getByRole('textbox', { name: 'Città' });
// The editor is inside a closed `<dialog>` once it is dismissed, and a closed
// dialog is not in the accessibility tree — so `getByRole` THROWS rather than
// returning something invisible, and the query is the only way to assert it
// went away.
const noField = () => screen.queryByRole('textbox', { name: 'Città' });

describe('a column filter trigger', () => {
  it('says whether the column is filtered, in words rather than in colour', async () => {
    const { rerender } = render(
      <TableFilterTrigger label="Città" value="" onApply={() => undefined} />,
    );

    // "Filter City" — not a funnel with a tint, which is a state carried by
    // colour alone and reaches nobody who cannot see it.
    expect(trigger()).toHaveAccessibleName('Filter Città');
    expect(trigger().querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );

    rerender(
      <TableFilterTrigger
        label="Città"
        value="Milano"
        onApply={() => undefined}
      />,
    );
    expect(trigger()).toHaveAccessibleName('Filter Città, currently Milano');
  });

  it('draws the value once — the eye reads it, the name says it', async () => {
    render(
      <TableFilterTrigger
        label="Città"
        value="Milano"
        onApply={() => undefined}
      />,
    );

    // Visible for compactness, `aria-hidden` because the accessible name
    // already carries it: without this a reader hears "Milano" twice.
    const shown = screen.getByText('Milano');
    expect(shown).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies on Apply, and not before — the rows do not move while you type', async () => {
    const onApply = vi.fn();
    render(<Controlled onApply={onApply} />);

    await browser.click(trigger());
    await waitFor(() => expect(field()).toBeVisible());

    await browser.fill(field(), 'Mil');
    // THE WHOLE POINT: three keystrokes, zero applications. Filtering per
    // keystroke deletes rows under a reader continuously and leaves the live
    // region nothing discrete to announce.
    expect(onApply).not.toHaveBeenCalled();

    await browser.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(onApply).toHaveBeenCalledWith('Mil'));
    // And it closes, because the editor exists only while it is being used.
    await waitFor(() => expect(noField()).toBeNull());
  });

  it('applies on Enter, because the editor is a real form', async () => {
    const onApply = vi.fn();
    render(<Controlled onApply={onApply} />);

    await browser.click(trigger());
    await waitFor(() => expect(field()).toBeVisible());
    await browser.fill(field(), 'Roma');
    await browser.keyboard('{Enter}');

    await waitFor(() => expect(onApply).toHaveBeenCalledWith('Roma'));
  });

  it('puts the focus in the field, so the reader can type on arrival', async () => {
    render(<Controlled />);

    // The surface carries `autofocus`, so without this the platform focuses the
    // DIALOG and somebody who came here to type has to Tab first.
    await browser.click(trigger());
    await waitFor(() => expect(field()).toHaveFocus());
  });

  it('selects what is applied, so the first keystroke replaces it', async () => {
    const onApply = vi.fn();
    render(<Controlled initial="Milano" onApply={onApply} />);

    await browser.click(trigger());
    await waitFor(() => expect(field()).toHaveFocus());
    await browser.keyboard('Roma');
    await browser.keyboard('{Enter}');

    // `focus()` alone would have produced "MilanoRoma" — appending to a value
    // the reader came here to change.
    await waitFor(() => expect(onApply).toHaveBeenCalledWith('Roma'));
  });

  it('discards on Escape, and again on the next visit', async () => {
    const onApply = vi.fn();
    render(<Controlled initial="Milano" onApply={onApply} />);

    await browser.click(trigger());
    await waitFor(() => expect(field()).toHaveFocus());
    await browser.fill(field(), 'Torino');
    await browser.keyboard('{Escape}');

    await waitFor(() => expect(noField()).toBeNull());
    expect(onApply).not.toHaveBeenCalled();
    expect(trigger()).toHaveAccessibleName('Filter Città, currently Milano');

    // RESEEDED, not remembered: an abandoned draft that survives is a value the
    // reader thinks they cancelled, waiting to be applied by the next Enter.
    await browser.click(trigger());
    await waitFor(() => expect(field()).toHaveValue('Milano'));
  });

  it('clears through the same path it applies through', async () => {
    const onApply = vi.fn();
    render(<Controlled initial="Milano" onApply={onApply} />);

    await browser.click(trigger());
    await waitFor(() => expect(field()).toBeVisible());
    await browser.click(screen.getByRole('button', { name: 'Clear' }));

    // An apply of nothing, not a second mode — so whoever owns the state hears
    // one kind of event and announces it one way.
    await waitFor(() => expect(onApply).toHaveBeenCalledWith(''));
    await waitFor(() => expect(trigger()).toHaveAccessibleName('Filter Città'));
  });

  it('offers nothing to clear when there is nothing applied', async () => {
    render(<Controlled />);

    await browser.click(trigger());
    await waitFor(() => expect(field()).toBeVisible());
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
  });

  it('speaks the reader’s language', async () => {
    renderUi(
      <TableFilterTrigger
        label="Città"
        value="Milano"
        onApply={() => undefined}
      />,
      { locale: 'it' },
    );

    expect(trigger()).toHaveAccessibleName('Filtra Città, attualmente Milano');
  });

  it('keeps the draft when the applied value changes under an open editor', async () => {
    const { rerender } = render(
      <TableFilterTrigger
        label="Città"
        value="Milano"
        onApply={() => undefined}
      />,
    );

    await browser.click(trigger());
    await waitFor(() => expect(field()).toHaveFocus());
    await browser.fill(field(), 'Torino');

    // NOT A CLICK OUTSIDE — that light-dismisses the popover, which is the
    // platform working. This is the other route: a URL sync, a refetch, or the
    // toolbar's own "clear filters" reached by keyboard, all of which arrive as
    // a new `value` while the editor is open. The first version of this
    // component reseeded the draft on every report of `open`, and a report
    // arrives whenever the handler's identity changes — so the reader's typing
    // was replaced and the focus yanked back into the field.
    rerender(
      <TableFilterTrigger
        label="Città"
        value="Napoli"
        onApply={() => undefined}
      />,
    );

    expect(field()).toHaveValue('Torino');
  });

  it('reports nothing when Apply changes nothing', async () => {
    const onApply = vi.fn();
    render(<Controlled initial="Milano" onApply={onApply} />);

    await browser.click(trigger());
    await waitFor(() => expect(field()).toBeVisible());
    await browser.click(screen.getByRole('button', { name: 'Apply' }));

    // Not merely redundant: the state hook returns a fresh object either way,
    // so the matcher re-runs over every row and a consumer told to put this in
    // a query key gets a refetch and a history entry for a view that did not
    // move.
    await waitFor(() => expect(noField()).toBeNull());
    expect(onApply).not.toHaveBeenCalled();
  });

  it('has no violations, open or closed', async () => {
    const { container } = render(<Controlled initial="Milano" />);

    await expectNoA11yViolations(container);

    await browser.click(trigger());
    await waitFor(() => expect(field()).toBeVisible());
    await expectNoA11yViolations(container);
  });
});
