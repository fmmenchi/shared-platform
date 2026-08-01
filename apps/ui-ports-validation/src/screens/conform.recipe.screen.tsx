import { useState } from 'react';
import { FormProvider, getFormProps, useForm } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod/v4';
import { z } from 'zod';
import { UiProvider } from '@fmmenchi/ui';
import {
  createConformErrors,
  createConformField,
} from '@fmmenchi/ui-form-ports/conform';
import { RECIPE_TYPES, RecipeFields, Submitted } from './recipe.shared.js';

/**
 * Conform — the FORMDATA one, and the reason it does not share the schema.
 *
 * Conform validates the form's `FormData`, not a JS object, so a ticked box is
 * the string `'on'` and an unticked one is absent entirely — `z.literal(true)`
 * can never hold. It also coerces an empty field to `undefined` before
 * validating, so the missing case needs its own message or zod reports
 * "expected string, received undefined".
 *
 * Both are Conform being Conform. Nothing above changes: the messages still
 * arrive keyed by name, which is all the port carries.
 */
const ConformSchema = z.object({
  email: z
    .string({ message: 'Enter a valid email address.' })
    .email('Enter a valid email address.'),
  password: z
    .string({ message: 'Use at least 8 characters.' })
    .min(8, 'Use at least 8 characters.'),
  tos: z.literal('on', { message: 'You have to accept to continue.' }),
});

const conformField = createConformField({ types: RECIPE_TYPES });

export function ConformRecipeScreen({
  constraints = false,
}: {
  constraints?: boolean;
}) {
  const [saved, setSaved] = useState<unknown>(null);
  const [form] = useForm({
    onValidate: ({ formData }) =>
      parseWithZod(formData, { schema: ConformSchema }),
    shouldValidate: 'onSubmit',
  });

  return (
    <FormProvider context={form.context}>
      <UiProvider
        adapters={{
          i18n: { locale: 'en' },
          form: { field: conformField, errors: createConformErrors(form) },
        }}
      >
        {/* Conform lets a VALID form submit natively — that is its point, and
            why it works with JavaScript off. There is no server here, so the
            submission is intercepted; a real app gives the form an action. */}
        <form
          {...getFormProps(form)}
          onSubmit={(event) => {
            getFormProps(form).onSubmit?.(event);
            // Conform stops the event itself when the form is INVALID, so an
            // event still going at this point is the valid case — the one that
            // would have reached the server.
            if (event.defaultPrevented) return;
            event.preventDefault();
            // Conform's PARSED value, not the raw FormData. Reading the form
            // element back would only prove the DOM holds what was typed into
            // it — it would never touch the library, and the test that asserts
            // "the value round-tripped" would be asserting nothing.
            setSaved(
              parseWithZod(new FormData(event.currentTarget), {
                schema: ConformSchema,
              }).payload,
            );
          }}
        >
          <RecipeFields constraints={constraints} />
          <Submitted values={saved} />
        </form>
      </UiProvider>
    </FormProvider>
  );
}
