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

/** Is there a number here at all? */
function isMissing(
  value: number | null | undefined,
): value is null | undefined {
  return value === null || value === undefined || Number.isNaN(value);
}

/** A plain number: `1.234,568`. */
export function formatNumber(
  value: number | null | undefined,
  locale?: string,
  options: FormatNumberOptions = {},
): string {
  if (isMissing(value)) return '';
  return getNumberFormat(locale, {
    style: 'decimal',
    useGrouping: grouping(options.grouping),
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: Math.max(
      options.maximumFractionDigits ?? 3,
      options.minimumFractionDigits ?? 0,
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
      style: 'currency',
      currency,
      currencyDisplay: options.display ?? 'symbol',
      minimumFractionDigits: options.minimumFractionDigits,
      maximumFractionDigits: options.maximumFractionDigits,
    }).format(value);
  } catch {
    // THE CONSTRUCTOR THROWS ON A CODE IT DOES NOT KNOW — a `RangeError`, from
    // inside a cell renderer, which is the page rather than the cell. The
    // number is the part the reader needs, so it survives and the unknown code
    // rides along visibly: hiding the row behind an empty string would turn a
    // bad code in the DATA into a hole on the screen that nobody can trace.
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
    style: 'percent',
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: Math.max(
      options.maximumFractionDigits ?? 0,
      options.minimumFractionDigits ?? 0,
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
 * A NUMERIC INPUT NEEDS THIS. Parsing what a reader typed means knowing which
 * character they were shown, and the value with no group separator at all —
 * some locales have none — is an empty string rather than a guess.
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
    // Same unknown code, same refusal to take the page down.
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
