import { cn } from '../../util/cn.js';
import { useFieldControl } from '../field/field.context.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { inputVariants } from './input.variants.js';
import type { InputProps } from './input.types.js';

/**
 * A single-line text field, built on the native `<input>`. It is transparent
 * (ADR-0013): it forwards its ref and spreads every native prop, and never
 * touches `value`/`onChange` — so it works uncontrolled or controlled and drops
 * into any form library (react-hook-form, Formik, TanStack, native). The design
 * system styles it and presents the `aria-invalid` state; validation and
 * form-state stay in the consumer. Give it a label (a wrapping `<label>`,
 * `aria-label`, or `aria-labelledby`) — a placeholder is not a label.
 *
 * ONE EXCEPTION, and it is the only one: `type="date"` is refused (ADR-0027).
 * The native date control cannot be told which locale to lay its segments out
 * in, so on a page whose language the app declares it contradicts every other
 * date on that page — silently, with no test going red. `DateInput` is the
 * replacement. The exception stays narrow: `checkbox`, `range` and `radio` pass
 * through though `Checkbox`, `Slider` and `Radio` exist, because those are
 * duplicative rather than wrong.
 */
function Input(props: InputProps) {
  // No `= 'text'` inside the pattern: a default in the destructuring makes the
  // React Compiler abandon the whole component, so the published bundle ships
  // unmemoized (measured) — and nothing reports it, lint stays green.
  const { className, size, type, ...rest } = props;
  // THE TYPE ALONE IS NOT ENOUGH, and that was checked rather than assumed:
  // React types `type` as `HTMLInputTypeAttribute`, whose union ends in
  // `(string & {})`, so `Exclude<…, 'date'>` removes nothing. The allowlist in
  // `input.types.ts` is what the compiler sees; this is what catches a spread, a
  // JavaScript caller, and a value widened to `string`.
  useDevWarning(
    // Compared as a widened string on purpose: the allowlist has already made
    // this impossible for TypeScript, and the whole point of the warning is the
    // callers TypeScript does not see.
    (type as string | undefined) === 'date',
    'Input: `type="date"` is refused (ADR-0027) — the native date control lays its segments out in the BROWSER\'s order, so on a page whose language your app declares it disagrees with every other date on it. Use `DateInput`, whose order follows the locale you gave `UiProvider`.',
  );
  useDevWarning(
    (type as string | undefined) === 'time',
    'Input: `type="time"` is refused (ADR-0027) — the native time control draws the same 24-hour reading whatever locale the page declares, and follows the operating system rather than even the locale the engine reports, so on an `en-US` page it says `14:30` beside a `Time` saying `02:30 PM`. Use `TimeInput`, whose hour cycle follows the locale you gave `UiProvider`.',
  );
  // Opt-in Field wiring: inside a <Field>, pick up id/aria-describedby/aria-invalid
  // (the consumer's own props still win); standalone, this is a no-op.
  const fieldProps = useFieldControl(rest);

  return (
    <input
      type={type ?? 'text'}
      className={cn(inputVariants({ size }), className)}
      {...fieldProps}
    />
  );
}

export { Input };
