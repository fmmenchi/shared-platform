# AGENTS.md — @fmmenchi/formatting

Locale-aware formatting of dates, numbers and money — one answer per value, shared by the client and
the server. Part of `shared-platform`; workspace contract in [../../../AGENTS.md](../../../AGENTS.md).
Scope `shared`, type `util`. Built under the cross-app + framework-agnostic bar of
[ADR-0008](../../../apps/docusaurus/docs/adr/0008-cross-app-framework-agnostic-layers.md), and
decided in [ADR-0026](../../../apps/docusaurus/docs/adr/0026-formatting-is-a-shared-layer.md).

## Commands

```bash
pnpm nx typecheck @fmmenchi/formatting
pnpm nx build @fmmenchi/formatting
pnpm nx lint @fmmenchi/formatting
pnpm nx test @fmmenchi/formatting
```

## Shape

- Public surface (`src/index.ts`): `createFormatter` (bind a locale + the app's defaults), the free
  functions (`formatDate`, `formatDateTime`, `formatTime`, `toDate`, `toMachineDate`, `formatNumber`,
  `formatInteger`, `formatCurrency`, `formatMoney`, `formatPercent`, `numericParts`,
  `currencyParts`), `clearFormatCache`, and the types.
- `src/lib/`: `intl-cache.ts` (the capped formatter store), `dates.ts`, `numbers.ts`, `formatter.ts`
  (the bound facade), plus a `*.types.ts` beside each. `index.ts` re-exports only.

## Rules

- **Framework-agnostic, no deps, no DOM.** `Intl` and nothing else. A React hook, a `<time>` element
  or a cell renderer belongs to `@fmmenchi/ui`, never here (ADR-0008) — the design system binds this
  package's locale question and adds nothing to it.
- **The platform's vocabulary, passed through.** `dateStyle`/`timeStyle`, `currencyDisplay`,
  `useGrouping` — never re-tabulated into a private set. A hand-made table is how "short" comes to
  mean two different things in two codebases.
- **Grouping is `auto | always | never`, never a boolean.** `useGrouping: true` means ALWAYS and
  overrides the `minimumGroupingDigits` a language declares — CLDR gives Italian 2, so Italian writes
  `1234` plain. A boolean that reads like the language's rule and means the override is the defect.
- **Zero is a number.** The absence guard is `null | undefined | NaN`, never falsiness. Adding a
  `value ? … : ''` anywhere in this package is the one change that must not pass review.
- **The zone is a stated parameter**, on every date function, and never a fallback dressed up as a
  decision.
- **Nothing throws into a cell renderer.** `Intl` constructors throw a `RangeError` on `en_US` and
  on an unknown currency code; both are caught, the first falling back to the runtime locale and the
  second keeping the number.
- **Cached and capped.** New formatters go through `getDateTimeFormat`/`getNumberFormat` — never
  `new Intl.…` at a call site — because on a server the locale comes from the request.
- **`Date` + `Intl`, not Temporal** (not Baseline). `DateInput` is the seam where a Temporal type
  would later be admitted without touching a call site.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.
