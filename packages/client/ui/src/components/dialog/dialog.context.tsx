import { createPartContext } from '../../primitives/part-context.js';

/**
 * What a `Dialog` provides to its parts. The platform still owns the toggling —
 * `command="show-modal"` and `command="close"` are its own, so no part has an
 * `open()` to call — and `surface` exists only for the fallback where a browser
 * has no invoker commands yet.
 *
 * `open` here is NOT a mirror of that state: it is the consumer's controlled
 * prop, `undefined` whenever they have not passed one, which is the only way
 * the content can tell "drive me" from "let the DOM own it". The state itself
 * is never copied — `reportOpen` passes the platform's `toggle` straight out.
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

const { Context, useFamilyContext, usePart } =
  createPartContext<DialogContextValue>('Dialog');

export const DialogContext = Context;
export const useDialogContext = useFamilyContext;

/**
 * Context for a `Dialog` PART, warning (with the part's own name) when it is
 * used outside one. It returns `null` rather than throwing: a misplaced part is
 * worth a loud warning, not a crashed page.
 */
export const useDialogPart = usePart;
