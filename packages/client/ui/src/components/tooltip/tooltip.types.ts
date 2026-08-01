import type { ReactElement } from 'react';
import type { Placement } from '@floating-ui/dom';

export interface TooltipProps {
  /**
   * What the tooltip says. A **string**, and that is the API refusing something
   * rather than an oversight: a tooltip is reached by hovering or focusing the
   * trigger, never by Tab, so anything interactive inside it — a link, a button
   * — could not be operated by a keyboard user at all. Typing this as
   * `ReactNode` would let that mistake compile. Rich, interactive content is a
   * `Popover`.
   */
  content: string;
  /**
   * The trigger: exactly ONE element, which receives the hover and focus
   * handlers, the ref and `aria-describedby`. It is cloned rather than wrapped,
   * so the tooltip adds no element of its own (ADR-0016) — the trigger must
   * therefore accept a `ref` and spread the props it is given, which every
   * design-system component does.
   */
  children: ReactElement;
  /** Preferred side. Flipped automatically when there is no room. */
  placement?: Placement;
  /**
   * How long the pointer must rest before it opens, in ms. Keyboard focus opens
   * it immediately — a deliberate asymmetry: a pointer sweeping across a toolbar
   * would strobe every tooltip on the way, whereas focus arrives on purpose.
   */
  openDelay?: number;
  /**
   * How long it stays after the pointer leaves, in ms. Not a flourish: WCAG
   * 1.4.13 requires the tooltip to be **hoverable**, and one that vanishes the
   * instant the pointer moves toward it cannot be reached.
   */
  closeDelay?: number;
}
