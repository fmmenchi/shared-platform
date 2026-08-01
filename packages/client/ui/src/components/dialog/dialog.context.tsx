import { createContext, useContext } from 'react';
import { useDevWarning } from '../../primitives/use-dev-warning.js';

/**
 * What a `Dialog` provides to its parts. As with the Popover, nothing in here
 * opens or closes it: `command="show-modal"` and `command="close"` are the
 * platform's, so the parts have no `open()` to call and no way to disagree with
 * the browser about the state — which is why there is no `open` here at all.
 * `surface` exists only for the fallback where a browser has no invoker
 * commands yet.
 */
export interface DialogContextValue {
  /** The dialog's id: what the trigger and the close button command. */
  surfaceId: string;
  /**
   * Told by the content when the platform toggles it, and passed straight on to
   * the consumer. There is deliberately no mirrored `open` STATE behind it: the
   * Popover keeps one because its trigger says `aria-expanded`, and this one
   * has nothing to say — a modal's trigger is inert while it is open. A copy
   * nobody reads is a re-render of the whole subtree per toggle, for nothing.
   */
  reportOpen: (open: boolean) => void;
  /** The element itself — only the pre-commands fallback touches it. */
  surface: HTMLDialogElement | null;
  setSurface: (node: HTMLDialogElement | null) => void;
  /** What opened it, so the focus has somewhere to go back to in WebKit. */
  invoker: HTMLElement | null;
  setInvoker: (node: HTMLElement | null) => void;
  /** The heading that names it: the first one registered, while it is mounted. */
  headingId: string | undefined;
  /** Whether the consumer wired `onOpenChange` — a controlled dialog needs it. */
  hasOpenChange: boolean;
  /** The controlled value, or `undefined` when the DOM owns the state. */
  open: boolean | undefined;
  /** The mount-time seed, read by the content — see `DialogProps.defaultOpen`. */
  defaultOpen: boolean;
  /** A heading announcing itself. Returns the way to take it back. */
  registerHeading: (id: string) => () => void;
}

export const DialogContext = createContext<DialogContextValue | null>(null);

export const useDialogContext = (): DialogContextValue | null =>
  useContext(DialogContext);

/**
 * Context for a `Dialog` PART, warning (with the part's own name) when it is
 * used outside one. It returns `null` rather than throwing: a misplaced part is
 * worth a loud warning, not a crashed page.
 */
export function useDialogPart(part: string): DialogContextValue | null {
  const context = useDialogContext();
  useDevWarning(
    context == null,
    `${part}: used outside a <Dialog>, so it is not wired to anything.`,
  );
  return context;
}
