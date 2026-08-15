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
  //
  // IN FRONT OF, NOT TOUCHING. Requiring the digit to end exactly where the cut
  // starts was enough while every literal was one character wide, which is what
  // a date separator is. A twelve-hour time ends in a WORD — `02:30 AM/PM` —
  // and a Backspace inside it starts five characters past the last digit, so
  // the strict rule found nothing, removed nothing, and re-emitted the same
  // text: the key did nothing at all, for ever, which is the exact defect this
  // function was written to fix one frame earlier.
  const removing =
    cut.length > 0
      ? cut
      : placed.filter((digit) => digit.at + digit.size <= from).slice(-1);
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
  // A deletion takes digits OUT of a string the frame already held, so the
  // surviving ones keep their places and the right-anchored `caretFor` below
  // is exact. There is no reflow to record.
  return { text, iso: whole ? compose(held) : '', marks: [], full: whole };
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
    if (known !== null)
      return { text: display(known), iso: known, marks: [], full: true };
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

  // WHERE EACH DIGIT CAME FROM, recorded as the parts are filled.
  //
  // The caret cannot be derived from the finished string alone, and two
  // attempts to derive it from a COUNT — how many digits the frame lost — were
  // measured wrong in opposite directions: counting against the frame's
  // capacity misplaces the keystroke after a padding insert, and counting
  // against what the mask consumed misplaces a value typed in from the left.
  // The two cases differ in WHERE the loss and the padding fell relative to the
  // caret, which no single number carries. Kept per digit, they are the same
  // question answered exactly.
  const provenance = new Map<Part, (number | null)[]>();

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
    // `padStart` prepends, so the supplied zeros are the leading entries.
    provenance.set(part, [
      ...Array<number | null>(value.length - taken.length).fill(null),
      ...taken,
    ]);
  }

  let text = '';
  const marks: { at: number; src: number | null }[] = [];
  for (const piece of frame.parts) {
    if (!frame.isPart(piece.type)) {
      text += draw(piece);
      continue;
    }
    const value = held.get(piece.type) ?? '';
    const local = frame.toLocal(value);
    const from = provenance.get(piece.type) ?? [];
    // Walked as CODE POINTS and paired with the sources as they are appended,
    // rather than counted back out of the finished text. A locale can draw a
    // day period that CONTAINS a digit — `blo` writes its periods `1ka`/`2ja` —
    // and counting digits out of the result would silently pair the frame's
    // parts with a literal's.
    let taken = 0;
    for (let offset = 0; offset < local.length;) {
      const char = String.fromCodePoint(local.codePointAt(offset) ?? 0);
      marks.push({ at: text.length + offset, src: from[taken] ?? null });
      offset += char.length;
      taken += 1;
    }
    text += local;
    // An incomplete part ends the string: everything after it would be a
    // separator, or a field with nothing in front of it.
    if (value.length < frame.width[piece.type])
      return { text, iso: '', marks, full: false };
  }

  return { text, iso: compose(held), marks, full: true };
}

/**
 * Where the caret goes after the mask has REFLOWED what was typed.
 *
 * Right where the browser would have put it, had the frame not moved anything:
 * immediately after the digit the user just pressed — which means at the offset
 * of the next digit along, past whatever separator sits between them.
 *
 * This replaces two versions that anchored on a COUNT of digits to the right of
 * the caret, corrected by how many the frame had lost. Both shipped a
 * regression, in opposite directions, because the correction depends on where
 * the loss and the padding fell relative to the caret:
 *
 * | typed at the head of…            | by capacity   | by consumption | here      |
 * | -------------------------------- | ------------- | -------------- | --------- |
 * | `12/08/2026`, then `01011999`    | `01/01/1999`  | `01/10/1199`   | ✓ former |
 * | `09:00 AM`, then `2`             | before the 2  | after the hour | ✓ latter |
 * | `09:00`, then `0`,`1`,`0`,`5`    | `00:10`       | —              | `01:05`  |
 *
 * Reading it off the mask's own record answers both at once, because it is no
 * longer inferring what happened to a digit — it is being told.
 */
export function caretAfterMask<Part extends string>(
  frame: SegmentFrame<Part>,
  typed: string,
  caret: number,
  masked: Masked,
): number {
  const { text, marks } = masked;
  // Nothing was laid into the frame — a recognised paste, which replaces the
  // whole value, so the caret belongs after it.
  if (marks.length === 0) return text.length;

  const isDigit = (char: string) => frame.toAscii(char) !== '';
  // `selectionStart` is read AFTER the browser applied the edit, so the digit
  // the user just pressed is the last one before the caret.
  const before = [...typed.slice(0, caret)].filter(isDigit).length;

  let mine = -1;
  for (let at = 0; at < marks.length; at += 1) {
    if (marks[at]?.src === before - 1) {
      mine = at;
      break;
    }
  }
  // THEIR DIGIT DID NOT SURVIVE — the frame was full and the overflow came off
  // — or there was none, which is what a letter typed into a twelve-hour field
  // looks like. Leave the caret where it is rather than move it to a digit that
  // is not theirs: an earlier version fell back to the last digit BEFORE theirs,
  // which sent the caret to the end of the field whenever the keystroke landed
  // past the last slot. Measured across 9160 inserts, that was the only
  // disagreement with the oracle, and it accounted for all of it.
  if (mine === -1) return Math.min(caret, text.length);

  return marks[mine + 1]?.at ?? text.length;
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

  // AND THE DIGITS THAT DID NOT SURVIVE, which is the one case right-anchoring
  // gets wrong on its own.
  //
  // The anchor assumes the digits to the right of the caret are still there
  // afterwards. They are — unless the frame was already FULL, in which case the
  // mask drops the overflow off the right end and the anchor slips one place
  // left. Measured: caret at the start of a full `09:00`, typing `1`,`7`,`4`,`5`
  // put the caret back at 0 after every keystroke, so each digit was inserted in
  // front of the last and the field walked through `10:09`, `07:10`, `04:07` to
  // `05:04` — four wrong-but-valid times, submitted in silence, from four
  // keystrokes that spelled a real one.
  //
  // Counted against the frame's own capacity rather than against the masked
  // text, so PADDING — which adds a digit rather than losing one, and is the
  // whole reason the anchor is on the right — is untouched.
  const capacity = frame.order.reduce(
    (total, part) => total + frame.width[part],
    0,
  );
  const dropped = Math.max(0, [...typed].filter(isDigit).length - capacity);
  const after = [...typed.slice(caret)].filter(isDigit).length - dropped;
  if (after <= 0) return masked.length;

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
