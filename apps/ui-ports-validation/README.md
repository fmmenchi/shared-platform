# ui-ports-validation

Integrations of `@fmmenchi/ui`'s **ports** inside an application. Not published,
not a layer, and nothing depends on it (`scope:app`, ADR-0020).

It exists because the design system deliberately knows nothing about form
libraries — so the claim "any library fits" has to be proved somewhere that
installs them. That somewhere is here, and not the design system, which now
carries **no devDependency on a form library at all**.

## What it validates

| Screen             | Binding                                  | The claim                                                 |
| ------------------ | ---------------------------------------- | --------------------------------------------------------- |
| react-hook-form    | `useRhfField` / `useRhfStatus`, 12 lines | a real library fits the port                              |
| No form library    | a dozen lines of `useState`              | the components cannot tell the difference                 |
| Data arriving late | `useForm({ values })`                    | the edit case, where `defaultValue` silently does nothing |

Every screen renders the **same** `SignupFields` component. Nothing inside it
names a form library — that is the whole thing being validated. If a screen
looks or behaves differently from another, the port has leaked.

## Running it

```bash
pnpm nx dev @fmmenchi/ui-ports-validation    # the screens, to click through
pnpm nx test @fmmenchi/ui-ports-validation   # the integrations, in real Chromium
```

## Why an app and not a library

The thing under test is _behaviour inside an application_ — a real `<form>`, a
real submit, real data arriving late. A library would not exercise any of that,
and nothing would import it. (A private package is possible in this workspace —
`gh-actions` is one — so this is a functional choice, not a structural rule.)

## What it does NOT cover

Submission **without JavaScript**. Measured: the label association and
`aria-invalid` arrive from the server, but `aria-describedby` does not — the
description parts register through an effect. No component test can see that;
it needs a real page load with JS disabled, i.e. Playwright. Worth adding the
day progressive enhancement becomes a requirement — one case, not a suite.
