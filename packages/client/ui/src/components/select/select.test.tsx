import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './select.component.js';
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

  // axe in real Chromium — every size, in each theme.
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
            </div>,
            { theme },
          );
          await expectNoA11yViolations(container);
        });
      }
    }
  });
});
