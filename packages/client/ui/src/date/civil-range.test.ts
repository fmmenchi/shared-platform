import { describe, it, expect } from 'vitest';
import {
  EMPTY_RANGE,
  isInRange,
  isRangeEnd,
  isWholeRange,
  takeDay,
} from './civil-range.js';
import type { CivilRange } from './civil-date.types.js';

const day = (d: number) => ({ year: 2026, month: 8, day: d });

/**
 * THE SELECTION MODEL, tested away from the grid that draws it.
 *
 * Every branch here is a decision ADR-0027 records, and each one has a wrong
 * answer that is easy to write and hard to notice once forty-two cells are on
 * screen distracting from it.
 */
describe('takeDay', () => {
  it('starts a range on the first click', () => {
    expect(takeDay(EMPTY_RANGE, day(12))).toEqual({
      start: day(12),
      end: null,
    });
  });

  it('closes it on the second, when the day is later', () => {
    const started: CivilRange = { start: day(12), end: null };
    expect(takeDay(started, day(20))).toEqual({ start: day(12), end: day(20) });
  });

  it('REWINDS when the second click is earlier, rather than refusing it', () => {
    const started: CivilRange = { start: day(12), end: null };
    // The alternative is to reject the click. The intent is unambiguous — a
    // range beginning there — and a control that answers a clear intent with
    // nothing teaches people to distrust it.
    expect(takeDay(started, day(5))).toEqual({ start: day(5), end: null });
  });

  it('takes the same day twice as a ONE-DAY range, not an error', () => {
    const started: CivilRange = { start: day(12), end: null };
    // A hotel booking for one night is a real thing to ask for.
    expect(takeDay(started, day(12))).toEqual({
      start: day(12),
      end: day(12),
    });
  });

  it('starts over once both ends are set', () => {
    const whole: CivilRange = { start: day(12), end: day(20) };
    expect(takeDay(whole, day(25))).toEqual({ start: day(25), end: null });
  });

  it('starts over even when the new day is inside the old range', () => {
    const whole: CivilRange = { start: day(12), end: day(20) };
    // The tempting alternative — move the nearest end — makes a click's meaning
    // depend on arithmetic the user cannot see.
    expect(takeDay(whole, day(15))).toEqual({ start: day(15), end: null });
  });

  it('crosses a month boundary without special-casing it', () => {
    const started: CivilRange = { start: day(28), end: null };
    const september = { year: 2026, month: 9, day: 3 };
    expect(takeDay(started, september)).toEqual({
      start: day(28),
      end: september,
    });
  });
});

describe('reading a range', () => {
  const whole: CivilRange = { start: day(12), end: day(20) };

  it('knows when it is whole', () => {
    expect(isWholeRange(whole)).toBe(true);
    expect(isWholeRange({ start: day(12), end: null })).toBe(false);
    expect(isWholeRange(EMPTY_RANGE)).toBe(false);
  });

  it('calls both ends ends, and only them', () => {
    expect(isRangeEnd(whole, day(12))).toBe(true);
    expect(isRangeEnd(whole, day(20))).toBe(true);
    expect(isRangeEnd(whole, day(15))).toBe(false);
  });

  it('calls a half-made range’s single end an end', () => {
    expect(isRangeEnd({ start: day(12), end: null }, day(12))).toBe(true);
  });

  it('counts the middle STRICTLY, so an end is never also in between', () => {
    // The ends carry `aria-selected`; the middle carries a fill and no selected
    // state. A day that claimed both would be announced as chosen when it is
    // only spanned.
    expect(isInRange(whole, day(15))).toBe(true);
    expect(isInRange(whole, day(12))).toBe(false);
    expect(isInRange(whole, day(20))).toBe(false);
  });

  it('has no middle until the range is whole', () => {
    expect(isInRange({ start: day(12), end: null }, day(15))).toBe(false);
  });

  it('has no middle in a one-day range', () => {
    expect(isInRange({ start: day(12), end: day(12) }, day(12))).toBe(false);
  });
});
