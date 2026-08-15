import { compareDays, isSameDay } from './civil-math.js';
import type { CivilDate, CivilRange } from './civil-date.types.js';

/** Nothing chosen. The shape a range starts and ends up as. */
export const EMPTY_RANGE: CivilRange = { start: null, end: null };

/** Both ends chosen — the only state a consumer can act on. */
export function isWholeRange(
  range: CivilRange,
): range is { start: CivilDate; end: CivilDate } {
  return range.start !== null && range.end !== null;
}

/**
 * WHAT A CLICK DOES TO A RANGE, in one place, because it is the whole of the
 * selection model and every part of it was a decision.
 *
 * - Nothing chosen, or both ends chosen → the day becomes a new START, and the
 *   end is cleared. Choosing again after a whole range means starting over,
 *   which is what a second stay is.
 * - A start with no end, and the day is on or after it → the day is the END,
 *   and the range is whole. The same day twice is a one-day range, not an
 *   error: a hotel booking for one night is a real thing to ask for.
 * - A start with no end, and the day is BEFORE it → the day REWINDS the start
 *   (ADR-0027). Refusing is the other option and is worse: the intent is
 *   unambiguous — a range beginning there — and a control that answers a clear
 *   intent with nothing teaches people to distrust it.
 */
export function takeDay(range: CivilRange, day: CivilDate): CivilRange {
  if (range.start === null || range.end !== null) {
    return { start: day, end: null };
  }
  return compareDays(day, range.start) < 0
    ? { start: day, end: null }
    : { start: range.start, end: day };
}

/** Is this day one of the two ends? They are the SELECTION; the middle is not. */
export function isRangeEnd(range: CivilRange, day: CivilDate): boolean {
  return (
    (range.start !== null && isSameDay(range.start, day)) ||
    (range.end !== null && isSameDay(range.end, day))
  );
}

/**
 * Is this day strictly BETWEEN the two ends?
 *
 * Strictly, so the ends are never also "in between": they carry
 * `aria-selected`, the middle carries a fill and no selected state, and a day
 * that claimed both would be announced as chosen when it is only spanned.
 */
export function isInRange(range: CivilRange, day: CivilDate): boolean {
  if (!isWholeRange(range)) return false;
  return compareDays(day, range.start) > 0 && compareDays(day, range.end) < 0;
}
