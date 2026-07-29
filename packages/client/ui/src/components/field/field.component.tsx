import { useCallback, useId, useMemo, useState } from 'react';
import { cn } from '../../util/cn.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useDescribedByRegistry } from '../../primitives/context/describedby-registry.js';
import {
  FieldContext,
  type FieldContextValue,
} from '../../primitives/context/field.js';
import type { FieldProps } from './field.types.js';
import styles from './field.module.css';

/**
 * Groups a `FieldLabel`, a SINGLE control (e.g. `Input`), and optional
 * `FieldDescription` / `FieldError`, and wires them for accessibility via
 * context: the label's `htmlFor` and the control's `id` share one id, the
 * descriptions/errors register into the control's `aria-describedby`, and
 * `invalid` drives its `aria-invalid`. It touches no value or validation — the
 * control stays transparent (ADR-0013). For a grouped control (radio/checkbox
 * group) use a fieldset with a legend, not this single-control Field.
 */
function Field(props: FieldProps) {
  const { className, invalid = false, children, ...rest } = props;
  const controlId = useId();

  // Description/error parts register their OWN id, so several coexist and the
  // control describes exactly the parts actually in the DOM (shared with
  // `Fieldset`, which describes a whole group the same way).
  const { describedBy, register } = useDescribedByRegistry();

  // Controls register presence so we can flag the two silent misuses: a Field
  // with no control (its label points at nothing) or more than one (a duplicate
  // id — a Field wraps exactly one control).
  const [controlCount, setControlCount] = useState(0);
  const registerControl = useCallback<
    FieldContextValue['registerControl']
  >(() => {
    setControlCount((c) => c + 1);
    return () => setControlCount((c) => c - 1);
  }, []);
  useDevWarning(
    controlCount > 1,
    'Field: more than one control shares its id — a Field wraps a single control (use a fieldset for a group).',
  );

  const value = useMemo<FieldContextValue>(
    () => ({ controlId, invalid, describedBy, register, registerControl }),
    [controlId, invalid, describedBy, register, registerControl],
  );

  return (
    <FieldContext.Provider value={value}>
      <div className={cn(styles.field, className)} {...rest}>
        {children}
      </div>
    </FieldContext.Provider>
  );
}

export { Field };
