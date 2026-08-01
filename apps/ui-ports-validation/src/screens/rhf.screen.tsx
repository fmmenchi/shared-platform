import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { UiProvider } from '@fmmenchi/ui';
import {
  RhfForm,
  createRhfField,
  useRhfErrors,
} from '@fmmenchi/ui-form-ports/react-hook-form';
import {
  RECIPE_EMPTY,
  RECIPE_TYPES,
  RecipeFields,
  RecipeSchema,
  Submitted,
  type RecipeValues,
} from './recipe.shared.js';

const rhfField = createRhfField({ types: RECIPE_TYPES });

/**
 * react-hook-form — the UNCONTROLLED one: it binds by `name` and `ref` and lets
 * the DOM hold the state, so it never has to choose between `value` and
 * `checked`. It still takes the `types` map, for the one thing being
 * uncontrolled does not solve: a DOM value is a string, and a `number` field
 * would otherwise store `"3"` where the schema expects `3`.
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
        form: { field: rhfField, errors: useRhfErrors },
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
