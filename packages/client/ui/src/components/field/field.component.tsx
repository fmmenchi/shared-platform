import { useCallback, useId, useMemo, useState } from 'react';
import { cn } from '../../util/cn.js';
import {
  FieldContext,
  type FieldContextValue,
} from '../../primitives/field.js';
import type { FieldProps } from './field.types.js';
import styles from './field.module.css';

/**
 * Groups a `FieldLabel`, a control (e.g. `Input`), and optional
 * `FieldDescription` / `FieldError`, and wires them for accessibility via
 * context: the label's `htmlFor` and the control's `id` share one id, the
 * description and error register into the control's `aria-describedby`, and
 * `invalid` drives its `aria-invalid`. It touches no value or validation — the
 * control stays transparent (ADR-0013).
 */
function Field(props: FieldProps) {
  const { className, invalid = false, children, ...rest } = props;
  const controlId = useId();

  // Description/error parts register their ids so the control describes exactly
  // the parts that are actually rendered (an aria-describedby to a missing id
  // would be flagged; registration keeps it honest).
  const [ids, setIds] = useState<
    Partial<Record<'description' | 'error', string>>
  >({});
  const register = useCallback<FieldContextValue['register']>((key, id) => {
    setIds((prev) => ({ ...prev, [key]: id }));
    return () =>
      setIds((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
  }, []);
  const describedBy =
    [ids.description, ids.error].filter(Boolean).join(' ') || undefined;

  const value = useMemo<FieldContextValue>(
    () => ({ controlId, invalid, describedBy, register }),
    [controlId, invalid, describedBy, register],
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
