import type { ReactNode } from 'react';

export interface TooltipProviderProps {
  children: ReactNode;
  /**
   * How long after one tooltip closes the next one opens with **no** delay, in
   * ms. The delay exists so that a pointer crossing a toolbar does not strobe
   * every tooltip on the way; once the user has clearly stopped to read one,
   * making them wait again for the button next to it is the delay outstaying
   * its reason. `0` turns the behaviour off.
   */
  skipDelay?: number;
}

/**
 * What the tooltips in one provider tell each other. Deliberately three
 * functions and no state: a tooltip opening must not re-render its neighbours.
 */
export interface TooltipCoordination {
  /** Open with no delay, because another tooltip has just closed. */
  skipsDelay: () => boolean;
  /** This one is open now — whichever was open before is asked to go. */
  claim: (close: () => void) => void;
  /** This one has closed, and starts the window in which the next one is instant. */
  release: (close: () => void) => void;
}
