import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { FormDateRangePicker } from './form-date-range-picker.component.js';
import { UiProvider } from '../../i18n/provider.js';
import { expectNoA11yViolations } from '../../test/axe.js';
import type { UseFormField } from '../../form/form-adapter.types.js';

/**
 * Render a bound range with a hand-written adapter, so the test names no form
 * library — and can stand in for any of them by varying only what the adapter
 * puts in `control`, which is where the defects live.
 */
function renderBound(field: UseFormField, ui: React.ReactNode): HTMLElement {
  const { container } = render(
    <UiProvider adapters={{ i18n: { locale: 'it' }, form: { field } }}>
      <form>{ui}</form>
    </UiProvider>,
  );
  return container;
}

const picker = (extra: Record<string, unknown> = {}) => (
  <FormDateRangePicker
    startName="checkIn"
    endName="checkOut"
    startLabel="Arrivo"
    endLabel="Partenza"
    legend="Il tuo soggiorno"
    defaultMonth={{ year: 2026, month: 8, day: 1 }}
    {...extra}
  />
);

const open = () =>
  browser.click(
    screen.getByRole('button', { name: 'Scegli le date dal calendario' }),
  );

const day = (container: HTMLElement, iso: string) =>
  container.querySelector(`[data-day="${iso}"]`) as HTMLElement;

const carrier = (container: HTMLElement, name: string) =>
  container.querySelector(`[data-carrier][name="${name}"]`) as HTMLInputElement;

describe('FormDateRangePicker', () => {
  it('binds TWO fields, which nothing here had done before', async () => {
    const seen: string[] = [];
    const container = renderBound((name) => {
      seen.push(name);
      return { control: { name }, errors: [] };
    }, picker());

    // The port is `(name) => BoundField`, a hook per field — so two fields are
    // two calls of it, in a fixed order, and no new port shape was needed.
    expect(seen).toEqual(['checkIn', 'checkOut']);
    expect(carrier(container, 'checkIn')).not.toBeNull();
    expect(carrier(container, 'checkOut')).not.toBeNull();
  });

  it('names the pair with a legend, and each field for itself', () => {
    renderBound((name) => ({ control: { name }, errors: [] }), picker());

    // `Field` gives its control an id and expects ONE control to take it:
    // measured with two, both inputs carried the same id and its label named
    // neither. A group is named by a legend.
    expect(
      screen.getByRole('group', { name: 'Il tuo soggiorno' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Arrivo' })).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Partenza' }),
    ).toBeInTheDocument();
  });

  it('gives each binding a ref to ITS carrier, not to the visible field', async () => {
    const held: Record<string, HTMLInputElement | null> = {};
    const container = renderBound(
      (name) => ({
        control: {
          name,
          ref: (node: HTMLInputElement | null) => {
            held[name] = node;
          },
        },
        errors: [],
      }),
      picker(),
    );

    await browser.fill(
      screen.getByRole('textbox', { name: 'Arrivo' }),
      '12082026',
    );

    // A library reads `.value` off the element its ref was given. Given the
    // visible field it would store `12/08/2026`.
    expect(held.checkIn).toBe(carrier(container, 'checkIn'));
    expect(held.checkOut).toBe(carrier(container, 'checkOut'));
    expect(held.checkIn?.value).toBe('2026-08-12');
  });

  it('tells each binding when the calendar writes its end', async () => {
    const changes: { name: string; value: string }[] = [];
    const container = renderBound(
      (name) => ({
        control: {
          name,
          onChange: (event) =>
            changes.push({
              name,
              value: (event.target as HTMLInputElement).value,
            }),
        },
        errors: [],
      }),
      picker(),
    );

    await open();
    await browser.click(day(container, '2026-08-12'));
    await browser.click(day(container, '2026-08-15'));

    // No `setValue`, no library-specific lever: the component holds both
    // carriers and writes each the way a keystroke does.
    expect(changes.filter((c) => c.name === 'checkIn').at(-1)?.value).toBe(
      '2026-08-12',
    );
    expect(changes.filter((c) => c.name === 'checkOut').at(-1)?.value).toBe(
      '2026-08-15',
    );
  });

  it('seeds each end from its own binding', () => {
    renderBound(
      (name) => ({
        control: {
          name,
          defaultValue: name === 'checkIn' ? '2026-08-12' : '2026-08-15',
        },
        errors: [],
      }),
      picker(),
    );
    expect(screen.getByRole('textbox', { name: 'Arrivo' })).toHaveValue(
      '12/08/2026',
    );
    expect(screen.getByRole('textbox', { name: 'Partenza' })).toHaveValue(
      '15/08/2026',
    );
  });

  it('FOLLOWS a controlled adapter when either end moves', async () => {
    function Controlled() {
      const [held, setHeld] = useState({
        checkIn: '2026-08-12',
        checkOut: '2026-08-15',
      });
      const field: UseFormField = (name) => ({
        control: { name, value: held[name as keyof typeof held] },
        errors: [],
      });
      return (
        <UiProvider adapters={{ i18n: { locale: 'it' }, form: { field } }}>
          <form>
            {picker()}
            <button
              type="button"
              onClick={() =>
                setHeld({ checkIn: '2027-06-01', checkOut: '2027-06-08' })
              }
            >
              Da fuori
            </button>
          </form>
        </UiProvider>
      );
    }
    const { container } = render(<Controlled />);

    // Formik and TanStack hand over `value` and no ref, expecting the value
    // they hold to be rendered back. This family cannot render an ISO string
    // into the box, so each end is followed onto its own carrier.
    await browser.click(screen.getByRole('button', { name: 'Da fuori' }));

    expect(screen.getByRole('textbox', { name: 'Arrivo' })).toHaveValue(
      '01/06/2027',
    );
    expect(screen.getByRole('textbox', { name: 'Partenza' })).toHaveValue(
      '08/06/2027',
    );
    expect(carrier(container, 'checkOut').value).toBe('2027-06-08');
  });

  it('never lets a native-control prop through to fields that are not one', () => {
    renderBound(
      (name) => ({
        control: {
          name,
          // What a schema declaring `types: { checkIn: 'date' }` emits.
          type: 'date',
          pattern: '\\d{4}-\\d{2}-\\d{2}',
          min: '1900-01-01',
        },
        errors: [],
      }),
      picker(),
    );

    for (const name of ['Arrivo', 'Partenza']) {
      const box = screen.getByRole('textbox', { name });
      expect(box).toHaveAttribute('type', 'text');
      expect(box).not.toHaveAttribute('pattern');
      expect(box).not.toHaveAttribute('min');
    }
  });

  it('shows the messages of BOTH ends, in field order', () => {
    renderBound(
      (name) => ({
        control: { name },
        errors:
          name === 'checkIn' ? ['Serve un arrivo.'] : ['Serve una partenza.'],
      }),
      picker({ hint: 'Quando arrivi e quando riparti.' }),
    );

    const group = screen.getByRole('group', { name: 'Il tuo soggiorno' });
    expect(group).toHaveTextContent('Serve un arrivo.');
    expect(group).toHaveTextContent('Serve una partenza.');
    expect(group).toHaveTextContent('Quando arrivi e quando riparti.');
  });

  it('posts two entries, under the two names', async () => {
    const container = renderBound(
      (name) => ({ control: { name }, errors: [] }),
      picker(),
    );

    await open();
    await browser.click(day(container, '2026-08-12'));
    await browser.click(day(container, '2026-08-15'));

    const form = container.querySelector('form') as HTMLFormElement;
    const data = new FormData(form);
    expect([...data.keys()]).toEqual(['checkIn', 'checkOut']);
    expect(data.get('checkIn')).toBe('2026-08-12');
    expect(data.get('checkOut')).toBe('2026-08-15');
  });

  it('warns rather than sever when a call site takes what the binding owns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderBound(
      (name) => ({ control: { name }, errors: [] }),
      picker({ onChange: () => undefined }),
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('FormDateRangePicker'),
    );
    warn.mockRestore();
  });

  it('has no accessibility violations, closed and open', async () => {
    const container = renderBound(
      (name) => ({
        control: {
          name,
          defaultValue: name === 'checkIn' ? '2026-08-12' : '2026-08-15',
        },
        errors: name === 'checkIn' ? ['Serve un arrivo.'] : [],
      }),
      picker({ hint: 'Quando arrivi e quando riparti.' }),
    );
    await expectNoA11yViolations(container);
    await open();
    await expectNoA11yViolations(container);
  });
});
