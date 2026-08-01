import { FormAdapterContext } from '../../form/form-adapter.context.js';
import type { FormProps } from './form.types.js';

/**
 * The `<form>` element, and the adapter scope for everything inside it.
 *
 * Give the form binding ONCE, where the design system is set up:
 *
 *     <UiProvider adapters={{ i18n, form: { field: useRhfField, errors: useRhfErrors } }}>
 *
 * and from then on a form is just a form:
 *
 *     <Form onSubmit={form.handleSubmit(save)}>
 *       <FormInput name="email" label="Email" />
 *       <FormSubmit>Save</FormSubmit>
 *     </Form>
 *
 * `field`/`errors` on this component override that, for the rare page binding
 * two libraries at once.
 *
 * It renders ONE element — the `<form>` — and adds no wrapper: the adapter
 * scope is context, which has no markup.
 *
 * **It defaults `noValidate` on**, which is the whole reason this is a
 * component rather than a bare `<form>` plus a provider. With the browser's own
 * validation left ON, a `required` field blocks submission before your handler
 * ever runs — measured, the handler is called **zero** times — and the browser
 * shows its own bubble, unstyleable and in its own language, next to the
 * `FieldError` you rendered. Forgetting the attribute is silent and fatal, so
 * it lives where it cannot be forgotten.
 *
 * It does NOT own submission: `onSubmit` is yours, and for a form library it is
 * that library's handler (`form.handleSubmit(...)`). The design system holds no
 * form state (ADR-0013).
 */
function Form(props: FormProps) {
  const { field, errors, children, noValidate = true, ...rest } = props;

  const element = (
    <form noValidate={noValidate} {...rest}>
      {children}
    </form>
  );

  // Only scope a binding when one was actually passed. Providing an empty one
  // would SHADOW the binding given to `UiProvider`, so every form would need
  // its own — the opposite of setting it up once.
  return field === undefined ? (
    element
  ) : (
    <FormAdapterContext value={{ field, errors }}>{element}</FormAdapterContext>
  );
}

export { Form };
