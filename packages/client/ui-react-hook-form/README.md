# @fmmenchi/ui-react-hook-form

`@fmmenchi/ui`'s form anatomies, already bound to
[react-hook-form](https://react-hook-form.com). One tag per field:

```tsx
<FormProvider {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormInput
      name="email"
      label="Email"
      rules={{ required: 'Email is required.' }}
    />
    <FormChoice name="tos" label="Accept the terms" />
    <button type="submit">Sign up</button>
  </form>
</FormProvider>
```

## What it is actually for

Not the wiring — that is a handful of lines. It is the two subtleties, solved
once and covered by tests, that every app would otherwise rediscover:

- **`useFormState`, not `formState` off the context.** react-hook-form's
  `formState` is a Proxy and its subscription does **not** reach a nested
  component: read it there and the error never arrives, with nothing to tell you.
- **Subscribed per field** (`useFormState({ control, name })`), so one field's
  error does not re-render every other field in the form.

Both are measured in this package's tests, not asserted.

## What it costs

It is married to one library. That is the deliberate trade, and the reason it
is a separate package rather than something inside `@fmmenchi/ui`: the design
system stays free of form libraries (ADR-0008), and an app using Conform,
Formik or TanStack Form simply does not install this.

In exchange it can offer the library's **own** API where the field is written —
`rules` goes straight to `register`, which a name-only binding cannot do.

## Install

```bash
pnpm add @fmmenchi/ui-react-hook-form
```

Peers: `react`, `react-hook-form`, `@fmmenchi/ui`.

## Exports

| Export          | What it is                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------- |
| `FormInput`     | `Field` + `Input`, bound. Takes `name`, `label`, `hint`, `rules`, plus every native input prop. |
| `FormChoice`    | `ChoiceField` + `Checkbox`, bound — the control-first anatomy for a consent box.                |
| `useBoundField` | The binding on its own, for a control these two do not cover.                                   |

An explicit prop at the call site always beats the binding, so a per-field
`type` or `placeholder` is never erased.

For a **group** of choices the field is the group, not the option: use
`@fmmenchi/ui`'s `Fieldset` and bind each option with `useBoundField`.
