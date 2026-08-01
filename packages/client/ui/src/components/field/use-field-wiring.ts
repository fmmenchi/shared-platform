import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useDescribedByRegistry } from '../../primitives/describedby-registry.js';
import type {
  Describable,
  DescribableOwner,
} from '../../primitives/describable.types.js';
import { type FieldContextValue } from './field.context.js';
import type { FieldWiring } from './use-field-wiring.types.js';

/**
 * Everything a field CONTAINER does apart from laying itself out: mint the
 * control's id, collect the description/error ids, count the controls, and flag
 * the two silent misuses (no control or several; more than one label).
 *
 * Extracted because `Field` and `ChoiceField` are the same wiring with two
 * different anatomies — a label above the control, or a control followed by its
 * label. They cannot share a container element: each owns its own stylesheet
 * (ADR-0019), and a component may not reach into a sibling's.
 *
 * `owner` names the component in the dev warnings, so a misuse points at the
 * thing the consumer actually wrote.
 */
export function useFieldWiring(
  owner: DescribableOwner,
  invalid: boolean,
): FieldWiring<HTMLDivElement> {
  const controlId = useId();

  // Description/error parts register their OWN id, so several coexist and the
  // control describes exactly the parts actually in the DOM.
  const { describedBy, register } = useDescribedByRegistry();

  // Controls register presence so we can flag the two silent misuses: a field
  // with no control (its label points at nothing) or more than one (a duplicate
  // id — a field wraps exactly one control).
  const [controlCount, setControlCount] = useState(0);
  // A control may bring its own id — a form library that mints one and points
  // its own markup at it. The field ADOPTS it rather than overwriting, so the
  // label's `htmlFor` follows and nothing the consumer passed is discarded.
  const [adoptedId, setAdoptedId] = useState<string>();
  const registerControl = useCallback<FieldContextValue['registerControl']>(
    (ownId) => {
      setControlCount((c) => c + 1);
      if (ownId !== undefined) setAdoptedId(ownId);
      return () => {
        setControlCount((c) => c - 1);
        if (ownId !== undefined) setAdoptedId(undefined);
      };
    },
    [],
  );
  useDevWarning(
    controlCount > 1,
    `${owner}: more than one control shares its id — it wraps a single control (use a Fieldset for a group).`,
  );

  const field = useMemo<FieldContextValue>(
    () => ({
      controlId: adoptedId ?? controlId,
      invalid,
      describedBy,
      registerControl,
    }),
    [adoptedId, controlId, invalid, describedBy, registerControl],
  );
  // The text parts bind to the nearest DESCRIBABLE container, which `Fieldset`
  // provides too — so a `FieldDescription` inside a field nested in a Fieldset
  // describes the control, and the same part outside that field describes the group.
  const describable = useMemo<Describable>(
    () => ({ owner, register }),
    [owner, register],
  );

  // Two labels for one control concatenate into its accessible name, and the
  // shorthand makes that easy to cause by accident — pass `label` AND compose a
  // `FieldLabel`. Measured from the committed DOM rather than by inspecting
  // `children`, so a label written by the consumer's own markup counts too.
  // Direct children only: a `<label>` wrapping a control inside is that
  // control's own, not a second label for this field.
  const ref = useRef<HTMLDivElement>(null);
  const [extraLabels, setExtraLabels] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const node = ref.current;
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
    `${owner}: more than one label — the control takes its name from all of them. Use the \`label\` prop or compose a <FieldLabel>, not both.`,
  );

  return { field, describable, ref };
}
