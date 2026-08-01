import { FormAdapterContext } from './form-adapter.context.js';
import type { FormAdapterProviderProps } from './form-adapter-provider.types.js';

/**
 * Puts a form library in scope for the `Form*` components below it, so nothing
 * under here names the library — swapping it is one line, at one place.
 *
 * It renders NOTHING: it is a seam, not a layout, so it adds no element to the
 * markup (ADR-0016) and never sits between your `<form>` and its fields.
 */
function FormAdapterProvider(props: FormAdapterProviderProps) {
  const { field, status, children } = props;
  // A fresh object each render is deliberate: the members are HOOKS, and a
  // memoised value would be the very trap this design was measured into
  // avoiding — the provider must re-render its consumers when the app's hooks
  // change identity.
  return (
    <FormAdapterContext value={{ field, status }}>
      {children}
    </FormAdapterContext>
  );
}

export { FormAdapterProvider };
