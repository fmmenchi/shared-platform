import { useState, type ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { FormSegmentedControl } from './form-segmented-control.component.js';
import { SegmentedControlItem } from '../segmented-control-item/segmented-control-item.component.js';
import { UiProvider } from '../../i18n/provider.js';
import { createBoundFields } from '../../form/bound-fields.js';
import type {
  UseFormField,
  UseFormOptionField,
} from '../../form/form-adapter.types.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * The port, hand-written — the OPTION-field one, which is what a group needs:
 * `option(value)` is the bag for one control, `errors` are the field's.
 */
function Bound({
  children,
  errors = [],
  onPick,
  ref,
}: {
  children: ReactNode;
  errors?: string[];
  onPick?: (value: string) => void;
  ref?: (node: HTMLInputElement | null) => void;
}) {
  const useDemoOptionField: UseFormOptionField = (name) => ({
    option: (value) => ({
      name,
      ref,
      onChange: (event) => onPick?.((event.target as HTMLInputElement).value),
    }),
    errors,
  });
  return (
    <UiProvider
      adapters={{
        i18n: { locale: 'en' },
        form: { field: unusedField, optionField: useDemoOptionField },
      }}
    >
      {children}
    </UiProvider>
  );
}

/**
 * The per-field member is required by the binding's type and must never be
 * reached by this component — which is asserted below rather than assumed.
 */
const unusedField: UseFormField = () => {
  throw new Error('FormSegmentedControl must not bind through `field`.');
};

/**
 * THE PART A POINTER CAN ACTUALLY REACH — see the same helper in
 * `segmented-control.test.tsx` for the measurement. The radio is `sr-only`, so
 * the label is the only target a person has; a browser-driven click refuses the
 * input, and it is right to.
 */
const segment = (name: string) =>
  screen.getByRole('radio', { name }).closest('label') as HTMLElement;

const options = (
  <>
    <SegmentedControlItem value="left">Left</SegmentedControlItem>
    <SegmentedControlItem value="center">Center</SegmentedControlItem>
    <SegmentedControlItem value="right">Right</SegmentedControlItem>
  </>
);

describe('FormSegmentedControl', () => {
  it('names the set ONCE, with the legend', () => {
    render(
      <Bound>
        <FormSegmentedControl name="align" label="Text alignment">
          {options}
        </FormSegmentedControl>
      </Bound>,
    );

    // The decision this component exists to keep (ADR-0025): the legend names
    // the group, so the inner wrapper is not a second, nameless `radiogroup`.
    // Two names here would be announced twice.
    expect(screen.getByRole('group', { name: 'Text alignment' })).toBeTruthy();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('pairs the options under the bound name', () => {
    render(
      <Bound>
        <FormSegmentedControl name="align" label="Text alignment">
          {options}
        </FormSegmentedControl>
      </Bound>,
    );

    for (const option of screen.getAllByRole('radio')) {
      expect(option).toHaveAttribute('name', 'align');
    }
  });

  it("reports the pick through the picked option's own handler", async () => {
    const onPick = vi.fn();
    render(
      <Bound onPick={onPick}>
        <FormSegmentedControl name="align" label="Text alignment">
          {options}
        </FormSegmentedControl>
      </Bound>,
    );

    // The binding's `onChange` is now ON THE RADIO, not delegated from the
    // group — the option asked for its own props. The event is the same real
    // one from the same real radio, so an adapter reads it as it always did.
    await browser.click(segment('Center'));
    expect(onPick).toHaveBeenCalledWith('center');
  });

  it("hands every option the binding's ref — the thing delegation could not", async () => {
    // WHAT THE MIGRATION BOUGHT. Bound through the group there was no "the
    // input" of a radio group to hand a ref to, so it was dropped outright and
    // the cost was written into the component: a library could not focus this
    // field from an error summary, and a ref-based one could not write a value
    // back into it. Every radio carries it now.
    const nodes: HTMLInputElement[] = [];
    render(
      <Bound
        ref={(node) => {
          if (node !== null) nodes.push(node);
        }}
      >
        <FormSegmentedControl name="align" label="Text alignment">
          {options}
        </FormSegmentedControl>
      </Bound>,
    );

    expect(nodes).toHaveLength(3);
    expect(nodes.map((node) => node.value)).toEqual([
      'left',
      'center',
      'right',
    ]);
    // A real node, reachable the way a library would reach it.
    nodes[1]?.focus();
    expect(screen.getByRole('radio', { name: 'Center' })).toHaveFocus();
  });

  it('never binds through the per-field port', () => {
    // `unusedField` throws if it is called. A group bound one-control-per-field
    // is the defect this component was migrated away from, and the shape of
    // that mistake is a silent one — it renders.
    expect(() =>
      render(
        <Bound>
          <FormSegmentedControl name="align" label="Text alignment">
            {options}
          </FormSegmentedControl>
        </Bound>,
      ),
    ).not.toThrow();
  });

  it('says what is missing when the binding has no option field', () => {
    const field: UseFormField = (name) => ({ control: { name } });
    expect(() =>
      render(
        <UiProvider adapters={{ i18n: { locale: 'en' }, form: { field } }}>
          <FormSegmentedControl name="align" label="Text alignment">
            {options}
          </FormSegmentedControl>
        </UiProvider>,
      ),
    ).toThrow(/optionField/);
  });

  it('still selects with the arrows once the set has focus', async () => {
    const onPick = vi.fn();
    render(
      <Bound onPick={onPick}>
        <FormSegmentedControl name="align" label="Text alignment">
          {options}
        </FormSegmentedControl>
      </Bound>,
    );

    await browser.click(segment('Left'));
    await browser.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Center' })).toBeChecked();
    expect(onPick).toHaveBeenLastCalledWith('center');
  });

  it('takes the selection from the adapter when the adapter drives it', async () => {
    function Persisting() {
      const [value, setValue] = useState('left');
      const useDemoOptionField: UseFormOptionField = (name) => ({
        // An adapter that DRIVES the field answers `checked` per option —
        // Formik and TanStack do. react-hook-form sends neither `checked` nor
        // `defaultChecked` and leaves the state in the DOM, and Conform sends
        // `defaultChecked`; all three have to work, which is why the item reads
        // whichever arrives rather than deciding for itself.
        option: (option) => ({
          name,
          checked: value === option,
          onChange: (event) =>
            setValue((event.target as HTMLInputElement).value),
        }),
        errors: [],
      });
      return (
        <UiProvider
          adapters={{
            i18n: { locale: 'en' },
            form: { field: unusedField, optionField: useDemoOptionField },
          }}
        >
          <FormSegmentedControl name="align" label="Text alignment">
            {options}
          </FormSegmentedControl>
          <output>{value}</output>
        </UiProvider>
      );
    }
    render(<Persisting />);

    expect(screen.getByRole('radio', { name: 'Left' })).toBeChecked();
    await browser.click(segment('Right'));
    expect(screen.getByRole('radio', { name: 'Right' })).toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('right');
  });

  it('describes the group with the adapter’s messages, and marks it invalid', () => {
    render(
      <Bound errors={['Pick a range.']}>
        <FormSegmentedControl
          name="align"
          label="Text alignment"
          hint="Applies to the selection."
        >
          {options}
        </FormSegmentedControl>
      </Bound>,
    );

    // The hint and the error register into the GROUP's `aria-describedby`, so
    // they are announced once for the set rather than repeated on every option
    // — which is what the `<fieldset>` anatomy buys over a bare wrapper.
    const group = screen.getByRole('group', { name: 'Text alignment' });
    expect(group).toHaveAccessibleDescription(/Applies to the selection\./);
    expect(group).toHaveAccessibleDescription(/Pick a range\./);
  });

  it('is in the typed kit, so every form shape gets it', () => {
    expect(createBoundFields()).toHaveProperty(
      'FormSegmentedControl',
      FormSegmentedControl,
    );
  });

  it('throws without an adapter in scope, rather than rendering unbound', () => {
    expect(() =>
      render(
        <FormSegmentedControl name="align" label="Text alignment">
          {options}
        </FormSegmentedControl>,
      ),
    ).toThrow(/FormSegmentedControl/);
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
            <Bound errors={['Pick a range.']}>
              <FormSegmentedControl
                name="align"
                label="Text alignment"
                hint="Applies to the selection."
              >
                {options}
              </FormSegmentedControl>
            </Bound>
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });

  it("forwards the binding's onBlur, which touched-gated adapters live on", async () => {
    // Formik shows errors only once `meta.touched` is true, and `touched` is
    // written by `field.onBlur`. Bound through the group this had to ride the
    // bubble; on the option it is simply the radio's own handler, and it still
    // has to fire or a group stays silent until a submit while every sibling
    // control speaks on leaving.
    const blurred = vi.fn();
    const optionField: UseFormOptionField = (name) => ({
      option: (value) => ({ name, value, onBlur: blurred }),
    });
    render(
      <UiProvider
        adapters={{
          i18n: { locale: 'en' },
          form: { field: unusedField, optionField },
        }}
      >
        <FormSegmentedControl name="align" label="Allineamento">
          <SegmentedControlItem value="l">Sinistra</SegmentedControlItem>
          <SegmentedControlItem value="r">Destra</SegmentedControlItem>
        </FormSegmentedControl>
      </UiProvider>,
    );
    const [first] = screen.getAllByRole('radio');
    (first as HTMLElement).focus();
    await browser.tab();
    await browser.tab();
    expect(blurred).toHaveBeenCalled();
  });
});
