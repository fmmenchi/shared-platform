import type { Placement } from '@floating-ui/dom';

export interface AnchoredOptions {
  /** Which side of the anchor to prefer. Flipped automatically when it does not fit. */
  placement?: Placement;
  /** Gap between anchor and surface, in px. */
  offset?: number;
  /** Only measure while this is true — a closed surface costs nothing. */
  open: boolean;
  /**
   * The anchor has gone: scrolled out of a clipping ancestor, hidden, or
   * removed while the surface was open. What to DO about it belongs to the
   * component — but it is always to close, because a surface in the top layer
   * is clipped by nothing and would otherwise sit there pointing at something
   * the user can no longer see.
   */
  onAnchorLost?: () => void;
}
