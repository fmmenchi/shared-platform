import type { AnyFieldApi, AnyFormApi, DeepKeys } from '@tanstack/react-form';
import { useField, useSelector } from '@tanstack/react-form';
import type { UseFormErrors, UseFormField } from '@fmmenchi/ui';
import { isBooleanField, readValue } from '../field-type.js';
import type {
  FormFieldType,
  FormFieldTypeOptions,
} from '../field-type.types.js';

/**
 * `@fmmenchi/ui`'s field port, implemented for TanStack Form.
 *
 *     const form = useForm({ defaultValues, validators: { onSubmit: Schema } })
 *     <UiProvider adapters={{ i18n, form: {
 *       field: createTanstackField(form, { types: { tos: 'checkbox' } }),
 *       errors: createTanstackErrors(form),
 *     } }}>
 *
 * TanStack is the odd one of the four, and the reason it is worth supporting:
 * its API is a RENDER PROP — `<form.Field name>{(field) => …}</form.Field>` —
 * not a bag of props. There is nothing to spread; the value and the handler
 * arrive as a callback argument.
 *
 * `useField` is what that render prop wraps, so this adapter uses it directly
 * and hands the design system the bag instead. The call site then reads exactly
 * like the other three and the render prop never surfaces — which is the port
 * earning its keep.
 *
 * Going through `useField` rather than reading the store is not a style choice.
 * It MOUNTS the field, and TanStack tracks per-field state only for mounted
 * fields. Reading `form.store` directly instead looks like it works — the
 * messages appear — and then the form can never be submitted again: the stale
 * per-field errors are never reconciled, so `isValid` stays false, `canSubmit`
 * stays false, and `handleSubmit` silently refuses. Measured: `errorMap` had
 * emptied, every field showed valid, and zero submissions went through.
 *
 * It takes the form object rather than reading a context because TanStack has
 * no provider; the form is what a screen already holds.
 */
export function createTanstackField<T = never>(
  form: AnyFormApi,
  options: FormFieldTypeOptions<
    [T] extends [never] ? string : DeepKeys<T>
  > = {},
): UseFormField {
  // The generic narrows what a CALLER may write; at run time a name is
  // whatever the port hands over, so the lookup widens back to string.
  const types = (options.types ?? {}) as Readonly<
    Partial<Record<string, FormFieldType>>
  >;

  return function useTanstackField(name) {
    const type = types[name];
    const boolean = isBooleanField(type);
    const field: AnyFieldApi = useField({ form, name });
    // Quiet until the field has been LEFT, or the form has been sent once.
    //
    // `isBlurred`, not `isTouched`: TanStack sets `isTouched` on the first
    // keystroke, so gating on it would shout after one character — while the
    // Formik port, whose `touched` is blur-based, stayed quiet. Two ports
    // behaving differently is the leak this whole exercise exists to catch.
    const submitted = useSelector(form.store, (s) => s.submissionAttempts > 0);
    const { value, meta } = field.state;

    return {
      control: {
        name,
        ...(boolean
          ? { checked: Boolean(value) }
          : { value: toInputValue(value) }),
        onChange: (event) =>
          field.handleChange(readValue(type, event.target as HTMLInputElement)),
        onBlur: () => field.handleBlur(),
      },
      errors: submitted || meta.isBlurred ? toMessages(meta.errors) : [],
    };
  };
}

/** Every field in error, keyed by name — what `FormErrorSummary` renders. */
export function createTanstackErrors(form: AnyFormApi): UseFormErrors {
  return function useTanstackErrors() {
    // Only stable references come out of the selector — `useSelector` compares
    // shallowly, and building the map in here would hand it a fresh one every
    // time and re-render on every touch of the store.
    const state = useSelector(form.store, (s) => ({
      fieldMeta: s.fieldMeta,
      submitted: s.submissionAttempts > 0,
    }));
    if (!state.submitted) return {};

    const byName: Record<string, readonly string[]> = {};
    for (const [name, meta] of Object.entries(state.fieldMeta)) {
      const messages = toMessages(meta?.errors);
      if (messages.length > 0) byName[name] = messages;
    }
    return byName;
  };
}

/** A control's `value` prop is a string; `undefined` would make it uncontrolled. */
function toInputValue(value: unknown): string {
  return value == null ? '' : String(value);
}

/**
 * TanStack keeps whatever the validator produced — and with a Standard Schema
 * validator that is an ISSUE OBJECT (`{ message, path }`), not a string. The
 * port carries messages, so unwrap it here rather than in every app.
 */
function toMessages(errors: unknown): readonly string[] {
  if (!Array.isArray(errors)) return [];
  return errors
    .map((error) =>
      typeof error === 'string'
        ? error
        : ((error as { message?: unknown })?.message ?? ''),
    )
    .filter(
      (message): message is string =>
        typeof message === 'string' && message !== '',
    );
}
