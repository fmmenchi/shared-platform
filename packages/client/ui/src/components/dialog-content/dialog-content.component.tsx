import { useCallback, useEffect, useRef } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useDialogPart } from '../dialog/dialog.context.js';
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
    // learn it was open.
    reportOpen(node.open);

    const onToggle = (event: Event) => {
      reportOpen((event as Event & { newState?: string }).newState === 'open');
    };
    node.addEventListener('toggle', onToggle);
    return () => node.removeEventListener('toggle', onToggle);
  }, [reportOpen]);

  const invoker = dialog?.invoker;
  useEffect(() => {
    const node = surface.current;
    if (!node) return;

    // THE ONE THING THE PLATFORM DOES NOT DO EVERYWHERE. Measured on close,
    // with the focus inside: Chromium and Firefox put it back on the invoker,
    // WebKit drops it on `<body>` — and a keyboard user in Safari then restarts
    // at the top of the document. Only ever a repair: if the engine already put
    // the focus somewhere real, this leaves it alone.
    const restore = () => {
      if (document.activeElement === document.body) invoker?.focus();
    };
    node.addEventListener('close', restore);
    return () => node.removeEventListener('close', restore);
  }, [invoker]);

  return (
    <dialog
      // BEFORE the spread: with no heading this resolves to `undefined`, and
      // written after it would silently wipe the name the consumer passed.
      aria-labelledby={dialog?.headingId}
      {...rest}
      ref={mergeRefs(surface, register, ref)}
      id={dialog?.surfaceId}
      // Not in React's JSX types yet — the attribute is what the browser reads.
      {...{ closedby: 'any' }}
      className={cn(styles.content, className)}
    >
      {children}
    </dialog>
  );
}

export { DialogContent };
