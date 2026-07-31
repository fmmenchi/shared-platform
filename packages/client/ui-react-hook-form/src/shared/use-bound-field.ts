import { useFormContext, useFormState } from 'react-hook-form';
import type { RegisterOptions } from 'react-hook-form';

/**
 * Bind one field to the react-hook-form instance in scope — the two subtleties
 * this package exists to have solved once, in one place:
 *
 * - **`useFormState`, not `formState` off the context.** The Proxy subscription
 *   does not reach a nested component, so the error would never arrive at all
 *   — measured, and silent when wrong.
 * - **Subscribed per FIELD** (`{ control, name }`), so one field's error does
 *   not re-render every other field in the form.
 *
 * A hook rather than a closure, so the subscription belongs to the component
 * that renders the field and re-renders on its own account.
 */
export function useBoundField(name: string, rules?: RegisterOptions) {
  const { register, control } = useFormContext();
  const { errors } = useFormState({ control, name });
  return {
    control: register(name, rules),
    error: errors[name]?.message as string | undefined,
  };
}
