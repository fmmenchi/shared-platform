import {
  FormProvider,
  getFormProps,
  getInputProps,
  useForm,
  useField,
} from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod/v4';
import { z } from 'zod';
import {
  FormChoice,
  FormErrorSummary,
  FormInput,
  UiProvider,
  type UseFormField,
} from '@fmmenchi/ui';

// NOTE Conform coerces an empty field to `undefined` before validating, so a
// bare `z.string()` reports "expected string, received undefined" rather than
// your message. Give the missing case its own message — this is Conform's
// documented coercion, not something the design system does.
const Schema = z.object({
  email: z
    .string({ message: 'Enter a valid email address.' })
    .email('Enter a valid email address.'),
  password: z
    .string({ message: 'Use at least 8 characters.' })
    .min(8, 'Use at least 8 characters.'),
  tos: z.literal('on', { message: 'You have to accept to continue.' }),
});

const LABELS: Record<string, string> = {
  email: 'Email',
  password: 'Password',
  tos: 'Terms and conditions',
};

/* ─── the Conform adapter, to see what collides ───────────────────────────── */

/**
 * The field type matters to Conform: `getInputProps` shapes the props by it, so
 * a checkbox asked for as text renders as text and never carries `checked`.
 */
const TYPES: Record<string, 'text' | 'email' | 'password' | 'checkbox'> = {
  email: 'email',
  password: 'password',
  tos: 'checkbox',
};

const useConformField: UseFormField = (name) => {
  const [meta] = useField(name);
  // Conform's getInputProps returns an `aria-describedby` pointing at an error
  // element IT expects you to render. We render `FieldError` instead, so that
  // reference dangles — measured: `<id>-email-error`, which exists nowhere.
  // Dropping it is the adapter's job: translating between one library's
  // assumptions and the design system's is the whole reason an adapter exists.
  //
  // The `id` is NOT dropped. The field adopts whatever the control brings and
  // moves the label's `htmlFor` to match, so Conform keeps the id its own
  // markup refers to.
  const { 'aria-describedby': _conformDescribedBy, ...control } = getInputProps(
    meta,
    { type: TYPES[name] ?? 'text' },
  );

  return { control, error: meta.errors };
};

export function ConformScreen() {
  const [form] = useForm({
    onValidate: ({ formData }) => parseWithZod(formData, { schema: Schema }),
    shouldValidate: 'onSubmit',
  });

  // Conform reports every error keyed by name on the form metadata, which is
  // exactly the shape the summary port asks for — no per-field juggling.
  const errors: Record<string, readonly string[]> = form.allErrors;

  return (
    <FormProvider context={form.context}>
      <UiProvider
        adapters={{
          i18n: { locale: 'en' },
          form: { field: useConformField, errors: () => errors },
        }}
      >
        {/* Conform lets a valid form submit NATIVELY — which is its point, and
            why it works without JavaScript. Here there is no server, so the
            submission is intercepted; a real app gives the form an action. */}
        <form
          {...getFormProps(form)}
          onSubmit={(event) => {
            getFormProps(form).onSubmit?.(event);
            if (!event.defaultPrevented) event.preventDefault();
          }}
        >
          <FormErrorSummary labelFor={(name) => LABELS[name] ?? name} />
          <FormInput
            name="email"
            label="Email"
            hint="We’ll only use it to sign you in."
          />
          <FormInput name="password" label="Password" />
          <FormChoice name="tos" label="I accept the terms and conditions" />
          <button type="submit">Create account</button>
        </form>
      </UiProvider>
    </FormProvider>
  );
}
