/** Digits, on both ends. Passed straight to `Intl.NumberFormat`. */
export interface FractionOptions {
  /** @default 0 */
  minimumFractionDigits?: number;
  /**
   * `Intl`'s own default for a plain decimal is 3, which silently rounds a
   * fourth digit away.
   *
   * @default 3
   */
  maximumFractionDigits?: number;
}

export interface FormatNumberOptions extends FractionOptions {
  /**
   * Thousands separators — in the platform's vocabulary, and NOT as a boolean.
   *
   * `auto` is the locale's own rule, and the locale has one: CLDR gives Italian
   * a `minimumGroupingDigits` of 2, so Italian writes `1234` ungrouped and
   * `12.345` grouped. Measured — `useGrouping: true` turns that off and
   * produces `1.234,50 €`, which is a separator an Italian reader is not
   * supposed to see, and which is exactly what a formatter written as
   * `useGrouping: true` emits. That is the whole reason this is three named
   * states instead of a boolean: `true` reads like "yes, group" and means
   * "always, overriding the language".
   *
   * `never` is for a value that is an IDENTIFIER wearing a number's clothes —
   * a year, an order number, a postcode — where `2.026` is simply wrong.
   *
   * The three states are `Intl`'s own, typed since ES2023 — which is why the
   * workspace compiles against that lib rather than declaring the option here.
   *
   * @default 'auto'
   */
  grouping?: 'auto' | 'always' | 'never';
}

export interface FormatCurrencyOptions extends FractionOptions {
  /**
   * `symbol` gives `1.234,50 €`, `code` gives `EUR 1.234,50`, `name` gives
   * `1.234,50 euro`.
   *
   * @default 'symbol'
   */
  display?: 'symbol' | 'narrowSymbol' | 'code' | 'name';
  /**
   * Left out, the currency decides — and it is right to: `JPY` has no minor
   * unit and `EUR` has two, which `Intl` already knows and a hand-written `2`
   * does not.
   */
  minimumFractionDigits?: number;
  /** See above — left out, the currency decides. */
  maximumFractionDigits?: number;
}

export interface FormatPercentOptions extends FractionOptions {
  /**
   * What the number MEANS.
   *
   * `ratio` (the default) reads `0.15` as fifteen percent, which is what
   * `Intl.NumberFormat` does and what a computed proportion is. `units` reads
   * `15` as fifteen percent, which is what a column literally headed "%" holds.
   * Getting this wrong is a factor of a hundred, in either direction, and it is
   * invisible in review — so it is a named parameter rather than a convention.
   *
   * @default 'ratio'
   */
  scale?: 'ratio' | 'units';
}

/** Where a locale puts the pieces of a number. See `numericParts`. */
export interface NumericParts {
  /** `,` in Italian, `.` in English. */
  decimal: string;
  /** `.` in Italian, `,` in English — and a narrow no-break space in French. */
  group: string;
}

/** Where a locale puts the pieces of an amount. See `currencyParts`. */
export interface CurrencyParts {
  /** The symbol or code as this locale writes it: `€`, `$`, `CHF`. */
  representation: string;
  /** Which side of the number it goes. */
  position: 'before' | 'after';
}
