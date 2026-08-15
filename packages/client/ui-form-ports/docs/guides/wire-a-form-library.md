---
title: Wire a form library
sidebar_label: Wire a form library
sidebar_position: 1
---

# Wire a form library

Bind one of the five subpaths to the design system, once, and render a bound field.

## Intent

You want `FormInput`, `FormChoice` and `FormErrorSummary` to read values and errors out of your form
library without every screen wiring it. The binding is given to `UiProvider` at setup and nothing
below it names a library again.

## The binding

Two members, both hooks: `field` binds one field by name, `errors` reports every field currently in
error. Every member is optional and each bound component asks for the one it needs, by name, when it
is missing: `field` binds one control to one name, `optionField` binds one field drawn as MANY
controls (a radio group, checkboxes sharing a name), and `errors` exists because `FormErrorSummary`
needs errors keyed by name and cannot get them from any single field.

```tsx
import { UiProvider } from '@fmmenchi/ui';
import {
  useRhfField,
  useRhfOptionField,
  useRhfErrors,
} from '@fmmenchi/ui-form-ports/react-hook-form';

<UiProvider
  adapters={{
    i18n,
    form: {
      field: useRhfField,
      optionField: useRhfOptionField,
      errors: useRhfErrors,
    },
  }}
>
  <App />
</UiProvider>;
```

**`optionField` is what `FormSegmentedControl` binds through**, so a form containing one needs it
wired or the component throws and names it. A per-field binding cannot stand in: bound one control
per name, a group renders a single control that can never report which option is checked, and the
form submits nothing while looking complete.

Four of the five subpaths export **factories** rather than ready hooks, because they take the field
type map described in [Declare the fields that are not text](./declare-field-types.md):

```tsx
import {
  createFormikField,
  createFormikOptionField,
  useFormikErrors,
} from '@fmmenchi/ui-form-ports/formik';

const types = { tos: 'checkbox', seats: 'number', colour: 'radio', tags: 'checkbox-group' } as const;
const field = createFormikField({ types });
const optionField = createFormikOptionField({ types });

<UiProvider adapters={{ i18n, form: { field, optionField, errors: useFormikErrors } }}>
```

Call the factory **outside** the component that renders the provider. Its result is a hook, and a
hook created during render is a new function on every pass.

## A form, and a field

The library keeps its own shape — `useForm`, `<FormProvider>`, `handleSubmit` are all still yours.
The design system only reads:

```tsx
function Signup() {
  const form = useForm<SignupValues>({ resolver: zodResolver(Schema) });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FormErrorSummary />
        <FormInput name="email" label="Email" />
        <FormChoice name="tos" label="I accept the terms" />
        <Button type="submit">Create account</Button>
      </form>
    </FormProvider>
  );
}
```

For react-hook-form specifically, `RhfForm` wires the four lines that every form repeats — `useForm`,
its provider, the `<form>` and `handleSubmit` — while hiding nothing: `options` is `useForm`'s own
argument forwarded whole, and the instance stays reachable from any child through the library's
`useFormContext()`.

```tsx
import { RhfForm } from '@fmmenchi/ui-form-ports/react-hook-form';

<RhfForm options={{ resolver: zodResolver(Schema) }} onSubmit={onSubmit}>
  <FormInput name="email" label="Email" />
</RhfForm>;
```

## Two libraries on one page

The binding is a provider value, so it nests: a `UiProvider` further down overrides the one above it,
and a single `Form` can take its own. This is for the rare page that binds two libraries at once —
not the normal case, which is one binding at the root.

## Verify

A bound field carries the library's own props. If it renders, types and submits **nothing**, the
binding did not reach it — the two usual causes are a provider mounted below the form rather than
above it, and a factory called during render.

## Next steps

- [Check your field names](./check-your-field-names.md) — the misspelt `name` is the other way a
  field silently submits nothing.
- [Subpaths](../reference/subpaths.md) — what each library's adapter exports.
