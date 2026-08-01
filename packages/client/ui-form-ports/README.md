# @fmmenchi/ui-form-ports

Implementations of `@fmmenchi/ui`'s form ports — **one subpath per form
library**, so an app installs only what it uses.

```tsx
import { useRhfField, useRhfErrors } from '@fmmenchi/ui-form-ports/react-hook-form';

<UiProvider adapters={{ i18n, form: { field: useRhfField, errors: useRhfErrors } }}>
```

From then on a form is just a form — `Form`, `FormInput`, `FormChoice` and
`FormErrorSummary` work with nothing further to wire.

## Why one package and not one per library

Because the cost of an integration you do not use is **zero**: you never import
its subpath, so it never enters your bundle, and its peer dependency is declared
**optional**, so nothing asks you to install it. Separate packages would cost N
releases, N changelogs and N versions to keep in step with `@fmmenchi/ui`.

This is the shape `@hookform/resolvers` uses for its twenty-four integrations,
and the reasoning is the same.

## Subpaths

| Subpath             | Needs                                  | Provides                                                    |
| ------------------- | -------------------------------------- | ----------------------------------------------------------- |
| `./react-hook-form` | `react-hook-form` (optional peer)      | `useRhfField`, `useRhfErrors`, `RhfForm`                    |
| `./formik`          | `formik` (optional peer)               | `createFormikField`, `useFormikErrors`                      |
| `./tanstack`        | `@tanstack/react-form` (optional peer) | `createTanstackField`, `createTanstackErrors`               |
| `./conform`         | `@conform-to/react` (optional peer)    | `createConformField`, `createConformErrors`                 |
| `./react-19`        | nothing but React                      | `useActionField`, `useActionErrors`, `ActionErrorsProvider` |

The first four are the four most-used React form libraries; `./react-19` is the
no-library option. All five bind the **same** components, and one test suite in
`apps/ui-ports-validation` runs the same assertions against all of them — if any
of them needed its own assertions, the port would be leaking.

### `types`, and why only some of them need it

Three of the four take a map of the fields that are not plain text inputs:

```tsx
createFormikField({ types: { tos: 'checkbox' } });
```

A **controlled** library binds a text input through `value` and a checkbox
through `checked` — two different props — and the field name alone does not say
which. react-hook-form is the exception and needs no map: it is uncontrolled, so
it binds by `name` and `ref` and lets the DOM hold the state either way.

### `./react-hook-form`

The adapter reads; it decides nothing. Validation, submission and values stay
with the library. Two things it has solved once, so no app rediscovers them:

- **`useFormState`, not `formState` off the context** — that one is a Proxy
  whose subscription does not reach a nested component, so the error never
  arrives, with nothing to tell you.
- **subscribed per field**, so one field's error does not re-render the rest.

`RhfForm` additionally wires the four lines every form repeats — `useForm`, its
provider, the `<form>` and `handleSubmit`. It hides nothing: `options` is
`useForm`'s own argument forwarded whole, and the instance is reachable from any
child through the library's own `useFormContext()`.

### `./formik`

Controlled, and with no zod integration of its own — `validationSchema` expects
a Yup schema, so a zod schema goes through the plain `validate` callback. Errors
are gated on `touched`, which is Formik's own convention and the reason its
state carries it.

### `./tanstack`

The odd one, and the reason it is worth supporting: TanStack's API is a **render
prop** (`<form.Field name>{(field) => …}</form.Field>`), not a bag of props. The
adapter goes through `useField` — what that render prop wraps — and hands the
design system a bag instead, so the markup is byte-for-byte the others'.

Going through `useField` rather than reading `form.store` is load-bearing: it
**mounts** the field, and TanStack tracks per-field state only for mounted
fields. Reading the store directly looks like it works, and then the form can
never be submitted again — the stale per-field errors are never reconciled, so
`canSubmit` stays false and `handleSubmit` silently refuses.

It also takes a zod schema **directly** (`validators: { onSubmit: Schema }`) —
TanStack speaks Standard Schema, so there is no resolver package in between.

### `./conform`

The FormData one: Conform validates the form's `FormData`, not a JS object, so a
ticked box is the string `'on'` and an empty field is coerced to `undefined`
before validating — give the missing case its own message or zod reports its own.

The adapter passes `ariaAttributes: false`, which is not tidiness: Conform
otherwise emits an `aria-describedby` pointing at an error element **it** expects
you to render, and the design system renders `FieldError` instead — measured, the
attribute pointed at an id that existed nowhere. The `id` still comes through and
is kept, because `Field` adopts whatever the control brings.

### `./react-19`

No form library at all. React 19 covers submission (`<form action>`,
`useFormStatus`, `useActionState`); what it does **not** cover is validation and
per-field error tracking — which is exactly what this port carries. The action
validates however it likes and returns errors keyed by name.

The controls stay entirely native — no `value`, no `onChange` — so `FormData`
collects them and the form can submit without JavaScript.

## Per-field rules, if you prefer them to a schema

The **portable** answer is native constraint attributes — `required`,
`minLength`, `type="email"` — which pass straight through to the control
(ADR-0013). They are the same three lines whichever library is underneath, the
browser enforces them before any library runs, and they still work with
JavaScript off. `RhfForm` sets `noValidate` and takes them out of play; pass
`noValidate={false}` to keep them.

Everything below is about **library-specific** per-field rules, which are not
portable: react-hook-form puts them on `register`, Formik on a field-level
`validate`, TanStack on per-field `validators`, and Conform derives them from the
schema. The port binds by **name**, so there is no `rules` prop on `FormInput` — and
there should not be: the design system cannot type `RegisterOptions` without
importing react-hook-form, so such a prop would have to be `unknown`, and a typo
in it would compile.

Three ways to get the rules, in the order worth reaching for them:

1. **A schema.** `useForm({ resolver: zodResolver(Schema) })`. Everything in one
   place, cross-field rules included, and the port carries the messages by name.
2. **A wrapper in your app** — six lines, and fully typed, which the design
   system could not be:

   ```tsx
   function AppInput({
     rules,
     ...rest
   }: FormInputProps & { rules?: RegisterOptions }) {
     const { register } = useFormContext();
     register(rest.name, rules);
     return <FormInput {...rest} />;
   }

   <AppInput name="email" label="Email" rules={{ required: 'Required.' }} />;
   ```

   It works because a plain `register(name)` — what the port does — does **not**
   wipe rules registered earlier for that name. Measured, both ways.

3. **A rules map in your own adapter**, when the rules are better kept together
   than beside each field: `register(name, RULES[name])`.

The general shape: your app knows its form library, so your app can type it. Any
time the design system would have to accept something opaque, a small wrapper on
the side that knows the library is the better place for it.

## Adding a library

A new subpath, an optional peer, an entry in the build, a row in the table, and
a row in the suite in `apps/ui-ports-validation` — which is the part that
matters: the same assertions have to hold for it.

Nothing in `@fmmenchi/ui` changes. The port is already the whole contract, and
four libraries as different as an uncontrolled one, a controlled one, a
render-prop one and a FormData one have now gone through it unmodified.
