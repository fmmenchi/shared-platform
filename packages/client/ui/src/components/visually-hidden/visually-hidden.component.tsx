import { useEffect, useRef } from 'react';
import type { ElementType } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { deferDevCheck } from '../../primitives/use-dev-warning.js';
import {
  focusableWithin,
  hiddenFocusableMessage,
} from './visually-hidden.guards.js';
import type { VisuallyHiddenProps } from './visually-hidden.types.js';
import styles from './visually-hidden.module.css';

/**
 * Text for assistive technology and not for the eye — the severity word before
 * an alert, the "(opens in a new tab)" after a link, the heading a section owes
 * the document outline but the design does not draw.
 *
 * THIS IS THE ELEMENT ADR-0016 ALLOWS, and it is worth saying why, because the
 * rule reads the other way at first: an element whose job is a few CSS
 * declarations does not earn its place. The exception is the one the rule
 * names — those declarations belong on "the element that is already there", and
 * here there frequently is none. The words exist only for a reader, so nothing
 * in the design put a node under them. When there IS an element already, `as`
 * is how you reach it (`as="h2"`) rather than wrapping it.
 *
 * IT IS NOT `hidden`, AND NOT `aria-hidden`. Both of those remove content from
 * everyone; this removes it from sight ALONE and leaves it in the accessibility
 * tree. Reaching for it to hide something from everybody is the one confusion
 * worth naming up front.
 *
 * NOT A SKIP LINK. A skip link must become visible when it takes focus, which
 * is a paint — a fill, a focus ring, a position above a sticky header, and
 * forced-colors handling for all three. `AppLayout` owns one already and this
 * component deliberately does not carry a second, half-built copy of it. What
 * it does instead is warn when something focusable ends up inside it, which is
 * the same mistake arriving from the other direction.
 */
function VisuallyHidden<As extends ElementType = 'span'>(
  props: VisuallyHiddenProps<As>,
) {
  // Destructured against the concrete `span` shape so the reads below type
  // cleanly; the public signature stays polymorphic for callers.
  const { as, className, children, ref, ...rest } =
    props as VisuallyHiddenProps<'span'> & { as?: As };

  const Comp = (as ?? 'span') as ElementType;
  const own = useRef<HTMLElement | null>(null);

  // `children` is the dependency because it is what changes the subtree the
  // check walks. Re-running on it is the point: content arriving from a later
  // fetch is exactly when a focusable element appears without anyone editing
  // this call site.
  useEffect(
    () =>
      deferDevCheck(() => {
        const node = own.current;
        if (!node) return;
        const found = focusableWithin(node);
        if (found) console.warn(hiddenFocusableMessage(found));
      }),
    [children],
  );

  return (
    <Comp
      {...rest}
      ref={mergeRefs(ref, own)}
      className={cn(styles.visuallyHidden, className)}
    >
      {children}
    </Comp>
  );
}

export { VisuallyHidden };
