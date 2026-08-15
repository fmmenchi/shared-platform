import type { ComponentProps, ReactNode } from 'react';
import type { SegmentedControl } from '../segmented-control/segmented-control.component.js';
import type { BindingOwned } from '../../form/binding-owned.types.js';

interface FormSegmentedControlOwnProps {
  /** The field name, as your form library knows it. */
  name: string;
  /** The visible group label — rendered as the fieldset's legend. */
  label: ReactNode;
  hint?: ReactNode;
  /** The options: `SegmentedControlItem`s. */
  children?: ReactNode;
}

/**
 * A `Fieldset` + `SegmentedControl` already bound to the form library in scope — one
 * of many, drawn as buttons, with the legend naming the set.
 *
 * `checked`, `onChange` and the value props are the binding's, not the call
 * site's: see `BindingOwned`. `label` here is the LEGEND and not
 * `SegmentedControl`'s own `label`, which is left unset so the set is named once
 * (ADR-0025).
 *
 * `ref` is absent from the GROUP because a radio group has no single input for
 * it to point at — but it is no longer a limitation of the binding. Bound
 * through `optionField`, the adapter's ref reaches every radio, which is what a
 * library needs to focus this field from an error summary or write a value back
 * into it. What is absent here is a ref to the wrapper, which never meant
 * anything.
 */
export type FormSegmentedControlProps = FormSegmentedControlOwnProps &
  Omit<
    ComponentProps<typeof SegmentedControl>,
    'label' | 'ref' | keyof FormSegmentedControlOwnProps | keyof BindingOwned
  >;
