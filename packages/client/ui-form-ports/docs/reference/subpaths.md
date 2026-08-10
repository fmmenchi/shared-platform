---
title: Subpaths
sidebar_label: Subpaths
sidebar_position: 1
---

# Subpaths

Every entry point in `@fmmenchi/ui-form-ports`. The package has **five subpaths** and no root
export: you import the one library you use, and the other four never enter your bundle.

---

## Summary

| Subpath             | Needs                                  | Exports                                                                     |
| ------------------- | -------------------------------------- | --------------------------------------------------------------------------- |
| `./react-hook-form` | `react-hook-form` (optional peer)      | `createRhfField`, `useRhfField`, `useRhfErrors`, `RhfForm`, `createRhfForm` |
| `./formik`          | `formik` (optional peer)               | `createFormikField`, `useFormikErrors`, `createFormikFields`, `FormikPath`  |
| `./tanstack`        | `@tanstack/react-form` (optional peer) | `createTanstackField`, `createTanstackErrors`, `createTanstackFields`       |
| `./conform`         | `@conform-to/react` (optional peer)    | `createConformField`, `createConformErrors`                                 |
| `./react-19`        | nothing but React                      | `useActionField`, `useActionErrors`, `ActionErrorsProvider`, `ActionErrors` |

`react`, `@fmmenchi/ui` are required peers. The four libraries are declared **optional**, so
installing the package asks nothing of you beyond the one you chose.

---

## `./react-hook-form`

The adapter reads; it decides nothing. Validation, submission and values stay with the library. Two
things it has solved once, so no app rediscovers them:

- **`useFormState`, not `formState` off the context.** That one is a Proxy whose subscription does
  not reach a nested component, so the error never arrives — with nothing to tell you.
- **Subscribed per field**, so one field's error does not re-render the rest.

`RhfForm` additionally wires `useForm`, its provider, the `<form>` and `handleSubmit`. It hides
nothing: `options` is `useForm`'s own argument forwarded whole, and the instance is reachable from
any child through `useFormContext()`. It sets `noValidate`; pass `noValidate={false}` to keep the
browser's own constraint validation in play.

## `./formik`

Controlled, and with no zod integration of its own — `validationSchema` expects a Yup schema, so a
zod schema goes through the plain `validate` callback. Errors are gated on `touched`, which is
Formik's own convention and the reason its state carries it.

`FormikPath<T>` is derived here because Formik publishes no path type.

## `./tanstack`

The odd one, and the reason it is worth supporting: TanStack's API is a **render prop**
(`<form.Field name>{(field) => …}</form.Field>`), not a bag of props. The adapter goes through
`useField` — what that render prop wraps — and hands the design system a bag instead, so the markup
is byte-for-byte the others'.

Going through `useField` rather than reading `form.store` is load-bearing: it **mounts** the field,
and TanStack tracks per-field state only for mounted fields. Reading the store directly looks like it
works, and then the form can never be submitted again — the stale per-field errors are never
reconciled, so `canSubmit` stays false and `handleSubmit` silently refuses.

It takes a zod schema **directly** (`validators: { onSubmit: Schema }`): TanStack speaks Standard
Schema, so there is no resolver package in between.

## `./conform`

The `FormData` one. Conform validates the form's `FormData`, not a JS object, so a ticked box is the
string `'on'` and an empty field is coerced to `undefined` before validating — give the missing case
its own message, or zod reports its own.

The adapter passes `ariaAttributes: false`, which is not tidiness: Conform otherwise emits an
`aria-describedby` pointing at an error element **it** expects you to render, while the design system
renders `FieldError` instead — measured, the attribute pointed at an id that existed nowhere. The
`id` still comes through and is kept, because `Field` adopts whatever the control brings.

## `./react-19`

No form library at all. React 19 covers submission (`<form action>`, `useFormStatus`,
`useActionState`); what it does **not** cover is validation and per-field error tracking, which is
what this port carries. The action validates however it likes and returns errors keyed by name,
which `ActionErrorsProvider` publishes.

The controls stay entirely native — no `value`, no `onChange` — so `FormData` collects them and the
form can submit without JavaScript.

---

## Per-field rules

The **portable** answer is native constraint attributes — `required`, `minLength`, `type="email"` —
which pass straight through to the control (ADR-0013). They are the same three lines whichever
library is underneath, the browser enforces them before any library runs, and they still work with
JavaScript off.

Library-specific per-field rules are not portable: react-hook-form puts them on `register`, Formik on
a field-level `validate`, TanStack on per-field `validators`, Conform derives them from the schema.
The port binds by **name**, so there is no `rules` prop on `FormInput` — and there should not be: the
design system cannot type `RegisterOptions` without importing react-hook-form, so such a prop would
have to be `unknown`, and a typo in it would compile.

Three ways to get them, in the order worth reaching for:

1. **A schema.** `useForm({ resolver: zodResolver(Schema) })`. Everything in one place, cross-field
   rules included, and the port carries the messages by name.
2. **A wrapper in your app** — six lines, and fully typed, which the design system could not be:

   ```tsx
   function AppInput({
     rules,
     ...rest
   }: FormInputProps & { rules?: RegisterOptions }) {
     const { register } = useFormContext();
     register(rest.name, rules);
     return <FormInput {...rest} />;
   }
   ```

   It works because a plain `register(name)` — what the port does — does **not** wipe rules
   registered earlier for that name. Measured, both ways.

3. **A rules map in your own adapter**, when the rules are better kept together than beside each
   field: `register(name, RULES[name])`.

The general shape: your app knows its form library, so your app can type it. Any time the design
system would have to accept something opaque, a small wrapper on the side that knows the library is
the better place for it.
