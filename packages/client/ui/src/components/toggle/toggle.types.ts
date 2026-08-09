import type { ButtonProps } from '../button/button.types.js';

interface ToggleOwnProps {
  /**
   * Whether the button is pressed. Passing it makes the state CONTROLLED —
   * the prop drives, and `onPressedChange` is how you hear about a press.
   */
  pressed?: boolean;
  /** Starting state when uncontrolled. Defaults to not pressed. */
  defaultPressed?: boolean;
  /** Called with the state the press asks for, controlled or not. */
  onPressedChange?: (pressed: boolean) => void;
}

/**
 * Public Toggle props — every `Button` prop except four, each removed because
 * passing it would make the component something other than a toggle. Typed out
 * rather than silently overwritten, so each one is a compile error.
 *
 * `as` — a toggle is a `<button>` and nothing else: `aria-pressed` is only
 * valid on a widget that can be activated, and an `<a>` navigates rather than
 * holds a state.
 *
 * `variant` — the treatment IS this component: quiet off, filled on. A caller
 * who picks `primary` for the off state has drawn a control whose two states
 * differ by nothing a user can name.
 *
 * `type` — a toggle has no form value and never submits (ADR-0024). One
 * `type="submit"` and a formatting button posts the page.
 *
 * `aria-pressed` — written from `pressed`, which is the only source it has.
 */
export type ToggleProps = ToggleOwnProps &
  Omit<
    ButtonProps<'button'>,
    'as' | 'variant' | 'type' | 'aria-pressed' | keyof ToggleOwnProps
  >;
