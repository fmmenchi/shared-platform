import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useDescribedByRegistry } from '../../primitives/describedby-registry.js';
import { DescribableContext } from '../../primitives/describable.js';
import type { Describable } from '../../primitives/describable.types.js';
import { hasRenderableChildren } from '../../util/renderable-children.js';
import { FieldLabel } from '../field-label/field-label.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
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
 *
 * Two levels of the same API. The SHORTHAND covers the ordinary field — pass
 * `label`, `hint` and `error` and the parts are rendered in the right order:
 *
 *     <Field label="Email" error={errors.email?.message}>
 *       <Input {...register('email')} />
 *     </Field>
 *
 * COMPOSING the parts by hand stays available and unchanged, for the field that
 * needs something the props cannot express — a label with a badge in it, two
 * descriptions, an error between the control and the hint. Mixing is fine as
 * long as each part appears once; a second label is flagged in development.
 */
function Field(props: FieldProps) {
  const {
    className,
    children,
    label,
    hint,
    error,
    invalid: invalidProp,
    orientation,
    ref,
    ...rest
  } = props;
  const controlId = useId();

  // An error IMPLIES the invalid state, so the two cannot be set out of step —
  // the desync trap that a separate `invalid` prop invites. An explicit
  // `invalid` still wins, for the field that is invalid before it has a message.
  const invalid = invalidProp ?? hasRenderableChildren(error);

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

  // Two labels for one control concatenate into its accessible name, and the
  // shorthand makes that easy to cause by accident — pass `label` AND compose a
  // `FieldLabel`. Measured from the committed DOM rather than by inspecting
  // `children`, so a label rendered by the consumer's own markup counts too.
  // Direct children only: a `<label>` wrapping a control inside is that
  // control's own, not a second label for this field.
  const el = useRef<HTMLDivElement>(null);
  const [extraLabels, setExtraLabels] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const node = el.current;
    if (node == null) return;
    const check = () =>
      setExtraLabels(node.querySelectorAll(':scope > label').length > 1);
    check();
    // Watched rather than re-checked each render: a label owned by a
    // descendant's own state appears without this component re-rendering, and
    // re-checking on every render would be a setState with no dependency list.
    // Dev-only in full — the query, the observer and the extra commit all drop
    // out of a production build.
    const observer = new MutationObserver(check);
    observer.observe(node, { childList: true });
    return () => observer.disconnect();
  }, []);
  useDevWarning(
    extraLabels,
    'Field: more than one label — the control takes its name from all of them. Use the `label` prop or compose a <FieldLabel>, not both.',
  );

  return (
    <FieldContext.Provider value={value}>
      <DescribableContext.Provider value={describable}>
        <div
          className={cn(
            styles.field,
            orientation === 'horizontal' && styles.horizontal,
            className,
          )}
          {...rest}
          ref={mergeRefs(el, ref)}
        >
          {/* In the row form the control comes FIRST in the DOM as well as on
              screen, so reading order matches visual order (WCAG 1.3.2) rather
              than relying on the grid to move things around. */}
          {orientation === 'horizontal' ? (
            <>
              {children}
              {label === undefined ? null : <FieldLabel>{label}</FieldLabel>}
            </>
          ) : (
            <>
              {label === undefined ? null : <FieldLabel>{label}</FieldLabel>}
              {children}
            </>
          )}
          {hint === undefined ? null : (
            <FieldDescription>{hint}</FieldDescription>
          )}
          {error === undefined ? null : <FieldError>{error}</FieldError>}
        </div>
      </DescribableContext.Provider>
    </FieldContext.Provider>
  );
}

export { Field };
