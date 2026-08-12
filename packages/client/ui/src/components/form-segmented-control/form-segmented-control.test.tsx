import { useState, type ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { FormSegmentedControl } from './form-segmented-control.component.js';
import { SegmentedControlItem } from '../segmented-control-item/segmented-control-item.component.js';
import { UiProvider } from '../../i18n/provider.js';
import { createBoundFields } from '../../form/bound-fields.js';
import type { UseFormField } from '../../form/form-adapter.types.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/** The port, hand-written: `control` is the bag, `errors` are the messages. */
function Bound({
  children,
  errors = [],
  onPick,
}: {
  children: ReactNode;
  errors?: string[];
  onPick?: (value: string) => void;
}) {
  const useDemoField: UseFormField = (name) => ({
    control: {
      name,
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

  it('reports the pick through the binding, by delegation', async () => {
    const onPick = vi.fn();
    render(
      <Bound onPick={onPick}>
        <FormSegmentedControl name="align" label="Text alignment">
          {options}
        </FormSegmentedControl>
      </Bound>,
    );

    // The binding's `onChange` sits on the GROUP, because a set has no single
    // input to put it on — `change` bubbles from the radio the user picked and
    // `event.target.value` is the answer. A real event from a real radio, so an
    // adapter reads it the way it already does.
    await browser.click(segment('Center'));
    expect(onPick).toHaveBeenCalledWith('center');
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

  it('takes the value from the adapter when the adapter has one', async () => {
    function Persisting() {
      const [value, setValue] = useState('left');
      const useDemoField: UseFormField = (name) => ({
        // An adapter that DRIVES the field — Conform's `getInputProps` emits a
        // `value`, react-hook-form's `register` does not and leaves the DOM to
        // keep it. Both have to work, and the value is the library's either
        // way: the call site cannot pass one, since `value` is binding-owned.
        control: {
          name,
          value,
          onChange: (event) =>
            setValue((event.target as HTMLInputElement).value),
        },
        errors: [],
      });
      return (
        <UiProvider
          adapters={{ i18n: { locale: 'en' }, form: { field: useDemoField } }}
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
    // written by `field.onBlur`. The group forwarded `name`, `value` and
    // `onChange` and dropped `onBlur`, so it never became touched: its error
    // appeared only after a submit, unlike every sibling bound control.
    // React's onBlur is `focusout`, which bubbles — the same delegation the
    // comment already argues for `onChange`.
    const blurred = vi.fn();
    const field: UseFormField = (name) => ({
      control: { name, onBlur: blurred },
    });
    render(
      <UiProvider adapters={{ i18n: { locale: 'en' }, form: { field } }}>
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
