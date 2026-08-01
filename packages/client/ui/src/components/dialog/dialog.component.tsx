import { useCallback, useId, useMemo, useState } from 'react';
import { DialogContext } from './dialog.context.js';
import type { DialogContextValue } from './dialog.context.js';
import type { DialogProps } from './dialog.types.js';

/**
 * Something the user must deal with before going back to the page.
 *
 *     <Dialog>
 *       <DialogTrigger>Delete…</DialogTrigger>
 *       <DialogContent>
 *         <DialogHeading>Delete this draft?</DialogHeading>
 *         <p>It cannot be undone.</p>
 *         <DialogClose>Cancel</DialogClose>
 *       </DialogContent>
 *     </Dialog>
 *
 * It renders NO element of its own — it is the wiring between the parts, and an
 * element that only carries a context has not earned its place (ADR-0016).
 *
 * A **modal**, and that is the whole difference from a `Popover`: the page
 * behind is inert, the focus is trapped, and it is dismissed on purpose rather
 * than by looking away. Measured in all three engines before any of this was
 * written — `showModal()` gives the focus trap, the inert background, the
 * `::backdrop`, `Escape`, and `<form method="dialog">` with a `returnValue`;
 * `command="show-modal"` opens it without script; `closedby="any"` dismisses it
 * on a backdrop click without the geometry comparison every library writes; and
 * `:has()` locks the page behind it in CSS, without the scroll-locking
 * dependency they all take.
 *
 * If it can be ignored, it is a `Popover`. If it only describes, it is a
 * `Tooltip`.
 */
function Dialog(props: DialogProps) {
  const { children, open, defaultOpen = false, onOpenChange } = props;

  const surfaceId = useId();
  const [surface, setSurface] = useState<HTMLDialogElement | null>(null);
  const [invoker, setInvoker] = useState<HTMLElement | null>(null);
  // A LIST, not the last writer. Measured with two headings mounted: unmounting
  // either one left the dialog nameless — the second because it held the slot,
  // the first because the cleanup cleared it regardless. The first still
  // mounted names the dialog, which is also the reading order.
  const [headingIds, setHeadingIds] = useState<readonly string[]>([]);

  const registerHeading = useCallback((id: string) => {
    setHeadingIds((ids) => [...ids, id]);
    return () => setHeadingIds((ids) => ids.filter((other) => other !== id));
  }, []);

  const reportOpen = useCallback(
    (next: boolean) => onOpenChange?.(next),
    [onOpenChange],
  );

  const value = useMemo<DialogContextValue>(
    () => ({
      surfaceId,
      reportOpen,
      surface,
      setSurface,
      invoker,
      setInvoker,
      open,
      hasOpenChange: onOpenChange !== undefined,
      defaultOpen,
      headingId: headingIds[0],
      registerHeading,
    }),
    [
      surfaceId,
      reportOpen,
      surface,
      invoker,
      open,
      onOpenChange,
      defaultOpen,
      headingIds,
      registerHeading,
    ],
  );

  return (
    <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
  );
}

export { Dialog };
