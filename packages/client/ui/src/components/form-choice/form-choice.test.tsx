import { useState, type ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { FormChoice } from './form-choice.component.js';
import { UiProvider } from '../../i18n/provider.js';
import { createBoundFields } from '../../form/bound-fields.js';
import type { UseFormField } from '../../form/form-adapter.types.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/** The port, hand-written: `control` is the bag, `errors` are the messages. */
function Bound({
  children,
  errors = [],
  onChange,
  control,
}: {
  children: ReactNode;
  errors?: string[];
  onChange?: (checked: boolean) => void;
  control?: Record<string, unknown>;
}) {
  const useDemoField: UseFormField = (name) => ({
    control: {
      name,
      onChange: (event) =>
        onChange?.((event.target as HTMLInputElement).checked),
      ...control,
    } as ReturnType<UseFormField>['control'],
    errors,
  });
  return (
    <UiProvider
      adapters={{ i18n: { locale: 'en' }, form: { field: useDemoField } }}
    >
      {children}
    </UiProvider>
  );
}

describe('FormChoice', () => {
  it('renders a labelled checkbox, bound to the adapter', () => {
    render(
      <Bound>
        <FormChoice name="tos" label="Accept the terms" />
      </Bound>,
    );

    const box = screen.getByRole('checkbox', { name: 'Accept the terms' });
    expect(box).toHaveAttribute('name', 'tos');
  });

  it('SURVIVES AN ADAPTER THAT EMITS `type`, which a real one does', async () => {
    const onChange = vi.fn();
    render(
      <Bound control={{ type: 'text' }} onChange={onChange}>
        <FormChoice name="tos" label="Accept the terms" />
      </Bound>,
    );

    // THE REGRESSION THIS FILE EXISTS FOR. `form/control-props.ts` already
    // recorded that Conform's `getInputProps` emits `type` unconditionally from
    // the schema's constraints, and that `forTag` filters nothing for an
    // `<input>` — but `Checkbox` wrote its own `type` BEFORE the spread, so the
    // adapter's won. Measured: `type="text"`, no checkbox role, and a consent
    // field that submitted a string. It was invisible because this was the one
    // adapter in the family with no test at all.
    const box = screen.getByRole('checkbox', { name: 'Accept the terms' });
    expect(box).toHaveAttribute('type', 'checkbox');

    await browser.click(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('reports a tick through the binding', async () => {
    const onChange = vi.fn();
    render(
      <Bound onChange={onChange}>
        <FormChoice name="tos" label="Accept the terms" />
      </Bound>,
    );

    await browser.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('takes the state from the library when it drives one', async () => {
    function Persisting() {
      const [on, setOn] = useState(false);
      const useDemoField: UseFormField = (name) => ({
        control: {
          name,
          checked: on,
          onChange: (event) =>
            setOn((event.target as HTMLInputElement).checked),
        },
        errors: [],
      });
      return (
        <UiProvider
          adapters={{ i18n: { locale: 'en' }, form: { field: useDemoField } }}
        >
          <FormChoice name="tos" label="Accept the terms" />
          <output>{on ? 'accepted' : 'not accepted'}</output>
        </UiProvider>
      );
    }
    render(<Persisting />);

    await browser.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('accepted');
  });

  it('shows the adapter’s messages, and marks the control invalid', () => {
    render(
      <Bound errors={['You must accept the terms.']}>
        <FormChoice name="tos" label="Accept the terms" />
      </Bound>,
    );

    const box = screen.getByRole('checkbox');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAccessibleDescription(/You must accept the terms\./);
  });

  it('describes the control with its hint', () => {
    render(
      <Bound>
        <FormChoice
          name="tos"
          label="Accept the terms"
          hint="You can opt out later."
        />
      </Bound>,
    );

    expect(screen.getByRole('checkbox')).toHaveAccessibleDescription(
      'You can opt out later.',
    );
  });

  it('is in the typed kit, so every form shape gets it', () => {
    expect(createBoundFields()).toHaveProperty('FormChoice', FormChoice);
  });

  it('throws without an adapter in scope, rather than rendering unbound', () => {
    expect(() =>
      render(<FormChoice name="tos" label="Accept the terms" />),
    ).toThrow(/FormChoice/);
  });

  describe('accessibility (axe)', () => {
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      it(`has no violations — bound / invalid / ${name}`, async () => {
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            <Bound errors={['You must accept the terms.']}>
              <FormChoice
                name="tos"
                label="Accept the terms"
                hint="You can opt out later."
              />
            </Bound>
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });
});
