/**
 * A date on a calendar: no time, no timezone, no instant.
 *
 * This is NOT a `Date`. A `Date` is a point on a timeline, and giving one to a
 * birthday or a due date attaches a timezone the date never had — measured, in
 * `America/Lima` (UTC-5), the browser's own `valueAsDate` for `2026-08-12`
 * answers **11 August** to every local question a consumer asks it, and so does
 * `new Date('2026-08-12')`. Every timezone west of Greenwich has that bug.
 *
 * `month` is 1–12 and `day` is 1–31, as a human writes them and as ISO 8601
 * writes them — not `Date`'s 0-based month, which is the other classic defect.
 */
export interface CivilDate {
  readonly year: number;
  /** 1–12. January is 1. */
  readonly month: number;
  /** 1–31, and never past the end of its month. */
  readonly day: number;
}

/**
 * The canonical text form, `YYYY-MM-DD` — what `<input type="date">` holds, what
 * a database stores, and what `Temporal.PlainDate.from()` will parse when it
 * arrives. Kept as `string` on purpose: a template-literal type would refuse the
 * `string` a fetch response hands you, and the safety belongs at the parse, not
 * at the assignment.
 */
export type IsoDate = string;

/**
 * TWO DAYS, OR ONE, OR NEITHER — a range as it exists while it is being chosen.
 *
 * Both ends are nullable and that is the shape rather than a convenience. A
 * range is picked in two gestures, so between them there IS a start and there
 * is no end, and a model that could not say so would have to invent one — an
 * end equal to the start reads as a one-day stay, which is a different answer
 * from "not finished".
 *
 * `end` is never before `start` once both are set: a click earlier than the
 * start REWINDS, making it the new start and clearing the end (ADR-0027). So
 * an inverted pair is not a state a consumer has to handle, and the type does
 * not pretend it is.
 */
export interface CivilRange {
  readonly start: CivilDate | null;
  readonly end: CivilDate | null;
}
