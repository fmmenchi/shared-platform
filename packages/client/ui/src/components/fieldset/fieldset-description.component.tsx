import { useEffect, useId } from 'react';
import { cn } from '../../util/cn.js';
import { useFieldsetPart } from '../../primitives/fieldset.js';
import type { FieldsetDescriptionProps } from './fieldset.types.js';
import styles from './fieldset.module.css';

/**
 * Helper text for the whole group. Registers its id into the fieldset's
 * `aria-describedby`, so it is announced once when the group is entered —
 * not repeated on each control inside.
 */
function FieldsetDescription(props: FieldsetDescriptionProps) {
  const { className, ...rest } = props;
  const register = useFieldsetPart('FieldsetDescription')?.register;
  const id = useId();
  // `register` is stable (useCallback in Fieldset), so this runs once per mount.
  useEffect(() => register?.(id), [register, id]);
  return <p id={id} className={cn(styles.description, className)} {...rest} />;
}

export { FieldsetDescription };
