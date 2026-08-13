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
