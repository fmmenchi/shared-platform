# ADR 0026 — Formatting values is a shared layer, and the design system only binds it

- **Status:** accepted (2026-08-12)
- **Date:** 2026-08-12
- **Deciders:** Fabio Menchicchi

## Context and problem statement

Three components in `@fmmenchi/ui` build their own number formatter — `Pagination`, `TableToolbar`
and `Table` each call `new Intl.NumberFormat(locale)` where they stand. One fact, three owners, and
none of them wrong on its own.

Dates have the opposite problem: nothing in the design system formats one. `Table` renders a cell
value as it arrives, so every consumer with a `createdAt` column writes `toLocaleDateString` — per
app, per column, with a different set of options each time. That is where the defects actually live,
and they are the same three in every codebase that has ever rendered a table:

- **A date is a day off.** A `Date` is a point in time and carries no zone, so `2026-01-01T00:00:00Z`
  is the 1st of January in Rome and the 31st of December in Lima. Whichever the runtime happens to
  be in, that is the answer — and on a server the runtime is whatever the container was started with.
- **Zero disappears.** `value ? format(value) : ''` is the guard everybody writes, and it renders a
  balance of zero, a count of zero and a delta of zero as an empty cell. A reader takes an empty cell
  for missing data, not for the answer.
- **The client and the server disagree.** An invoice PDF that says `01/02/2026` beside a screen that
  says `02/01/2026` is one bug with two owners. So is an export where the amounts are `1,234.50` and
  the screen says `1.234,50`.

The workspace already made this argument once, in code. `sorting/compare.ts` and `filtering/filter.ts`
both say in their headers that they are pure and isomorphic **so that they can move to
`packages/shared/` unchanged the day the server has to answer the same question** — because if the
two sides collate differently, page 2 is not the continuation of page 1. Formatting is that same
argument one operation over.

The reference implementation we had to hand — `IntlFormatterService` in the iungo frontend — settles
the question of what NOT to build as much as what to build. It is a class with the right idea and
four things worth not copying: it constructs a formatter on every call, it drops zero
(`formatInt(0)` returns `''`), it re-tabulates `dateStyle` into a private set of `day`/`month`/`year`
options where its `short` is a date with no year at all, and it carries `capitalize`, `uppercase`,
`lowercase` and `substring` — none of which is locale-aware formatting, and two of which are already
solved better elsewhere in this workspace (`foldForSearch` for the Turkish dotted `İ`,
`Intl.Segmenter` for the grapheme `substring` would split).

## Decision drivers

- **One fact, one owner** — the rule the three duplicated `NumberFormat`s already break.
- **[ADR-0008](./0008-cross-app-framework-agnostic-layers.md)**: a layer here must be cross-app reusable
  and framework-agnostic.
- **[ADR-0002](./0002-ui-library-foundations-decision.md)**, native-first — `Intl` is the platform,
  and the platform's vocabulary is not to be re-tabulated into a private one.
- **[ADR-0016](./0016-minimal-semantic-markup.md)** — a seam with one possible plug is not a
  seam.
- **[ADR-0017](./0017-browser-platform-target.md)** — Baseline Widely by default.

## Decision

### 1. Formatting is `@fmmenchi/formatting`, in `packages/shared/`

Pure, isomorphic, no dependency beyond `Intl`, no React. It is the profile `analytics` and `notify`
already have, and it is the only shape the server can use: an export job, a PDF and an email have to
produce the same string as the screen, and they cannot if the function ships with a framework
attached.

It is called `formatting` and not `l10n` deliberately. `l10n` implies catalogs and translation, which
`UiProvider` **refuses** to own — it holds no app copy — and a name that promises that would invite
exactly the content this platform does not accept.

### 2. What it owns, and what it deliberately does not

It owns: dates, times and the ISO **machine form** for `<time dateTime>`; numbers, integers,
percentages, currencies and money that carries its own currency; the locale's separators and the side
its currency symbol sits on, read out with `formatToParts`; and one cached, capped formatter store.

It does not own: string case and slicing (not formatting, and not locale-aware as normally written);
relative time, lists and plurals (real, but with no consumer asking yet — they join when one does);
and what a missing value should LOOK like. Absence formats as an empty string, and whether that
should be a dash, an "n/a" or a placeholder is a decision about the screen it is on. Only the layer
that can see the column may take it.

### 3. The platform's vocabulary is passed through, never re-tabulated

`dateStyle` and `timeStyle` are `Intl`'s four values, not a private table. A hand-made table is how
"short" comes to mean a date with no year in one codebase and a two-digit year in the next — two
vocabularies for one idea, and the reader learns whichever one leaks.

The one place this rule is applied AGAINST a boolean is grouping. `useGrouping: true` does not mean
"group the thousands"; it means **always**, overriding the `minimumGroupingDigits` a language
declares. CLDR gives Italian 2, so Italian writes `1234` plain and `12.345` grouped — and a formatter
written as `useGrouping: true`, which is what every hand-rolled one is, puts a separator in front of
an Italian reader that Italian does not use. So grouping is three named states, `auto | always |
never`, and never a boolean that reads like the first and means the second.

### 4. The zone is a stated parameter, and the app states it once

Every date function takes `timeZone`; `createFormatter` binds an app-wide default that a call may
override. There is no "the server's zone" fallback dressed up as a decision — left unstated, the
runtime answers, and that is documented as what it is.

### 5. The design system BINDS it; it does not re-implement it and does not port it

`@fmmenchi/ui` depends on `@fmmenchi/formatting` (allowed: `client` may depend on `shared`) and hands
out a bound formatter from the locale its provider already holds. The three duplicated
`Intl.NumberFormat` call sites collapse into that one.

**It is not an adapter.** A port exists where there is a real choice of implementation — React Hook
Form versus TanStack Form, React Router versus TanStack Router. Of `Intl` there is one, so a port
would be a seam with a single plug. What IS an app-level choice is configuration, not implementation:
the zone, and the currency to fall back to. Those ride in the provider as a `formatting` slice and
compose by inheritance exactly as the locale does — a nested provider states only what it changes.

### 6. Two locales, not one

The design system already distinguishes the locale of the **reader** from the locale of the
**sentence** (`useCopyLocale`), because with `de-DE` injected and no German catalog, the copy falls
back to English while `Intl.NumberFormat('de-DE')` writes `2.450` — which an English reader parses as
two-point-four-five. A standalone value (a cell, a badge, an amount) uses the reader's locale; a
value interpolated into DS copy uses the copy locale. This is the reference implementation's largest
omission and it is not a detail: it is the same class of defect the formatting exists to prevent, one
layer up.

### 7. `Date` and `Intl`, not Temporal

Temporal is not Baseline. `Date` plus `Intl` is, and the seam — `DateInput` accepting a `Date`, a
timestamp or an ISO string through one `toDate` — is where a Temporal type would later be admitted
without touching a call site. Recorded in the known-issues ledger rather than left as folklore.

## Consequences

- One place answers "how is this value written", for the screen, the export, the PDF and the email.
- `@fmmenchi/ui` gains a dependency on `@fmmenchi/formatting`. It is a `shared` package with no
  runtime dependency of its own, so the design system's dependency graph stays one layer deep.
- The three duplicated `Intl.NumberFormat` sites become one, and the next one is a lint-visible
  duplication rather than a habit.
- `sorting/compare.ts` and `filtering/filter.ts` now have a destination. They are not moved here —
  that is its own change, with its own tests — but the header comment they both carry stops being
  aspirational.
- A consumer that wants a formatting behaviour the package refuses (a dash for empty, a private date
  style) writes it in their own cell renderer, which is where that decision belongs.
- Relative time, lists and plurals are deferred, not rejected. The first consumer that needs one
  gets it added, and this ADR does not have to be superseded to allow it.
