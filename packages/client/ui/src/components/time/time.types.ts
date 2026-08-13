import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { DateInput, DateStyle } from '@fmmenchi/formatting';

interface TimeOwnProps {
  /**
   * The instant. A `Date`, a timestamp, or the ISO string an API actually
   * delivers — one type, so a cell can pass whatever the endpoint sent.
   */
  value: DateInput | null | undefined;
  /**
   * How much of the instant to show.
   *
   * @default 'date'
   */
  format?: 'date' | 'dateTime' | 'time';
  /**
   * How much of the DATE. `Intl`'s own four, not a private table.
   *
   * @default 'medium'
   */
  dateStyle?: DateStyle;
  /**
   * How much of the CLOCK, when `format` shows one.
   *
   * @default 'short'
   */
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
  /**
   * The zone the instant is read in. Left out, the app's answer from
   * `UiProvider`'s `formatting` slice; left out there too, the runtime's.
   */
  timeZone?: string;
  /**
   * What to render when there is no instant — and NOTHING by default.
   *
   * A `<time>` with no date and no words is an element that states nothing,
   * which is the one thing this component exists to avoid. What a missing value
   * should look like is a decision about the screen it is on: a dash in a
   * table, an empty space in a card, "never" in a column of last-seen dates.
   * The formatter refuses to take that decision and so does this.
   */
  fallback?: ReactNode;
  /** Not accepted: the content IS the value. See the component. */
  children?: never;
}

export type TimeProps = TimeOwnProps &
  Omit<ComponentPropsWithRef<'time'>, keyof TimeOwnProps | 'dateTime'>;
