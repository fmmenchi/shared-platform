import { getNumberFormat } from './intl-cache.js';
import type {
  CurrencyParts,
  FormatCurrencyOptions,
  FormatNumberOptions,
  FormatPercentOptions,
  NumericParts,
} from './numbers.types.js';
import type { Money } from './values.types.js';

/**
 * Numbers and money, written the way the reader's locale writes them.
 *
 * PURE AND ISOMORPHIC, for the reason the dates are: an export that says
 * `1,234.50` beside a screen that says `1.234,50` is one bug with two owners.
 *
 * ZERO IS A NUMBER. Every hand-rolled formatter this replaces guards with
 * `value ? format(value) : ''`, and that guard is a defect with a very quiet
 * failure: a balance of zero, a count of zero and a delta of zero all render as
 * an empty cell, which a reader takes for missing data rather than for the
 * answer. The guard here is on ABSENCE — `null`, `undefined`, `NaN` — and
 * `NaN` is included because arithmetic produces it and `Intl` prints it as
 * "NaN", a string that reaches the screen and looks like a value.
 */

/**
 * The locale's own grouping rule unless told otherwise.
 *
 * `auto` is what `Intl` does when the option is absent, and it is not the same
 * as `true`: `true` means ALWAYS, which overrides the `minimumGroupingDigits`
 * the language declares. See `FormatNumberOptions.grouping`.
 */
function grouping(
  choice: 'auto' | 'always' | 'never' | undefined,
): 'auto' | 'always' | false {
  return choice === 'never' ? false : choice === 'always' ? 'always' : 'auto';
}

/**
 * A digit option `Intl` will accept, or nothing.
 *
 * NaN IS AS DANGEROUS IN THE OPTION AS IN THE VALUE, and only the value was
 * guarded. Measured, each of these threw a `RangeError` from inside the
 * render: `maximumFractionDigits: 101`, `minimumFractionDigits: -1`, and
 * `maximumFractionDigits: NaN` — the last one arriving from exactly the place
 * the guarded value does, a column config doing `Number(column.precision)` on
 * something that was not a number.
 *
 * Out of range is CLAMPED rather than dropped, because a caller who asked for
 * 101 digits wants as many as there are; not-a-number is dropped, because
 * there is no number in it to honour.
 */
function digits(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.min(Math.max(Math.trunc(value), 0), 100);
}

/**
 * The two, in the order `Intl` insists on.
 *
 * A maximum below a minimum is a `RangeError`, and the pair arrives from a
 * config as often as from a call — so the maximum is raised to meet the
 * minimum, which is what the caller asking for four decimals meant.
 */
function fractionDigits(
  min: number | undefined,
  max: number | undefined,
  fallbackMax?: number,
): { minimumFractionDigits?: number; maximumFractionDigits?: number } {
  const low = digits(min);
  const high = digits(max) ?? fallbackMax;
  return {
    minimumFractionDigits: low,
    maximumFractionDigits:
      high === undefined ? undefined : Math.max(high, low ?? 0),
  };
}

/**
 * MINUS ZERO IS NOT A NUMBER A READER MEANS.
 *
 * `Intl`'s default sign display writes `-0` for anything that rounds to zero
 * from below: measured, `formatNumber(-0)` → `"-0"`, `formatInteger(-0.2)` →
 * `"-0"`, `formatCurrency(-0.001, 'USD')` → `"-$0.00"`. A ledger delta reading
 * minus nothing is the mirror of the empty-cell defect this file was written
 * to kill — a value that says something the arithmetic does not.
 *
 * `signDisplay: 'negative'` shows the sign for negative numbers and not for
 * negative zero, which is the distinction wanted and is the only one of the
 * four modes that draws it.
 */
const SIGN = { signDisplay: 'negative' } as const;

/** Is there a number here at all? */
function isMissing(
  value: number | null | undefined,
): value is null | undefined {
  // TYPE-CHECKED, not only NaN-checked. `Number.isNaN` does not coerce, so a
  // STRING sailed straight through this guard and `Intl` wrote `€NaN` —
  // measured, from a table column that typechecked. "NaN reaching the screen
  // and looking like a value" is the thing this file's header says it exists
  // to prevent, and a string is the commonest way to get there.
  return typeof value !== 'number' || Number.isNaN(value);
}

/** A plain number: `1.234,568`. */
export function formatNumber(
  value: number | null | undefined,
  locale?: string,
  options: FormatNumberOptions = {},
): string {
  if (isMissing(value)) return '';
  return getNumberFormat(locale, {
    ...SIGN,
    style: 'decimal',
    useGrouping: grouping(options.grouping),
    ...fractionDigits(
      options.minimumFractionDigits ?? 0,
      options.maximumFractionDigits,
      3,
    ),
  }).format(value);
}

/**
 * A whole number: `1.235`.
 *
 * ROUNDS RATHER THAN TRUNCATES, which is `Intl`'s behaviour and worth stating
 * because the alternative — `Math.trunc` then format — is what a call site
 * writes by hand and disagrees with every total computed the other way.
 */
export function formatInteger(
  value: number | null | undefined,
  locale?: string,
  options: Pick<FormatNumberOptions, 'grouping'> = {},
): string {
  if (isMissing(value)) return '';
  return getNumberFormat(locale, {
    ...SIGN,
    style: 'decimal',
    useGrouping: grouping(options.grouping),
    maximumFractionDigits: 0,
  }).format(value);
}

/** An amount in a stated currency: `1.234,50 €`. */
export function formatCurrency(
  value: number | null | undefined,
  currency: string,
  locale?: string,
  options: FormatCurrencyOptions = {},
): string {
  if (isMissing(value)) return '';
  try {
    return getNumberFormat(locale, {
      ...SIGN,
      style: 'currency',
      currency,
      currencyDisplay: options.display ?? 'symbol',
      // CLAMPED HERE TOO, and it was not: the contradictory pair threw inside
      // the `try` and landed in the catch below, which then wrote a VALID
      // currency as if its code were unknown — measured, `{min: 4, max: 2}`
      // with `USD` produced `1.2346 USD` and no `$`. A guard that disguises
      // one fault as another is worse than none.
      ...fractionDigits(
        options.minimumFractionDigits,
        options.maximumFractionDigits,
      ),
    }).format(value);
  } catch {
    // THE CONSTRUCTOR THROWS ON A MALFORMED CODE — one that is not three ASCII
    // letters — with a `RangeError`, from inside a cell renderer, which is the
    // page rather than the cell. It does NOT throw on a code it merely does
    // not recognise: measured, `ZZZ` and `XBT` are accepted and printed as
    // written, so an unknown-but-well-formed code needs no rescuing. The
    // number is the part the reader needs, so it survives and the code rides
    // along visibly.
    const amount = formatNumber(value, locale, {
      minimumFractionDigits: options.minimumFractionDigits ?? 2,
      maximumFractionDigits: options.maximumFractionDigits ?? 2,
    });
    return `${amount} ${currency}`;
  }
}

/**
 * An amount that carries its own currency.
 *
 * THE PAIR TRAVELS TOGETHER, because a row in a mixed-currency table has an
 * amount whose currency is a property of the row and not of the column — and
 * an amount formatted in the wrong currency is not a formatting mistake, it is
 * a different number.
 */
export function formatMoney(
  money: Money | null | undefined,
  locale?: string,
  options: FormatCurrencyOptions = {},
): string {
  if (money == null) return '';
  return formatCurrency(money.amount, money.currency, locale, options);
}

/** A proportion: `15%`. Read `scale` before using this. */
export function formatPercent(
  value: number | null | undefined,
  locale?: string,
  options: FormatPercentOptions = {},
): string {
  if (isMissing(value)) return '';
  const ratio = (options.scale ?? 'ratio') === 'ratio' ? value : value / 100;
  return getNumberFormat(locale, {
    ...SIGN,
    style: 'percent',
    ...fractionDigits(
      options.minimumFractionDigits ?? 0,
      options.maximumFractionDigits,
      0,
    ),
  }).format(ratio);
}

/**
 * The separators this locale uses, read out of a formatted number.
 *
 * NOT A TABLE OF LOCALES, which is the other way to answer this and the way
 * that goes stale: `formatToParts` asks the runtime, so a locale nobody
 * anticipated still answers, and French's narrow no-break space group
 * separator arrives as the character the browser actually emits rather than as
 * the ordinary space somebody assumed.
 *
 * A NUMERIC INPUT NEEDS THIS, and needs MORE than this outside Latin digits —
 * which is the honest scope of what it returns. Measured: `ar-EG` writes
 * 1234567.5 as `١٬٢٣٤٬٥٦٧٫٥` and `en-IN` as `12,34,567.5`, so a parser built on
 * the separators alone still meets digits it cannot read (`١٢٣`) and grouping
 * positions it did not expect (lakh, not thousands). This answers "which
 * separators was the reader shown", not "how do I parse their locale". The
 * value with no group separator at all — some locales have none — is an empty
 * string rather than a guess.
 */
export function numericParts(locale?: string): NumericParts {
  // Big enough to force a group, fractional enough to force a decimal.
  const parts = getNumberFormat(locale, {
    style: 'decimal',
    useGrouping: true,
    minimumFractionDigits: 1,
  }).formatToParts(10000.1);

  return {
    decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.',
    group: parts.find((part) => part.type === 'group')?.value ?? '',
  };
}

/**
 * How this locale writes this currency, and on which side.
 *
 * The SIDE is the part a design system needs: a column of amounts aligns on
 * the number, and a symbol that leads in one locale and trails in another
 * cannot be positioned by a stylesheet that assumes either.
 *
 * The index is checked. `findIndex` returning `-1` and then reading
 * `parts[-1].value` throws, and a formatter that throws inside a cell renderer
 * takes the page down over a currency code nobody validated.
 */
export function currencyParts(
  currency: string,
  locale?: string,
  display: FormatCurrencyOptions['display'] = 'symbol',
): CurrencyParts {
  let parts: Intl.NumberFormatPart[];
  try {
    parts = getNumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: display,
    }).formatToParts(1);
  } catch {
    // Same malformed code, same refusal to take the page down.
    return { representation: currency, position: 'before' };
  }

  const at = parts.findIndex((part) => part.type === 'currency');
  if (at === -1) return { representation: currency, position: 'before' };

  const numberAt = parts.findIndex(
    (part) => part.type === 'integer' || part.type === 'decimal',
  );
  return {
    representation: parts[at]?.value ?? currency,
    position: numberAt === -1 || at < numberAt ? 'before' : 'after',
  };
}
