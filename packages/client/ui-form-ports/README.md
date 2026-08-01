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

| Subpath             | Needs                             | Provides                                                    |
| ------------------- | --------------------------------- | ----------------------------------------------------------- |
| `./react-hook-form` | `react-hook-form` (optional peer) | `useRhfField`, `useRhfErrors`, `RhfForm`                    |
| `./react-19`        | nothing but React                 | `useActionField`, `useActionErrors`, `ActionErrorsProvider` |

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

### `./react-19`

No form library at all. React 19 covers submission (`<form action>`,
`useFormStatus`, `useActionState`); what it does **not** cover is validation and
per-field error tracking — which is exactly what this port carries. The action
validates however it likes and returns errors keyed by name.

The controls stay entirely native — no `value`, no `onChange` — so `FormData`
collects them and the form can submit without JavaScript.

## Per-field rules, if you prefer them to a schema

The port binds by **name**, so there is no `rules` prop on `FormInput` — and
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

A new subpath, an optional peer, an entry in the build, a row in the table.
Nothing in `@fmmenchi/ui` changes: the port is already the whole contract.
