---
title: Declare the fields that are not text
sidebar_label: Declare field types
sidebar_position: 3
---

# Declare the fields that are not text

Tell the adapter which fields are checkboxes and which hold numbers, so the value that reaches your
schema is the value your schema expects.

## Intent

A DOM value is always a string. A field typed as a number in your schema will receive `"31"`, fail
validation, and go on failing it no matter what the reader types — with a message that never
explains itself. The `types` map is how the adapter undoes that.

All four library subpaths take the same map, so swapping libraries does not mean rewriting it.

```tsx
createFormikField({ types: { tos: 'checkbox', seats: 'number' } });
```

## Give it the values type, and the keys are checked

A misspelt key here is not an error — it is a field quietly bound as text, which is the exact
failure the map exists to prevent. Hand the factory your form's values type and the keys become
paths checked against it, the same guarantee the typed kits give `name`:

```tsx
createFormikField<SignupValues>({
  types: { tos: 'checkbox', seats: 'number' },
});
createFormikField<SignupValues>({ types: { seat: 'number' } }); // does not compile
```

Each adapter checks in **its own path syntax** — `guests.0.name` for Formik, `guests[0].name` for
TanStack and Conform, react-hook-form's `FieldPath` for react-hook-form — so pasting one library's
paths into another's adapter is a compile error too. Without the type argument the keys stay
`string`, and every existing call site compiles unchanged.

## The two questions it answers

**Which prop holds the state.** A controlled library binds a text input through `value` and a
checkbox through `checked` — two different props. Being uncontrolled, react-hook-form does not need
this one.

**What type to store.** Every port undoes the string coercion with its library's own lever:

| Subpath             | How the number survives                   |
| ------------------- | ----------------------------------------- |
| `./react-hook-form` | `valueAsNumber` on `register`             |
| `./formik`          | `valueAsNumber` read at the source        |
| `./tanstack`        | `valueAsNumber` read at the source        |
| `./conform`         | schema coercion — it validates `FormData` |

Leaving it to the consumer's schema would not have been an answer: the port is what writes the
value, so the loss is the port's to undo.

## `date` is deliberately not converted

A date input's value already **is** the canonical `YYYY-MM-DD` string, so passing it on loses
nothing. Turning it into a `Date` would be a decision about time zones, and that belongs to the
schema.

## There is no `'radio'`

A radio group is N controls sharing one name with a distinct value each, so the option's value
cannot be expressed in a map keyed by field NAME. Advertising `'radio'` here would have meant a
control that can never be selected. That binding needs its own shape — one name to many controls.

## Verify

Assert the **stored type**, not the rendered text: the shared suite checks for `"seats":3`, not
`"seats":"3"`. They are different assertions, and only one of them catches this.

## Next steps

- [Subpaths](../reference/subpaths.md) — the per-library particulars.
- [Concepts](../concepts/index.md) — why the port is where this is fixed.
