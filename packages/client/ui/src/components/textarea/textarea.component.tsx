import { cn } from '../../util/cn.js';
import { useFieldControl } from '../field/field.context.js';
import { textareaVariants } from './textarea.variants.js';
import type { TextareaProps } from './textarea.types.js';

/**
 * A multi-line text field, built on the native `<textarea>`. It is `Input`'s
 * twin in every way that matters: fully transparent (ADR-0013) — it forwards
 * its ref, spreads every native prop and never touches `value`/`onChange` — so
 * it works uncontrolled or controlled and drops into any form library. Give it
 * a label (a wrapping `<label>`, `aria-label`, or `aria-labelledby`).
 *
 * What is NOT here, deliberately: auto-growing height. Doing it in JS means
 * measuring the content on every keystroke — a layout read in the typing path —
 * while `field-sizing: content` does it in CSS with nothing to run. It belongs
 * in the stylesheet the day the Baseline gate says that property is adoptable,
 * not in a `useLayoutEffect` today.
 */
function Textarea(props: TextareaProps) {
  // No default in the destructuring: a default value there makes the React
  // Compiler abandon the component, so the published bundle ships it
  // unmemoized — measured on Input, where lint stayed green and nothing said a
  // word. `rows` falls through to the browser's own default instead.
  const { className, size, resize, ...rest } = props;
  // Opt-in Field wiring: inside a <Field>, pick up id / aria-describedby /
  // aria-invalid (the consumer's own props still win); standalone, a no-op.
  const fieldProps = useFieldControl(rest);

  return (
    <textarea
      className={cn(textareaVariants({ size, resize }), className)}
      {...fieldProps}
    />
  );
}

export { Textarea };
