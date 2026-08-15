import type { ComponentPropsWithRef, ReactNode } from 'react';
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
   * The field name the form submits under. Rendered on a hidden native carrier
   * beside the visible field, because the visible one holds the QUERY and not
   * the value — see the component's own note on what that costs.
   */
  name?: string;
}

/**
 * Public Combobox props — the visible control is an `<input>`, so every native
 * attribute passes through to it.
 *
 * `value`, `defaultValue` and `onChange` are taken over: on a combobox they are
 * ambiguous between the typed text and the chosen item, and conflating the two
 * is the defect this whole component exists around. The typed text is
 * `query`/`onQueryChange`; the choice is `value`/`onValueChange`.
 *
 * `type` and `role` are the control's identity. `list` is refused because
 * `<datalist>` is the OTHER answer to this problem (ADR-0028) and mixing the
 * two would put two lists on one field.
 */
export type ComboboxProps<T> = ComboboxOwnProps<T> &
  Omit<
    ComponentPropsWithRef<'input'>,
    | keyof ComboboxOwnProps<T>
    | 'type'
    | 'role'
    | 'list'
    | 'size'
    | 'onChange'
    | 'children'
  > &
  ComboboxVariants;
