import { useCallback, useId, useMemo, useState } from 'react';
import { cn } from '../../util/cn.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useDescribedByRegistry } from '../../primitives/describedby-registry.js';
import { DescribableContext } from '../../primitives/describable.js';
import type { Describable } from '../../primitives/describable.types.js';
import { FieldContext, type FieldContextValue } from './field.context.js';
import type { FieldProps } from './field.types.js';
import styles from './field.module.css';

/**
 * Groups a `FieldLabel`, a SINGLE control (e.g. `Input`), and optional
 * `FieldDescription` / `FieldError`, and wires them for accessibility via
 * context: the label's `htmlFor` and the control's `id` share one id, the
 * descriptions/errors register into the control's `aria-describedby`, and
 * `invalid` drives its `aria-invalid`. It touches no value or validation — the
 * control stays transparent (ADR-0013). For a group of controls use `Fieldset`.
 */
function Field(props: FieldProps) {
  const { className, invalid = false, children, ...rest } = props;
  const controlId = useId();

  // Description/error parts register their OWN id, so several coexist and the
  // control describes exactly the parts actually in the DOM.
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
    'Field: more than one control shares its id — a Field wraps a single control (use a Fieldset for a group).',
  );

  const value = useMemo<FieldContextValue>(
    () => ({ controlId, invalid, describedBy, registerControl }),
    [controlId, invalid, describedBy, registerControl],
  );
  // The text parts bind to the nearest DESCRIBABLE container, which `Fieldset`
  // provides too — so a `FieldDescription` inside a Field nested in a Fieldset
  // describes the control, and the same part outside that Field describes the group.
  const describable = useMemo<Describable>(
    () => ({ owner: 'Field', register }),
    [register],
  );

  return (
    <FieldContext.Provider value={value}>
      <DescribableContext.Provider value={describable}>
        <div className={cn(styles.field, className)} {...rest}>
          {children}
        </div>
      </DescribableContext.Provider>
    </FieldContext.Provider>
  );
}

export { Field };
