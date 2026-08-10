import { useEffect } from 'react';

/**
 * DID THE POINTER MOVE, or did the page move under it?
 *
 * `pointerenter` does not mean "the user pointed at this". It means the element
 * and the pointer are now in the same place, and either of them may have done
 * the travelling: a menu opening under a resting cursor, a row appearing above
 * one, a list scrolling — each fires an enter for an element nobody reached
 * for. Anything that reads an enter as an intention acts on all of them.
 *
 * That matters here because hovering a menu row FOCUSES it, so the pointer and
 * the keyboard can share one cursor. The trade only holds while the pointer is
 * the thing that moved; when it is not, a menu opening beneath a resting mouse
 * takes the focus away from the reader who opened it with the keyboard.
 *
 * THE TEST IS A POSITION, NOT AN EVENT COUNT. The first version asked whether a
 * `pointermove` had been seen since the last enter, and it was wrong about the
 * order: moving onto a new element fires `pointerover`/`pointerenter` BEFORE
 * the `pointermove` at the new position, so a real hover had no evidence yet
 * and was refused. (The bar's own "carries the menu under the pointer" test
 * caught it, which is the test earning its place.) Comparing coordinates has no
 * such ordering problem: at the moment of a real enter the last recorded
 * position is still the PREVIOUS one, so it differs — while an enter caused by
 * the layout moving under a still cursor carries exactly the position already
 * recorded.
 *
 * MODULE-LEVEL, and not as a shortcut: the pointer is one thing for the whole
 * document, and a per-instance record would answer for movements it never saw.
 * One listener, refcounted while a menu is mounted, so nothing is attached at
 * import and nothing outlives the last consumer.
 *
 * `movementX/Y` LOOKS like the answer and is not. Measured, driving Chromium
 * through the automation protocol: a real hover delivers
 * `pointerover` → `pointerenter` → `pointermove`, every one of them reporting
 * `movementX = 0, movementY = 0`. A signal that is zero for genuine movement
 * cannot be asked whether something moved.
 *
 * WITH NO HISTORY the answer is NO, and the opposite was tried first. The
 * argument for YES was that a cursor can only be resting somewhere if an
 * earlier event put it there — which is false where it matters most: an
 * automated browser starts its pointer at 0,0 without dispatching anything, so
 * the very first boundary event a page ever sees can be one the LAYOUT caused.
 * That is not a testing curiosity, it is the case this exists for, and it was
 * still getting through.
 *
 * The cost is a pointer that arrives having never moved inside this document,
 * which a real one cannot do: reaching a menu means crossing the page, and
 * crossing the page is `pointermove` after `pointermove`. A fixture that hovers
 * with no travel first is describing something that does not happen, and says
 * so by not being believed.
 */
let last: { x: number; y: number } | null = null;
let watchers = 0;

const see = (event: PointerEvent) => {
  last = { x: event.clientX, y: event.clientY };
};

/** Whether the pointer itself is what arrived, rather than the page. */
export function pointerMoved(event: {
  clientX: number;
  clientY: number;
}): boolean {
  if (last === null) return false;
  return event.clientX !== last.x || event.clientY !== last.y;
}

/** Watch the pointer for as long as the component is mounted. */
export function useWatchPointer(): void {
  useEffect(() => {
    watchers += 1;
    if (watchers === 1) {
      document.addEventListener('pointermove', see, {
        capture: true,
        passive: true,
      });
    }

    return () => {
      watchers -= 1;
      if (watchers === 0) {
        document.removeEventListener('pointermove', see, { capture: true });
        // The next menu starts from no history rather than from a position
        // nobody is left to answer for.
        last = null;
      }
    };
  }, []);
}
