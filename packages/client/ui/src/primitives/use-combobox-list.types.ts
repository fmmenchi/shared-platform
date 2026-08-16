import type { ComboboxFilter } from '../components/combobox/combobox.types.js';

/**
 * WHERE THE HIGHLIGHT IS — a row of the filtered list, or the offer to create.
 *
 * A union rather than an index, and that is a fix rather than taste. Identified
 * as "the last position", the offer was whatever sat at `shown.length` WHEN THE
 * KEY WAS PRESSED: in the server-search flow the docs recommend, a response
 * landing between the arrow and the `Enter` grew the list, and the position the
 * user had highlighted was by then a real row they had never seen. Named, it
 * cannot be mistaken for a row no matter what the list does underneath.
 */
export type Spot = number | 'create';

export interface ComboboxListOptions<T> {
  /** The options, in the consumer's own shape. Never fetched or sorted here. */
  items: readonly T[];
  /** This item as text — what the default filter matches against. */
  getLabel: (item: T) => string;
  /**
   * How the typed query narrows the list, defaulting to a case- and
   * accent-insensitive substring of `getLabel`. `false` turns filtering off,
   * for the consumer whose server already answered.
   */
  filter?: ComboboxFilter<T> | false;
  /** What has been typed. */
  query: string;
  /**
   * Is the query something the user TYPED, or the label of what they picked?
   * Without the distinction the list reopens filtered by its own answer, and
   * one row reads to a screen reader as though the rest had gone.
   */
  searching: boolean;
  /** Whether a "create what was typed" row may be offered at all. */
  offersCreation?: boolean;
  /**
   * Narrows the offer further — a minimum length, a format, a permission. It
   * refines and never widens: the built-in "no row already says it" check runs
   * first either way.
   */
  canCreate?: (query: string, shown: readonly T[]) => boolean;
}

export interface ComboboxList<T> {
  /** The listbox's id, for `aria-controls`. */
  listId: string;
  /** A row's id, for `aria-activedescendant` and the row itself. */
  optionId: (spot: Spot) => string;
  /** The rows to draw, after filtering. */
  shown: readonly T[];
  /** Whether the offer to create is one of them. */
  creatable: boolean;
  /** How many rows the keyboard walks — the offer included. */
  rows: number;
  /** Where the keyboard is, clamped to what is actually drawn. */
  highlighted: Spot | null;
  /** Walk the rows, wrapping at both ends. */
  move: (delta: number) => void;
  /** Back to highlighting nothing — on typing, and on opening. */
  clearHighlight: () => void;
}
