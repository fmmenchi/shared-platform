import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChoiceField } from './choice-field.component.js';
import { Field } from '../field/field.component.js';
import { Checkbox } from '../checkbox/checkbox.component.js';
import { Radio } from '../radio/radio.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { Input } from '../input/input.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const box = { inlineSize: '20rem' };

describe('ChoiceField', () => {
  afterEach(() => vi.restoreAllMocks());

  it('labels the control, so it has an accessible name', () => {
    render(
      <ChoiceField label="Accept the terms">
        <Checkbox />
      </ChoiceField>,
    );
    expect(
      screen.getByRole('checkbox', { name: 'Accept the terms' }),
    ).toBeInTheDocument();
  });

  it('describes the control with the hint and the error, in that order', async () => {
    render(
      <ChoiceField
        label="Send me updates"
        hint="About one email a month."
        error="Choose an option to continue."
      >
        <Checkbox />
      </ChoiceField>,
    );
    const control = screen.getByRole('checkbox');
    await waitFor(() =>
      expect(control).toHaveAccessibleDescription(
        'About one email a month. Choose an option to continue.',
      ),
    );
  });

  it('an error implies the invalid state', () => {
    render(
      <ChoiceField label="Accept" error="Required.">
        <Checkbox />
      </ChoiceField>,
    );
    expect(screen.getByRole('checkbox')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('an absent error leaves the field valid and shows nothing', () => {
    const { container } = render(
      <ChoiceField label="Accept" error={undefined}>
        <Checkbox />
      </ChoiceField>,
    );
    expect(screen.getByRole('checkbox')).not.toHaveAttribute('aria-invalid');
    expect(container.querySelectorAll('p')).toHaveLength(0);
  });

  it('clicking the label toggles the control', async () => {
    const user = userEvent.setup();
    render(
      <ChoiceField label="Accept the terms">
        <Checkbox />
      </ChoiceField>,
    );
    await user.click(screen.getByText('Accept the terms'));
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('works for a lone radio too', () => {
    render(
      <ChoiceField label="Standard delivery">
        <Radio name="shipping" />
      </ChoiceField>,
    );
    expect(
      screen.getByRole('radio', { name: 'Standard delivery' }),
    ).toBeInTheDocument();
  });

  describe('anatomy', () => {
    const renderRow = () =>
      renderUi(
        <ChoiceField
          label="Accept the terms"
          hint="You can withdraw later."
          error="Required to continue."
          style={box}
        >
          <Checkbox />
        </ChoiceField>,
      );

    it('puts the control BEFORE its label in the DOM, not only on screen', () => {
      // Reading order matches visual order (WCAG 1.3.2) rather than being
      // reshuffled by the grid.
      const { container } = renderRow();
      expect(
        [...container.querySelectorAll('input, label')].map((n) => n.tagName),
      ).toEqual(['INPUT', 'LABEL']);
    });

    it('places the label beside the control, on the same line', () => {
      const { container } = renderRow();
      const control = (
        container.querySelector('input') as HTMLElement
      ).getBoundingClientRect();
      const label = (
        container.querySelector('label') as HTMLElement
      ).getBoundingClientRect();
      expect(label.left).toBeGreaterThan(control.right);
      expect(
        Math.abs(
          (control.top + control.bottom) / 2 - (label.top + label.bottom) / 2,
        ),
      ).toBeLessThan(1);
    });

    it('lines the hint and error up under the LABEL, not under the control', () => {
      const { container } = renderRow();
      const label = (
        container.querySelector('label') as HTMLElement
      ).getBoundingClientRect();
      const texts = [...container.querySelectorAll('p')];
      expect(texts).toHaveLength(2);
      for (const node of texts) {
        const rect = node.getBoundingClientRect();
        expect(Math.abs(rect.left - label.left)).toBeLessThan(1);
        expect(rect.top).toBeGreaterThan(label.bottom - 1);
      }
    });

    it('lays out the same when the parts are composed by hand', () => {
      // Placement is by element, not by position — so the escape hatch cannot
      // drift from the props.
      const { container } = renderUi(
        <ChoiceField label="Accept the terms" style={box}>
          <Checkbox />
          <FieldError>Required to continue.</FieldError>
        </ChoiceField>,
      );
      const label = (
        container.querySelector('label') as HTMLElement
      ).getBoundingClientRect();
      const error = (
        container.querySelector('p') as HTMLElement
      ).getBoundingClientRect();
      expect(Math.abs(error.left - label.left)).toBeLessThan(1);
    });

    it('is the OPPOSITE anatomy to Field, which stacks its label above', () => {
      const { container } = renderUi(
        <Field label="Email">
          <Input />
        </Field>,
      );
      const input = (
        container.querySelector('input') as HTMLElement
      ).getBoundingClientRect();
      const label = (
        container.querySelector('label') as HTMLElement
      ).getBoundingClientRect();
      expect(label.bottom).toBeLessThanOrEqual(input.top);
    });
  });

  it('warns by its own name when it holds more than one control', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <ChoiceField label="Two">
        <Checkbox />
        <Checkbox />
      </ChoiceField>,
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('ChoiceField: more than one control'),
    );
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(
      <ChoiceField label="Accept the terms">
        <Checkbox />
      </ChoiceField>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  describe('accessibility (axe)', () => {
    for (const { name, theme } of [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const) {
      it(`has no violations — with hint and error / ${name}`, async () => {
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            <ChoiceField
              label="Accept the terms"
              hint="You can withdraw later."
              error="Required to continue."
            >
              <Checkbox />
            </ChoiceField>
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });
});
