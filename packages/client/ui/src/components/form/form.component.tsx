import { FormAdapterContext } from '../../form/form-adapter.context.js';
import type { FormProps } from './form.types.js';

/**
 * The `<form>` element and the adapter scope for everything inside it:
 *
 *     <Form field={useMyField} status={useMyStatus} onSubmit={form.handleSubmit(save)}>
 *       <FormInput name="email" label="Email" />
 *       <FormSubmit>Save</FormSubmit>
 *     </Form>
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
  const { field, status, children, noValidate = true, ...rest } = props;

  return (
    <FormAdapterContext value={{ field, status }}>
      <form noValidate={noValidate} {...rest}>
        {children}
      </form>
    </FormAdapterContext>
  );
}

export { Form };
