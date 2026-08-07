import type { RadioProps } from '../radio/radio.types.js';

/**
 * One choice of a set. Everything a `Radio` takes — including the `name` that
 * makes several of them one set, which is the browser's job and not ours.
 */
export interface MenuItemRadioProps extends RadioProps {
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
