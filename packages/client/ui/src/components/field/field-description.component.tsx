import { useEffect, useId } from 'react';
import { cn } from '../../util/cn.js';
import { useFieldContext } from '../../primitives/field.js';
import type { FieldDescriptionProps } from './field.types.js';
import styles from './field.module.css';

/**
 * Helper text for the field. Registers its id into the control's
 * `aria-describedby`, so it is announced with the field.
 */
function FieldDescription(props: FieldDescriptionProps) {
  const { className, ...rest } = props;
  const register = useFieldContext()?.register;
  const id = useId();
  // `register` is stable (useCallback in Field), so this runs once per mount.
  useEffect(() => register?.('description', id), [register, id]);
  return <p id={id} className={cn(styles.description, className)} {...rest} />;
}

export { FieldDescription };
