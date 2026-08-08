import { useId, useMemo } from 'react';
import { cn } from '../../util/cn.js';
import { AccordionContext } from './accordion.context.js';
import type { AccordionContextValue } from './accordion.context.js';
import type { AccordionProps } from './accordion.types.js';
import styles from './accordion.module.css';

/**
 * A stack of disclosures, each a native `<details>`.
 *
 * The root does almost nothing, and that is the design. Measured in Chromium
 * before any of this was written: `<summary>` is focusable with no `tabindex`,
 * `Enter` and `Space` toggle it, the `toggle` event reports `newState`, and the
 * accessibility tree already exposes `DisclosureTriangle` with `expanded` (`DisclosureTriangleGrouped` once a
 * `name` is set) —
 * so no ARIA is added here, because adding it would restate what the element
 * says. `<details name>` makes a group exclusive with no script at all.
 *
 * What is left for the root is the group name and the stack's own spacing.
 */
function Accordion(props: AccordionProps) {
  const { className, exclusive = false, children, ...rest } = props;

  // PROGRESSIVE ENHANCEMENT, and one whose degradation is a CAPABILITY, not
  // polish: `<details name>` is Baseline NEWLY (2024-09, widely ~2027-03), and
  // where it is missing the attribute is inert — the accordion stays usable and
  // simply stops being exclusive. Recorded in the ledger (known-issues) and
  // stated in the docs, because a consumer who asked for one-at-a-time deserves
  // to know it can silently not happen (ADR-0010, ADR-0017).
  //
  // Generated, never taken from the consumer: the name IS the exclusivity, and
  // two accordions sharing one would close each other's items across the page.
  const generated = useId();
  const value = useMemo<AccordionContextValue>(
    () => ({ name: exclusive ? generated : undefined }),
    [exclusive, generated],
  );

  return (
    <AccordionContext.Provider value={value}>
      <div {...rest} className={cn(styles.accordion, className)}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

export { Accordion };
