import { useField, useFormikContext } from 'formik';
import type { UseFormField } from '@fmmenchi/ui';
import { isBooleanField } from '../field-type.js';
import type { FormFieldTypeOptions } from '../field-type.types.js';

/**
 * `@fmmenchi/ui`'s field port, implemented for Formik.
 *
 *     <UiProvider adapters={{ i18n, form: {
 *       field: createFormikField({ types: { tos: 'checkbox' } }),
 *       errors: useFormikErrors,
 *     } }}>
 *
 * Formik is CONTROLLED where react-hook-form is not: it returns a `value` and
 * an `onChange`, so React drives the input. That difference is invisible from
 * the call site, which is the point of binding through native props — the
 * design system's controls are transparent either way (ADR-0013).
 *
 * It is the reason for `types`: a controlled binding has to produce `checked`
 * for a checkbox and `value` for everything else, and the name alone does not
 * say which.
 *
 * The error is gated on `touched` — Formik's own convention, and the reason its
 * state carries it: a field that is merely still empty should not shout before
 * the user has been near it. A submit attempt marks every field touched, so the
 * messages then appear together.
 */
export function createFormikField(
  options: FormFieldTypeOptions = {},
): UseFormField {
  const { types = {} } = options;

  return function useFormikField(name) {
    const type = types[name];
    const boolean = isBooleanField(type);
    // Formik keys its binding off the type too: asked for a checkbox it returns
    // `checked` and leaves `value` alone.
    const [field, meta] = useField(boolean ? { name, type } : name);

    return {
      control: {
        name: field.name,
        ...(boolean
          ? { checked: Boolean(field.checked) }
          : { value: (field.value as string) ?? '' }),
        onChange: field.onChange,
        onBlur: field.onBlur,
      },
      error: meta.touched ? meta.error : undefined,
    };
  };
}

/** Every field in error, keyed by name — what `FormErrorSummary` renders. */
export function useFormikErrors(): Readonly<Record<string, readonly string[]>> {
  const { errors, touched, submitCount } =
    useFormikContext<Record<string, unknown>>();
  const show = (name: string) =>
    submitCount > 0 || (touched as Record<string, unknown>)[name] === true;
  return Object.fromEntries(
    Object.entries(errors)
      .filter(([name, message]) => show(name) && typeof message === 'string')
      .map(([name, message]) => [name, [message as string]]),
  );
}
