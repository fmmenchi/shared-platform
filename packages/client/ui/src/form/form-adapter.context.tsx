import { createContext, useContext } from 'react';
import type {
  BoundField,
  FormStatus,
  UseFormField,
  UseFormStatus,
} from './form-adapter.types.js';

export interface FormAdapter {
  field: UseFormField;
  status?: UseFormStatus;
}

export const FormAdapterContext = createContext<FormAdapter | null>(null);

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
  const adapter = useContext(FormAdapterContext);
  const useFormField = adapter?.field;
  if (useFormField == null) {
    throw new Error(
      `${component}: no form adapter in scope — wrap this form in a <FormAdapterProvider>.`,
    );
  }
  return useFormField(name);
}

/**
 * The whole form's state, for the components that render it.
 *
 * Optional in the adapter, because a form with no summary and no submit button
 * of ours never needs it — so an app is not made to implement something it does
 * not use. Asking for it when it was not supplied is the misuse, and throws.
 */
export function useFormStatus(component: string): FormStatus {
  const adapter = useContext(FormAdapterContext);
  if (adapter == null) {
    throw new Error(
      `${component}: no form adapter in scope — wrap this form in a <FormAdapterProvider>.`,
    );
  }
  const useStatus = adapter.status;
  if (useStatus == null) {
    throw new Error(
      `${component}: the form adapter in scope provides no \`status\` — add one to use form-level components.`,
    );
  }
  // Called through a `use`-prefixed BINDING, not as `adapter.status()`. A member
  // call is not recognised as a hook by the tooling, and the React Compiler then
  // memoises around it — measured: "change in the order of Hooks", and the value
  // arrives undefined. The field path does the same thing for the same reason.
  return useStatus();
}
