import { useCallback, useEffect, useRef } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { lockScroll, unlockScroll } from '../../primitives/scroll-lock.js';
import { useDialogPart } from '../dialog/dialog.context.js';
import { useDialogContentWarnings } from './dialog-content.guards.js';
import type { DialogContentProps } from './dialog-content.types.js';
import styles from './dialog-content.module.css';

/**
 * The modal surface: a native `<dialog>`, opened with `showModal()` by whoever
 * commanded it, so the focus is trapped, the page behind is inert and the
 * `::backdrop` is the platform's.
 *
 * `closedby="any"` is what makes a click on the backdrop dismiss it. It is
 * Baseline "newly" and deliberately has no fallback: `Escape` and the close
 * button work everywhere, so a browser without it loses a convenience, not a
 * way out.
 */
function DialogContent(props: DialogContentProps) {
  const { className, children, ref, ...rest } = props;
  const dialog = useDialogPart('DialogContent');
  const surface = useRef<HTMLDialogElement>(null);
  const locked = useRef(false);

  const setSurface = dialog?.setSurface;
  const reportOpen = dialog?.reportOpen;

  const register = useCallback(
    (node: HTMLDialogElement | null) => setSurface?.(node),
    [setSurface],
  );

  useEffect(() => {
    const node = surface.current;
    if (!node || !reportOpen) return;

    // READ FIRST, then subscribe: a dialog opened before hydration has already
    // fired its `toggle`, and a component that only subscribed would never
    // learn it was open. Reported only when it IS open — an unconditional call
    // told every consumer their dialog had just closed, at mount, before
    // anything had happened.
    if (node.open) reportOpen(true);
    if (node.matches(':modal')) {
      locked.current = true;
      lockScroll();
    }

    const onToggle = (event: Event) => {
      const isOpen =
        (event as Event & { newState?: string }).newState === 'open';
      reportOpen(isOpen);

      // `:modal`, not `open`: a non-modal `<dialog open>` leaves the page
      // interactive, and freezing its scroll would trap a user with nothing to
      // dismiss. Measured — the CSS version keyed on the attribute and did
      // exactly that.
      const shouldLock = isOpen && node.matches(':modal');
      if (shouldLock === locked.current) return;
      locked.current = shouldLock;
      if (shouldLock) lockScroll();
      else unlockScroll();
    };
    node.addEventListener('toggle', onToggle);

    return () => {
      node.removeEventListener('toggle', onToggle);
      // Unmounted while open: the element goes, the lock would not.
      if (locked.current) {
        locked.current = false;
        unlockScroll();
      }
    };
  }, [reportOpen]);

  const invoker = dialog?.invoker;
  useEffect(() => {
    const node = surface.current;
    if (!node) return;

    // THE ONE THING THE PLATFORM DOES NOT DO EVERYWHERE. Measured on close with
    // the focus inside: Chromium and Firefox put it back on the invoker, after
    // `Escape`, after `command="close"`, after a light dismiss and after a
    // `<form method="dialog">`; WebKit leaves it on `<body>` in all four, and a
    // Safari keyboard user then restarts at the top of the document.
    //
    // DEFERRED, because the first version read `document.activeElement` inside
    // the `close` event and never fired anywhere: WebKit drops the focus ~60ms
    // AFTER that event, so at the moment of the check it was still inside the
    // dialog and the guard said "somebody has this". Measured at microtask,
    // rAF, 0ms, 60ms and 400ms.
    //
    // Only ever a repair: if any engine — or the consumer, from `onOpenChange`
    // — has put the focus somewhere real by then, this stands down.
    let pending: ReturnType<typeof setTimeout>;
    const restore = () => {
      clearTimeout(pending);
      pending = setTimeout(() => {
        if (document.activeElement !== document.body) return;
        if (invoker?.isConnected) invoker.focus();
      }, 150);
    };

    node.addEventListener('close', restore);
    return () => {
      clearTimeout(pending);
      node.removeEventListener('close', restore);
    };
  }, [invoker]);

  // The state initializer, and it has to be imperative: `<dialog open>` is a
  // NON-modal dialog — measured, no backdrop, the page behind stays clickable
  // and `Escape` does not close it — so there is no attribute that means
  // "modal". Seeded ONCE and never re-asserted: from here the DOM owns the
  // state, which is the whole reason there is no `open` prop to disagree with.
  const controlled = dialog?.open;
  const seeded = useRef(false);
  const defaultOpen = dialog?.defaultOpen ?? false;
  useEffect(() => {
    const node = surface.current;
    // Uncontrolled only: with `open` given, the sync below owns the state and a
    // seed would be a second writer racing it at mount.
    if (controlled !== undefined || !defaultOpen || seeded.current || !node)
      return;
    seeded.current = true;
    // `showModal()` throws on an already-open dialog, and a consumer may have
    // opened it from the ref before this ran.
    if (!node.open) node.showModal();
  }, [controlled, defaultOpen]);

  // The controlled half, and it runs on a CHANGE of `open` — never on what the
  // platform did. An earlier version re-asserted the prop on every `toggle`,
  // the way React snaps an `<input value>` back when the consumer swallows the
  // change, and measured what that means for a modal: with `open` still true,
  // `Escape` closed the dialog and the listener reopened it before the next
  // frame. Twice. The user could not leave — a keyboard trap, WCAG 2.1.2, from
  // a consumer bug that on an input would only have meant "you cannot type".
  //
  // So: `Escape`, a backdrop click, `command="close"` and
  // `<form method="dialog">` are CLOSE REQUESTS, and they are granted. What the
  // consumer gets for ignoring `onOpenChange` is a visible divergence — the
  // dialog is shut while their prop says open — which they can see, report and
  // fix. It is the one place this component refuses to be as strict as React.
  useEffect(() => {
    const node = surface.current;
    if (!node || controlled === undefined) return;
    if (controlled && !node.open) node.showModal();
    if (!controlled && node.open) node.close();
  }, [controlled]);

  useDialogContentWarnings(
    surface,
    invoker,
    controlled,
    dialog?.hasOpenChange ?? false,
  );

  return (
    <dialog
      // BEFORE the spread: with no heading this resolves to `undefined`, and
      // written after it would silently wipe the name the consumer passed.
      aria-labelledby={dialog?.headingId}
      // Also before the spread, and for a reason a consumer feels: a modal
      // holding an unfinished form must be able to ask for `closerequest`, or a
      // stray click on the backdrop throws the typing away. Not in React's JSX
      // types yet, so it is written as an attribute.
      {...{ closedby: 'any' }}
      {...rest}
      ref={mergeRefs(surface, register, ref)}
      // NOT overridable: the trigger's `commandfor` points here, so an id from
      // outside would cut the wire. Documented on the type.
      id={dialog?.surfaceId}
      className={cn(styles.content, className)}
    >
      {children}
    </dialog>
  );
}

export { DialogContent };
