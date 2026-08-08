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
 * accessibility tree already exposes `DisclosureTriangle` with `expanded` —
 * so no ARIA is added here, because adding it would restate what the element
 * says. `<details name>` makes a group exclusive with no script at all.
 *
 * What is left for the root is the group name and the stack's own spacing.
 */
function Accordion(props: AccordionProps) {
  const { className, exclusive = false, children, ...rest } = props;

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
