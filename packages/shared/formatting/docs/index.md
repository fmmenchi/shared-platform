---
title: '@fmmenchi/formatting'
sidebar_label: formatting
sidebar_position: 0
---

# @fmmenchi/formatting

Locale-aware formatting of **dates, numbers and money** — one answer per value, shared by the client
and the server. Framework-agnostic, isomorphic, **no dependencies** beyond `Intl`.

Decided in [ADR-0026](../../adr/0026-formatting-is-a-shared-layer.md), under
[ADR-0008](../../adr/0008-cross-app-framework-agnostic-layers.md)'s bar — the same pure, isomorphic
shape as [`@fmmenchi/analytics`](../analytics/index.md), for values instead of events.

## The problem

An invoice PDF that says `01/02/2026` beside a screen that says `02/01/2026` is one bug with two
owners. The only way to have one owner is for both sides to call the same function — which the
server cannot do if the function ships with React attached.

Over calling `Intl` where you stand, it adds four things, each of them a defect somewhere today:

|                                                        |                                                                                                                                                                                                                |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The formatters are cached**, and the cache is capped | A thousand rows with three formatted columns construct three thousand formatters per render. On a server the locale comes from `Accept-Language` — an uncapped map is unbounded growth keyed on request input. |
| **Zero is a number**                                   | `value ? format(value) : ''` renders a balance of zero, a count of zero and a delta of zero as an empty cell, which a reader takes for missing data.                                                           |
| **The zone is stated**                                 | A `Date` carries none: `2026-01-01T00:00:00Z` is the 1st of January in Rome and the 31st of December in Lima.                                                                                                  |
| **Nothing throws**                                     | `en_US` from a Java backend and an unknown currency code both make an `Intl` constructor raise a `RangeError` — from inside a cell renderer that is the page, not the cell.                                    |

## Use

```ts
import { createFormatter } from '@fmmenchi/formatting';

const fmt = createFormatter('it-IT', {
  timeZone: 'Europe/Rome',
  currency: 'EUR',
});

fmt.date('2026-01-31T14:05:00Z'); // '31 gen 2026'
fmt.machine('2026-01-31T14:05:00Z', { dateOnly: true }); // '2026-01-31' → <time dateTime>
fmt.currency(1234.5); // '1234,50 €'
fmt.percent(0.15); // '15%'
fmt.parts(); // { decimal: ',', group: '.' }
```

The free functions take a locale per call, for anywhere a bound formatter is awkward:

```ts
import { formatDate, formatCurrency } from '@fmmenchi/formatting';

formatDate(row.createdAt, locale, { style: 'short', timeZone: 'UTC' });
formatCurrency(row.total, row.currency, locale);
```

## Grouping belongs to the language

`useGrouping: true` does not mean "group the thousands"; it means **always**, overriding the
`minimumGroupingDigits` a language declares. CLDR gives Italian 2, so Italian writes `1234` plain and
`12.345` grouped — and a formatter written the obvious way puts a separator in front of an Italian
reader that Italian does not use.

```ts
formatNumber(1234, 'it-IT'); // '1234'  — the language's rule
formatNumber(1234, 'it-IT', { grouping: 'always' }); // '1.234' — overrides it
formatNumber(1234, 'it-IT', { grouping: 'never' }); // '1234'  — for an identifier
```

## Missing values

Absence — `null`, `undefined`, `''`, an unparseable date, `NaN` — formats as an **empty string**, not
a dash and not "n/a". What a missing value should look like is a decision about the screen it is on,
and only that layer can take it.

## In React

`@fmmenchi/ui` binds the locale from its provider and adds the elements that carry the
machine-readable half — `Time` (`<time dateTime>`) and `Numeric` (`<data value>`):

```tsx
import { useFormatter, Time, Numeric } from '@fmmenchi/ui';

<Time value={order.placedAt} />;
<Numeric value={order.total} format="currency" currency="EUR" />;
```

A `Table` column asks for it by name, and the alignment follows from what the value is:

```tsx
{ key: 'placedAt', header: 'Placed', format: { kind: 'date' } }
{ key: 'total', header: 'Total', format: { kind: 'currency', currency: 'EUR' } }
```

## Reference

| Export                                             | Purpose                                                                                              |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `createFormatter`                                  | Bind a locale + the app's `timeZone` / `currency`; returns every function below with those answered. |
| `formatDate` · `formatDateTime` · `formatTime`     | Dates and clocks, in `Intl`'s own styles.                                                            |
| `toMachineDate`                                    | The ISO form for `<time dateTime>` — date-only derived in the zone, never by slicing.                |
| `toDate`                                           | One owner for the parse: `Date`, timestamp or ISO string → `Date \| null`.                           |
| `formatNumber` · `formatInteger` · `formatPercent` | Numbers, with grouping left to the language.                                                         |
| `formatCurrency` · `formatMoney`                   | An amount in a stated currency, or one that carries its own.                                         |
| `numericParts` · `currencyParts`                   | The locale's separators, and which side its symbol sits on.                                          |
| `clearFormatCache`                                 | Forget the cached formatters — for a test that measures them.                                        |

## Boundaries

- **Framework-agnostic** — no React, no DOM. The hooks and the elements live in `@fmmenchi/ui`.
- **Isomorphic** — the same string on a screen, in an export and in a PDF.
- **Not `l10n`** — it holds no catalogs and translates nothing; DS copy stays in `@fmmenchi/ui`, app
  copy stays in the app.
- **Deferred, not rejected** — relative time, lists and plurals join when a consumer asks.
