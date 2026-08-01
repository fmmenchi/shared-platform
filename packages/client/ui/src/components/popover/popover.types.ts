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
   * Drives it. The controlled half of the pair: while it is given, this prop is
   * the source of truth and the surface is shown or hidden to match — including
   * BACK, when the platform hides it and the prop still says open.
   *
   * Which makes `onOpenChange` mandatory in practice, and a dev warning says
   * so: a light-dismiss popover is hidden by a click outside, by `Escape` and
   * by another `auto` popover opening, none of which asks React first.
   *
   * Leave it out for the uncontrolled half and let the DOM own the state.
   */
  open?: boolean;
  /**
   * Seeded once, at mount. IMPERATIVE like the Dialog's: the platform toggles a
   * popover through `popovertarget` or `showPopover()`, and there is no
   * attribute that opens one. A SEED, not a control — after the first paint the
   * DOM owns the state, and the platform hides this surface on its own (a click
   * outside, `Escape`, another `auto` popover opening) without asking React.
   * There is deliberately no `open` twin — see `onOpenChange`.
   */
  defaultOpen?: boolean;
  /**
   * Told when the platform opens or closes it. A REPORT, not a control: the
   * popover's state lives in the DOM, where the browser put it, so there is no
   * `open` prop to disagree with. To drive one from code, call `showPopover()`
   * / `hidePopover()` on the content's ref — the platform's own API.
   */
  onOpenChange?: (open: boolean) => void;
}
