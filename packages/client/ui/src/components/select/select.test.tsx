import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './select.component.js';
import { Field } from '../field/field.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const Options = () => (
  <>
    <option value="">Choose…</option>
    <option value="it">Italy</option>
    <option value="fr">France</option>
  </>
);

describe('Select', () => {
  it('is a combobox that takes its name from an associated label', () => {
    render(
      <label>
        Country
        <Select>
          <Options />
        </Select>
      </label>,
    );
    // A single-choice <select> maps to the combobox role — the OS renders the
    // popup, which is the whole point of using the native control.
    expect(
      screen.getByRole('combobox', { name: 'Country' }),
    ).toBeInTheDocument();
  });

  it('takes its options — and its groups — as children', () => {
    render(
      <Select aria-label="q">
        <optgroup label="Europe">
          <option value="it">Italy</option>
        </optgroup>
      </Select>,
    );
    expect(screen.getByRole('group', { name: 'Europe' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Italy' })).toBeInTheDocument();
  });

  // The Field wiring was untested: removing `useFieldControl` from the component
  // left all 14 tests green. Input's suite had this; this one had copied
  // everything but.
  it('inside a Field, adopts its id, description and invalid state', async () => {
    render(
      <Field label="Country" hint="Where you live." error="Pick one.">
        <Select>
          <Options />
        </Select>
      </Field>,
    );

    const select = screen.getByRole('combobox', { name: 'Country' });
    expect(select).toHaveAttribute('id');
    expect(select).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() =>
      expect(select).toHaveAccessibleDescription('Where you live. Pick one.'),
    );
  });

  it('honours its size axis, and merges the consumer className', () => {
    // Both were unasserted: `selectVariants({})` and dropping `className` from
    // `cn` each left the suite green.
    const { rerender } = render(
      <Select aria-label="q" size="lg" className="mine">
        <Options />
      </Select>,
    );
    const select = screen.getByRole('combobox', { name: 'q' });
    const large = select.className;
    expect(select).toHaveClass('mine');

    rerender(
      <Select aria-label="q" size="sm" className="mine">
        <Options />
      </Select>,
    );
    expect(screen.getByRole('combobox', { name: 'q' }).className).not.toBe(
      large,
    );
  });

  describe('what it refuses, where the type cannot reach', () => {
    it('drops `multiple` from a spread — it would flip the role to listbox', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      // A JSX spread of a non-fresh object skips excess-property checks, and
      // this is the path FormSelect takes with the adapter's bag. Conform's
      // `getInputProps` really does emit `multiple` for an array field.
      const bag = { multiple: true } as object;
      render(
        <Select aria-label="q" {...bag}>
          <Options />
        </Select>,
      );

      const select = screen.getByRole<HTMLSelectElement>('combobox', {
        name: 'q',
      });
      expect(select.multiple).toBe(false);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Select: `multiple` is not supported'),
      );
      warn.mockRestore();
    });

    it('drops a numeric `size`, and keeps the height it would have removed', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const bag = { size: 5 } as object;
      render(
        <Select aria-label="q" {...bag}>
          <Options />
        </Select>,
      );

      const forced = screen.getByRole<HTMLSelectElement>('combobox', {
        name: 'q',
      });
      expect(forced).not.toHaveAttribute('size');
      // cva's default only fires on `undefined`, so a numeric size used to
      // remove the class outright and leave the control unsized.
      const { container } = render(
        <Select aria-label="plain">
          <Options />
        </Select>,
      );
      expect(forced.className).toBe(
        container.querySelector('select')?.className,
      );
      warn.mockRestore();
    });
  });

  it('forwards ref to the select element', () => {
    let el: HTMLElement | null = null;
    render(
      <Select
        aria-label="q"
        ref={(node) => {
          el = node;
        }}
      >
        <Options />
      </Select>,
    );
    expect(el).toBeInstanceOf(HTMLSelectElement);
  });

  // What this catches: a change in the MARKUP — a stray wrapper, a lost
  // attribute. What it does NOT catch: anything in the stylesheet. The class
  // names are content-hashed, so editing one declaration fails this test with
  // the same diff as editing another, and the reflex `-u` absorbs both.
  it('matches the rendered snapshot', () => {
    const { container } = render(
      <Select aria-label="q">
        <Options />
      </Select>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  describe('transparency (ADR-0013)', () => {
    it('spreads arbitrary native props through to the select', () => {
      render(
        <Select aria-label="q" name="country" required autoComplete="country">
          <Options />
        </Select>,
      );
      const select = screen.getByRole('combobox', { name: 'q' });
      expect(select).toHaveAttribute('name', 'country');
      expect(select).toBeRequired();
      expect(select).toHaveAttribute('autocomplete', 'country');
    });

    it('works uncontrolled — does not hijack the value', async () => {
      const user = userEvent.setup();
      render(
        <Select aria-label="q" defaultValue="">
          <Options />
        </Select>,
      );
      const select = screen.getByRole<HTMLSelectElement>('combobox', {
        name: 'q',
      });
      await user.selectOptions(select, 'fr');
      expect(select.value).toBe('fr');
    });

    it('works controlled — forwards onChange and never owns the value itself', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Select aria-label="q" value="" onChange={onChange}>
          <Options />
        </Select>,
      );
      const select = screen.getByRole<HTMLSelectElement>('combobox', {
        name: 'q',
      });

      await user.selectOptions(select, 'it');

      expect(onChange).toHaveBeenCalledTimes(1);
      // The value stayed where the consumer put it: the component never wrote
      // to it, which is what makes it drop into any form library.
      expect(select.value).toBe('');
    });

    it('presents the invalid state from the native attribute', () => {
      render(
        <Select aria-label="q" aria-invalid="true">
          <Options />
        </Select>,
      );
      expect(screen.getByRole('combobox', { name: 'q' })).toHaveAttribute(
        'aria-invalid',
        'true',
      );
    });
  });

  // axe in real Chromium — every size AND the states Input already audited:
  // invalid and disabled shipped unchecked here, which lowered a bar the repo
  // had already set.
  describe('accessibility (axe)', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      for (const size of sizes) {
        it(`has no violations — ${size} / ${name}`, async () => {
          const { container } = renderUi(
            <div
              style={{
                background: 'var(--fm-color-background)',
                color: 'var(--fm-color-foreground)',
                padding: '1rem',
              }}
            >
              <label>
                Country
                <Select size={size}>
                  <Options />
                </Select>
              </label>
              <label>
                Invalid
                <Select size={size} aria-invalid="true">
                  <Options />
                </Select>
              </label>
              <label>
                Disabled
                <Select size={size} disabled>
                  <Options />
                </Select>
              </label>
              <label>
                Grouped
                <Select size={size}>
                  <optgroup label="Europe">
                    <option value="it">Italy</option>
                  </optgroup>
                </Select>
              </label>
            </div>,
            { theme },
          );
          await expectNoA11yViolations(container);
        });
      }
    }
  });

  describe('the base-select branch, on the one engine that has it', () => {
    // Every claim in the `@supports (appearance: base-select)` block was
    // measured by hand and guarded by nothing — while the suite runs on
    // Chromium, which is exactly the engine that implements it. These pin the
    // two decisions a refactor would silently undo.

    const supported = CSS.supports('appearance', 'base-select');

    it('draws the closed chevron with PHYSICAL borders, so rtl cannot lay it down', () => {
      if (!supported) return;
      render(
        <div dir="rtl">
          <Select aria-label="Città" defaultValue="a">
            <option value="a">Aosta</option>
          </Select>
        </div>,
      );
      const style = getComputedStyle(
        screen.getByRole('combobox'),
        '::picker-icon',
      );
      // Logical borders swap under rtl while the rotation does not: the glyph
      // then points LEFT when closed. Physical right+bottom cannot swap.
      expect(Number.parseFloat(style.borderRightWidth)).toBeGreaterThan(0);
      expect(Number.parseFloat(style.borderBottomWidth)).toBeGreaterThan(0);
      expect(Number.parseFloat(style.borderLeftWidth)).toBe(0);
      expect(Number.parseFloat(style.borderTopWidth)).toBe(0);
    });

    it('keeps the picker icon transition inside the motion tokens', () => {
      if (!supported) return;
      render(
        <Select aria-label="Città" defaultValue="a">
          <option value="a">Aosta</option>
        </Select>,
      );
      const style = getComputedStyle(
        screen.getByRole('combobox'),
        '::picker-icon',
      );
      expect(style.transitionProperty).toContain('rotate');
      expect(Number.parseFloat(style.transitionDuration)).toBeGreaterThan(0);
    });
  });

  describe('direction is computed, not matched by attribute', () => {
    it('keeps the fallback arrow on the reading side inside an ltr island', () => {
      // `[dir='rtl'] .select` matched through the ancestor while the control
      // resolved ltr: `pe-8` freed the right, the rule forced the arrow left,
      // and the label ran underneath it. `:dir()` resolves what the element
      // actually is.
      render(
        <div dir="rtl">
          <div dir="ltr">
            <Select aria-label="Città" defaultValue="a">
              <option value="a">Aosta</option>
            </Select>
          </div>
          <Select aria-label="مدينة" defaultValue="a">
            <option value="a">أوستا</option>
          </Select>
        </div>,
      );
      const [island, inherited] = screen.getAllByRole('combobox');
      // Chromium serialises the computed anchors distinguishably: a
      // right-anchored offset computes to `calc(100% - …)`, a left-anchored
      // one to plain pixels from the left edge. Measured, not assumed.
      // The island resolves ltr: the arrow anchors right, like any ltr select…
      expect(getComputedStyle(island).backgroundPosition).toContain('100%');
      // …and the inherited-rtl one anchors left, with nothing on the element.
      const inheritedPosition = getComputedStyle(inherited).backgroundPosition;
      expect(inheritedPosition).not.toContain('100%');
      expect(inheritedPosition).toMatch(/^\d/);
    });
  });
});
