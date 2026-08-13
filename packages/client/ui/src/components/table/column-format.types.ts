import type {
  DateInput,
  DateStyle,
  FormatCurrencyOptions,
  FormatNumberOptions,
  FormatPercentOptions,
} from '@fmmenchi/formatting';

/**
 * How a column's values are written — the answer to the two questions the
 * column type used to refuse a date over.
 *
 * `RenderableKey` excludes dates and says why: _"there is no canonical
 * rendering of a date (which format, whose timezone?). Guessing would be a
 * design system making a product decision."_ That is still true, and this is
 * not the design system guessing — it is the COLUMN answering, in the one place
 * where a caller writes the answer once instead of on every row.
 *
 * WHAT COMES WITH IT IS THE POINT. A `format` is not only "call the formatter":
 * it settles the alignment and the digit figures too, because those follow from
 * what the value IS. Numbers align to the end and want tabular figures so the
 * digits stack; text does not. Today a caller writes `align: 'end'` beside
 * every numeric column and remembers the figures never — which is one decision
 * copied N times, the thing this component's own column list exists to stop.
 */
export type ColumnFormat =
  | ColumnDateFormat
  | ColumnNumberFormat
  | ColumnCurrencyFormat
  | ColumnPercentFormat;

interface ColumnDateFormat {
  kind: 'date' | 'dateTime' | 'time';
  /** `Intl`'s four. @default 'medium' */
  dateStyle?: DateStyle;
  /** @default 'short' */
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
  /** Left out, the app's zone from `UiProvider`. */
  timeZone?: string;
}

interface ColumnNumberFormat {
  kind: 'number' | 'integer';
  grouping?: FormatNumberOptions['grouping'];
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

interface ColumnCurrencyFormat {
  kind: 'currency';
  /**
   * Left out, the app's currency from `UiProvider` — and with neither, the cell
   * is empty, because an amount in a guessed currency is a different number.
   */
  currency?: string;
  display?: FormatCurrencyOptions['display'];
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

interface ColumnPercentFormat {
  kind: 'percent';
  /** `0.15` → 15% (`ratio`, the default) or `15` → 15% (`units`). */
  scale?: FormatPercentOptions['scale'];
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/** What a formatted column may point at, by kind. */
export type FormattableValue = DateInput | number | null | undefined;

/**
 * The keys a `format` makes renderable — which is the whole reason it exists.
 *
 * A `Date` column is the most common column there is and `RenderableKey`
 * excludes it, correctly, because React cannot render one. With a `format` the
 * column has said how, so the key is admitted: `Date`, a timestamp, an ISO
 * string, a number.
 */
export type FormattableKey<T> = Extract<
  {
    [K in keyof T]: NonNullable<T[K]> extends Date | number | string
      ? K
      : never;
  }[keyof T],
  string
>;
