import { useCallback, useId, useMemo, useState } from 'react';
import { PopoverContext } from './popover.context.js';
import type { PopoverContextValue } from './popover.context.js';
import type { PopoverProps } from './popover.types.js';

/**
 * A surface with real content, opened from a control and dismissed the way the
 * platform dismisses things.
 *
 *     <Popover>
 *       <PopoverTrigger>Share</PopoverTrigger>
 *       <PopoverContent>
 *         <PopoverHeading>Share this page</PopoverHeading>
 *         …
 *         <PopoverClose>Done</PopoverClose>
 *       </PopoverContent>
 *     </Popover>
 *
 * It renders NO element of its own — it is the wiring between the parts, and an
 * element that only carries a context has not earned its place (ADR-0016).
 *
 * What it does not contain is the point of it (ADR-0021). The toggle is
 * `popovertarget`, so no click handler; `Esc`, click-outside and returning the
 * focus to the trigger are `popover="auto"`, so no dismissal logic and no focus
 * manager; the top layer is the platform's, so no portal and no `z-index`. All
 * measured in Chromium before any of this was written. What is left for us is
 * what the platform genuinely does not do: where the surface goes, what the
 * trigger says about it, and what names it.
 *
 * A **tooltip is not a small popover** — it opens on hover, never takes focus
 * and may hold nothing interactive. A **modal is not a popover either**: a
 * `popover="auto"` leaves the page live behind it by design, and something that
 * must be dealt with before anything else is a `Dialog`.
 */
function Popover(props: PopoverProps) {
  const { children, placement = 'bottom', onOpenChange } = props;

  const surfaceId = useId();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [headingId, setHeadingId] = useState<string | undefined>(undefined);

  const reportOpen = useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  const value = useMemo<PopoverContextValue>(
    () => ({
      surfaceId,
      open,
      reportOpen,
      anchor,
      setAnchor,
      headingId,
      setHeadingId,
      placement,
    }),
    [surfaceId, open, reportOpen, anchor, headingId, placement],
  );

  return (
    <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>
  );
}

export { Popover };
