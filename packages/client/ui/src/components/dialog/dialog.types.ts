import type { ReactNode } from 'react';

export interface DialogProps {
  /** The trigger, the dialog itself, and whatever else belongs to it. */
  children: ReactNode;
  /**
   * Drives it. While it is given, this prop decides when the dialog OPENS, and
   * the trigger stops commanding the platform and asks you instead — one owner
   * at a time, or the two of you close what the other just opened (measured:
   * that is exactly what happened, inside a single frame).
   *
   * What it does NOT do is win a close back. `Escape`, a backdrop click,
   * `command="close"` and `<form method="dialog">` are close REQUESTS and they
   * are granted, even while this says `true`. React snaps an `<input value>`
   * back when the consumer swallows the change; doing the same here was
   * measured to leave the user inside a modal they could not dismiss — a
   * keyboard trap (WCAG 2.1.2), which is not a state this component will
   * produce for anybody. You get a visible divergence instead, and
   * `onOpenChange` tells you the moment it happens.
   *
   * Leave it out for the uncontrolled half and let the DOM own the state.
   */
  open?: boolean;
  /**
   * Seeded once, at mount. IMPERATIVE because the platform offers nothing
   * declarative: the `open` ATTRIBUTE renders a NON-modal dialog — measured, no
   * backdrop, the page behind stays clickable, `Escape` does not close — so
   * modality can only be asked for with `showModal()`. A SEED, not a control:
   * after the first paint the DOM owns the state, and the browser closes this
   * dialog on its own four ways (Escape, a backdrop click under
   * `closedby="any"`, `<form method="dialog">`, `command="close"`), none of
   * which asks React first. Ignored while `open` is given: one writer, not
   * two.
   */
  defaultOpen?: boolean;
  /**
   * Told whenever it opens or closes — by the trigger, by the platform, or by
   * `open` itself. Uncontrolled it is a report; controlled it is the other half
   * of the contract, because the browser closes this dialog four ways that
   * never ask React and this is how you hear about them. A dev warning fires if
   * `open` arrives without it.
   */
  onOpenChange?: (open: boolean) => void;
}
