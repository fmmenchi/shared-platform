import { useMemo, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { UiProvider } from '@fmmenchi/ui';
import {
  createTanstackErrors,
  createTanstackField,
} from '@fmmenchi/ui-form-ports/tanstack';
import {
  RECIPE_EMPTY,
  RECIPE_TYPES,
  RecipeFields,
  RecipeSchema,
  Submitted,
  type RecipeValues,
} from './recipe.shared.js';

/**
 * TanStack Form — the RENDER-PROP one, and the reason this screen matters.
 *
 * Its API is `<form.Field name>{(field) => …}</form.Field>`: there is no bag of
 * props to spread. The adapter builds one by subscribing to the form store, so
 * the markup below is byte-for-byte the markup of the other three screens. That
 * is the port earning its keep — if anything TanStack-shaped had to appear
 * here, the port would be cut to fit react-hook-form.
 *
 * It also takes zod DIRECTLY: TanStack speaks Standard Schema, so there is no
 * resolver package in between.
 */
export function TanstackScreen({
  constraints = false,
}: {
  constraints?: boolean;
}) {
  const [saved, setSaved] = useState<RecipeValues | null>(null);
  const form = useForm({
    defaultValues: RECIPE_EMPTY,
    validators: { onSubmit: RecipeSchema },
    onSubmit: ({ value }) => setSaved(value),
  });

  // Built once per form: the design system calls these AS HOOKS, so handing it
  // a new identity every render is churn for nothing.
  const adapters = useMemo(
    () => ({
      i18n: { locale: 'en' } as const,
      form: {
        field: createTanstackField(form, { types: RECIPE_TYPES }),
        errors: createTanstackErrors(form),
      },
    }),
    [form],
  );

  return (
    <UiProvider adapters={adapters}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <RecipeFields constraints={constraints} />
        <Submitted values={saved} />
      </form>
    </UiProvider>
  );
}
