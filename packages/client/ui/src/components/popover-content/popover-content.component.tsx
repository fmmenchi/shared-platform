import { useEffect, useRef } from 'react';
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
 * `role="dialog"` because it is content the user deals with and then leaves —
 * announced as a dialog, named by its `PopoverHeading`. It is NOT modal: the
 * page behind stays live and reachable, which is what separates a popover from
 * a `Dialog`.
 */
function PopoverContent(props: PopoverContentProps) {
  const { className, children, ref, ...rest } = props;
  const popover = usePopoverPart('PopoverContent');
  const surface = useRef<HTMLDivElement>(null);

  useAnchored(popover?.anchor ?? null, surface, {
    placement: popover?.placement ?? 'bottom',
    open: popover?.open ?? false,
  });

  const reportOpen = popover?.reportOpen;
  useEffect(() => {
    const node = surface.current;
    if (!node || !reportOpen) return;

    // The state is the platform's; this is how we hear about it. Everything
    // that opens or closes this surface — the trigger, `Esc`, a click outside,
    // another popover taking the layer — arrives here as one event, which is
    // why there is no handler anywhere else.
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
    <div
      {...rest}
      ref={mergeRefs(surface, ref)}
      id={popover?.surfaceId}
      popover="auto"
      role="dialog"
      aria-labelledby={popover?.headingId}
      tabIndex={-1}
      data-open={popover?.open ? '' : undefined}
      className={cn(styles.content, className)}
    >
      {children}
    </div>
  );
}

export { PopoverContent };
