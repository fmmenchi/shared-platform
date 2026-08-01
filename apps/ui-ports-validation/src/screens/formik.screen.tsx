import { useState } from 'react';
import { Formik, Form } from 'formik';
import { UiProvider } from '@fmmenchi/ui';
import {
  createFormikField,
  useFormikErrors,
} from '@fmmenchi/ui-form-ports/formik';
import {
  RECIPE_EMPTY,
  RECIPE_TYPES,
  RecipeFields,
  RecipeSchema,
  Submitted,
  type RecipeValues,
} from './recipe.shared.js';

// The binding is built ONCE, outside the component: it closes over nothing but
// the type map, so rebuilding it per render would hand the design system a new
// hook identity on every pass.
const formikField = createFormikField({ types: RECIPE_TYPES });

/**
 * Formik — the CONTROLLED one.
 *
 * Formik has no zod integration of its own: `validationSchema` expects a Yup
 * schema, so a zod schema goes through the plain `validate` callback instead.
 * That is Formik's shape, not a limitation of the port — the messages come out
 * keyed by name either way, which is all the port carries.
 */
export function FormikScreen({
  constraints = false,
}: {
  constraints?: boolean;
}) {
  const [saved, setSaved] = useState<RecipeValues | null>(null);

  return (
    <Formik
      initialValues={RECIPE_EMPTY}
      validate={(values) => {
        const result = RecipeSchema.safeParse(values);
        if (result.success) return {};
        // Formik wants one message per field, keyed by name.
        return Object.fromEntries(
          result.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        );
      }}
      onSubmit={(values) => setSaved(values)}
    >
      <UiProvider
        adapters={{
          i18n: { locale: 'en' },
          form: { field: formikField, errors: useFormikErrors },
        }}
      >
        <Form>
          <RecipeFields constraints={constraints} />
          <Submitted values={saved} />
        </Form>
      </UiProvider>
    </Formik>
  );
}
