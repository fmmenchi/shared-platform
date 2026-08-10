---
title: '@fmmenchi/ui-form-ports'
sidebar_label: ui-form-ports
sidebar_position: 0
---

# @fmmenchi/ui-form-ports

Implementations of `@fmmenchi/ui`'s **form ports** — one subpath per form library, so an app
installs only what it uses.

`@fmmenchi/ui` ships `Form`, `FormInput`, `FormChoice` and `FormErrorSummary` without knowing which
form library you use: it declares a port and asks the app to fill it. This package is that filling,
written once for the four most-used React form libraries and for the no-library case.

```tsx
import {
  useRhfField,
  useRhfErrors,
} from '@fmmenchi/ui-form-ports/react-hook-form';

<UiProvider
  adapters={{ i18n, form: { field: useRhfField, errors: useRhfErrors } }}
>
  <App />
</UiProvider>;
```

From then on a form is just a form. No field is handed a `control`, no component imports your form
library, and swapping libraries is one line in one file.

## Prerequisites

- **`@fmmenchi/ui`** and **React 19** — both peer dependencies.
- **One form library**, or none:
  - `react-hook-form`, `formik`, `@tanstack/react-form` or `@conform-to/react` — each declared an
    **optional** peer, so nothing asks you to install the four you are not using;
  - or nothing at all, with `./react-19`.

```bash
pnpm add @fmmenchi/ui-form-ports react-hook-form
```

## 🚀 Guides

- [Wire a form library](./guides/wire-a-form-library.md) — pick a subpath, bind it once, render a
  field.
- [Check your field names](./guides/check-your-field-names.md) — make a misspelt `name` a compile
  error instead of a field that submits nothing.
- [Declare the fields that are not text](./guides/declare-field-types.md) — the `types` map, and why
  a number field needs one.

## 📚 Reference

- [Subpaths](./reference/subpaths.md) — all five, with what each needs, what it exports and what is
  particular to it.

## 🏗 Concepts

- [Concepts](./concepts/index.md) — what a port is, why the members are hooks, why one package
  rather than five, and how four very different libraries went through one contract unmodified.
