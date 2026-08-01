import { useUiAdapters } from '../i18n/provider.js';
import type { BoundField } from './form-adapter.types.js';

/**
 * The form binding in scope — the one given to `UiProvider` when the design
 * system was set up.
 *
 * There is exactly ONE way to bind, deliberately. An earlier version also
 * offered a per-form context, and it was removed: nesting `UiProvider` already
 * overrides the binding for a subtree (verified), so the second mechanism paid
 * for a case that was already covered, and was read by everyone.
 */
function useFormBinding() {
  return useUiAdapters()?.form;
}

/**
 * Bind one field through the binding in scope.
 *
 * The binding is CALLED AS A HOOK here, inside the component that renders the
 * field, which is what makes it live: the subscription belongs to that
 * component, so it re-renders when its own field changes. A closure would be
 * cached — the React Compiler sees stable dependencies, because a form library
 * typically MUTATES its error object in place — and the error would never
 * arrive, silently. Measured.
 *
 * Throws rather than degrading: an unbound control still renders, still accepts
 * typing, and submits nothing — a failure that surfaces in production data
 * rather than in development.
 */
export function useBoundField(name: string, component: string): BoundField {
  const binding = useFormBinding();
  const useFormField = binding?.field;
  if (useFormField == null) {
    throw new Error(
      `${component}: no form binding in scope — give one to <UiProvider adapters={{ form }}>.`,
    );
  }
  return useFormField(name);
}

/**
 * Every field in error, by name — what `FormErrorSummary` renders.
 *
 * Optional in the binding, because a form without a summary never needs it, so
 * an app is not made to implement something it does not use.
 */
export function useFormErrors(
  component: string,
): Readonly<Record<string, readonly string[]>> {
  const binding = useFormBinding();
  if (binding == null) {
    throw new Error(
      `${component}: no form binding in scope — give one to <UiProvider adapters={{ form }}>.`,
    );
  }
  const useErrors = binding.errors;
  if (useErrors == null) {
    throw new Error(
      `${component}: the form binding provides no \`errors\` — add one to use <FormErrorSummary>.`,
    );
  }
  // Called through a `use`-prefixed BINDING, not as `binding.errors()`. A member
  // call is not recognised as a hook by the tooling, and the React Compiler then
  // memoises around it — measured: "change in the order of Hooks", and the value
  // arrives undefined.
  return useErrors();
}
