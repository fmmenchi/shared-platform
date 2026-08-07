import type { CheckboxProps } from '../checkbox/checkbox.types.js';

/**
 * A checkable command. Everything a `Checkbox` takes — `checked`,
 * `defaultChecked`, `onChange`, `name` — because it IS one: the state stays in
 * the DOM, where the browser that paints the box already keeps it.
 */
export interface MenuItemCheckboxProps extends CheckboxProps {
  /** The words on the row. They name the control, through the `<label>`. */
  children?: React.ReactNode;
  /**
   * What typing on the keyboard should match, when the row's own words are not
   * it. It must be text the user can read.
   */
  textValue?: string;
  /**
   * Whether choosing this closes the menu. `true` by default (the APG's rule).
   * Set `false` to keep it open for a second toggle — which is a prop and not
   * `event.preventDefault()`, because preventing the default on a real
   * `<input>` cancels the tick instead.
   */
  closeOnSelect?: boolean;
}
