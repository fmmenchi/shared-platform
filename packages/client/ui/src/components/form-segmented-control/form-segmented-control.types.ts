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
 * `ref` is absent, and that is a limitation rather than an omission: a radio
 * group has no single input for it to point at. See the component's own note.
 */
export type FormSegmentedControlProps = FormSegmentedControlOwnProps &
  Omit<
    ComponentProps<typeof SegmentedControl>,
    'label' | 'ref' | keyof FormSegmentedControlOwnProps | keyof BindingOwned
  >;
