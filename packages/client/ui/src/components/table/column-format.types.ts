import type {
  DateStyle,
  FormatCurrencyOptions,
  FormatKind,
  FormatNumberOptions,
  FormatPercentOptions,
  TimeStyle,
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
 * it settles the ALIGNMENT too, because that follows from what the value IS.
 * Numbers align to the end; text does not. Today a caller writes
 * `align: 'end'` beside every numeric column — one decision copied N times,
 * the thing this component's own column list exists to stop.
 *
 * It does NOT settle the digit figures, which an earlier version of this
 * paragraph claimed while `format-cell.tsx` said the opposite in the same
 * commit: `.table` already sets `font-variant-numeric: tabular-nums` on
 * itself, so every cell in every table has them and this would be a second
 * owner for a fact that already has one.
 */
export type ColumnFormat = ColumnDateKindFormat | ColumnNumberKindFormat;

/**
 * THE KINDS ARE THE SHARED ONES, not a second list of the same words.
 * `FormatKind` is `@fmmenchi/formatting`'s taxonomy and says it exists "so a
 * column can say what it holds in one word" — and the first version of this
 * file then wrote the seven literals out again, which is two owners for one
 * vocabulary and the exact thing the taxonomy was shared to prevent.
 */
type NumberKind = Extract<FormatKind, 'number' | 'integer'>;

/** Common to every date kind. */
interface ColumnZoned {
  /** Left out, the app's zone from `UiProvider`. */
  timeZone?: string;
}

/**
 * A DATE KIND ONLY TAKES THE STYLE IT USES.
 *
 * One interface for all three let `{ kind: 'date', timeStyle: 'long' }` and
 * `{ kind: 'time', dateStyle: 'full' }` compile, and the cell then dropped the
 * irrelevant one in silence — a configuration that reads as if it did
 * something.
 */
type ColumnDateKindFormat =
  | (ColumnZoned & {
      kind: Extract<FormatKind, 'date'>;
      /** `Intl`'s four. @default 'medium' */
      dateStyle?: DateStyle;
      timeStyle?: never;
    })
  | (ColumnZoned & {
      kind: Extract<FormatKind, 'time'>;
      /** @default 'short' */
      timeStyle?: TimeStyle;
      dateStyle?: never;
    })
  | (ColumnZoned & {
      kind: Extract<FormatKind, 'dateTime'>;
      /** @default 'medium' */
      dateStyle?: DateStyle;
      /** @default 'short' */
      timeStyle?: TimeStyle;
    });

type ColumnNumberKindFormat =
  ColumnNumberFormat | ColumnCurrencyFormat | ColumnPercentFormat;

interface ColumnNumberFormat {
  kind: NumberKind;
  grouping?: FormatNumberOptions['grouping'];
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

interface ColumnCurrencyFormat {
  kind: Extract<FormatKind, 'currency'>;
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
  kind: Extract<FormatKind, 'percent'>;
  /** `0.15` → 15% (`ratio`, the default) or `15` → 15% (`units`). */
  scale?: FormatPercentOptions['scale'];
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * The keys a `format` makes renderable — which is the whole reason it exists,
 * AND ONLY THE ONES THAT KIND CAN READ.
 *
 * A `Date` column is the most common column there is and `RenderableKey`
 * excludes it, correctly, because React cannot render one. With a `format` the
 * column has said how, so the key is admitted.
 *
 * SPLIT BY KIND, because one shared constraint admitted the pairings the whole
 * arm exists to prevent: `{ key: 'name' /* string *\/, format: { kind:
 * 'currency' } }` typechecked, and measured, `Intl` wrote **`€NaN`** into the
 * cell — while a `Date` with a number format wrote its timestamp as a
 * plausible-looking amount. A type that admits the failure it was introduced
 * to stop is worse than no type, because it reads as a guarantee.
 */
export type DateKey<T> = Extract<
  {
    [K in keyof T]: NonNullable<T[K]> extends Date | number | string
      ? K
      : never;
  }[keyof T],
  string
>;

/** A number, and nothing that merely looks like one. */
export type NumberKey<T> = Extract<
  {
    [K in keyof T]: NonNullable<T[K]> extends number ? K : never;
  }[keyof T],
  string
>;

export type { ColumnDateKindFormat, ColumnNumberKindFormat };
