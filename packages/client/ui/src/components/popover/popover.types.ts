import type { ReactNode } from 'react';
import type { Placement } from '@floating-ui/dom';

export interface PopoverProps {
  /** The trigger, the content, and whatever else belongs to this popover. */
  children: ReactNode;
  /**
   * Preferred side of the trigger, and where it sits along that side. The bare
   * side is centred; `-start`/`-end` align it, logically — under `dir="rtl"`,
   * `bottom-start` is on the right. Flipped when there is no room, slid back in
   * when it would leave the viewport.
   */
  placement?: Placement;
  /**
   * Told when the platform opens or closes it. A REPORT, not a control: the
   * popover's state lives in the DOM, where the browser put it, so there is no
   * `open` prop to disagree with. To drive one from code, call `showPopover()`
   * / `hidePopover()` on the content's ref — the platform's own API.
   */
  onOpenChange?: (open: boolean) => void;
}
