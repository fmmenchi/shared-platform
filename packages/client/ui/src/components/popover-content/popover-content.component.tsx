import { useCallback, useEffect, useRef } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useAnchored } from '../../primitives/use-anchored.js';
import { useOpenMirror } from '../../primitives/use-open-mirror.js';
import { usePopoverPart } from '../popover/popover.context.js';
import { usePopoverControlWarnings } from './popover-content.guards.js';
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

  // The state initializer, imperative for the same reason the Dialog's is: the
  // platform toggles a popover through `popovertarget` or `showPopover()`, and
  // no attribute opens one. Seeded ONCE and never re-asserted — from here the
  // DOM owns the state, which is why there is no `open` prop beside it.
  const controlled = popover?.controlled;
  usePopoverControlWarnings(controlled, popover?.hasOpenChange ?? false);
  // DECLARED FIRST, because effects run in declaration order and the two
  // effects below both call `showPopover()` in the same mount commit — the
  // `defaultOpen` seed and the controlled sync. Declared last (as it was), the
  // attribute arrived AFTER the show on those paths: the surface opened, the
  // UA found no `autofocus`, and the focus stayed on <body> with the name
  // unannounced — on exactly the openings a consumer does not click for. The
  // file already uses declaration order as a tool and says so for
  // `useAnchored`; this is the same tool, one effect earlier.
  useEffect(() => {
    // Written as an ATTRIBUTE, not React's `autoFocus` prop, which focuses at
    // mount — this surface is mounted and closed for most of its life. The UA
    // reads it when the popover is shown and moves the focus in; measured in
    // Chromium, and the one piece of focus management the platform does not do
    // on its own. Taking the focus OUT again on close is its business, and it
    // does it (measured, from a control inside).
    surface.current?.setAttribute('autofocus', '');
  }, []);

  const seeded = useRef(false);
  const defaultOpen = popover?.defaultOpen ?? false;
  useEffect(() => {
    const node = surface.current;
    // Uncontrolled only: with `open` given, the sync below owns the state.
    if (controlled !== undefined || !defaultOpen || seeded.current || !node)
      return;
    seeded.current = true;
    // `showPopover()` throws on an already-open surface, and the trigger or a
    // consumer's ref may have opened it before this ran.
    if (!node.matches(':popover-open')) node.showPopover();
  }, [controlled, defaultOpen]);

  // The controlled half, and it runs on a CHANGE of `open` — never on what the
  // platform did. An earlier version re-asserted the prop on every `toggle`,
  // and measured what that means: with `open` still true, `Escape` did not
  // dismiss, a click outside did not dismiss, and because a light-dismiss
  // popover CONSUMES that click, the page behind became unusable while the
  // surface sat there. A dismissal is a request, and it is granted; an
  // inattentive consumer gets a visible divergence instead of a stuck page.
  useEffect(() => {
    const node = surface.current;
    if (!node || controlled === undefined) return;
    const isOpen = node.matches(':popover-open');
    if (controlled && !isOpen) node.showPopover();
    if (!controlled && isOpen) node.hidePopover();
  }, [controlled]);

  useAnchored(popover?.anchor ?? null, surface, {
    placement: popover?.placement ?? 'bottom',
    open: popover?.open ?? false,
    onAnchorLost: close,
  });

  // Everything that opens or closes this surface — the trigger, `Esc`, a click
  // outside, another popover taking the layer — arrives as one `toggle` event,
  // which is why there is no handler anywhere else. The primitive reads the
  // state before it subscribes, and reports closed if the surface is taken away
  // while open; both were defects here, and the second one shipped.
  const reportOpen = popover?.reportOpen;
  const report = useCallback(
    (open: boolean) => reportOpen?.(open),
    [reportOpen],
  );
  useOpenMirror(surface, report);

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
