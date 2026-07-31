import { createContext, useContext } from 'react';
import type { BoundField, UseFormField } from './form-adapter.types.js';

export const FormAdapterContext = createContext<UseFormField | null>(null);

/**
 * Bind one field through the adapter in scope.
 *
 * The adapter is CALLED AS A HOOK here, inside the component that renders the
 * field, which is what makes the binding live: the subscription belongs to this
 * component, so it re-renders when its own field changes. Hence the eslint
 * exception — the rule cannot see that a context value is a hook, but the
 * contract (called unconditionally, once per component) is kept.
 *
 * Throws rather than degrading: an unbound control still renders, still accepts
 * typing, and submits nothing — a failure that surfaces in production data
 * rather than in development.
 */
export function useBoundField(name: string, component: string): BoundField {
  const useFormField = useContext(FormAdapterContext);
  if (useFormField == null) {
    throw new Error(
      `${component}: no form adapter in scope — wrap this form in a <FormAdapterProvider>.`,
    );
  }
  return useFormField(name);
}
