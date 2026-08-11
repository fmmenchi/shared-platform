import { createContext, useContext, useEffect } from 'react';
import { useDevWarning } from '../../primitives/use-dev-warning.js';

/**
 * What a `Field` provides to its label and its control. The text parts do NOT
 * read this — they read the shared `DescribableContext`, which a `Fieldset`
 * provides too, so one description/error pair serves either container. The control
 * never learns anything about VALUE — only a11y ids — so it stays transparent
 * (ADR-0013).
 */
export interface FieldContextValue {
  /** id for the control; the label's `htmlFor` targets it. A control that
   * brings its OWN id is ADOPTED — the field re-points the label at it (see
   * `registerControl`), so the two never disagree. An earlier version of this
   * comment claimed the opposite while the code adopted, and the doc drifted
   * into a promise the tests explicitly refute. */
  controlId: string;
  /** Error state — drives the control's `aria-invalid`. */
  invalid: boolean;
  /** Space-joined ids of the registered description(s)/error(s), in DOM order. */
  describedBy: string | undefined;
  /**
   * A control registers its presence, so the field can warn on 0 or >1 — and
   * its OWN id, if it brought one, so the field can adopt it.
   */
  registerControl: (ownId?: string) => () => void;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

export const useFieldContext = (): FieldContextValue | null =>
  useContext(FieldContext);

/**
 * Context for a part that only a `Field` can wire (the label, which needs the
 * control's id), warning by name when it is used outside one — a stray label
 * renders perfectly and points at nothing, which is invisible otherwise. Returns
 * `null` rather than throwing: a misplaced label is worth a loud warning, not a
 * crashed page.
 */
export function useFieldPart(part: string): FieldContextValue | null {
  const field = useFieldContext();
  useDevWarning(
    field == null,
    `${part}: used outside a <Field>, so it is not associated with a control.`,
  );
  return field;
}

export type AriaInvalid = boolean | 'true' | 'false' | 'grammar' | 'spelling';

/** The a11y props a field writes onto its control — all it ever touches. */
export type FieldControlProps = {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: AriaInvalid;
};

/**
 * Apply a field's wiring to one control's props: the field's `id` (so the label
 * associates — the field OWNS the id), its `aria-describedby` MERGED with any the
 * control already had, and its `aria-invalid` UNLESS the control sets its own.
 * With no field it returns the props untouched.
 *
 * Generic over `object`, NOT over `FieldControlProps`: constraining it to the
 * latter makes TypeScript excess-property-check a fresh object literal against
 * it, so `getControlProps({ placeholder: 'x' })` — the normal way to call a prop
 * getter — would not compile.
 */
export function applyFieldProps<P extends object>(
  field: FieldContextValue | null,
  props: P,
): P & FieldControlProps {
  if (!field) return props;
  const own = props as FieldControlProps;
  const describedBy =
    [field.describedBy, own['aria-describedby']].filter(Boolean).join(' ') ||
    undefined;
  return {
    ...props,
    // The control's OWN id WINS. A layer that silently discards what it was
    // handed is not transparent, and some form libraries (Conform) mint an id
    // and point their own markup at it. The field adopts it instead — see
    // `registerControl` — so the label follows and the two never disagree.
    id: own.id ?? field.controlId,
    'aria-describedby': describedBy,
    'aria-invalid': own['aria-invalid'] ?? (field.invalid || undefined),
  };
}

/**
 * Control-side field wiring, for the design system's OWN controls: only a11y is
 * wired (never value/onChange), so the control stays transparent, and with no
 * `Field` it is a no-op. Every form control calls this. A consumer wiring a raw or
 * third-party control reaches for the public `useField` prop getters instead.
 */
export function useFieldControl<P extends FieldControlProps>(props: P): P {
  const field = useFieldContext();
  // Register presence so the Field can flag a missing or duplicated control.
  const registerControl = field?.registerControl;
  const ownId = (props as FieldControlProps).id;
  // Report the id as well as the presence: if the control brought one, the
  // field adopts it so the label's `htmlFor` follows.
  useEffect(() => registerControl?.(ownId), [registerControl, ownId]);
  // The result adds only keys `P` already declares, so it is still a `P`.
  return applyFieldProps(field, props) as P;
}
