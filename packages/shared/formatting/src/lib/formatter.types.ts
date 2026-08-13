import type {
  FormatDateOptions,
  FormatDateTimeOptions,
  FormatTimeOptions,
  ToMachineDateOptions,
} from './dates.types.js';
import type {
  CurrencyParts,
  FormatCurrencyOptions,
  FormatNumberOptions,
  FormatPercentOptions,
  NumericParts,
} from './numbers.types.js';
import type { DateInput, Money } from './values.types.js';

/**
 * What an app decides ONCE, so that no call site decides it differently.
 *
 * These are the two questions the free functions leave open on every call, and
 * leaving them open on every call is how a codebase ends up with three answers:
 * which zone an instant is read in, and which currency an amount is in when the
 * data does not carry one.
 */
export interface FormatterDefaults {
  /**
   * The zone every date is read in unless a call says otherwise.
   *
   * Left out, the runtime's zone answers — which is right for a browser and is
   * a coin toss on a server, where it is whatever the container was started
   * with. An app that shows one company's calendar states it here.
   */
  timeZone?: string;
  /**
   * The currency `currency()` falls back to when a CALL names none.
   *
   * Not `money()`, which the first version of this line claimed: a `Money`
   * carries a required currency, so there is nothing there to fall back from,
   * and the code never read this for it. An app that set this expecting
   * `money()` to use it was following the documentation into a no-op.
   *
   * There is no default default: an amount rendered in the wrong currency is
   * not a formatting mistake, it is a different number, so the fallback is
   * something an app states or does not have.
   */
  currency?: string;
}

/**
 * The same functions with the locale already answered.
 *
 * The free functions take a locale per call, because a pure module cannot know
 * one. Nobody wants to write it per call, and every place that forgets it is a
 * value formatted in the runtime's locale sitting in a page written in the
 * reader's — so the binding exists, and the design system hands one out from
 * the locale its provider already holds.
 */
export interface Formatter {
  /** The locale this one was bound to, canonicalised. */
  readonly locale: string | undefined;
  /** The defaults it was bound with. */
  readonly defaults: FormatterDefaults;

  date: (
    value: DateInput | null | undefined,
    options?: FormatDateOptions,
  ) => string;
  dateTime: (
    value: DateInput | null | undefined,
    options?: FormatDateTimeOptions,
  ) => string;
  time: (
    value: DateInput | null | undefined,
    options?: FormatTimeOptions,
  ) => string;
  /** The ISO form for `<time dateTime>`. Never localised — see `toMachineDate`. */
  machine: (
    value: DateInput | null | undefined,
    options?: ToMachineDateOptions,
  ) => string;

  number: (
    value: number | null | undefined,
    options?: FormatNumberOptions,
  ) => string;
  integer: (
    value: number | null | undefined,
    options?: Pick<FormatNumberOptions, 'grouping'>,
  ) => string;
  percent: (
    value: number | null | undefined,
    options?: FormatPercentOptions,
  ) => string;
  /** An amount in a stated currency, or in `defaults.currency`. */
  currency: (
    value: number | null | undefined,
    currency?: string,
    options?: FormatCurrencyOptions,
  ) => string;
  /** An amount that carries its own currency. */
  money: (
    money: Money | null | undefined,
    options?: FormatCurrencyOptions,
  ) => string;

  parts: () => NumericParts;
  currencyParts: (
    currency?: string,
    display?: FormatCurrencyOptions['display'],
  ) => CurrencyParts;
}

/**
 * The kinds of value this package knows how to write.
 *
 * A NAME FOR THE SHAPE, so a column, a cell or a config file can say what it
 * holds in one word and get the whole treatment — the format, and everything
 * that follows from it. What follows is not this package's business:
 * alignment and tabular figures are decisions about a page, and they belong to
 * whoever draws one. The taxonomy is shared so that both sides agree on the
 * words.
 */
export type FormatKind =
  'date' | 'dateTime' | 'time' | 'number' | 'integer' | 'currency' | 'percent';
