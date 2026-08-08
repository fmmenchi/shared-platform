import { useEffect, useRef } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useAccordionPart } from '../accordion/accordion.context.js';
import { useControlWarnings } from './accordion-item.guards.js';
import type { AccordionItemProps } from './accordion-item.types.js';
import styles from './accordion-item.module.css';

/**
 * One disclosure: a native `<details>`, with its `<summary>` and its panel as
 * children.
 *
 * The element does the work. What is here is the pair the platform has no
 * declarative answer for — a seed that is written once, and a controlled prop
 * that has to win back a toggle the user performed — and the `name` that makes
 * an exclusive accordion exclusive.
 */
function AccordionItem(props: AccordionItemProps) {
  const {
    className,
    open,
    defaultOpen = false,
    onOpenChange,
    children,
    ref,
    ...rest
  } = props;
  const accordion = useAccordionPart('AccordionItem');
  const element = useRef<HTMLDetailsElement>(null);
  const seeded = useRef(false);

  useControlWarnings(open, onOpenChange !== undefined);

  // Uncontrolled only: with `open` given, the sync below owns the state and a
  // seed would be a second writer racing it at mount.
  useEffect(() => {
    const node = element.current;
    if (open !== undefined || !defaultOpen || seeded.current || !node) return;
    seeded.current = true;
    node.open = true;
  }, [open, defaultOpen]);

  // Report, and — when controlled — re-assert. `<summary>` is toggled by click,
  // `Enter` and `Space` without asking React, so a controlled item that only
  // rendered `open` would drift from the DOM the first time a user touched it.
  useEffect(() => {
    const node = element.current;
    if (!node) return;

    const sync = (event?: Event) => {
      if (event) {
        onOpenChange?.(
          (event as Event & { newState?: string }).newState === 'open',
        );
      }
      if (open !== undefined && node.open !== open) node.open = open;
    };
    sync();
    node.addEventListener('toggle', sync);
    return () => node.removeEventListener('toggle', sync);
  }, [open, onOpenChange]);

  return (
    <details
      {...rest}
      // The platform's own exclusivity. `undefined` when the accordion is not
      // exclusive, which is how `<details>` tells a group from a loner.
      name={accordion?.name}
      ref={mergeRefs(element, ref)}
      className={cn(styles.item, className)}
    >
      {children}
    </details>
  );
}

export { AccordionItem };
