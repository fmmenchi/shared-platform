import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useDescribedByRegistry } from '../../primitives/describedby-registry.js';
import { DescribableContext } from '../../primitives/describable.js';
import type { Describable } from '../../primitives/describable.types.js';
import type { FieldsetProps } from './fieldset.types.js';
import styles from './fieldset.module.css';

/** Whether the group has an accessible name: a non-empty legend, or a non-blank
 *  `aria-label`/`aria-labelledby`. Presence alone is not enough — an empty legend
 *  (a missing translation key) leaves the group nameless just as surely. */
function isNamed(node: HTMLFieldSetElement): boolean {
  const legend = node.querySelector(':scope > legend');
  if (legend != null && (legend.textContent ?? '').trim() !== '') return true;
  for (const attribute of ['aria-label', 'aria-labelledby']) {
    if ((node.getAttribute(attribute) ?? '').trim() !== '') return true;
  }
  return false;
}

/**
 * Groups related controls — a radio or checkbox group, or any set of fields that
 * answer one question — as a native `<fieldset>` named by its `<legend>`. A
 * `FieldDescription` / `FieldError` placed directly inside registers into the
 * GROUP's `aria-describedby`, so it is announced once for the group instead of
 * repeated on every control. It touches no value or validation (ADR-0013). For a
 * single control with its own label use `Field`.
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
  const el = useRef<HTMLFieldSetElement>(null);

  // Flag the silent defect this component exists to prevent: a group with no
  // accessible name. Measured from the committed DOM, because the name can come
  // from a legend this component never sees (one rendered by a child, or written
  // by hand) — and watched with an observer rather than keyed on `children`,
  // since a legend owned by a descendant's own state appears without `children`
  // ever changing identity, which would leave a false warning standing forever.
  // Dev-only in full: the query, the observer and the extra commit all drop out
  // of a production build.
  const [unnamed, setUnnamed] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const node = el.current;
    if (node == null) return;
    const check = () => setUnnamed(!isNamed(node));
    check();
    const observer = new MutationObserver(check);
    observer.observe(node, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['aria-label', 'aria-labelledby'],
    });
    return () => observer.disconnect();
  }, []);
  useDevWarning(
    unnamed,
    'Fieldset: no accessible name — give it a <FieldsetLegend> with text, or an aria-label.',
  );

  // The same slot a `Field` fills, which is why one description/error pair serves
  // both: a part binds to whichever container is NEAREST.
  const describable = useMemo<Describable>(
    () => ({ owner: 'Fieldset', register }),
    [register],
  );

  // MERGE our describedby with any the consumer passes, so their own hint never
  // silently replaces the group's description/error.
  const describedByAll =
    [describedBy, ariaDescribedBy].filter(Boolean).join(' ') || undefined;

  // `aria-invalid` is only meaningful once the group carries a role that supports
  // it: a plain `<fieldset>` is `role="group"`, which does not, so setting it
  // there would be ignored ARIA. Opt in with `role="radiogroup"` and the group's
  // invalid state becomes expressible to assistive tech; otherwise `data-invalid`
  // is a styling hook and the error text does the telling.
  const supportsAriaInvalid = rest.role === 'radiogroup';

  return (
    <DescribableContext value={describable}>
      <fieldset
        className={cn(styles.fieldset, className)}
        {...rest}
        ref={mergeRefs(el, ref)}
        aria-describedby={describedByAll}
        aria-invalid={supportsAriaInvalid && invalid ? true : undefined}
        data-invalid={invalid || undefined}
      >
        {children}
      </fieldset>
    </DescribableContext>
  );
}

export { Fieldset };
