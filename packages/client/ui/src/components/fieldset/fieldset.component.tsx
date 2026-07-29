import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useDescribedByRegistry } from '../../primitives/describedby-registry.js';
import {
  FieldsetContext,
  type FieldsetContextValue,
} from '../../primitives/fieldset.js';
import type { FieldsetProps } from './fieldset.types.js';
import styles from './fieldset.module.css';

/**
 * Groups related controls — a radio or checkbox group, or any set of fields that
 * answer one question — as a native `<fieldset>` named by its `<legend>`. The
 * description and error register into the GROUP's `aria-describedby`, so they are
 * announced once for the group instead of repeated on every control, and
 * `invalid` exposes `data-invalid` for styling. It touches no value or validation
 * (ADR-0013). For a single control with its own label use `Field`.
 */
function Fieldset(props: FieldsetProps) {
  const {
    className,
    invalid = false,
    children,
    ref,
    'aria-describedby': ariaDescribedBy,
    ...rest
  } = props;
  const { describedBy, register } = useDescribedByRegistry();

  // Flag the silent defect this component exists to prevent: a group with no
  // accessible name. Measured from the committed DOM rather than by having the
  // legend register itself — a registration is a state update, so the parent's
  // first warning pass would still see zero and cry wolf. Reading the DOM also
  // accepts a legend the consumer wrote by hand, which registration would miss.
  // Re-checked whenever the children change, so a legend rendered conditionally
  // (arriving after mount) clears the warning instead of tripping it.
  const el = useRef<HTMLFieldSetElement>(null);
  const [unnamed, setUnnamed] = useState(false);
  useEffect(() => {
    const node = el.current;
    if (node == null) return;
    setUnnamed(
      node.querySelector(':scope > legend') == null &&
        !node.hasAttribute('aria-label') &&
        !node.hasAttribute('aria-labelledby'),
    );
  }, [children]);
  useDevWarning(
    unnamed,
    'Fieldset: no <FieldsetLegend> — the group has no accessible name (add one, or an aria-label on the Fieldset).',
  );

  const value = useMemo<FieldsetContextValue>(
    () => ({ describedBy, register }),
    [describedBy, register],
  );

  // MERGE our describedby with any the consumer passes, so their own hint never
  // silently replaces the group's description/error (the same rule as `Field`).
  // Hence it sits AFTER the spread: `{...rest}` must not win over the merge.
  const describedByAll =
    [describedBy, ariaDescribedBy].filter(Boolean).join(' ') || undefined;

  return (
    <FieldsetContext.Provider value={value}>
      <fieldset
        className={cn(styles.fieldset, className)}
        data-invalid={invalid || undefined}
        {...rest}
        ref={mergeRefs(el, ref)}
        aria-describedby={describedByAll}
      >
        {children}
      </fieldset>
    </FieldsetContext.Provider>
  );
}

export { Fieldset };
