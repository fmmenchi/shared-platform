import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { FormCombobox } from './form-combobox.component.js';
import { UiProvider } from '../../i18n/provider.js';
import { createBoundFields } from '../../form/bound-fields.js';
import type {
  UseFormField,
  UseFormOptionField,
} from '../../form/form-adapter.types.js';
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

/**
 * THE OPTION PORT, hand-written — the other binding, and the only one that can
 * hold a set. `option(value)` answers per carrier and `setValues` is handed the
 * whole list, which is what a library keeping a store needs: a carrier that
 * unmounts sends nothing of its own.
 */
function BoundToASet({
  children,
  held,
  onSet,
  errors = [],
}: {
  children: React.ReactNode;
  held: readonly string[];
  onSet?: (values: readonly string[]) => void;
  errors?: string[];
}) {
  const useDemoOptionField: UseFormOptionField = (name) => ({
    option: (value) => ({
      name,
      value,
      checked: held.includes(value),
      // The store owns `checked`, so it owns the change too — the carriers are
      // never touched by a person, but React requires the pair.
      onChange: () => undefined,
    }),
    setValues: (values) => onSet?.(values),
    errors,
  });
  return (
    <UiProvider
      adapters={{
        i18n: { locale: 'en' },
        form: {
          field: (name) => ({ control: { name }, errors: [] }),
          optionField: useDemoOptionField,
        },
      }}
    >
      {children}
    </UiProvider>
  );
}

const field = () => screen.getByRole('combobox');
const carrier = (container: HTMLElement) =>
  container.querySelector('[data-carrier]') as HTMLInputElement | null;

describe('FormCombobox', () => {
  it('still forwards `onValueChange`, which the union nearly took away', async () => {
    // IT WAS LOST ONCE, silently: with both halves sharing one props type, the
    // single one had to discard whatever the two typed differently, and a
    // discarded prop is a prop that stops being forwarded. Each half has its
    // own type now, and this is what says so out loud.
    const reported = vi.fn();

    render(
      <Bound>
        <FormCombobox
          {...wiring}
          name="city"
          label="City"
          onValueChange={reported}
        />
      </Bound>,
    );

    await browser.click(field());
    await browser.click(screen.getByRole('option', { name: 'Torino' }));

    expect(reported).toHaveBeenCalledWith('2');
  });

  describe('several of many', () => {
    it('binds through the OPTION port and tells it the whole list', async () => {
      // The per-field binding cannot express a set — it returns one bag of
      // props for one control — so this half asks for the other port, and a
      // change hands over the finished list rather than a delta nobody could
      // send for a carrier that has gone.
      const set = vi.fn();

      render(
        <BoundToASet held={[]} onSet={set}>
          <FormCombobox {...wiring} multiple name="cities" label="Cities" />
        </BoundToASet>,
      );

      await browser.click(field());
      await browser.click(screen.getByRole('option', { name: 'Torino' }));

      expect(set).toHaveBeenCalledWith(['2']);
    });

    it('draws one carrier per held key, through the binding', () => {
      const { container } = render(
        <BoundToASet held={['1', '2']}>
          {/* NO `defaultValue`, and it would not compile: the starting value is
              the BINDING's here (`BindingOwned`), which is the whole point —
              the two tags below come from what the form already holds. */}
          <FormCombobox {...wiring} multiple name="cities" label="Cities" />
        </BoundToASet>,
      );

      // The binding's own props reach every carrier — the half the per-field
      // shape could never do, since a group has no "the input".
      const carriers = container.querySelectorAll('input[type="checkbox"]');
      expect(
        [...carriers].map((one) => (one as HTMLInputElement).value),
      ).toEqual(['1', '2']);
      expect(
        [...carriers].every((one) => (one as HTMLInputElement).checked),
      ).toBe(true);
    });

    it('has no violations, with tags and an open list', async () => {
      // The whole new surface — the tags, their remove controls, the multi
      // selectable listbox — went in with no axe run of its own; the file's
      // other a11y block covers the single half only.
      const { container } = renderUi(
        <BoundToASet held={['1']}>
          <FormCombobox {...wiring} multiple name="cities" label="Cities" />
        </BoundToASet>,
      );

      await browser.click(field());
      await expectNoA11yViolations(container);
    });

    it('keeps the selection when one Escape closes the list', async () => {
      // BOUND, which is the difference: unbound this already passes. Measured
      // in the ports app against a real adapter, three picks then one Escape
      // came back with nothing chosen at all.
      const three = [...CITIES, { id: '3', name: 'Napoli' }];
      render(
        <form>
          <BoundToASet held={[]}>
            <FormCombobox
              {...wiring}
              items={three}
              multiple
              name="cities"
              label="Cities"
            />
          </BoundToASet>
        </form>,
      );

      await browser.click(field());
      await browser.click(screen.getByRole('option', { name: 'Milano' }));
      await browser.click(screen.getByRole('option', { name: 'Torino' }));
      await browser.click(screen.getByRole('option', { name: 'Napoli' }));
      expect(
        screen.queryAllByRole('listitem').map((n) => n.textContent),
      ).toEqual(['Milano', 'Torino', 'Napoli']);

      await browser.keyboard('{Escape}');

      expect(
        screen.queryAllByRole('listitem').map((n) => n.textContent),
      ).toEqual(['Milano', 'Torino', 'Napoli']);
    });

    it('shows the field errors, like the single half does', () => {
      render(
        <BoundToASet held={[]} errors={['Pick at least one.']}>
          <FormCombobox {...wiring} multiple name="cities" label="Cities" />
        </BoundToASet>,
      );

      expect(screen.getByText('Pick at least one.')).toBeInTheDocument();
    });
  });

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
