/**
 * The frame a segmented field types into: which parts, in which order, with
 * which separators, and in which digits.
 *
 * It is `Intl.DateTimeFormat.formatToParts()` output plus the arithmetic that
 * output does not carry — how wide each part is and what it may hold. Both
 * `DateInput` and `TimeInput` build one; everything in `segments.ts` works on
 * it and knows nothing else about dates or times.
 */
export interface SegmentFrame<Part extends string> {
  /**
   * The locale's own pattern, LITERALS INCLUDED, as `formatToParts` gave it.
   *
   * The bidi marks in those literals are load-bearing and must not be stripped:
   * every `ar-*` pattern separates its parts with U+200F, and that mark is what
   * lays the groups out right-to-left — the same way `Intl.format()` lays out
   * the `Time` beside the field.
   */
  readonly parts: readonly Intl.DateTimeFormatPart[];
  /** Just the typed parts, in the order they are typed. */
  readonly order: readonly Part[];
  /** How many digits each part holds when it is full. */
  readonly width: Readonly<Record<Part, number>>;
  /** The largest number each part may ever say. */
  readonly ceiling: Readonly<Record<Part, number>>;
  /** And the smallest, once the part is as wide as it will get. */
  readonly floor: Readonly<Record<Part, number>>;
  /** Is this `formatToParts` type one this field types into? */
  readonly isPart: (type: string) => type is Part;
  /** This locale's numeral for an ASCII digit — `2` becomes `٢` under `ar-EG`. */
  readonly toLocal: (ascii: string) => string;
  /** And back: one character read as an ASCII digit, or `''` if it is not one. */
  readonly toAscii: (char: string) => string;
}

/**
 * What the frame draws where it is not typing a number.
 *
 * A separator, usually — and for a twelve-hour field, the DAY PERIOD, which is
 * a word the value decides rather than a mark the pattern fixes. Passing it in
 * rather than reading `piece.value` is the whole of the difference between the
 * two fields' frames, and it is why `TimeInput` reuses this engine instead of
 * owning a second copy of it.
 *
 * Defaults to the pattern's own literal when a caller has nothing to say.
 */
export type DrawLiteral = (piece: Intl.DateTimeFormatPart) => string;

/** A typed part's tokens, where they sit, and how wide each one is. */
export interface PlacedDigit<Part extends string> {
  readonly part: Part;
  readonly ascii: string;
  /**
   * The offset in CODE UNITS, because that is what `selectionStart` counts and
   * what `slice` takes — `ccp` writes its numerals above the BMP, so a digit is
   * not always one unit wide.
   */
  readonly at: number;
  readonly size: number;
}

/** What every masking pass answers: what to show, and what it names. */
export interface Masked {
  /** The text to put on screen. */
  readonly text: string;
  /** The canonical value it names, or `''` while it names none yet. */
  readonly iso: string;
  /**
   * WHERE EACH DIGIT OF `text` CAME FROM — its offset, and its index in the
   * typed digit stream, or `null` where the frame supplied it by padding.
   *
   * The caret needs this and cannot be given less. Two versions derived it from
   * a count of what the frame had lost, and both were measured wrong in
   * opposite directions: the loss and the padding fall on different sides of
   * the caret in different edits, and a single number cannot say which. Empty
   * where there was no reflow to record — a recognised paste, or a deletion,
   * which leaves the surviving digits exactly where they were.
   */
  readonly marks: readonly {
    readonly at: number;
    readonly src: number | null;
  }[];
}
