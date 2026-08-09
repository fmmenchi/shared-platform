import { useState, type ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormSwitch } from './form-switch.component.js';
import { UiProvider } from '../../i18n/provider.js';
import { createBoundFields } from '../../form/bound-fields.js';
import type { UseFormField } from '../../form/form-adapter.types.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * A hand-written adapter, which is the whole port: `control` is the bag the
 * library hands over and `errors` are its messages. Written here rather than
 * mocked, so the test exercises the contract a real adapter has to satisfy.
 */
function Bound({
  children,
  errors = [],
  onChange,
}: {
  children: ReactNode;
  errors?: string[];
  onChange?: (checked: boolean) => void;
}) {
  const useDemoField: UseFormField = (name) => ({
    control: {
      name,
      onChange: (event) =>
        onChange?.((event.target as HTMLInputElement).checked),
    },
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

describe('FormSwitch', () => {
  it('renders a labelled switch, bound to the adapter', () => {
    render(
      <Bound>
        <FormSwitch name="notify" label="Email me about replies" />
      </Bound>,
    );

    // Still a switch after the binding — the adapter supplies props, it does
    // not get to change what the control IS (ADR-0024).
    const control = screen.getByRole('switch', {
      name: 'Email me about replies',
    });
    expect(control).toHaveAttribute('name', 'notify');
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('reports a flip through the binding', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Bound onChange={onChange}>
        <FormSwitch name="notify" label="Notifications" />
      </Bound>,
    );

    await user.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('takes the state from the library, which is the point of binding it', async () => {
    const user = userEvent.setup();
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
          <FormSwitch name="notify" label="Notifications" />
          <output>{on ? 'saved on' : 'saved off'}</output>
        </UiProvider>
      );
    }
    render(<Persisting />);

    // A settings surface persists on change — the switch applies immediately
    // and the library is where that lands. This is the shape the component is
    // for; a Save button beside it would mean `FormChoice` instead.
    await user.click(screen.getByRole('switch'));
    expect(screen.getByRole('switch')).toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('saved on');
  });

  it('shows the adapter’s messages, and marks the control invalid', () => {
    render(
      <Bound errors={['A weekly digest needs notifications on.']}>
        <FormSwitch name="digest" label="Weekly digest" />
      </Bound>,
    );

    const control = screen.getByRole('switch');
    expect(control).toHaveAttribute('aria-invalid', 'true');
    expect(control).toHaveAccessibleDescription(
      /A weekly digest needs notifications on\./,
    );
  });

  it('describes the control with its hint', () => {
    render(
      <Bound>
        <FormSwitch
          name="digest"
          label="Weekly digest"
          hint="A summary every Monday."
        />
      </Bound>,
    );

    expect(screen.getByRole('switch')).toHaveAccessibleDescription(
      'A summary every Monday.',
    );
  });

  it('merges a call-site ref with the binding’s', () => {
    let el: HTMLElement | null = null;
    render(
      <Bound>
        <FormSwitch
          name="notify"
          label="Notifications"
          ref={(node) => {
            el = node;
          }}
        />
      </Bound>,
    );
    expect(el).toBeInstanceOf(HTMLInputElement);
  });

  it('survives an adapter that emits `type`, which a real one does', () => {
    // Not hypothetical: `form/control-props.ts` records that Conform's
    // `getInputProps` emits `type` unconditionally, from the schema's
    // constraints. `forTag` drops input-only props for a `<select>`, but an
    // `<input>` keeps the bag untouched — so the only thing standing between a
    // stray `type="text"` and a switch that has stopped being one is that
    // `Switch` writes its identity AFTER the spread.
    function TypeEmitting({ children }: { children: ReactNode }) {
      const useDemoField: UseFormField = (name) => ({
        control: { name, type: 'text' } as ReturnType<UseFormField>['control'],
        errors: [],
      });
      return (
        <UiProvider
          adapters={{ i18n: { locale: 'en' }, form: { field: useDemoField } }}
        >
          {children}
        </UiProvider>
      );
    }
    render(
      <TypeEmitting>
        <FormSwitch name="notify" label="Notifications" />
      </TypeEmitting>,
    );

    const control = screen.getByRole('switch');
    expect(control).toHaveAttribute('type', 'checkbox');
  });

  it('is in the typed kit, so every form shape gets it', () => {
    // `BoundFields` lists ALL of them on purpose — a kit that enumerated its
    // own members would have gone stale the day this component landed. This is
    // that promise, asserted.
    expect(createBoundFields()).toHaveProperty('FormSwitch', FormSwitch);
  });

  it('throws without an adapter in scope, rather than rendering unbound', () => {
    // An unbound field flips perfectly well and saves nothing — a failure you
    // would meet in production data rather than in development, so it is made
    // loud at the only moment anyone is looking.
    expect(() =>
      render(<FormSwitch name="notify" label="Notifications" />),
    ).toThrow(/FormSwitch/);
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
            <Bound errors={['Turn notifications on first.']}>
              <FormSwitch
                name="digest"
                label="Weekly digest"
                hint="A summary every Monday."
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
