import type { ComponentPropsWithRef, ReactNode } from 'react';
import type {
  FormatCurrencyOptions,
  FormatNumberOptions,
  FormatPercentOptions,
} from '@fmmenchi/formatting';

interface NumericOwnProps {
  /** The number. `null`, `undefined` and `NaN` all mean "there isn't one". */
  value: number | null | undefined;
  /**
   * What the number IS, which decides how it is written.
   *
   * @default 'number'
   */
  format?: 'number' | 'integer' | 'currency' | 'percent';
  /**
   * ISO-4217 code for `currency`. Left out, the app's answer from
   * `UiProvider`'s `formatting` slice — and with neither, nothing is rendered,
   * because an amount in a guessed currency is not a formatting mistake, it is
   * a different number.
   */
  currency?: string;
  /**
   * Whether `value` is a ratio (`0.15` → 15%) or already in units (`15` → 15%).
   * The difference is a factor of a hundred and is invisible in review.
   *
   * @default 'ratio'
   */
  scale?: FormatPercentOptions['scale'];
  /** Thousands separators: the locale's own rule, always, or never. */
  grouping?: FormatNumberOptions['grouping'];
  /** Digits after the separator. Left out, the format decides. */
  minimumFractionDigits?: number;
  /** Digits after the separator. Left out, the format decides. */
  maximumFractionDigits?: number;
  /** `symbol`, `code` or `name`, for `currency`. */
  currencyDisplay?: FormatCurrencyOptions['display'];
  /**
   * What to render when there is no number — nothing by default, for the reason
   * `Time.fallback` gives.
   */
  fallback?: ReactNode;
  /** Not accepted: the content IS the value. See the component. */
  children?: never;
}

export type NumericProps = NumericOwnProps &
  Omit<ComponentPropsWithRef<'data'>, keyof NumericOwnProps | 'value'>;
