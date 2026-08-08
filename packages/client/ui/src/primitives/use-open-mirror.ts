import { useEffect, useRef, type RefObject } from 'react';

/**
 * Keep a component's idea of "open" in step with the platform's, for a surface
 * the platform toggles on its own.
 *
 * `popovertarget`, `Esc`, a click outside, another popover taking the top
 * layer, a `<summary>` clicked or answered with Enter: every one of them opens
 * or closes the surface without asking us, and every one arrives as the same
 * `toggle` event. Nothing here commands the
 * surface — it only listens, which is why a component using this has no
 * `open()` of its own to call.
 *
 * Three things it does that a bare listener does not, each of them a defect
 * measured on one of the two surfaces that use it:
 *
 * - **it reads the state before subscribing.** A click that lands before React
 *   has hydrated — which is the whole point of a declarative trigger — has
 *   already fired `toggle`, so a component that only subscribed never learnt it
 *   was open: `aria-expanded="false"` over a live surface, and for the menu no
 *   command focused and the arrows dead.
 * - **it reports closed when it goes.** Unmounted while open, nothing will ever
 *   fire `toggle` again and the trigger goes on saying "expanded" for a surface
 *   that is not there. Asked of its own bookkeeping and not of the element:
 *   by cleanup time React has taken the node out and the platform has already
 *   closed the popover, so `:popover-open` says no and the repair never runs.
 *
 * ONE callback, because there is one thing to say. A component that needs to do
 * more on an opening than record it — a menu puts the focus on a command, since
 * the platform opens the surface and stops there — composes that INTO what it
 * passes, rather than being handed a second hook to hang it on. An earlier
 * version had an `onOpen` beside this and immediately wanted an `onClose` to
 * match, which is the shape telling you it is the wrong shape.
 *
 * `report` must be STABLE. It is a dependency of the subscription and a new
 * identity resubscribes: harmless in itself, except that the cleanup reports
 * closed on the way past, so an unstable callback would say the surface had
 * closed and reopened without anything having happened.
 */
export function useOpenMirror(
  surfaceRef: RefObject<HTMLElement | null>,
  report: (open: boolean) => void,
): void {
  const reported = useRef(false);

  useEffect(() => {
    const node = surfaceRef.current;
    if (!node) return;

    const mirror = (open: boolean) => {
      reported.current = open;
      report(open);
    };

    // Two ways a surface says it is open, because two kinds use this: a
    // popover answers `:popover-open`, a `<details>` answers its own property.
    // The `instanceof` keeps the second from ever firing for the first.
    if (
      node.matches(':popover-open') ||
      (node instanceof HTMLDetailsElement && node.open)
    ) {
      mirror(true);
    }

    const onToggle = (event: Event) => {
      mirror((event as Event & { newState?: string }).newState === 'open');
    };
    node.addEventListener('toggle', onToggle);

    return () => {
      node.removeEventListener('toggle', onToggle);
      if (reported.current) mirror(false);
    };
  }, [surfaceRef, report]);
}
