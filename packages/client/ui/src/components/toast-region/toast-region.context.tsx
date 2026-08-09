import { createPartContext } from '../../primitives/part-context.js';
import type { ToastContextValue } from './toast-region.types.js';

const { Context, useFamilyContext, usePart } =
  createPartContext<ToastContextValue>('ToastRegion');

export const ToastContext = Context;

/**
 * Raise a toast.
 *
 * `null` outside a region, read tolerantly like every other family hook here —
 * a component that raises one on a page without a region should not crash the
 * page; `usePart` says which part is misplaced, once, in development.
 */
export const useToast = (): ToastContextValue | null => usePart('useToast');

/** @internal the silent read, for the region's own parts. */
export const useToastContext = useFamilyContext;
