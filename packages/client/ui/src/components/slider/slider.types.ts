import type { ComponentPropsWithRef } from 'react';

/**
 * The one own prop: everything else a slider needs the platform already
 * spells natively.
 */
interface SliderOwnProps {
  /**
   * Formats the current value into the `aria-valuetext` the reader announces
   * — `(v) => `${v} minutes``. Written the same way the fill is: at render,
   * and again from the element's own `input` listener as the user drags, so
   * it can never go stale on an UNCONTROLLED slider. Prefer it over a static
   * `aria-valuetext`, which still passes through but overrides the correct
   * `aria-valuenow` with a frozen string the moment an uncontrolled slider
   * moves — reserve the static form for controlled usage that re-renders it.
   */
  getValueText?: (value: number) => string;
}

/**
 * Public Slider props: a transparent native `<input type="range">` (ADR-0013).
 * Every native attribute and `ref` passes through — `value`/`defaultValue`,
 * `min`/`max`/`step`, `name`, `aria-valuetext` — and `onChange` is attached to
 * the element unchanged, so it works uncontrolled or controlled and drops into
 * any form library. (`list` reaches the element too, but with the track drawn
 * by us no engine paints datalist tick marks — do not rely on it visually.)
 *
 * Beyond `getValueText` there are no own props, and that is the point rather
 * than an omission: a slider's state IS `value`, its bounds ARE `min`/`max`,
 * and the keyboard — arrows, `Home`/`End`, and `PageUp`/`PageDown` where the
 * engine implements them — is the platform's, not ours. The painted fill is
 * derived from those same props and never becomes a second fact to keep in
 * step.
 *
 * `type` is omitted — it is the component's identity, not an axis. There is no
 * `variant` and no `size`: one treatment, one geometry (the coarse-pointer
 * height is a media query, not an API).
 */
export type SliderProps = SliderOwnProps &
  Omit<ComponentPropsWithRef<'input'>, 'type' | keyof SliderOwnProps>;
