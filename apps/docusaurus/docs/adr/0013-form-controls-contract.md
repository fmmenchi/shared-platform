# ADR 0013 — Form controls are transparent native controls; validation and form-state stay in the consumer

- **Status:** accepted (2026-07-28)
- **Date:** 2026-07-28
- **Deciders:** Fabio Menchicchi

## Context and problem statement

Form controls look like the hardest cluster in the design system, and for the wrong reasons. The fear
comes from conflating three concerns the DS should never own:

- **rendering modes** — the DS must work under **SSR and CSR** alike (a consumer may hydrate or render
  purely client-side);
- **validation libraries** — consumers use react-hook-form, Formik, TanStack Form, or the native
  Constraint Validation API, and the DS cannot pick one (framework-agnostic, ADR-0008);
- **rich inputs** — number, date, and especially a calendar date-picker feel like they belong here.

Try to make the DS "handle forms" and it drowns in that thicket. The way out is a hard boundary.

## Decision

**The DS ships transparent, native, uncontrolled-first form controls that own ZERO validation and ZERO
form-state. The consumer's library drives them; the DS only styles, wires a11y, and presents state.**

The boundary, drawn explicitly:

| DS owns (this side)                                                                         | Consumer owns (that side)                       |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| the look, via the `input-*` token family                                                    | validation rules (zod, yup, native constraints) |
| a11y wiring: `label` association, `aria-describedby`, `aria-invalid`, `useId`               | form state (react-hook-form, Formik, TanStack…) |
| **state PRESENTATION**: `invalid` is a prop; an error-message slot                          | **computing** state — what is valid             |
| **transparency**: forwards `ref`, spreads arbitrary props, never hijacks `value`/`onChange` | submission, focus-on-error, the error summary   |
| atomic controls + a composable `Field`                                                      | the calendar date-picker                        |

Why this dissolves each fear:

- **SSR + CSR** — controls are **uncontrolled by default** (no controlled `value` → no hydration
  mismatch, SSR-safe by construction); a11y ids come from React `useId` (stable server↔client); no
  `window`/`document` at module scope or in render. Controlled mode is still supported via the existing
  `useControlled` primitive.
- **Any validation library** — the common denominator every library needs is a control that **forwards
  its ref and spreads unknown props without sequestering `value`/`onChange`**. A transparent native
  control satisfies react-hook-form's `{...register()}`, Formik's `name`/`onChange`, TanStack's ref, and
  the native Constraint API simultaneously — because it integrates with none of them; it just doesn't get
  in the way.
- **Rich inputs split in two:** `type="number"`, `type="date"`, `inputmode="numeric"` are the **same
  Input with a different `type`** — trivial, native, library-friendly. The **calendar date-picker**
  (grid + popover + keyboard) is a _different, much harder_ component, deferred, and when it lands it
  leans on the platform (Popover API + anchor positioning, ADR-0010). It is not "an input".

  > **Amended by [ADR-0027](./0027-dates-and-calendar.md): `type="date"` is the one exception to
  > transparency.** `Input` refuses it, and `FormInput` inherits the refusal. Measured there: the
  > native field's segment order comes from the browser and cannot be told to follow the locale this
  > design system was given, so on a page whose language the app declares it contradicts the `Time`,
  > `Numeric` and formatted `Table` cells beside it — silently, and without any test going red.
  > `DateInput` is the replacement, and the refusal ships with it. The exception is narrow and stays
  > narrow: `type="checkbox"`, `type="range"` and `type="radio"` remain accepted though `Checkbox`,
  > `Slider` and `Radio` exist, because those are duplicative rather than wrong.

## Consequences

- The DS gains a full form-control cluster (Input, Textarea, Checkbox, Radio, Switch, Select) as
  variations of one transparent archetype, and cashes in the `input-*` tokens that exist but are unused.
- It works with every validation library and rendering mode precisely because it commits to none.
- The genuinely hard parts (validation logic, form orchestration, the calendar picker) are **out of
  scope by design**, not by omission.
- First realization: **Input** (text), which establishes the field-wiring primitive (`label` +
  `aria-describedby` + `aria-invalid`, id via `useId`) that every other control reuses. `Field` (the
  label + control + help + error composition) is decided once a second control exists, not before.
