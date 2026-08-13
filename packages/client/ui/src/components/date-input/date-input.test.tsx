import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { DateInput } from './date-input.component.js';
import { Field } from '../field/field.component.js';
import { Input } from '../input/input.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const field = () => screen.getByLabelText('Due') as HTMLInputElement;

describe('DateInput', () => {
  it('is the platform’s date field, not a drawing of one', () => {
    render(<DateInput aria-label="Due" />);
    // The whole decision (ADR-0027) as an assertion. If this ever stops being a
    // native date input, the locale display, the OS sheet on touch, the ISO
    // value and `form.reset()` all went with it.
    expect(field().type).toBe('date');
  });

  it('lines up with a text field, which is why it has no styles of its own', () => {
    render(
      <>
        <Input aria-label="Text" defaultValue="x" />
        <DateInput aria-label="Due" defaultValue="2026-08-12" />
      </>,
    );
    const text = screen.getByLabelText('Text');
    // Measured before this component existed, and the reason it adds no CSS:
    // `Input`'s size axis already fits a date field. A stylesheet here would be
    // a second source of truth for a height that is already right.
    expect(field().getBoundingClientRect().height).toBe(
      text.getBoundingClientRect().height,
    );
  });

  describe('the value stays the browser’s', () => {
    it('keeps the ISO string in the DOM', async () => {
      render(<DateInput aria-label="Due" defaultValue="2026-08-12" />);
      expect(field().value).toBe('2026-08-12');
    });

    it('IS RESTORED BY form.reset(), because React never held it', () => {
      const { container } = render(
        <form>
          <DateInput aria-label="Due" defaultValue="2026-08-12" />
        </form>,
      );
      const form = container.querySelector('form') as HTMLFormElement;

      field().value = '2026-01-01';
      form.reset();
      // The measured reason this component takes no controlled `date` prop: a
      // value re-homed into React comes back as React's stale copy instead.
      expect(field().value).toBe('2026-08-12');
    });

    it('submits under its name, as one field of a form', () => {
      const { container } = render(
        <form>
          <DateInput aria-label="Due" name="due" defaultValue="2026-08-12" />
        </form>,
      );
      const form = container.querySelector('form') as HTMLFormElement;
      expect(new FormData(form).get('due')).toBe('2026-08-12');
    });

    it('carries min and max into ValidityState, untouched', () => {
      render(
        <DateInput
          aria-label="Due"
          min="2026-08-01"
          max="2026-08-31"
          defaultValue="2026-08-12"
        />,
      );
      field().value = '2026-07-01';
      expect(field().validity.rangeUnderflow).toBe(true);
      field().value = '2026-09-30';
      expect(field().validity.rangeOverflow).toBe(true);
    });
  });

  describe('the reading it adds', () => {
    it('reports the day as a day, which is the whole reason it exists', async () => {
      const onDateChange = vi.fn();
      render(<DateInput aria-label="Due" onDateChange={onDateChange} />);

      await browser.fill(field(), '2026-08-12');

      await waitFor(() =>
        expect(onDateChange).toHaveBeenLastCalledWith({
          year: 2026,
          month: 8,
          day: 12,
        }),
      );
      // THE DEFECT THIS PREVENTS, stated so it holds in every timezone rather
      // than in the one the machine happens to be in. The hand-rolled version
      // builds an instant at UTC midnight, so its local day is the ISO day only
      // where the offset is not west of UTC — 11 in America/Lima, 12 on a UTC
      // runner. That the answer moves with the runner IS the defect; asserting
      // one runner's answer is how the first version of this test went red in
      // CI while being perfectly green here.
      const naive = new Date(field().value);
      expect(naive.getUTCDate()).toBe(12);
      expect(naive.getDate()).toBe(naive.getTimezoneOffset() > 0 ? 11 : 12);
    });

    it('says null rather than guessing, when the field names no day', async () => {
      const onDateChange = vi.fn();
      render(
        <DateInput
          aria-label="Due"
          defaultValue="2026-08-12"
          onDateChange={onDateChange}
        />,
      );

      await browser.fill(field(), '');
      await waitFor(() => expect(onDateChange).toHaveBeenLastCalledWith(null));
    });

    it('runs BESIDE onChange and never instead of it', async () => {
      // Read INSIDE the handler: React clears `currentTarget` once the event
      // has been dispatched, so an assertion that reaches for it afterwards
      // finds `null` and says nothing about what the consumer actually saw.
      const seen: string[] = [];
      const onChange = vi.fn((event: { currentTarget: HTMLInputElement }) => {
        seen.push(event.currentTarget.value);
      });
      const onDateChange = vi.fn();
      render(
        <DateInput
          aria-label="Due"
          onChange={onChange}
          onDateChange={onDateChange}
        />,
      );

      await browser.fill(field(), '2026-08-12');

      // Both, every time. A component that swallowed `onChange` would sever
      // every form library that binds through it — which is the thing ADR-0013
      // exists to prevent.
      await waitFor(() => expect(onChange).toHaveBeenCalled());
      expect(onDateChange).toHaveBeenCalled();
      expect(seen.at(-1)).toBe('2026-08-12');
    });

    it('seeds from a day, and an explicit defaultValue still wins', () => {
      const { rerender } = render(
        <DateInput
          aria-label="Due"
          defaultDate={{ year: 2026, month: 8, day: 12 }}
        />,
      );
      expect(field().value).toBe('2026-08-12');

      rerender(
        <DateInput
          key="second"
          aria-label="Due"
          defaultDate={{ year: 2026, month: 8, day: 12 }}
          defaultValue="2027-01-02"
        />,
      );
      // The precedence every component here gives the call site.
      expect(screen.getByLabelText('Due')).toHaveValue('2027-01-02');
    });

    it('refuses to seed a day that does not exist', () => {
      render(
        <DateInput
          aria-label="Due"
          defaultDate={{ year: 2026, month: 2, day: 30 }}
        />,
      );
      // Empty, not the 2nd of March — which is what `new Date(2026, 1, 30)`
      // would have made of it.
      expect(field().value).toBe('');
    });
  });

  it('inside a Field, adopts its id, description and invalid state', async () => {
    render(
      <Field label="Due" hint="Weekdays only." error="Too early.">
        <DateInput />
      </Field>,
    );
    const el = screen.getByLabelText(/Due/);
    expect(el).toHaveAttribute('id');
    expect(el).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() =>
      expect(el).toHaveAccessibleDescription('Weekdays only. Too early.'),
    );
  });

  it('spreads arbitrary native props through, like the Input it is', () => {
    render(
      <DateInput aria-label="Due" name="due" required step={7} readOnly />,
    );
    expect(field()).toHaveAttribute('name', 'due');
    expect(field()).toHaveAttribute('required');
    expect(field()).toHaveAttribute('step', '7');
    expect(field()).toHaveAttribute('readonly');
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(
      <DateInput aria-label="Due" defaultValue="2026-08-12" />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  describe('accessibility (axe)', () => {
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      it(`has no violations — ${name}`, async () => {
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            <Field label="Due">
              <DateInput defaultValue="2026-08-12" />
            </Field>
            <Field label="Broken" error="Too early.">
              <DateInput defaultValue="2026-08-12" />
            </Field>
            <Field label="Off">
              <DateInput disabled defaultValue="2026-08-12" />
            </Field>
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });
});
