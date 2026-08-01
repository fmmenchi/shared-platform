import { useCallback, useEffect, useRef, useState } from 'react';
import { useTooltipCoordination } from './tooltip.context.js';
import type {
  TooltipDisclosure,
  TooltipTiming,
} from './tooltip.disclosure.types.js';

/**
 * When a tooltip is shown, and when it goes.
 *
 * Colocated rather than a primitive, deliberately: the Popover opens on a click
 * that `popovertarget` drives declaratively, so it inherits `Esc`, light dismiss
 * and focus return from the platform and needs none of this. Delays are the
 * shape of a HOVER surface. The day a second one exists — a submenu — this file
 * moves to `primitives/` unchanged, and not a day earlier.
 *
 * A tooltip in a `TooltipProvider` also asks its neighbours two questions —
 * whether one of them just closed (then this one is instant) and whether one is
 * still open (then that one goes). Alone, the answers are no and none.
 *
 * Two things live in here that read as trivia at the call site and are not:
 *
 * - **a timer that is always cancellable.** Every event arrives while a previous
 *   delay may still be in flight: sweeping a toolbar must cancel the previous
 *   trigger's wait, and arriving on the surface must cancel the close the
 *   trigger's `pointerleave` just asked for — which is WCAG 1.4.13 "hoverable".
 * - **the press.** A click presses *and* focuses, so without remembering the
 *   press the focus behind it reopens what the press just closed.
 *   `:focus-visible` does not settle it, because a programmatic `.focus()` can
 *   match it too.
 */
export function useTooltipDisclosure(timing: TooltipTiming): TooltipDisclosure {
  const { openDelay, closeDelay } = timing;

  const [open, setOpen] = useState(false);
  // An open that has been asked for and has not happened yet. It is state, not
  // a ref, because `Escape` has to be listening during that window: measured,
  // pressing it 60ms into a 400ms `openDelay` was ignored and the tooltip
  // appeared anyway.
  const [asked, setAsked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pressed = useRef(false);
  const { skipsDelay, claim, release } = useTooltipCoordination();

  const schedule = useCallback((next: boolean, delay: number) => {
    clearTimeout(timer.current);
    setAsked(next);
    timer.current = setTimeout(() => {
      setAsked(false);
      setOpen(next);
    }, delay);
  }, []);

  const settle = useCallback((next: boolean) => {
    clearTimeout(timer.current);
    setAsked(false);
    setOpen(next);
  }, []);

  // A tooltip left waiting on an unmounted component would call `setOpen` on it.
  useEffect(() => () => clearTimeout(timer.current), []);

  const dismiss = useCallback(() => settle(false), [settle]);

  // What the neighbours are told, and it is the same event twice: while this one
  // is open nobody else may be, and once it closes the next one is instant.
  useEffect(() => {
    if (open) claim(dismiss);
    else release(dismiss);
    // Unmounting while open used to leave the group's slot pointing at a dead
    // `dismiss`: measured, every tooltip in that provider then opened instantly
    // for the rest of the page's life, because "somebody is open" was true
    // forever.
    return () => release(dismiss);
  }, [open, claim, release, dismiss]);

  return {
    open,
    engaged: open || asked,

    showNow: useCallback(() => settle(true), [settle]),

    showAfterDelay: useCallback(() => {
      pressed.current = false;
      schedule(true, skipsDelay() ? 0 : openDelay);
    }, [schedule, openDelay, skipsDelay]),

    showOnFocus: useCallback(() => {
      if (pressed.current) return;
      settle(true);
    }, [settle]),

    hideAfterDelay: useCallback(() => {
      pressed.current = false;
      schedule(false, closeDelay);
    }, [schedule, closeDelay]),

    dismiss,

    dismissOnPress: useCallback(() => {
      pressed.current = true;
      settle(false);
    }, [settle]),

    releasePress: useCallback(() => {
      pressed.current = false;
    }, []),
  };
}
