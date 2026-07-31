import type { ComponentPropsWithRef } from 'react';

/**
 * A checkbox has THREE states, not two. Modelling the third as a value of
 * `checked` rather than as a separate `indeterminate` prop is Radix's design,
 * adopted here because it makes the broken combination unspeakable: there is one
 * source of truth, so "mixed" can never disagree with "checked".
 */
export type CheckedState = boolean | 'indeterminate';

interface CheckboxOwnProps {
  /**
   * Controlled state. `'indeterminate'` is the MIXED state — some of what this
   * box summarises is on, some is not.
   *
   * The DOM cannot express it as an attribute (`indeterminate` is a property
   * with no HTML attribute, which React therefore cannot set from props — pass
   * it as one and nothing happens, with no warning). So the component sends the
   * element `checked={false}` and sets the property, keeping the two in step for
   * you, including after a click, which clears the property natively.
   *
   * **The submitted value follows the boolean, never the mixed state:** a mixed
   * box submits nothing, and `required` is not satisfied by one.
   *
   * There is no attribute to find in DevTools — the browser maps the property to
   * a checked state of `mixed` in the ACCESSIBILITY TREE. Never write
   * `aria-checked` yourself; it would be redundant and could contradict it.
   */
  checked?: CheckedState;
  /**
   * Initial state when uncontrolled, `'indeterminate'` included. It is a
   * STARTING value: once the user acts, the browser owns the box, and a mixed
   * box that is clicked becomes plainly checked — which is correct, because
   * nothing else is claiming it is still mixed.
   */
  defaultChecked?: CheckedState;
}

/**
 * Public Checkbox props: a transparent native `<input type="checkbox">`
 * (ADR-0013). Every native attribute and `ref` passes through and `onChange` is
 * attached unchanged, so it drops into any form library — `checked` is widened
 * to carry the third state, and a plain boolean still passes straight through.
 *
 * `type` is omitted rather than defaulted — it is the component's identity, not
 * an axis. There is no `size` and no `variant`.
 */
export type CheckboxProps = CheckboxOwnProps &
  Omit<ComponentPropsWithRef<'input'>, 'type' | keyof CheckboxOwnProps>;
