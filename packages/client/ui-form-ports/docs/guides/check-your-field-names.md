---
title: Check your field names
sidebar_label: Check your field names
sidebar_position: 2
---

# Check your field names

Make a misspelt `name` a compile error rather than a field that renders, types and submits nothing.

## Intent

`name` is what binds a field. Get it wrong and nothing breaks loudly: the input appears, accepts
text, validates against no rule and contributes no value. Each adapter ships a **kit** that checks
names against your form's own values type.

## Declare the kit beside the schema

The kit is a module-level declaration, not a provider — a type does not travel through React context
(a context's type is fixed where it is created) and does not descend the JSX tree. An import is what
carries a type across a file boundary, which is exactly what a sub-component needs.

```ts
// signup.form.ts — outside any component, beside the schema
import { createRhfForm } from '@fmmenchi/ui-form-ports/react-hook-form';

export const { Form, FormInput, FormChoice } = createRhfForm<SignupValues>();
```

```tsx
// signup-fields.tsx — another file, another component, clean props
import { FormInput } from './signup.form.js';

<FormInput name="email" label="Email" />;
<FormInput name="emial" label="Email" />; // does not compile
```

You pass the **values** type, never a path type. The path type is derived inside the adapter, which
is the only place that knows the syntax — `guests.0.name` for react-hook-form, `guests[0].name` for
TanStack. Same call, different derivation:

| Subpath             | Kit                         | Paths from                                            |
| ------------------- | --------------------------- | ----------------------------------------------------- |
| `./react-hook-form` | `createRhfForm<T>()`        | `FieldPath<T>` (the library's)                        |
| `./tanstack`        | `createTanstackFields<T>()` | `DeepKeys<T>` (the library's)                         |
| `./formik`          | `createFormikFields<T>()`   | `FormikPath<T>` — derived here: Formik publishes none |
| `./conform`         | none, and none needed       | `fields.email.name` off the metadata                  |

No `FieldPath` and no library import reaches your components.

## Conform is the exception, on purpose

Its names come from the metadata object, so a typo is a property that does not exist — a stronger
guarantee than a string union, and it covers array rows too. Its own `FieldName<Schema>` type is
`string & { [brand]?: … }` with the brand **optional**, so it accepts any string: typing a name
against it would add nothing. Measured, not assumed.

## What the kit does not carry

**Defaults.** Real defaults come from props or a request, so they are not available where the kit is
declared. The kit carries the SHAPE; the data goes to the form at render:

```tsx
<Form options={{ defaultValues, resolver }}>
```

**A silent widening.** Called with no type argument the kit returns a message type instead of the
components, so the mistake is a compile error rather than every name quietly becoming `string`.

## Verify

The guard is **type-level only**. `pnpm nx typecheck` is what enforces it; a JavaScript consumer
still gets working, unchecked components, and no test can fail in their place.

## Next steps

- [Declare the fields that are not text](./declare-field-types.md).
