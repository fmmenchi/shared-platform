import { useField, useFormikContext } from 'formik';
import type { UseFormField } from '@fmmenchi/ui';
import { isBooleanField, readValue } from '../field-type.js';
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
    const { setFieldValue } = useFormikContext();
    // Formik keys its binding off the type too: asked for a checkbox it returns
    // `checked` and leaves `value` alone.
    const [field, meta] = useField(boolean ? { name, type } : name);

    return {
      control: {
        name: field.name,
        ...(boolean
          ? { checked: Boolean(field.checked) }
          : { value: field.value == null ? '' : String(field.value) }),
        // Formik's own `onChange` reads `target.value` and stores the string.
        // For a number field that is the type loss `readValue` exists to undo,
        // so the write goes through `setFieldValue` instead.
        onChange:
          type === 'number'
            ? (event) =>
                setFieldValue(
                  name,
                  readValue(type, event.target as HTMLInputElement),
                )
            : field.onChange,
        onBlur: field.onBlur,
      },
      // Formik reports one message per field; the port takes a list, so the
      // wrapping happens here rather than in the design system.
      errors: meta.touched && meta.error ? [meta.error] : [],
    };
  };
}

/** Every field in error, keyed by name — what `FormErrorSummary` renders. */
export function useFormikErrors(): Readonly<Record<string, readonly string[]>> {
  const { errors, touched, submitCount } =
    useFormikContext<Record<string, unknown>>();

  const byName: Record<string, readonly string[]> = {};
  for (const [name, messages] of flatten(errors)) {
    // Formik marks every field touched on a submit attempt, so after one
    // failed submit the whole list appears at once.
    if (submitCount > 0 || getIn(touched, name) === true) {
      byName[name] = messages;
    }
  }
  return byName;
}

/**
 * Formik keeps its errors as a TREE — `{ address: { city: 'Required' } }` for a
 * field named `address.city`, and an array for a field array. The fields
 * themselves read it with a path lookup, so they show those messages fine.
 *
 * Flattening is what keeps the summary honest. Taking only the top-level string
 * entries, which is the obvious reading of `errors`, silently dropped every
 * nested one: the field showed a message the summary did not list, and if it was
 * the only error the summary rendered nothing at all while the form refused to
 * submit. The summary exists precisely so nobody has to walk the form to find
 * out what failed.
 */
function flatten(node: unknown, path = ''): Array<[string, string[]]> {
  if (typeof node === 'string') {
    return node === '' ? [] : [[path, [node]]];
  }
  if (Array.isArray(node)) {
    return node.flatMap((child, index) => flatten(child, `${path}[${index}]`));
  }
  if (node != null && typeof node === 'object') {
    return Object.entries(node).flatMap(([key, child]) =>
      flatten(child, path === '' ? key : `${path}.${key}`),
    );
  }
  return [];
}

/** Reads `touched` by the same dotted/indexed path `flatten` produces. */
function getIn(source: unknown, path: string): unknown {
  return path
    .split(/[.[\]]+/)
    .filter(Boolean)
    .reduce<unknown>(
      (node, key) =>
        node == null || typeof node !== 'object'
          ? undefined
          : (node as Record<string, unknown>)[key],
      source,
    );
}
