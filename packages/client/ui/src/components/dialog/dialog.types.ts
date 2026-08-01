import type { ReactNode } from 'react';

export interface DialogProps {
  /** The trigger, the dialog itself, and whatever else belongs to it. */
  children: ReactNode;
  /**
   * Drives it. The controlled half of the pair: while it is given, this prop is
   * the source of truth and the dialog is opened or closed to match — including
   * BACK, when the platform closes it and the prop still says open. That is
   * what "controlled" means, and it is the same contract React gives a `value`
   * without an `onChange`.
   *
   * Which makes `onOpenChange` mandatory in practice, and a dev warning says
   * so: this dialog is closed by the browser four ways that never ask React —
   * `Escape`, a backdrop click under `closedby="any"`, `<form method="dialog">`
   * and `command="close"` — so a consumer who does not feed those back has
   * built a modal the user cannot dismiss.
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
   * which asks React first. There is deliberately no `open` twin — see
   * `onOpenChange`.
   */
  defaultOpen?: boolean;
  /**
   * Told when the platform opens or closes it. A REPORT, not a control: the
   * state lives in the DOM, where the browser put it. To drive one from code,
   * call `showModal()` / `close()` on the content's ref — the platform's own
   * API, and the same pair the parts use when a browser has no invoker
   * commands yet.
   */
  onOpenChange?: (open: boolean) => void;
}
