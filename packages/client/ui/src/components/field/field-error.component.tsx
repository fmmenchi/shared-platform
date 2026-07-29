import { useEffect, useId } from 'react';
import { cn } from '../../util/cn.js';
import { useFieldContext } from '../../primitives/field.js';
import type { FieldErrorProps } from './field.types.js';
import styles from './field.module.css';

/**
 * The field's error message. Renders (and registers into `aria-describedby`)
 * ONLY when it has content, so an empty error neither shows nor pollutes the
 * description. The colour is the `error` status role plus normal text weight —
 * paired with the control's own invalid look, the error never rests on colour
 * alone. Announcing a freshly-appeared error is the consumer's job.
 */
function FieldError(props: FieldErrorProps) {
  const { className, children, ...rest } = props;
  const register = useFieldContext()?.register;
  const id = useId();
  const hasContent = children != null && children !== false && children !== '';
  useEffect(() => {
    if (!hasContent) return;
    return register?.(id);
  }, [register, id, hasContent]);

  if (!hasContent) return null;
  return (
    <p id={id} className={cn(styles.error, className)} {...rest}>
      {children}
    </p>
  );
}

export { FieldError };
