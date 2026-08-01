import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { UiProvider } from '@fmmenchi/ui';
import {
  RhfForm,
  useRhfErrors,
  useRhfField,
} from '@fmmenchi/ui-form-ports/react-hook-form';
import {
  RECIPE_EMPTY,
  RecipeFields,
  RecipeSchema,
  Submitted,
  type RecipeValues,
} from './recipe.shared.js';

/**
 * react-hook-form — the UNCONTROLLED one, and the only one of the four that
 * needs no `types` map: it binds by `name` and `ref` and lets the DOM hold the
 * state, so it never has to choose between `value` and `checked`.
 *
 * `RhfForm` is `useForm` + `FormProvider` + `handleSubmit` + `<form>`, written
 * once. Note what it does with native validation: it sets `noValidate`, because
 * a `required` field otherwise blocks submission before `handleSubmit` ever
 * runs (measured — zero calls) and shows an unstyleable bubble beside the
 * FieldError. `noValidate={false}` gives the native behaviour back, which is
 * what the constraints recipe below asks for.
 */
export function RhfRecipeScreen({
  constraints = false,
}: {
  constraints?: boolean;
}) {
  const [saved, setSaved] = useState<RecipeValues | null>(null);

  return (
    <UiProvider
      adapters={{
        i18n: { locale: 'en' },
        form: { field: useRhfField, errors: useRhfErrors },
      }}
    >
      <RhfForm
        options={{
          defaultValues: RECIPE_EMPTY,
          resolver: zodResolver(RecipeSchema),
        }}
        noValidate={!constraints}
        onSubmit={(values) => setSaved(values)}
      >
        <RecipeFields constraints={constraints} />
        <Submitted values={saved} />
      </RhfForm>
    </UiProvider>
  );
}
