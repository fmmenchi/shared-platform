import { cn } from '../../util/cn.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useFieldContext } from './field.context.js';
import type { FieldLabelProps } from './field.types.js';
import styles from './field.module.css';

/**
 * The field's label. Its `htmlFor` targets the control's shared id, so clicking
 * the label focuses the control and the control takes its name from the label.
 */
function FieldLabel(props: FieldLabelProps) {
  const { className, ...rest } = props;
  const field = useFieldContext();
  useDevWarning(
    field == null,
    'FieldLabel: used outside a <Field>, so it is not associated with a control.',
  );
  return (
    <label
      htmlFor={field?.controlId}
      className={cn(styles.label, className)}
      {...rest}
    />
  );
}

export { FieldLabel };
