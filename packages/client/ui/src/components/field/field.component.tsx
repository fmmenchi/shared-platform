import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { hasRenderableChildren } from '../../util/renderable-children.js';
import { FieldLabel } from '../field-label/field-label.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { DescribableContext } from '../../primitives/describable.js';
import { FieldContext } from './field.context.js';
import { useFieldWiring } from './use-field-wiring.js';
import type { FieldProps } from './field.types.js';
import styles from './field.module.css';

/**
 * Groups a `FieldLabel`, a SINGLE control (e.g. `Input`), and optional
 * `FieldDescription` / `FieldError`, and wires them for accessibility via
 * context: the label's `htmlFor` and the control's `id` share one id, the
 * descriptions/errors register into the control's `aria-describedby`, and
 * `invalid` drives its `aria-invalid`. It touches no value or validation — the
 * control stays transparent (ADR-0013).
 *
 * The label goes ABOVE the control. A single checkbox or radio has the opposite
 * anatomy — control first, label beside it — and that is `ChoiceField`, a
 * separate component rather than a prop here: the two shapes take different
 * props, and one component would mean props that apply in only one of them. For
 * a group of controls use `Fieldset`.
 *
 * Two levels of the same API. The SHORTHAND covers the ordinary field — pass
 * `label`, `hint` and `error` and the parts are rendered in the right order:
 *
 *     <Field label="Email" error={errors.email?.message}>
 *       <Input {...register('email')} />
 *     </Field>
 *
 * COMPOSING the parts by hand stays available and unchanged, for the field that
 * needs something the props cannot express — a label with a badge in it, two
 * descriptions, an error between the control and the hint. Mixing is fine as
 * long as each part appears once; a second label is flagged in development.
 */
function Field(props: FieldProps) {
  const {
    className,
    children,
    label,
    hint,
    error,
    invalid: invalidProp,
    ref,
    ...rest
  } = props;

  // An error IMPLIES the invalid state, so the two cannot be set out of step —
  // the desync trap that a separate `invalid` prop invites. An explicit
  // `invalid` still wins, for the field that is invalid before it has a message.
  const invalid = invalidProp ?? hasRenderableChildren(error);
  const wiring = useFieldWiring('Field', invalid);

  return (
    <FieldContext value={wiring.field}>
      <DescribableContext value={wiring.describable}>
        <div
          className={cn(styles.field, className)}
          {...rest}
          ref={mergeRefs(wiring.ref, ref)}
        >
          {label === undefined ? null : <FieldLabel>{label}</FieldLabel>}
          {children}
          {hint === undefined ? null : (
            <FieldDescription>{hint}</FieldDescription>
          )}
          {error === undefined ? null : <FieldError>{error}</FieldError>}
        </div>
      </DescribableContext>
    </FieldContext>
  );
}

export { Field };
