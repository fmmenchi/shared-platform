# @fmmenchi/formatting

Locale-aware formatting of **dates, numbers and money** — one answer per value, shared by the client
and the server. Framework-agnostic, isomorphic, **no dependencies** beyond `Intl`.

```bash
pnpm add @fmmenchi/formatting
```

## Why

An invoice PDF that says `01/02/2026` beside a screen that says `02/01/2026` is one bug with two
owners. The only way to have one owner is for both sides to call the same function — which the server
cannot do if the function ships with React attached.

Over calling `Intl` inline, it adds the four things a call site gets wrong on its own:

- **The formatters are cached**, and the cache is capped — a thousand rows with three formatted
  columns construct three thousand formatters per render otherwise, and on a server the locale comes
  from `Accept-Language`.
- **Zero is a number.** `value ? format(value) : ''` renders a balance of zero as an empty cell,
  which a reader takes for missing data.
- **The zone is stated.** `2026-01-01T00:00:00Z` is the 1st of January in Rome and the 31st of
  December in Lima.
- **Nothing throws.** `en_US` from a Java backend and an unknown currency code both make an `Intl`
  constructor raise a `RangeError`.

## Use

```ts
import { createFormatter } from '@fmmenchi/formatting';

const fmt = createFormatter('it-IT', {
  timeZone: 'Europe/Rome',
  currency: 'EUR',
});

fmt.date('2026-01-31T14:05:00Z'); // '31 gen 2026'
fmt.dateTime('2026-01-31T14:05:00Z'); // '31 gen 2026, 15:05'
fmt.machine('2026-01-31T14:05:00Z', { dateOnly: true }); // '2026-01-31'  → <time dateTime>

fmt.number(12345.5); // '12.345,5'
fmt.currency(1234.5); // '1234,50 €'   (Italian groups from five digits — see below)
fmt.percent(0.15); // '15%'
fmt.money({ amount: 10, currency: 'USD' }); // '10,00 USD'

fmt.parts(); // { decimal: ',', group: '.' }
fmt.currencyParts(); // { representation: '€', position: 'after' }
```

The free functions take a locale per call, for anywhere a bound formatter is awkward:

```ts
import { formatDate, formatCurrency } from '@fmmenchi/formatting';

formatDate(row.createdAt, locale, { style: 'short', timeZone: 'UTC' });
formatCurrency(row.total, row.currency, locale);
```

### Grouping belongs to the language

`useGrouping: true` does not mean "group the thousands"; it means **always**, overriding the
`minimumGroupingDigits` a language declares. CLDR gives Italian 2, so Italian writes `1234` plain and
`12.345` grouped. Hence three named states:

```ts
formatNumber(1234, 'it-IT'); // '1234'   — the language's rule
formatNumber(1234, 'it-IT', { grouping: 'always' }); // '1.234'  — overrides it
formatNumber(1234, 'it-IT', { grouping: 'never' }); // '1234'   — for an identifier
```

### Percentages

`0.15` is fifteen percent (`scale: 'ratio'`, the default, and what `Intl` does). A column literally
headed "%" holds `15`, and says so:

```ts
formatPercent(15, locale, { scale: 'units' }); // '15%'
```

### Missing values

Absence — `null`, `undefined`, `''`, an unparseable date, `NaN` — formats as an **empty string**.
What a missing value should look like is a decision about the screen it is on, and only that layer
can take it.

## In React

`@fmmenchi/ui` binds the locale from its provider and adds the elements that carry the
machine-readable half:

```tsx
import { useFormatter, Time, Numeric } from '@fmmenchi/ui';

const fmt = useFormatter();

<Time value={order.placedAt} />; // <time dateTime="2026-01-31">
<Numeric value={order.total} format="currency" currency="EUR" />; // <data value="1234.5">
```

A `Table` column asks for it by name, and the alignment follows:

```tsx
{ key: 'placedAt', header: 'Placed', format: { kind: 'date' } }
{ key: 'total', header: 'Total', format: { kind: 'currency', currency: 'EUR' } }
```

## Decisions

- [ADR-0026 — Formatting values is a shared layer, and the design system only binds it](../../../apps/docusaurus/docs/adr/0026-formatting-is-a-shared-layer.md)
- [ADR-0008 — Cross-app, framework-agnostic layers](../../../apps/docusaurus/docs/adr/0008-cross-app-framework-agnostic-layers.md)
