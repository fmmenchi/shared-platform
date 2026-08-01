import { useEffect, type RefObject } from 'react';
import {
  autoUpdate,
  computePosition,
  flip,
  hide,
  offset,
  shift,
} from '@floating-ui/dom';
import type { AnchoredOptions } from './use-anchored.types.js';

/**
 * Keep a floating surface next to its anchor: positioned, flipped when there is
 * no room on the preferred side, and slid back into view when it would leave it.
 *
 * The one place the design system imports geometry (ADR-0021). Everything above
 * it — what opens the surface, what closes it, what it announces — is the
 * component's, which is why this hook knows nothing about focus, dismissal or
 * ARIA. It is internal and unexported from the package: it becomes public only
 * if a second consumer confirms its shape.
 *
 * Two things it does NOT do, deliberately:
 *
 * - **It never sets React state.** Coordinates are written straight to the
 *   element's style, because `autoUpdate` fires on every scroll frame and a
 *   `setState` there would re-render the subtree sixty times a second to move
 *   two pixels.
 * - **It does not show or hide anything.** Visibility belongs to the component:
 *   a tooltip's is hover and focus, a popover's is a click. This only measures —
 *   including when the anchor has gone — scrolled out of a clipping ancestor,
 *   hidden, or removed — which it REPORTS through `onAnchorLost` and leaves the
 *   component to answer, because the answer is always to close and only the
 *   component can. Same for the side it settled on (`data-placement`) and where
 *   the anchor's centre falls along the surface (`--anchor-centre`): facts an
 *   arrow needs, drawn by whoever wants one.
 *
 * CSS anchor positioning does all of this declaratively and recomputes natively,
 * and all three current engines implement it correctly — measured. It is not
 * Baseline yet, which is about the browsers people are running rather than the
 * ones being shipped, so this hook is the bridge. When it lands, this file
 * becomes a stylesheet and nothing above it changes.
 *
 * The anchor arrives as an ELEMENT and the surface as a ref, which is not an
 * inconsistency: the surface is the component's own node and never changes, but
 * the anchor may be somebody else's — held in state so that a new one actually
 * re-runs the measurement, which a ref would not report.
 */
export function useAnchored(
  anchor: HTMLElement | null,
  surfaceRef: RefObject<HTMLElement | null>,
  options: AnchoredOptions,
): void {
  const { placement = 'top', offset: gap = 8, open, onAnchorLost } = options;

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!open || !anchor || !surface) return;

    const reposition = () => {
      // An anchor with no box — `display: none`, or removed from the document
      // while the surface is still open — measures as a zero rect at the
      // origin, and the clamp would park the surface in the corner of the
      // viewport. The coordinates are left alone; what must NOT be left alone
      // is the report. Measured: returning quietly here stranded a tooltip on
      // screen forever when its trigger was removed under the pointer, because
      // the `pointerleave` that would have closed it could no longer fire.
      if (anchor.getClientRects().length === 0) {
        onAnchorLost?.();
        return;
      }

      void computePosition(anchor, surface, {
        placement,
        strategy: 'fixed',
        middleware: [
          offset(gap),
          flip(),
          shift({ padding: 8 }),
          // The top layer is not clipped by anything, which is the point of it
          // and also this: measured, an anchor scrolled halfway out of its
          // `overflow: auto` container left the surface painted in full over
          // that container, pointing at a control the user could no longer see.
          hide({ padding: 4 }),
        ],
      }).then(({ x, y, placement: resolved, middlewareData }) => {
        // Written to the element, not to state — see the note above.
        surface.style.left = `${x}px`;
        surface.style.top = `${y}px`;

        // Where it ENDED UP, which is not what was asked for once `flip()` has
        // had its say — a stylesheet drawing an arrow needs the resolved side,
        // not the preferred one.
        // Guarded: the CSSOM writes above are idempotent (the engine drops a
        // mutation that changes no value) but `dataset.x =` is not, and this
        // runs on every `autoUpdate` callback — measured at 119 attribute
        // mutations across a 60-frame scroll, none of which changed anything,
        // on an element carrying twelve `[data-placement…]` selectors.
        if (surface.dataset.placement !== resolved) {
          surface.dataset.placement = resolved;
        }

        // And where the anchor's centre falls along the surface, so that arrow
        // still points at the trigger after `shift()` has slid the box sideways
        // to stay in view. Measured from the FINAL coordinates, so it is right
        // by construction rather than by agreement.
        const box = anchor.getBoundingClientRect();
        const vertical =
          resolved.startsWith('top') || resolved.startsWith('bottom');
        const centre = vertical
          ? box.left + box.width / 2 - x
          : box.top + box.height / 2 - y;
        surface.style.setProperty('--anchor-centre', `${centre}px`);
        if (middlewareData.hide?.referenceHidden === true) onAnchorLost?.();
      });
    };

    const stop = autoUpdate(anchor, surface, reposition);
    return () => {
      stop();
      // The coordinates are stale the moment this closes: measured, reopening
      // after a scroll put the surface where the anchor USED to be. Clearing
      // them returns it to wherever the stylesheet parks a closed surface,
      // which is the only position that is right by construction.
      surface.style.left = '';
      surface.style.top = '';
      delete surface.dataset.placement;
      surface.style.removeProperty('--anchor-centre');
    };
  }, [anchor, surfaceRef, placement, gap, open, onAnchorLost]);
}
