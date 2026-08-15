import type { ComponentPropsWithRef, ReactNode, Ref } from 'react';
import type { VariantProps } from 'class-variance-authority';
import type { comboboxVariants } from './combobox.variants.js';

/** Variant axes, derived from the cva definition. */
export type ComboboxVariants = VariantProps<typeof comboboxVariants>;

/**
 * Does this item match what has been typed? The same shape the table's column
 * filters take (`RowFilter`), reused rather than restated: it is the one
 * question a combobox asks of an item, and what a match MEANS is the
 * consumer's — accent folding, synonyms, a server's own idea of relevance.
 */
export type ComboboxFilter<T> = (item: T, query: string) => boolean;

interface ComboboxOwnProps<T> {
  /**
   * The options, in the consumer's own shape. Never fetched, never sorted and
   * never cached here (ADR-0028): a combobox is a control over somebody else's
   * data.
   */
  items: readonly T[];
  /** This item's stable identity — what the form submits. */
  getKey: (item: T) => string;
  /**
   * This item as text: the input's value once it is chosen, and what the
   * default filter matches against. It is also the option's accessible name
   * unless `renderItem` supplies richer content with its own.
   */
  getLabel: (item: T) => string;
  /**
   * The option's contents, for rows that are not a single string — two lines,
   * an avatar, a secondary column. Defaults to `getLabel`.
   *
   * Whatever it draws, `getLabel` still decides what the input reads after a
   * pick, because a chosen row has to become text a person can edit.
   */
  renderItem?: (item: T) => ReactNode;
  /**
   * How the typed query narrows the list, defaulting to a case-insensitive
   * substring of `getLabel`.
   *
   * **`false` turns filtering off**, which is not a convenience: when the
   * consumer searches on a server, the items arriving ARE the answer, and
   * filtering them again applies the query twice — silently dropping every row
   * whose match the server understood and this one does not. The bug reads as
   * "the server returns results and the list is empty".
   */
  filter?: ComboboxFilter<T> | false;
  /**
   * ACCEPT WHAT WAS TYPED, even when it is in no row.
   *
   * Off by default, and that default is the decision (ADR-0028): with free text
   * off this is a CHOOSER — what it submits is always a key from the list — and
   * the failure mode of the other default is silent, a form that happily posts
   * a typo as if it were a record. On, the typed string is itself the value and
   * rides the carrier exactly as a key would.
   *
   * It does NOT turn on inline completion in either mode: writing into the
   * field as you type fights an IME mid-composition, and fights a value that is
   * allowed not to be in the list.
   */
  freeText?: boolean;
  /**
   * Offer to create what was typed — as a ROW IN THE LIST, never a button
   * beside it. One keyboard path, one highlight, one announcement, and no
   * second code path to keep in step.
   *
   * Given, the row appears whenever the query is non-empty and no option's
   * label already equals it; `canCreate` decides otherwise. The component only
   * reports the intent — what creating MEANS, and what it produces, is yours.
   */
  onCreate?: (query: string) => void;
  /**
   * When the offer appears, if the default is wrong for this list — a minimum
   * length, a format, a permission. Only asked when `onCreate` is given.
   */
  canCreate?: (query: string, shown: readonly T[]) => boolean;
  /** The chosen item's key — controlled. Pair with `onValueChange`. */
  value?: string | null;
  /** The chosen item's key at mount, when the component keeps it. */
  defaultValue?: string | null;
  /** The choice changed: a key, or `null` when it was cleared. */
  onValueChange?: (value: string | null) => void;
  /** The typed text — controlled. Pair with `onQueryChange`. */
  query?: string;
  /** The typed text at mount, when the component keeps it. */
  defaultQuery?: string;
  /** The typed text changed. */
  onQueryChange?: (query: string) => void;
  /** Whether the list is showing — controlled. Pair with `onOpenChange`. */
  open?: boolean;
  /** Whether the list shows at mount, when the component keeps it. */
  defaultOpen?: boolean;
  /** The list opened or closed, by any route including the platform's. */
  onOpenChange?: (open: boolean) => void;
  /**
   * The field name the form submits under. Rendered on the CARRIER beside the
   * visible field, because the visible one holds the query and not the value —
   * see the component's own note on what that costs.
   */
  name?: string;
  /**
   * The `<form>` this field belongs to when it is not inside one — a dialog, a
   * portal, a sticky footer. It goes on the carrier with the `name`, which is
   * the node that actually contributes: put on the visible field it associated
   * the one element that submits nothing.
   */
  form?: string;
  /**
   * A ref to the carrier — the node that holds the value, carries the `name`
   * and fires a real `input` event when the choice changes.
   *
   * This is what a bound wrapper needs and the ordinary `ref` cannot be: a
   * form library reads `.value` off the element its ref was given, and given
   * the visible field it would read the search text. `ref` stays pointed at the
   * visible input, which is where focus belongs.
   */
  carrierRef?: Ref<HTMLInputElement>;
}

/**
 * Public Combobox props — the visible control is an `<input>`, so every native
 * attribute passes through to it.
 *
 * `value` and `defaultValue` are taken over: on a combobox they are ambiguous
 * between the typed text and the chosen item, and conflating the two is the
 * defect this whole component exists around. The typed text is
 * `query`/`onQueryChange`; the choice is `value`/`onValueChange`.
 *
 * `onChange` and `onBlur` go to the CARRIER, not to the visible field, which is
 * the routing `DateInput` settled first. A form binding's handler arrives under
 * those names and reads the field off the event target: on the visible input it
 * would hear a keystroke of the QUERY and find a node with no name, so the
 * library learned the search text and never learned the choice. What the user
 * types is reported by `onQueryChange`.
 *
 * `type` and `role` are the control's identity. `list` is refused because
 * `<datalist>` is the OTHER answer to this problem (ADR-0028) and mixing the
 * two would put two lists on one field.
 */
export type ComboboxProps<T> = ComboboxOwnProps<T> &
  Omit<
    ComponentPropsWithRef<'input'>,
    keyof ComboboxOwnProps<T> | 'type' | 'role' | 'list' | 'size' | 'children'
  > &
  ComboboxVariants;
