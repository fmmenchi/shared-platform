import { useEffect, useId } from 'react';
import { cn } from '../../util/cn.js';
import { useFieldsetPart } from '../../primitives/fieldset.js';
import type { FieldsetErrorProps } from './fieldset.types.js';
import styles from './fieldset.module.css';

/**
 * The group's error message. Renders (and registers into the fieldset's
 * `aria-describedby`) ONLY when it has content, so an empty error neither shows
 * nor pollutes the description. The colour is the `error` status role plus normal
 * text weight, and the words carry the meaning — the error never rests on colour
 * alone. Announcing a freshly-appeared error is the consumer's job.
 */
function FieldsetError(props: FieldsetErrorProps) {
  const { className, children, ...rest } = props;
  const register = useFieldsetPart('FieldsetError')?.register;
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

export { FieldsetError };
