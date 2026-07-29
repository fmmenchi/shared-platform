import { createContext, useContext, useEffect } from 'react';

/**
 * Shared state a `Field` provides to its label, description, error, and control.
 * The control never learns anything about VALUE — only a11y ids — so it stays
 * transparent (ADR-0013).
 */
export interface FieldContextValue {
  /** id for the control; the label's `htmlFor` targets it. The FIELD owns it, so
   * the label always associates — a control can't override it inside a Field. */
  controlId: string;
  /** Error state — drives the control's `aria-invalid`. */
  invalid: boolean;
  /** Space-joined ids of the rendered description(s) + error(s), in DOM order. */
  describedBy: string | undefined;
  /** A description/error part registers its own id (keyed BY the id, so several
   * coexist and each cleans up independently). */
  register: (id: string) => () => void;
  /** A control registers its presence, so the Field can warn on 0 or >1. */
  registerControl: () => () => void;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

export const useFieldContext = (): FieldContextValue | null =>
  useContext(FieldContext);

type FieldControlProps = {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
};

/**
 * Control-side field wiring. Inside a `Field`, a control takes the field's `id`
 * (so the label associates — the field OWNS the id), MERGES the field's
 * `aria-describedby` with any of its own, and takes the field's `aria-invalid`
 * UNLESS it sets its own. Only a11y is wired (never value/onChange), so the
 * control stays transparent; with no `Field` it is a no-op. Every form control
 * calls this.
 */
export function useFieldControl<P extends FieldControlProps>(props: P): P {
  const field = useFieldContext();
  // Register presence so the Field can flag a missing or duplicated control.
  const registerControl = field?.registerControl;
  useEffect(() => registerControl?.(), [registerControl]);

  if (!field) return props;
  const describedBy =
    [field.describedBy, props['aria-describedby']].filter(Boolean).join(' ') ||
    undefined;
  return {
    ...props,
    id: field.controlId,
    'aria-describedby': describedBy,
    'aria-invalid': props['aria-invalid'] ?? (field.invalid || undefined),
  };
}
