import { cn } from '../../util/cn.js';
import { useFieldControl } from '../field/field.context.js';
import type { SwitchProps } from './switch.types.js';
import styles from './switch.module.css';

/**
 * A SETTING that applies the moment you flip it — notifications on, dark theme
 * on — and is still true tomorrow. Built on `<input type="checkbox">` with
 * `role="switch"`, so it is announced as a switch and still carries a value, a
 * `name` and a place in `form.reset()`.
 *
 * NOT A TOGGLE, and the boundary is ADR-0024. A `Toggle` is a button that stays
 * pressed and acts on the current selection: no value, never submits, state in
 * React. A switch is the opposite of that on every line — which is why it keeps
 * the native input, and why it is transparent (ADR-0013) rather than clever.
 * If a switch needs a Save button beside it, the honest control is a checkbox.
 *
 * THE DOM HOLDS THE STATE, and that is the same rule the whole package follows:
 * the browser paints this control, so a copy in React would buy nothing and
 * cost the thing that makes it a switch — `form.reset()` becomes a no-op when
 * React re-renders its stale value straight back (measured on the text inputs).
 * So `checked`/`defaultChecked` and `onChange` go to the element untouched.
 *
 * WHAT IS OURS IS THE PAINT. There is no native switch rendering to keep — the
 * one shell that would give us one is Safari's `switch` attribute, single-engine
 * and below Baseline — so this is the one control in the family drawn with
 * `appearance: none`. See the stylesheet for why that does not repeat `Radio`'s
 * measured mistake: a switch says "on" with the knob's POSITION, and geometry
 * survives Windows High Contrast where a drawn mark does not.
 *
 * Label it by NESTING it in a `<label>` — `<label><Switch /> Notifications</label>`
 * — which associates the two with no `id` and makes the text part of the target.
 */
function Switch(props: SwitchProps) {
  // NOTE no defaults in this destructuring pattern: one makes the React
  // Compiler abandon the whole component, silently and with lint green
  // (measured on Checkbox, visible in the shipped bundle).
  const { className, ...rest } = props;
  const fieldProps = useFieldControl(rest);

  return (
    <input
      className={cn(styles.switch, className)}
      {...fieldProps}
      // AFTER the spread, both: they are the component's identity rather than
      // defaults a caller may edit. The types already remove them, but a JS
      // consumer has no types, and a stray `role="checkbox"` would silently
      // turn this back into the control it exists not to be.
      type="checkbox"
      role="switch"
    />
  );
}

export { Switch };
