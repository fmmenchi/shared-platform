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
   * label already says it (case- and accent-insensitively, trimmed — the same
   * fold the filter uses); `canCreate` narrows it further. What creating MEANS,
   * and what it produces, is yours.
   *
   * **RETURN THE NEW KEY TO ADOPT IT.** The control owes you that the field and
   * the form agree afterwards, and returning nothing leaves them free not to:
   * the box reads "Bologna" while the carrier holds an empty string, which is
   * the exact divergence this component exists around. Three ways to close it,
   * and returning the key is the one-liner:
   *
   *     onCreate={(query) => addCity(query).id}
   *
   * The other two are a controlled `value` you set yourself once the record
   * exists (the answer when creating is asynchronous — return nothing, resolve
   * later, set `value`), and `freeText`, where the typed string is already the
   * value. Uncontrolled, synchronous, and returning nothing is warned about in
   * development, because it cannot be repaired from anywhere.
   */
  onCreate?: (query: string) => string | null | void;
  /**
   * NARROW the offer further — a minimum length, a format, a permission. Only
   * asked when `onCreate` is given, and only once the built-in checks have
   * already passed: something was typed, and no row already says it.
   *
   * It REFINES and does not replace, which was a defect first: replacing, a
   * consumer adding a length rule silently took over a duplicate check they
   * were never told they owned, and this package's own documented example
   * offered to create a row that was selected two lines above it.
   *
   * `shown` is the FILTERED list, which is the whole list when `filter` is
   * `false` — so a rule written against it changes meaning with a prop set for
   * an unrelated reason. Prefer rules about the query itself.
   */
  canCreate?: (query: string, shown: readonly T[]) => boolean;
  /**
   * Note: the choice itself — `value`, `defaultValue`, `onValueChange` — is not
   * here. Its SHAPE depends on `multiple`, so it lives in the two interfaces
   * below and TypeScript picks the right one from the flag.
   */
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
 * ONE OF MANY. The choice is a key or nothing, and the field reads the chosen
 * item's label once it has one.
 */
interface ComboboxSingleProps {
  /**
   * SEVERAL OF MANY. Off, and the flag is what splits the two value shapes
   * below — a boolean rather than two components, because everything else about
   * them is the same control (ADR-0028 §5).
   */
  multiple?: false;
  /** The chosen item's key — controlled. Pair with `onValueChange`. */
  value?: string | null;
  /** The chosen item's key at mount, when the component keeps it. */
  defaultValue?: string | null;
  /** The choice changed: a key, or `null` when it was cleared. */
  onValueChange?: (value: string | null) => void;
}

/**
 * SEVERAL OF MANY, with the chosen keys drawn as removable tags under the
 * field.
 *
 * The selection is an ORDERED LIST OF KEYS, not the package's `Selection`
 * ({ mode, ids }) type: that one exists to say "ten thousand rows except these
 * three" for a table whose ids are not on the client, and here `exclude` has no
 * meaning while the order is visible — the tags are in it (ADR-0028 §5).
 *
 * THE ORDER IS THE ORDER THINGS WERE PICKED, and it is also the order the tags
 * are drawn in, so what a reader sees and what a form would submit cannot
 * disagree.
 */
interface ComboboxMultipleProps {
  /** SEVERAL OF MANY. See the value shape it selects, above. */
  multiple: true;
  /** The chosen keys, in order — controlled. Pair with `onValueChange`. */
  value?: readonly string[];
  /** The chosen keys at mount, when the component keeps them. */
  defaultValue?: readonly string[];
  /** The selection changed: the keys, in order, after the change. */
  onValueChange?: (value: readonly string[]) => void;
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
 * types is reported by `onQueryChange`. Both need a `name`: the carrier is only
 * rendered when there is one, and without it neither handler can ever fire —
 * warned about in development.
 *
 * `onBlur` ON THE CARRIER CANNOT HEAR THE VISIBLE FIELD, and that is worth
 * stating rather than leaving to be discovered. React's `onBlur` is `focusout`,
 * which bubbles up the REACT tree; the carrier is a SIBLING of the box a person
 * types in, not an ancestor of it, so the only blur it ever sees is its own. A
 * library validating on blur (`mode: 'onBlur'`) therefore validates this field
 * when the choice changes and not when focus leaves it. Inherited from
 * `DateInput`, whose carrier has the same shape, and the alternative is worse:
 * on the visible field the handler reads a node with no name.
 *
 * `required` lands on the VISIBLE field, which is `DateInput`'s policy and for
 * its reason: required on a CSS-hidden carrier is an invalid control the browser
 * cannot scroll to or focus, so it refuses the submit while showing nothing.
 * The consequence is worth stating plainly — with `freeText` off, a query that
 * matches no row still satisfies `required` while the carrier submits an empty
 * string. A schema is what catches that; the attribute cannot.
 *
 * `type` and `role` are the control's identity. `list` is refused because
 * `<datalist>` is the OTHER answer to this problem (ADR-0028) and mixing the
 * two would put two lists on one field.
 */
export type ComboboxProps<T> = ComboboxOwnProps<T> &
  (ComboboxSingleProps | ComboboxMultipleProps) &
  ComboboxRest<T>;

/**
 * The ONE-OF-MANY half on its own, for a wrapper that can only bind a single
 * value — `FormCombobox` today, because the form port cannot yet express a set
 * whose members come and go (ADR-0028 §12).
 *
 * It exists because a discriminated union does not survive a spread: a bound
 * wrapper builds one props bag and hands it over, and TypeScript cannot tell
 * which branch that bag belongs to. Naming the branch is honest — the wrapper
 * really is single-only — where a cast would have hidden it.
 */
export type ComboboxSingleOnlyProps<T> = ComboboxOwnProps<T> &
  ComboboxSingleProps &
  ComboboxRest<T>;

/** Everything both halves share: the native attributes and the variants. */
type ComboboxRest<T> = Omit<
  ComponentPropsWithRef<'input'>,
  | keyof ComboboxOwnProps<T>
  | keyof ComboboxSingleProps
  | keyof ComboboxMultipleProps
  | 'type'
  | 'role'
  | 'list'
  | 'size'
  | 'children'
> &
  ComboboxVariants;
