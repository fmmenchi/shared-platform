import { useCallback, useEffect, useRef } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useAnchored } from '../../primitives/use-anchored.js';
import { usePopoverPart } from '../popover/popover.context.js';
import type { PopoverContentProps } from './popover-content.types.js';
import styles from './popover-content.module.css';

/**
 * The surface itself: in the top layer, anchored to the trigger, and dismissed
 * by the platform.
 *
 * A native `<dialog>`, not a `div` with `role="dialog"`: it is content the user
 * deals with and then leaves, which is what the element means, and the role
 * comes with it (ADR-0016). Measured before choosing it — `<dialog popover>`
 * opens from `popovertarget`, paints, takes `Esc`, light-dismisses and returns
 * the focus exactly as a `div` does, so the native element costs nothing.
 *
 * It is NOT modal. `showModal()` is never called; the page behind stays live
 * and reachable, which is what separates a popover from a `Dialog`.
 */
function PopoverContent(props: PopoverContentProps) {
  const { className, children, ref, ...rest } = props;
  const popover = usePopoverPart('PopoverContent');
  const surface = useRef<HTMLDialogElement>(null);

  // CLOSED, not hidden. Hiding it left an open dialog in the top layer with the
  // focus inside it: measured, `visibility: hidden` blurred the focused control
  // to `<body>` and Tab restarted at the top of the document, while light
  // dismiss still ate the next click. Closing hands the focus back to the
  // trigger, which is the platform's job and it does it.
  const close = useCallback(() => surface.current?.hidePopover(), []);

  useAnchored(popover?.anchor ?? null, surface, {
    placement: popover?.placement ?? 'bottom',
    open: popover?.open ?? false,
    onAnchorLost: close,
  });

  const reportOpen = popover?.reportOpen;
  useEffect(() => {
    const node = surface.current;
    if (!node || !reportOpen) return;

    // READ FIRST, then subscribe. Measured: a popover opened before hydration
    // — which is the whole point of a declarative trigger — had already fired
    // its `toggle`, so a component that only subscribed never learnt it was
    // open, and told assistive tech `aria-expanded="false"` over a live dialog.
    // Nothing paints from this: the stylesheet keys off `:popover-open`, so
    // arriving late costs an announcement, not a visible surface.
    reportOpen(node.matches(':popover-open'));

    // Everything that opens or closes this surface — the trigger, `Esc`, a
    // click outside, another popover taking the layer — arrives here as one
    // event, which is why there is no handler anywhere else.
    const onToggle = (event: Event) => {
      reportOpen((event as Event & { newState?: string }).newState === 'open');
    };
    node.addEventListener('toggle', onToggle);
    return () => node.removeEventListener('toggle', onToggle);
  }, [reportOpen]);

  useEffect(() => {
    // Written as an ATTRIBUTE, not React's `autoFocus` prop, which focuses at
    // mount — this surface is mounted and closed for most of its life. The UA
    // reads it when the popover is shown and moves the focus in; measured in
    // Chromium, and the one piece of focus management the platform does not do
    // on its own. Taking the focus OUT again on close is its business, and it
    // does it (measured, from a control inside).
    surface.current?.setAttribute('autofocus', '');
  }, []);

  return (
    <dialog
      // BEFORE the spread: `aria-labelledby` written after it resolved to
      // `undefined` with no heading and silently wiped the one the consumer had
      // passed — while `popover` and the id below are not theirs to change.
      aria-labelledby={popover?.headingId}
      {...rest}
      ref={mergeRefs(surface, ref)}
      id={popover?.surfaceId}
      popover="auto"
      tabIndex={-1}
      className={cn(styles.content, className)}
    >
      {children}
    </dialog>
  );
}

export { PopoverContent };
