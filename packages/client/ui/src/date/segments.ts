import type {
  DrawLiteral,
  Masked,
  PlacedDigit,
  SegmentFrame,
} from './segments.types.js';

/**
 * THE MASK ENGINE FOR A SEGMENTED FIELD — the arithmetic `DateInput` paid for
 * and `TimeInput` inherits.
 *
 * Every function here is pure and knows nothing about dates or times: it works
 * on a `SegmentFrame`, which says which parts a field has, how wide they are
 * and what they may hold. What a whole set of parts NAMES is the caller's, and
 * arrives as a `compose` callback.
 *
 * This module exists because ADR-0027 forbids the alternative. Two copies of
 * caret arithmetic is a failure this repository has already measured twice, and
 * the comments below are the record of what each rule cost to learn — they are
 * about dates because dates are where they were learned, and every one of them
 * is true of any field typed in segments.
 */

/** The pattern's own literal, which is what a frame draws unless it says else. */
const ownValue: DrawLiteral = (piece) => piece.value;

/**
 * Walk a masked string and say which part each digit belongs to, and where it
 * sits.
 *
 * The mask lays parts out in fixed slots between fixed literals, so a string it
 * produced can be read back positionally instead of being re-flowed. That is
 * the whole difference between a deletion that touches one part and one that
 * cascades through all of them.
 */
export function placeDigits<Part extends string>(
  frame: SegmentFrame<Part>,
  text: string,
  draw: DrawLiteral = ownValue,
): PlacedDigit<Part>[] {
  const digits: PlacedDigit<Part>[] = [];
  let at = 0;
  for (const piece of frame.parts) {
    if (!frame.isPart(piece.type)) {
      const literal = draw(piece);
      if (literal !== '' && text.startsWith(literal, at)) at += literal.length;
      continue;
    }
    let held = 0;
    while (at < text.length && held < frame.width[piece.type]) {
      const char = String.fromCodePoint(text.codePointAt(at) ?? 0);
      const ascii = frame.toAscii(char);
      if (ascii === '') break;
      digits.push({ part: piece.type, ascii, at, size: char.length });
      at += char.length;
      held += 1;
    }
  }
  return digits;
}

/**
 * A deletion, applied to the part it happened in.
 *
 * The flow mask below is right for TYPING and wrong for editing: it pours one
 * stream of digits back into the slots, so removing a digit — or a separator —
 * pulls every later digit one place forward. Measured on `12/08/2026`: one
 * Backspace over the day left `10/08/2026`, a different real day, submitted in
 * silence; deleting a separator left the digits unchanged, so the mask
 * re-emitted the same text and the key did nothing at all, for ever.
 *
 * Here the previous text is read positionally, the removed range is mapped onto
 * it, and only the digits inside that range go. Nothing after them moves. A
 * separator has no digits of its own, so Backspace over one takes the digit in
 * front of it instead, which is what every mask does and what the user meant.
 */
export function applyDeletion<Part extends string>(
  frame: SegmentFrame<Part>,
  before: string,
  typed: string,
  caret: number,
  compose: (held: ReadonlyMap<Part, string>) => string,
  draw: DrawLiteral = ownValue,
): Masked | null {
  const placed = placeDigits(frame, before, draw);
  if (placed.length === 0) return null;

  // What was cut: the span between the common prefix and the common suffix.
  let head = 0;
  while (
    head < typed.length &&
    head < before.length &&
    typed[head] === before[head]
  ) {
    head += 1;
  }
  let tail = 0;
  while (
    tail < typed.length - head &&
    tail < before.length - head &&
    typed[typed.length - 1 - tail] === before[before.length - 1 - tail]
  ) {
    tail += 1;
  }
  const from = head;
  const to = before.length - tail;
  if (to <= from) return null;

  const cut = placed.filter(
    (digit) => digit.at < to && digit.at + digit.size > from,
  );
  // Only literals were removed — take the digit in front of the cut with them.
  const removing =
    cut.length > 0
      ? cut
      : placed.filter((digit) => digit.at + digit.size === from).slice(-1);
  if (removing.length === 0) return null;

  const held = new Map<Part, string>();
  for (const part of frame.order) held.set(part, '');
  for (const digit of placed) {
    if (removing.includes(digit)) continue;
    held.set(digit.part, (held.get(digit.part) ?? '') + digit.ascii);
  }

  // NO TRUNCATION HERE, unlike the flow mask. A part left short by a deletion
  // still has whole parts after it, and they are exactly what "leave the others
  // alone" means: `1/08/2026`, not `1`. Only the literals with nothing left on
  // one side of them come off, so an emptied field is empty rather than a row
  // of separators.
  const tokens = frame.parts.map((piece) =>
    frame.isPart(piece.type)
      ? { literal: false, value: frame.toLocal(held.get(piece.type) ?? '') }
      : { literal: true, value: draw(piece) },
  );
  const filled = tokens.map((token) => !token.literal && token.value !== '');
  const first = filled.indexOf(true);
  const last = filled.lastIndexOf(true);
  const text =
    first === -1
      ? ''
      : tokens
          .slice(first, last + 1)
          .map((token) => token.value)
          .join('');

  const whole = frame.order.every(
    (part) => (held.get(part) ?? '').length === frame.width[part],
  );
  return { text, iso: whole ? compose(held) : '' };
}

/**
 * The mask: what was typed, reduced to what the frame can contain.
 *
 * ONLY DIGITS SURVIVE — this locale's or ASCII, so an Arabic keyboard and a
 * numeric keypad both work — and the separators are put back from the locale's
 * own pattern. A letter cannot be typed, a second separator cannot be typed,
 * and `12082026` becomes `12/08/2026` on its own.
 *
 * A DIGIT THAT MAKES A PART IMPOSSIBLE IS REFUSED AND NOT CONSUMED. Consuming
 * it was the first version and it was catastrophic rather than merely wrong: a
 * part holding one digit that no second digit could complete then swallowed
 * every digit after it, so `8/12/2026` in `en-US` left `8` behind and no further
 * keystroke could ever land. Left in place, the digit starts the next part
 * instead — `5` then `9` is the 5th, then September.
 *
 * BOTH ENDS ARE ENFORCED. A ceiling alone let `00/00/2026` be typed in full:
 * complete-looking, and storing nothing, with nothing to tell the user why.
 *
 * What it does NOT decide is whether the whole set of parts names anything: 30
 * February can be typed, and is then simply not stored. Blocking it mid-edit
 * would mean refusing the `3` of a `30` that was on its way to March.
 *
 * `recognise` is the one door out of all this: a string that is ALREADY the
 * canonical value is taken as one instead of being re-segmented. `2026-08-12`
 * out of an API, a spreadsheet or the field's own carrier was read as `20`,
 * `02`, `6081` under `it` — complete-looking, four millennia out, announced by
 * nothing.
 */
export function maskSegments<Part extends string>(
  frame: SegmentFrame<Part>,
  typed: string,
  compose: (held: ReadonlyMap<Part, string>) => string,
  options: {
    readonly recognise?: (typed: string) => string | null;
    readonly display?: (iso: string) => string;
    readonly draw?: DrawLiteral;
  } = {},
): Masked {
  const { recognise, display, draw = ownValue } = options;

  if (recognise !== undefined && display !== undefined) {
    const known = recognise(typed);
    if (known !== null) return { text: display(known), iso: known };
  }

  const digits = [...typed].map(frame.toAscii).filter((char) => char !== '');
  const held = new Map<Part, string>();
  let index = 0;

  const admits = (part: Part, candidate: string) => {
    const value = Number(candidate);
    if (value > frame.ceiling[part]) return false;
    // A part is allowed to be `0` while it is still growing — `0` is on its way
    // to `05` — but never once it is as wide as it will get.
    return candidate.length < frame.width[part] || value >= frame.floor[part];
  };

  for (const part of frame.order) {
    let value = '';
    while (index < digits.length && value.length < frame.width[part]) {
      const candidate = value + digits[index];
      if (!admits(part, candidate)) break;
      value = candidate;
      index += 1;
    }
    // A part closed early by a digit that did not fit is PADDED, so that digit
    // starts the next part rather than being lost. Only when digits remain, so
    // it does not fire while a part is still being typed: `12` `4` waits at
    // `12/4`. And never into a value the part may not hold, which is what keeps
    // a lone `0` from becoming `00`.
    const padded = value.padStart(frame.width[part], '0');
    if (
      value !== '' &&
      value.length < frame.width[part] &&
      index < digits.length &&
      Number(padded) >= frame.floor[part]
    ) {
      value = padded;
    }
    held.set(part, value);
  }

  let text = '';
  for (const piece of frame.parts) {
    if (!frame.isPart(piece.type)) {
      text += draw(piece);
      continue;
    }
    const value = held.get(piece.type) ?? '';
    text += frame.toLocal(value);
    // An incomplete part ends the string: everything after it would be a
    // separator, or a field with nothing in front of it.
    if (value.length < frame.width[piece.type]) return { text, iso: '' };
  }

  return { text, iso: compose(held) };
}

/**
 * Where the caret goes once the text has been rewritten under it.
 *
 * Counted in DIGITS, not in characters: the mask inserts and removes
 * separators, so a character index taken before it means nothing after. Put the
 * caret after the same digit the user was behind — and past the separator that
 * follows it, or the next keystroke lands in front of the `/` and the caret
 * jumps backwards on every third character.
 */
export function caretFor<Part extends string>(
  frame: SegmentFrame<Part>,
  masked: string,
  typed: string,
  caret: number,
): number {
  // Walked as CODE POINTS with their unit offsets carried along, because
  // `selectionStart` counts units while a digit is not always one unit wide:
  // `ccp` writes its numerals above the BMP. Indexed by unit, every one of them
  // read as half a surrogate, no digit was ever counted, and the caret went to
  // the end on every keystroke — mid-string editing was impossible in that
  // locale and nowhere else.
  const points: { char: string; at: number }[] = [];
  for (let at = 0; at < masked.length;) {
    const char = String.fromCodePoint(masked.codePointAt(at) ?? 0);
    points.push({ char, at });
    at += char.length;
  }

  // ANCHORED ON THE RIGHT, and this is the whole of the function.
  //
  // Counting the digits BEFORE the caret is the obvious way and it is wrong,
  // because padding inserts a digit to their left: the `n`-th digit of the
  // masked text is then the zero the mask added, not the one the person
  // pressed, so the caret lands in FRONT of their keystroke and everything
  // after it is typed into the wrong place. Measured over all 336 dates of 2026
  // typed in short form — `8` `/` `1` `2` `/` `2026` rather than `08/12/2026` —
  // that stored a WRONG BUT VALID date 186 times in `en-US`, 172 in `it` and
  // 132 in `ja-JP`: `8/12/2026` came out as `0261-08-22`.
  //
  // The digits to the RIGHT of the caret are the ones padding cannot move, so
  // they are what to hold on to. Same sweep, anchored this way: 13 wrong in
  // `en-US` and 0 in `ja-JP`, and the 13 are genuine short-form ambiguity —
  // `1 13 2026` and `11 3 2026` are the same digits — which no mask on one
  // field can tell apart.
  const isDigit = (char: string) => frame.toAscii(char) !== '';
  const after = [...typed.slice(caret)].filter(isDigit).length;
  if (after === 0) return masked.length;

  let seen = 0;
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index];
    if (point === undefined || !isDigit(point.char)) continue;
    seen += 1;
    if (seen === after) return point.at;
  }
  return 0;
}

/**
 * The locale's numerals, `0`–`9` in order, so `١٢` can be read and written as
 * readily as `12`.
 *
 * NOT PINNED to ASCII, deliberately. An `ar-EG` page renders `١٢` in every
 * `Time` and `Table` cell, so a field beside them showing `12` would be the
 * very mismatch these components exist to remove — one layer down.
 */
export function numeralsOf(locale: string | undefined): string[] {
  const format = new Intl.NumberFormat(locale, { useGrouping: false });
  return Array.from({ length: 10 }, (_, digit) => format.format(digit));
}
