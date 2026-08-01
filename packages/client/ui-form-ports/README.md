# @fmmenchi/ui-form-ports

Implementations of `@fmmenchi/ui`'s form ports — **one subpath per form
library**, so an app installs only what it uses.

```tsx
import { useRhfField, useRhfErrors } from '@fmmenchi/ui-form-ports/react-hook-form';

<UiProvider adapters={{ i18n, form: { field: useRhfField, errors: useRhfErrors } }}>
```

From then on a form is just a form — `FormInput`, `FormChoice` and
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
| `./react-hook-form` | `react-hook-form` (optional peer)      | `createRhfField`, `useRhfErrors`, `RhfForm`                 |
| `./formik`          | `formik` (optional peer)               | `createFormikField`, `useFormikErrors`                      |
| `./tanstack`        | `@tanstack/react-form` (optional peer) | `createTanstackField`, `createTanstackErrors`               |
| `./conform`         | `@conform-to/react` (optional peer)    | `createConformField`, `createConformErrors`                 |
| `./react-19`        | nothing but React                      | `useActionField`, `useActionErrors`, `ActionErrorsProvider` |

The first four are the four most-used React form libraries; `./react-19` is the
no-library option. All five bind the **same** components, and one test suite in
`apps/ui-ports-validation` runs the same assertions against **the four** — if any
of them needed its own assertions, the port would be leaking. `./react-19` is
tested separately, because its submission model is not a library's at all.

### `types` — declare the fields that are not plain text

All four take the same map, so swapping libraries does not mean rewriting it:

```tsx
createFormikField({ types: { tos: 'checkbox', seats: 'number' } });
```

It answers two questions the field **name** cannot.

**Which prop holds the state.** A controlled library binds a text input through
`value` and a checkbox through `checked` — two different props. Being
uncontrolled, react-hook-form does not need this one.

**What type to store.** A DOM value is always a string, so a `number` field would
put `"31"` where the schema expects `31` — and the form then fails validation
forever, with a message no amount of typing fixes. Every port undoes that loss,
each with its library's own lever (`valueAsNumber` for react-hook-form,
`valueAsNumber` read at the source for the controlled two, schema coercion for
Conform, which validates `FormData`). Leaving it to the consumer's schema would
not have been an answer: the port is what writes the value, so the loss is the
port's to undo. The shared suite asserts `"seats":3`, not `"seats":"3"` — the
two are different assertions, which is the point.

`date` is deliberately not converted: a date input's value already **is** the
canonical `YYYY-MM-DD` string, so passing it on loses nothing, and turning it
into a `Date` would be a decision about time zones that belongs to the schema.

There is no `'radio'`. A radio group is N controls sharing one name with a
distinct value each, so the option's value cannot be expressed in a map keyed by
field NAME — advertising it would have meant a control that can never be
selected. That binding needs its own shape, one name to many controls.

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
