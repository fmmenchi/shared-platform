import type { ComponentPropsWithRef, ReactNode } from 'react';

interface SegmentedControlOwnProps {
  /**
   * What the set is asking, and the group's accessible name.
   *
   * OPTIONAL BECAUSE THE NAME CAN COME FROM OUTSIDE. Standing on its own — a
   * segmented control in a toolbar — the set must name itself, and passing this
   * is how. Wrapped in something that already names it, a `Fieldset` with a
   * `FieldsetLegend`, leaving it out is correct: two names are announced twice
   * ("Text alignment, group … Text alignment, radio group"), and the visible
   * legend is the better of the two. `role="radiogroup"` follows the name — a
   * nested group that names nothing is one more thing announced for nothing.
   */
  label?: string;
  /**
   * The `name` the options share — which is what pairs them for the platform,
   * and what a form submits the chosen value under.
   */
  name: string;
  /** The selected value. Passing it makes the group CONTROLLED. */
  value?: string;
  /** The value selected at mount when uncontrolled. */
  defaultValue?: string;
  /** Called with the value the user picked, controlled or not. */
  onValueChange?: (value: string) => void;
  children?: ReactNode;
}

/**
 * Public SegmentedControl props.
 *
 * `role` is omitted: this is a radio group in the accessibility tree and in the
 * form, drawn as buttons (ADR-0025). Changing the role would leave the
 * platform's own arrow-key behaviour describing a widget that no longer claims
 * it.
 */
export type SegmentedControlProps = SegmentedControlOwnProps &
  Omit<ComponentPropsWithRef<'div'>, 'role' | keyof SegmentedControlOwnProps>;
