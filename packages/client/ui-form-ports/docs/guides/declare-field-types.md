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

## `date` and `time` are deliberately not converted

A date field's value already **is** the canonical `YYYY-MM-DD` string, and a time field's is `HH:mm`,
so passing either on loses nothing. Turning them into a `Date` would be a decision about time zones,
and that belongs to the schema — a `CivilTime` is a clock reading with no zone at all, which is
exactly what the conversion would destroy.

Both are accepted here even though the design system **replaces** those native controls rather than
using them (ADR-0027): your schema declares what a field IS, not which control draws it, and refusing
the honest answer would only push you to write `'text'` and lose whatever else the adapter derives.
What the map must never do is reach the control — Conform shapes every prop by it, so it emits
`type`, `pattern`, `min` and `max`, and `FormDateInput`/`FormTimeInput` drop precisely those. The
shared suite declares both on purpose, because nothing inside the design system can see that work.

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
