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
  const { children, onOpenChange } = props;

  const surfaceId = useId();
  const [open, setOpen] = useState(false);
  const [surface, setSurface] = useState<HTMLDialogElement | null>(null);
  const [invoker, setInvoker] = useState<HTMLElement | null>(null);
  const [headingId, setHeadingId] = useState<string | undefined>(undefined);

  const reportOpen = useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  const value = useMemo<DialogContextValue>(
    () => ({
      surfaceId,
      open,
      reportOpen,
      surface,
      setSurface,
      invoker,
      setInvoker,
      headingId,
      setHeadingId,
    }),
    [surfaceId, open, reportOpen, surface, invoker, headingId],
  );

  return (
    <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
  );
}

export { Dialog };
