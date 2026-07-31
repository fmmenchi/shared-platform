import { cn } from '../../util/cn.js';
import { useFieldControl } from '../field/field.context.js';
import type { RadioProps } from './radio.types.js';
import styles from './radio.module.css';

/**
 * A single choice in a group, built on the native `<input type="radio">`. Like
 * `Input` it is fully transparent (ADR-0013): every native attribute and `ref`
 * passes through and `checked`/`onChange` are never touched, so it works
 * uncontrolled or controlled and drops into any form library.
 *
 * Label it by NESTING it in a `<label>` — `<label><Radio … /> Free</label>` —
 * which associates the two with no `id` and makes the text part of the click
 * target. Group the options in a `Fieldset` with a `FieldsetLegend`: radios pair
 * by their shared `name`, and the platform then gives arrow-key navigation,
 * roving focus and one tab stop per group for free.
 *
 * The mark is the browser's own, tinted with `accent-color` — measured against a
 * hand-drawn `appearance: none` dot, which is erased in Windows High Contrast
 * (dot and control both resolve to Canvas, leaving checked indistinguishable
 * from unchecked). The trade is that only the mark is ours to colour, which is
 * why the INVALID state belongs to the surrounding `Fieldset`: an unchecked
 * native radio has no border we are able to repaint.
 */
function Radio(props: RadioProps) {
  const { className, ...rest } = props;
  // Opt-in Field wiring: inside a <Field>, pick up id/aria-describedby/aria-invalid
  // (the consumer's own props still win); standalone, this is a no-op. A set of
  // radios belongs in a <Fieldset> instead, which describes the GROUP once rather
  // than repeating the hint on every option.
  const fieldProps = useFieldControl(rest);

  return (
    <input
      type="radio"
      className={cn(styles.radio, className)}
      {...fieldProps}
    />
  );
}

export { Radio };
