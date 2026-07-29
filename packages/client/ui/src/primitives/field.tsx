import { createContext, useContext } from 'react';

/**
 * Shared state a `Field` provides to its label, description, error, and control.
 * The control never learns anything about VALUE — only a11y ids — so it stays
 * transparent (ADR-0013).
 */
export interface FieldContextValue {
  /** id for the control; the label's `htmlFor` targets it. */
  controlId: string;
  /** Error state — drives the control's `aria-invalid`. */
  invalid: boolean;
  /** Space-joined ids of the rendered description + error, for `aria-describedby`. */
  describedBy: string | undefined;
  /** A description/error part registers its id so the control describes it. */
  register: (key: 'description' | 'error', id: string) => () => void;
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
 * Control-side field wiring. Merges an enclosing `Field`'s a11y ids into a
 * control's props — `id`, `aria-describedby`, `aria-invalid` — with the control's
 * OWN explicit props winning. Only a11y is wired (never value/onChange), so the
 * control stays transparent, and with no `Field` in the tree it is a no-op.
 * Every form control calls this.
 */
export function useFieldControl<P extends FieldControlProps>(props: P): P {
  const field = useFieldContext();
  if (!field) return props;
  const describedBy =
    [field.describedBy, props['aria-describedby']].filter(Boolean).join(' ') ||
    undefined;
  return {
    ...props,
    id: props.id ?? field.controlId,
    'aria-describedby': describedBy,
    'aria-invalid': props['aria-invalid'] ?? (field.invalid || undefined),
  };
}
