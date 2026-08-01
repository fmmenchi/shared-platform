import { createContext, useContext } from 'react';
import type { Placement } from '@floating-ui/dom';
import { useDevWarning } from '../../primitives/use-dev-warning.js';

/**
 * What a `Popover` provides to its parts. The platform owns the toggling —
 * `popovertarget` toggles, `popover="auto"` dismisses — so no part has an
 * `open()` to call of its own.
 *
 * Two different things are called open here, deliberately. `open` is a MIRROR,
 * read from the `toggle` event, for the two jobs the platform does not do for
 * us: what the trigger says in `aria-expanded`, and when the geometry starts
 * measuring. `controlled` is the consumer's prop — `undefined` unless they
 * passed one — which is how the content tells "drive me" from "let the DOM own
 * it".
 */
export interface PopoverContextValue {
  /** The surface's id: what the trigger targets, and what it controls. */
  surfaceId: string;
  /** Whether the platform has it open. Mirrored, never commanded. */
  open: boolean;
  /** Told by the content when the platform toggles it. */
  reportOpen: (open: boolean) => void;
  /** The trigger's node, which is what the surface anchors to. */
  anchor: HTMLElement | null;
  setAnchor: (node: HTMLElement | null) => void;
  /** The heading's id, when there is one — the surface's accessible name. */
  headingId: string | undefined;
  setHeadingId: (id: string | undefined) => void;
  /** The controlled value, or `undefined` when the DOM owns the state. */
  controlled: boolean | undefined;
  /** Whether the consumer wired `onOpenChange` — a controlled popover needs it. */
  hasOpenChange: boolean;
  /** The mount-time seed, read by the content — see `PopoverProps.defaultOpen`. */
  defaultOpen: boolean;
  /** Preferred side, passed to the geometry by the content. */
  placement: Placement;
}

export const PopoverContext = createContext<PopoverContextValue | null>(null);

export const usePopoverContext = (): PopoverContextValue | null =>
  useContext(PopoverContext);

/**
 * Context for a `Popover` PART, warning (with the part's own name) when it is
 * used outside one. Every part reads the context through this, so an orphan part
 * can't fail silently. It returns `null` rather than throwing: a misplaced part
 * is worth a loud warning, not a crashed page.
 */
export function usePopoverPart(part: string): PopoverContextValue | null {
  const context = usePopoverContext();
  useDevWarning(
    context == null,
    `${part}: used outside a <Popover>, so it is not wired to anything.`,
  );
  return context;
}
