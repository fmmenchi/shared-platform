import { useCallback, useEffect, useRef } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useOpenMirror } from '../../primitives/use-open-mirror.js';
import { useAccordionPart } from '../accordion/accordion.context.js';
import { useControlWarnings } from './accordion-item.guards.js';
import type { AccordionItemProps } from './accordion-item.types.js';
import styles from './accordion-item.module.css';

/**
 * One disclosure: a native `<details>`, with its `<summary>` and its panel as
 * children.
 *
 * The element does the work. What is left here is the pair the platform has no
 * declarative answer for, and the `name` that makes an exclusive accordion
 * exclusive — which are the two things that must never be asked for together;
 * see below.
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

  // TWO OWNERS, ONE STATE — so one of them has to go, and it is not the
  // platform. Inside an exclusive accordion `<details name>` closes the
  // siblings itself; a controlled item that re-asserts `open` fights it, and
  // the fight is not a flicker. Measured: an item pinned open made its sibling
  // PERMANENTLY un-openable (9 toggle events for 2 clicks), and two controlled
  // items driven by the usual single-open reducer ended with NOTHING open,
  // because the exclusivity-induced close reported after the open and won.
  // So in an exclusive group `open` is refused rather than half-honoured: the
  // item behaves uncontrolled and the warning says to drop one of the two.
  const grouped = accordion?.name !== undefined;
  const controlled = grouped ? undefined : open;

  useControlWarnings(open, onOpenChange !== undefined, grouped);

  // The mirror reads the state before subscribing, which is right for a surface
  // the platform may have opened before hydration — but WE opened this one, and
  // a seed is not an event. So the first report is swallowed when it is the
  // state we asked for: measured, `defaultOpen` alone fired `onOpenChange(true)`
  // at mount, and a reducer or an analytics call saw an open nobody performed.
  // A first report that DISAGREES still gets through: that one is a real click
  // that landed before we did.
  const asked = useRef(controlled ?? defaultOpen);
  const first = useRef(true);
  const report = useCallback(
    (next: boolean) => {
      if (first.current) {
        first.current = false;
        if (next === asked.current) return;
      }
      onOpenChange?.(next);
    },
    [onOpenChange],
  );
  useOpenMirror(element, report);

  // Controlled: win BACK. A `<summary>` is toggled by click, Enter and Space
  // without asking React, so a prop that only rendered would drift from the DOM
  // the first time a user touched it.
  useEffect(() => {
    const node = element.current;
    if (!node || controlled === undefined) return;

    const sync = () => {
      if (node.open !== controlled) node.open = controlled;
    };
    sync();
    node.addEventListener('toggle', sync);
    return () => node.removeEventListener('toggle', sync);
  }, [controlled]);

  return (
    <details
      {...rest}
      // RENDERED, not written in an effect. `<details open>` is the one
      // declarative seed the platform gives, so it belongs in the markup: an
      // effect left the panel closed in server HTML and flashed open on
      // hydration, which for a disclosure means content that is invisible
      // without JavaScript. React writes this attribute only when the value
      // CHANGES, so an unchanging `defaultOpen` seeds it once and then lets the
      // user's own toggles stand — the test for that is what pins it.
      open={controlled ?? defaultOpen}
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
