import type { Placement } from '@floating-ui/dom';

export interface AnchoredOptions {
  /** Which side of the anchor to prefer. Flipped automatically when it does not fit. */
  placement?: Placement;
  /** Gap between anchor and surface, in px. */
  offset?: number;
  /** Only measure while this is true — a closed surface costs nothing. */
  open: boolean;
}
