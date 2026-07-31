import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { hasRenderableChildren } from '../../util/renderable-children.js';
import { DescribableContext } from '../../primitives/describable.js';
import { FieldContext } from '../field/field.context.js';
import { useFieldWiring } from '../field/use-field-wiring.js';
import { FieldLabel } from '../field-label/field-label.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import type { ChoiceFieldProps } from './choice-field.types.js';
import styles from './choice-field.module.css';

/**
 * A single choice with the words next to it — a consent checkbox, a lone radio:
 *
 *     <ChoiceField label="Accept the terms" error={errors.tos?.message}>
 *       <Checkbox {...adapter('tos')} />
 *     </ChoiceField>
 *
 * The control leads, its label sits beside it, and the hint and error line up
 * under the LABEL so the text reads as one block. Identical wiring to `Field` —
 * shared id, `aria-describedby`, `aria-invalid` — and a different anatomy, which
 * is why it is its own component: the two shapes take different props.
 *
 * **It earns its place only when there is something to say.** With no hint and
 * no error, a plain `<label><Checkbox /> Accept</label>` is the smaller, better
 * markup (ADR-0016) — nothing here is doing anything a nested label does not.
 * What it adds is the id and `aria-describedby` wiring that a bare label cannot.
 *
 * For SEVERAL related choices the field is the group, not the option: use a
 * `Fieldset` with a `FieldsetLegend` and give each option its own `<label>`.
 */
function ChoiceField(props: ChoiceFieldProps) {
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

  const invalid = invalidProp ?? hasRenderableChildren(error);
  const wiring = useFieldWiring('ChoiceField', invalid);

  return (
    <FieldContext.Provider value={wiring.field}>
      <DescribableContext.Provider value={wiring.describable}>
        <div
          className={cn(styles.choice, className)}
          {...rest}
          ref={mergeRefs(wiring.ref, ref)}
        >
          {/* The control comes first in the DOM as well as on screen, so what is
              read matches what is seen (WCAG 1.3.2) rather than being reordered
              by the grid. */}
          {children}
          <FieldLabel>{label}</FieldLabel>
          {hint === undefined ? null : (
            <FieldDescription>{hint}</FieldDescription>
          )}
          {error === undefined ? null : <FieldError>{error}</FieldError>}
        </div>
      </DescribableContext.Provider>
    </FieldContext.Provider>
  );
}

export { ChoiceField };
