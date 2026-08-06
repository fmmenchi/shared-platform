import type { ReactNode } from 'react';
import type { Placement } from '@floating-ui/dom';

export interface MenuProps {
  /** The trigger, the menu itself, and the items inside it. */
  children: ReactNode;
  /**
   * Preferred side of the trigger, and where it sits along it. Flipped when
   * there is no room, slid back in when it would leave the viewport.
   */
  placement?: Placement;
  /**
   * Called whenever it opens or closes — from the trigger, from `Escape`, from
   * a click outside, or because an item was chosen.
   */
  onOpenChange?: (open: boolean) => void;
}
