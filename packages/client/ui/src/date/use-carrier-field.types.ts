import type { RefObject } from 'react';

/**
 * What a carrier field needs to be told about the value it carries.
 *
 * Everything here is about MEANING — what an ISO string names, how it is drawn,
 * whether what is on screen is whole. The machinery that uses it knows none of
 * that; it knows about a carrier node, a visible node, and the three ways a
 * value can arrive from outside without either of them being asked.
 */
export interface CarrierFieldOptions<Value> {
  /** The component's name, for the one warning this can raise. */
  readonly label: string;
  /** The carrier's starting value, already through `normalise`. */
  readonly seed: string;
  /**
   * The canonical value, drawn the way the declared locale writes it.
   *
   * MUST BE MEMOISED on the locale's pattern: the effects below depend on it,
   * and a new identity every render would tear down and rebuild the three doors
   * on every keystroke. It is also the signal that the locale moved, which is
   * what re-draws a field the user has already touched.
   */
  readonly display: (iso: string) => string;
  /**
   * Any string a consumer might assign, reduced to the canonical form this
   * field stores — or `null` if it names nothing.
   *
   * ONE GRAMMAR, and the loose end of it. `2026-08-12T00:00:00.000Z` is what
   * `toISOString()` gives and what a consumer passes without thinking; a field
   * that accepted only the strict form left itself empty while the form posted
   * the instant.
   */
  readonly normalise: (iso: string) => string | null;
  /** The canonical form read as the value it names. */
  readonly parse: (iso: string) => Value | null;
  /** Does this on-screen text already name a whole value? */
  readonly isWholeShown: (text: string) => boolean;
  /** Told whenever the value moves, from any of the doors or from a keystroke. */
  readonly onValueChange?: (value: Value | null) => void;
  /**
   * What the browser should say about a field holding text that names nothing.
   *
   * A masked field can look complete and store nothing — `08/12/` reads as
   * unfinished, but `02:30 AM/PM` does not — and the platform had no way to
   * know: the visible input holds text, so `required` is satisfied, and the
   * CARRIER holds `''` and is not `required` on purpose, because a required
   * carrier is an invalid control the browser cannot focus and the submit is
   * refused showing nothing. Measured: `<TimeInput required />`, type `0230`,
   * submit — `validity.valueMissing` false, `checkValidity()` true, and the
   * form posted an empty string with no signal of any kind.
   *
   * Given here, it becomes the visible field's `setCustomValidity`, which is
   * the platform's own answer: the submit is refused, the browser focuses the
   * field and reads the message out, and `:invalid` styling applies. It is copy
   * in a language, so it comes from the component's catalogue.
   */
  readonly incomplete: string;
}

/** The nodes and the two writes a segmented field drives them with. */
export interface CarrierField {
  /** The named node holding the canonical value — where a form library binds. */
  readonly carrier: RefObject<HTMLInputElement | null>;
  /** The node the user types into, holding localised text. */
  readonly field: RefObject<HTMLInputElement | null>;
  /**
   * The last text this component put on screen.
   *
   * A change event says what the field holds NOW; telling a deletion from an
   * insertion needs what it held before, and reading it back off the node is
   * too late — the browser has already applied the edit.
   */
  readonly shown: RefObject<string>;
  /** Put a canonical value on the carrier, loudly enough for a form library. */
  readonly write: (iso: string) => void;
  /**
   * What the keystroke path just drew and just said, recorded so the doors can
   * tell a value that moved from one they have already announced.
   *
   * A method rather than two writable refs because the React Compiler refuses a
   * component that assigns through a hook's return value — which is the right
   * refusal here for a reason beyond the rule: these two must move together,
   * and a component that could set one without the other is a component that
   * can make the doors and the keystrokes disagree about the same event.
   */
  readonly record: (text: string, iso: string) => void;
}
