import { cn } from '../../util/cn.js';
import { useFieldPart } from '../field/field.context.js';
import type { FieldLabelProps } from './field-label.types.js';
import styles from './field-label.module.css';

/**
 * The field's label. Its `htmlFor` targets the control's shared id, so clicking
 * the label focuses the control and the control takes its name from the label.
 */
function FieldLabel(props: FieldLabelProps) {
  const { className, ...rest } = props;
  // Through `useFieldPart` — the hook written for exactly this part, which sat
  // unused while this file restated its guard in slightly different words: a
  // phantom contract plus two phrasings of one warning.
  const field = useFieldPart('FieldLabel');
  return (
    <label
      htmlFor={field?.controlId}
      className={cn(styles.label, className)}
      {...rest}
    />
  );
}

export { FieldLabel };
