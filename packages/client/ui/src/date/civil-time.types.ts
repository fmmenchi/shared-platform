/**
 * A time on a clock: no date, no timezone, no instant.
 *
 * This is NOT a `Date`, for the reason `CivilDate` is not one and one more.
 * "09:00" is a time a shop opens; it is not a point on any timeline until a day
 * and a zone are attached, and attaching them silently is how a 9am opening
 * becomes 8am for half the world.
 *
 * THE HOUR IS ALWAYS 0–23, whatever the reader's clock shows. Twelve-hour
 * presentation is a fact about a locale, not about a time — the same split
 * `CivilDate` makes by storing months 1–12 while the field may write them
 * anywhere in the string. A model that stored `{ hour: 2, period: 'PM' }` would
 * push that presentation into every comparison and every sort.
 */
export interface CivilTime {
  /** 0–23. Midnight is 0. */
  readonly hour: number;
  /** 0–59. */
  readonly minute: number;
  /**
   * 0–59, and absent rather than zero when the field does not carry seconds.
   *
   * The distinction is load-bearing: `09:00` and `09:00:00` are the same
   * instant and different ANSWERS — one was given to the minute and the other
   * to the second — and a field that stored a zero could not tell a consumer
   * which it had been asked for.
   */
  readonly second?: number;
}

/**
 * The canonical text form, `HH:mm` or `HH:mm:ss` — what `<input type="time">`
 * holds, what a database stores, and what `Temporal.PlainTime.from()` will
 * parse when it arrives.
 *
 * Kept as `string` for the same reason `IsoDate` is: a template-literal type
 * would refuse the `string` a fetch response hands you, and the safety belongs
 * at the parse rather than at the assignment.
 */
export type IsoTime = string;

/** Whether a field carries seconds. Says the one thing it needs to be told. */
export type TimePrecision = 'minute' | 'second';

/**
 * THE FOUR CYCLES A CLOCK CAN BE READ IN, because `Intl` reports four and a
 * field that handled two would be wrong in the other two rather than merely
 * incomplete.
 *
 * Measured, forcing each cycle on a locale that has it:
 *
 * | cycle | midnight | noon  | 23:05 | reads    |
 * | ----- | -------- | ----- | ----- | -------- |
 * | h11   | 00 AM    | 00 PM | 11 PM | 0–11     |
 * | h12   | 12 AM    | 12 PM | 11 PM | 1–12     |
 * | h23   | 00       | 12    | 23    | 0–23     |
 * | h24   | 24       | 12    | 23    | 1–24     |
 *
 * `h11` is the one that surprises: it is Japanese's, and it writes midnight and
 * noon BOTH as `00`, distinguished only by 午前/午後. A field that assumed
 * `h12`'s `12` there would show a time nobody in that locale writes.
 */
export type HourCycle = 'h11' | 'h12' | 'h23' | 'h24';
