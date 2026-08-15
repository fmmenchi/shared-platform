import { describe, it, expect } from 'vitest';
import {
  applyDeletion,
  caretAfterMask,
  caretFor,
  maskSegments,
  numeralsOf,
} from './segments.js';
import type { SegmentFrame } from './segments.types.js';

/**
 * THE ENGINE'S OWN TESTS, which it went without for as long as it had two
 * consumers and three caret rules.
 *
 * Every sibling pure module in this folder has a suite; this one had none, and
 * the regressions it shipped were all found from a component — or not at all.
 * Worse, the two component tests that did guard the caret were both pinned to
 * `it`, whose parts have a floor of 0, which is the one locale where the
 * arithmetic that kept breaking cannot fire.
 */

type DatePart = 'day' | 'month' | 'year';
type TimePart = 'hour' | 'minute' | 'second';

const numeralsFor = (locale: string) => {
  const numerals = numeralsOf(locale);
  return {
    toLocal: (ascii: string) =>
      [...ascii].map((char) => numerals[Number(char)] ?? char).join(''),
    toAscii: (char: string) => {
      const index = numerals.indexOf(char);
      if (index !== -1) return String(index);
      return char >= '0' && char <= '9' ? char : '';
    },
  };
};

function dateFrame(locale: string): SegmentFrame<DatePart> {
  const parts = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
    calendar: 'gregory',
  }).formatToParts(new Date(Date.UTC(2026, 7, 12)));
  const isPart = (type: string): type is DatePart =>
    ['day', 'month', 'year'].includes(type);
  return {
    parts,
    order: parts.map((piece) => piece.type).filter(isPart),
    width: { day: 2, month: 2, year: 4 },
    ceiling: { day: 31, month: 12, year: 9999 },
    floor: { day: 1, month: 1, year: 1 },
    isPart,
    ...numeralsFor(locale),
  };
}

function timeFrame(
  locale: string,
  cycle?: string,
  seconds = false,
): SegmentFrame<TimePart> {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    ...(seconds ? { second: '2-digit' as const } : {}),
    ...(cycle === undefined ? {} : { hourCycle: cycle as 'h11' }),
  };
  const format = new Intl.DateTimeFormat(locale, options);
  const parts = format.formatToParts(
    new Date(Date.UTC(2026, 7, 12, 14, 30, 45)),
  );
  const range = {
    h11: { floor: 0, ceiling: 11 },
    h12: { floor: 1, ceiling: 12 },
    h23: { floor: 0, ceiling: 23 },
    h24: { floor: 1, ceiling: 24 },
  }[format.resolvedOptions().hourCycle ?? 'h23'] ?? { floor: 0, ceiling: 23 };
  const isPart = (type: string): type is TimePart =>
    ['hour', 'minute', 'second'].includes(type);
  return {
    parts,
    order: parts.map((piece) => piece.type).filter(isPart),
    width: { hour: 2, minute: 2, second: 2 },
    ceiling: { hour: range.ceiling, minute: 59, second: 59 },
    floor: { hour: range.floor, minute: 0, second: 0 },
    isPart,
    ...numeralsFor(locale),
  };
}

const nothing = () => '';

/** A whole value laid out in the frame, exactly as the mask would draw it. */
function laid<Part extends string>(
  frame: SegmentFrame<Part>,
  values: Record<string, number>,
): string {
  let text = '';
  for (const piece of frame.parts) {
    if (!frame.isPart(piece.type)) {
      text += piece.value;
      continue;
    }
    text += frame.toLocal(
      String(values[piece.type]).padStart(frame.width[piece.type], '0'),
    );
  }
  return text;
}

/**
 * THE ORACLE, and it is deliberately NOT the implementation restated.
 *
 * It re-runs the frame's admission rules over the digit stream itself, watching
 * for the moment the user's own keystroke is taken, and then says the caret
 * belongs at the digit after it. The implementation reads the mask's record of
 * the same events; agreeing is evidence rather than tautology, and the two
 * disagreed on 18 frames of 88 the first time this was run.
 */
function oracle<Part extends string>(
  frame: SegmentFrame<Part>,
  typed: string,
  caret: number,
  text: string,
): number {
  const digits = [...typed].map(frame.toAscii).filter((char) => char !== '');
  const before = [...typed.slice(0, caret)].filter(
    (char) => frame.toAscii(char) !== '',
  ).length;

  let index = 0;
  let output = 0;
  let mine = -1;
  const admits = (part: Part, candidate: string) => {
    const value = Number(candidate);
    if (value > frame.ceiling[part]) return false;
    return candidate.length < frame.width[part] || value >= frame.floor[part];
  };
  for (const part of frame.order) {
    let value = '';
    const taken: number[] = [];
    while (index < digits.length && value.length < frame.width[part]) {
      const candidate = value + digits[index];
      if (!admits(part, candidate)) break;
      value = candidate;
      taken.push(index);
      index += 1;
    }
    const padded = value.padStart(frame.width[part], '0');
    if (
      value !== '' &&
      value.length < frame.width[part] &&
      index < digits.length &&
      Number(padded) >= frame.floor[part]
    ) {
      value = padded;
    }
    const pads = value.length - taken.length;
    for (let k = 0; k < value.length; k += 1) {
      if (k >= pads && taken[k - pads] === before - 1) mine = output;
      output += 1;
    }
    if (value.length < frame.width[part]) break;
  }

  const offsets: number[] = [];
  for (let at = 0; at < text.length;) {
    const char = String.fromCodePoint(text.codePointAt(at) ?? 0);
    if (frame.toAscii(char) !== '') offsets.push(at);
    at += char.length;
  }
  if (mine === -1) return Math.min(caret, text.length);
  return offsets[mine + 1] ?? text.length;
}

/** Every digit, at every offset, of a whole value. */
function sweep<Part extends string>(
  frame: SegmentFrame<Part>,
  values: Record<string, number>,
): { checked: number; wrong: string[] } {
  const full = laid(frame, values);
  const wrong: string[] = [];
  let checked = 0;
  for (let at = 0; at <= full.length; at += 1) {
    for (let digit = 0; digit <= 9; digit += 1) {
      const typed = full.slice(0, at) + String(digit) + full.slice(at);
      const caret = at + 1;
      const masked = maskSegments(frame, typed, nothing, {});
      const got = caretAfterMask(frame, typed, caret, masked);
      const want = oracle(frame, typed, caret, masked.text);
      checked += 1;
      if (got !== want) {
        wrong.push(
          `${full} +${digit}@${at} → ${masked.text} caret ${got}≠${want}`,
        );
      }
    }
  }
  return { checked, wrong };
}

describe('the caret after an insert, against an independent oracle', () => {
  const dates = [
    { day: 12, month: 8, year: 2026 },
    { day: 5, month: 8, year: 2026 },
    { day: 1, month: 1, year: 1999 },
    { day: 30, month: 11, year: 2026 },
  ];

  it.each(['it', 'en-US', 'ja-JP', 'ko-KR', 'ar-EG', 'hu', 'ccp'])(
    'puts it beside the keystroke for every insert into a date — %s',
    (locale) => {
      const frame = dateFrame(locale);
      let checked = 0;
      const wrong: string[] = [];
      for (const values of dates) {
        const run = sweep(frame, values);
        checked += run.checked;
        wrong.push(...run.wrong);
      }
      // The guard against a sweep that swept nothing.
      expect(checked).toBeGreaterThan(300);
      expect(wrong).toEqual([]);
    },
  );

  const times = [
    { hour: 9, minute: 0, second: 0 },
    { hour: 2, minute: 30, second: 45 },
    { hour: 11, minute: 59, second: 59 },
    { hour: 12, minute: 0, second: 0 },
  ];

  it.each([
    ['en-US', undefined, false],
    ['en-US', undefined, true],
    ['it', undefined, false],
    ['ja-JP', 'h11', false],
    ['ko-KR', undefined, false],
    ['ar-EG', undefined, true],
    ['fi-FI', undefined, false],
    ['en-US', 'h24', false],
  ] as [string, string | undefined, boolean][])(
    'and for every insert into a time — %s/%s seconds:%s',
    (locale, cycle, seconds) => {
      const frame = timeFrame(locale, cycle, seconds);
      let checked = 0;
      const wrong: string[] = [];
      for (const values of times) {
        const run = sweep(frame, values);
        checked += run.checked;
        wrong.push(...run.wrong);
      }
      expect(checked).toBeGreaterThan(200);
      expect(wrong).toEqual([]);
    },
  );

  it('leaves the caret alone when the keystroke did not survive', () => {
    // The frame is full and the overflow comes off the right, so the digit just
    // pressed is not in the output at all. An earlier version fell back to the
    // last digit BEFORE it, which sent the caret to the end of the field.
    const frame = dateFrame('it');
    const typed = '12/08/20269';
    const masked = maskSegments(frame, typed, nothing, {});
    expect(masked.text).toBe('12/08/2026');
    expect(caretAfterMask(frame, typed, 11, masked)).toBe(10);
  });

  it('sends the caret to the end of a value it recognised whole', () => {
    const frame = dateFrame('it');
    const masked = maskSegments(frame, '2026-08-12', nothing, {
      recognise: (value) => (value === '2026-08-12' ? value : null),
      display: () => '12/08/2026',
    });
    expect(masked.marks).toEqual([]);
    expect(caretAfterMask(frame, '2026-08-12', 3, masked)).toBe(10);
  });
});

describe('what the mask records about each digit', () => {
  it('marks a padded zero as nobodys keystroke', () => {
    // `2` at the head of `09:00` makes the hour `02` by supplying a zero the
    // user never typed. Which digit is whose is the whole of what the caret
    // needs, and the only thing a count of losses cannot say.
    const frame = timeFrame('en-US');
    const masked = maskSegments(frame, '209:00 PM', nothing, {});
    expect(masked.text).toBe('02:09 PM');
    expect(masked.marks.map((mark) => mark.src)).toEqual([null, 0, 1, 2]);
  });

  it('marks nothing for the parts an incomplete one cut short', () => {
    const frame = dateFrame('it');
    const masked = maskSegments(frame, '1', nothing, {});
    expect(masked.text).toBe('1');
    expect(masked.marks.map((mark) => mark.src)).toEqual([0]);
  });

  it('pairs digits by position, not by counting them out of the text', () => {
    // A locale can draw a day period that CONTAINS a digit — `blo` writes its
    // periods `1ka`/`2ja` — so counting digits out of the finished string would
    // pair a part with a literal's.
    const frame = timeFrame('en-US');
    const masked = maskSegments(frame, '0930', nothing, {
      draw: (piece) => (piece.type === 'dayPeriod' ? '1ka' : piece.value),
    });
    expect(masked.text).toBe('09:30 1ka');
    expect(masked.marks.map((mark) => mark.at)).toEqual([0, 1, 3, 4]);
  });
});

describe('a deletion keeps the digits it did not remove', () => {
  it('takes only what was cut, and leaves the rest in place', () => {
    const frame = dateFrame('it');
    const deleted = applyDeletion(frame, '12/08/2026', '12/08/202', 9, nothing);
    expect(deleted?.text).toBe('12/08/202');
    // No reflow happened, so there is nothing to record and the right-anchored
    // rule is exact.
    expect(deleted?.marks).toEqual([]);
    expect(caretFor(frame, '12/08/202', '12/08/202', 9)).toBe(9);
  });

  it('takes the digit in front of a separator that was deleted', () => {
    const frame = dateFrame('it');
    const deleted = applyDeletion(frame, '12/08/2026', '1208/2026', 2, nothing);
    expect(deleted?.text).toBe('1/08/2026');
  });

  it('answers null when there is nothing placed to delete', () => {
    const frame = dateFrame('it');
    expect(applyDeletion(frame, '', '', 0, nothing)).toBeNull();
  });
});
