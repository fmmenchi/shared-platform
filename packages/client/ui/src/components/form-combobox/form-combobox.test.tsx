import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { FormCombobox } from './form-combobox.component.js';
import { UiProvider } from '../../i18n/provider.js';
import { createBoundFields } from '../../form/bound-fields.js';
import type { UseFormField } from '../../form/form-adapter.types.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

interface City {
  id: string;
  name: string;
}

const CITIES: City[] = [
  { id: '1', name: 'Milano' },
  { id: '2', name: 'Torino' },
];

const wiring = {
  items: CITIES,
  getKey: (city: City) => city.id,
  getLabel: (city: City) => city.name,
};

/** The port, hand-written — `control` is the bag, `errors` are the messages. */
function Bound({
  children,
  errors = [],
  onPick,
  seed,
  bindingRef,
}: {
  children: React.ReactNode;
  errors?: string[];
  onPick?: (value: unknown) => void;
  seed?: string;
  bindingRef?: (node: HTMLInputElement | null) => void;
}) {
  const useDemoField: UseFormField = (name) => ({
    control: {
      name,
      defaultValue: seed,
      ref: bindingRef,
      onChange: (event) => onPick?.((event.target as HTMLInputElement).value),
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

const field = () => screen.getByRole('combobox');
const carrier = (container: HTMLElement) =>
  container.querySelector('[data-carrier]') as HTMLInputElement | null;

describe('FormCombobox', () => {
  it('is labelled by the field, and the label reaches the control', () => {
    render(
      <Bound>
        <FormCombobox {...wiring} name="city" label="City" />
      </Bound>,
    );

    // The whole reason a bound wrapper exists: the label is associated, which
    // the bare component cannot do for itself.
    expect(screen.getByRole('combobox', { name: 'City' })).toBeTruthy();
  });

  it("gives the binding's ref to the CARRIER, not to the visible field", () => {
    let bound: HTMLInputElement | null = null;
    const { container } = render(
      <Bound
        bindingRef={(node) => {
          bound = node;
        }}
      >
        <FormCombobox {...wiring} name="city" label="City" />
      </Bound>,
    );

    // A form library reads `.value` off the node its ref was given. Given the
    // visible field it would read the SEARCH TEXT — which is the defect the
    // date family measured before this pattern existed.
    expect(bound).toBe(carrier(container));
    expect(bound).not.toBe(field());
  });

  it('tells the binding when a row is chosen, through a real event', async () => {
    const onPick = vi.fn();
    render(
      <Bound onPick={onPick}>
        <FormCombobox {...wiring} name="city" label="City" />
      </Bound>,
    );

    await browser.click(field());
    await browser.keyboard('{ArrowDown}{Enter}');

    await waitFor(() => {
      expect(onPick).toHaveBeenCalledWith('1');
    });
  });

  it("seeds itself from the adapter's starting value, and SHOWS it", async () => {
    render(
      <Bound seed="2">
        <FormCombobox {...wiring} name="city" label="City" />
      </Bound>,
    );

    // Not just carried: rendered. A seeded value that showed an empty box was
    // the defect an adversarial review found in the bare component.
    await waitFor(() => {
      expect(field()).toHaveValue('Torino');
    });
  });

  it("describes the field with the adapter's messages, and marks it invalid", () => {
    render(
      <Bound errors={['Pick a city.']}>
        <FormCombobox {...wiring} name="city" label="City" hint="Where to." />
      </Bound>,
    );

    const input = field();
    expect(input).toHaveAccessibleDescription(/Where to\./);
    expect(input).toHaveAccessibleDescription(/Pick a city\./);
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('is in the typed kit, so every form shape gets it', () => {
    expect(createBoundFields()).toHaveProperty('FormCombobox', FormCombobox);
  });

  it('throws without an adapter in scope, rather than rendering unbound', () => {
    expect(() =>
      render(<FormCombobox {...wiring} name="city" label="City" />),
    ).toThrow(/FormCombobox/);
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
            <Bound errors={['Pick a city.']}>
              <FormCombobox
                {...wiring}
                name="city"
                label="City"
                hint="Where to."
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
