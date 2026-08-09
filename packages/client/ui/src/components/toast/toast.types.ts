import type { ReactNode } from 'react';
import type { AlertVariants } from '../alert/alert.types.js';

/** What a caller asks for when it raises one. */
export interface ToastOptions {
  /** The status, which carries meaning through colour AND a hidden word. */
  variant?: AlertVariants['variant'];
  /** A short heading. */
  title?: ReactNode;
  /**
   * A status glyph, `aria-hidden`, beside the text.
   *
   * PASSED THROUGH because the toast is the one `Alert` a consumer cannot reach
   * into. They hand over an options object and the region does the rendering,
   * so without this the colour of one edge is the ONLY status signal a sighted
   * reader gets — four panels that differ by hue alone (WCAG 1.4.1). The slot
   * exists on `Alert` for exactly this reason; the toast was just not offering
   * it.
   *
   * Still optional, and still the consumer's glyph: this package ships no icon
   * set on purpose.
   */
  icon?: ReactNode;
  /** The message. */
  children?: ReactNode;
  /**
   * How long it stays, in ms. **`0` — it stays until dismissed — is the
   * default**, and giving it a number is a decision with an obligation
   * attached.
   *
   * A message that removes itself is a TIME LIMIT (WCAG 2.2.1), and the
   * criterion is not satisfied by pausing on hover: it asks for the limit to be
   * turned off, adjusted to ten times, or extended after a warning — none of
   * which a toast can offer. What makes a timed message acceptable is that its
   * content is REDUNDANT: available somewhere the reader can go back to. So the
   * default does not impose a limit, and a caller who sets one is saying the
   * message is not the only copy.
   *
   * A timed toast also carries NO dismiss control, which is the other half of
   * the same decision — see `Toast`.
   */
  duration?: number;
}

/** One raised toast, as the region holds it. */
export interface ToastEntry extends ToastOptions {
  id: string;
}

/** @internal — `Toast` is a part of `ToastRegion` and is never rendered alone. */
export interface ToastProps extends ToastEntry {
  /** Called when this one asks to go. */
  onDismiss: (id: string) => void;
  /** Paused while the pointer or the focus is in the region. */
  paused: boolean;
}
