import { cn } from '../../util/cn.js';
import { useFieldControl } from '../../primitives/field.js';
import { inputVariants } from './input.variants.js';
import type { InputProps } from './input.types.js';

/**
 * A single-line text field, built on the native `<input>`. It is fully
 * transparent (ADR-0013): it forwards its ref and spreads every native prop, and
 * never touches `value`/`onChange` — so it works uncontrolled or controlled and
 * drops into any form library (react-hook-form, Formik, TanStack, native). The
 * design system styles it and presents the `aria-invalid` state; validation and
 * form-state stay in the consumer. Give it a label (a wrapping `<label>`,
 * `aria-label`, or `aria-labelledby`) — a placeholder is not a label.
 */
function Input(props: InputProps) {
  const { className, size, type = 'text', ...rest } = props;
  // Opt-in Field wiring: inside a <Field>, pick up id/aria-describedby/aria-invalid
  // (the consumer's own props still win); standalone, this is a no-op.
  const fieldProps = useFieldControl(rest);

  return (
    <input
      type={type}
      className={cn(inputVariants({ size }), className)}
      {...fieldProps}
    />
  );
}

export { Input };
