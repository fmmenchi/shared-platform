import { createContext, useContext } from 'react';
import { useUiAdapters } from '../i18n/provider.js';
import type {
  BoundField,
  UseFormErrors,
  UseFormField,
} from './form-adapter.types.js';

export interface FormAdapter {
  field: UseFormField;
  errors?: UseFormErrors;
}

export const FormAdapterContext = createContext<FormAdapter | null>(null);

/**
 * The binding in scope: the nearest `Form`/`FormAdapterProvider` if there is
 * one, otherwise the one given to `UiProvider` when the design system was set
 * up. Set it once there and the bound components work with nothing else wired.
 */
function useFormAdapter(): FormAdapter | null {
  const local = useContext(FormAdapterContext);
  const fromSetup = useUiAdapters()?.form;
  return local ?? fromSetup ?? null;
}

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
  const adapter = useFormAdapter();
  const useFormField = adapter?.field;
  if (useFormField == null) {
    throw new Error(
      `${component}: no form adapter in scope — wrap this form in a <FormAdapterProvider>.`,
    );
  }
  return useFormField(name);
}

/**
 * Every field in error, by name — what `FormErrorSummary` renders.
 *
 * Optional in the adapter, because a form without a summary never needs it, so
 * an app is not made to implement something it does not use. Asking for it when
 * it was not supplied is the misuse, and throws.
 */
export function useFormErrors(
  component: string,
): Readonly<Record<string, readonly string[]>> {
  const adapter = useFormAdapter();
  if (adapter == null) {
    throw new Error(
      `${component}: no form adapter in scope — wrap this form in a <FormAdapterProvider>.`,
    );
  }
  const useErrors = adapter.errors;
  if (useErrors == null) {
    throw new Error(
      `${component}: the form adapter in scope provides no \`errors\` — add one to use <FormErrorSummary>.`,
    );
  }
  // Called through a `use`-prefixed BINDING, not as `adapter.status()`. A member
  // call is not recognised as a hook by the tooling, and the React Compiler then
  // memoises around it — measured: "change in the order of Hooks", and the value
  // arrives undefined. The field path does the same thing for the same reason.
  return useErrors();
}
