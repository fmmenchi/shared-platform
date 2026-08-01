import { createContext, useContext } from 'react';
import { useDevWarning } from '../../primitives/use-dev-warning.js';

/**
 * What a `Dialog` provides to its parts. As with the Popover, nothing in here
 * opens or closes it: `command="show-modal"` and `command="close"` are the
 * platform's, so the parts have no `open()` to call and no way to disagree with
 * the browser about the state. `open` is a MIRROR, read from the `toggle`
 * event, and `surface` exists only for the fallback where a browser has no
 * invoker commands yet.
 */
export interface DialogContextValue {
  /** The dialog's id: what the trigger and the close button command. */
  surfaceId: string;
  /** Whether the platform has it open. Mirrored, never commanded. */
  open: boolean;
  /** Told by the content when the platform toggles it. */
  reportOpen: (open: boolean) => void;
  /** The element itself — only the pre-commands fallback touches it. */
  surface: HTMLDialogElement | null;
  setSurface: (node: HTMLDialogElement | null) => void;
  /** What opened it, so the focus has somewhere to go back to in WebKit. */
  invoker: HTMLElement | null;
  setInvoker: (node: HTMLElement | null) => void;
  /** The heading's id, when there is one — the dialog's accessible name. */
  headingId: string | undefined;
  setHeadingId: (id: string | undefined) => void;
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

/**
 * Invoker commands — `command` / `commandfor` — are what let a button open and
 * close a dialog with no script at all. Baseline "newly", so the components
 * feature-detect and fall back to `showModal()` / `close()`: a dialog that does
 * not open is not a degradation anyone can live with.
 */
export const COMMANDS_SUPPORTED =
  typeof HTMLButtonElement !== 'undefined' &&
  'command' in HTMLButtonElement.prototype;
