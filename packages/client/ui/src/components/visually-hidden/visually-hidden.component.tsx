import { useEffect, useRef } from 'react';
import type { ElementType } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { deferDevCheck } from '../../primitives/use-dev-warning.js';
import {
  hiddenFocusableMessage,
  tabbableWithin,
} from './visually-hidden.guards.js';
import type { VisuallyHiddenProps } from './visually-hidden.types.js';
import styles from './visually-hidden.module.css';

/**
 * Text for assistive technology and not for the eye — the severity word before
 * an alert, the "(opens in a new tab)" after a link, the heading a section owes
 * the document outline but the design does not draw.
 *
 * WHY THIS EARNS ITS PLACE under ADR-0016, which reads the other way at first:
 * an element whose job is a few CSS declarations does not earn one. It passes
 * on the ADR's positive test — "an element is justified only by something it
 * does that the alternative cannot" — and the alternative genuinely cannot. The
 * content here is a TEXT NODE, which carries no class, while the visible text
 * beside it must stay visible; no rule on any element already present can hide
 * one and not the other. That is a capability, not a tidier API, and it is the
 * distinction the ADR turns on. Note it is NOT an exception for "there was no
 * element there" — that is the `InputGroupSlot` reasoning the ADR exists to
 * kill. When an element IS already there, `as` reaches it (`as="h2"`) and no
 * node is added at all.
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

  // BEST EFFORT, and worth stating exactly rather than generously: this
  // re-runs whenever this component re-renders, because JSX `children` are a
  // fresh object every time. So it over-runs (a check per render, in dev only)
  // and it can also MISS — a child that fetches and then renders a control
  // without the parent re-rendering never re-triggers it, and neither does
  // anything injected imperatively. It catches the common shape, not all of them.
  useEffect(
    () =>
      deferDevCheck(() => {
        const node = own.current;
        if (!node) return;
        const found = tabbableWithin(node);
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
