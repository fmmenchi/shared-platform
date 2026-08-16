import { useEffect, useId, useState } from 'react';
import { UI_FALLBACK_LOCALE } from '../i18n/messages.js';
import { useUiAdapters } from '../i18n/provider.js';
import { matches, says } from './combobox-filter.js';
import type {
  ComboboxList,
  ComboboxListOptions,
  Spot,
} from './use-combobox-list.types.js';

/**
 * The rows of a combobox and where the keyboard is in them — everything two
 * combobox-shaped controls share, and nothing either of them owns alone.
 *
 * ADR-0029 §1 splits single-select and multi-select into two components because
 * their BOX is not the same box: `control-md` is a fixed `h-9`, and a field
 * whose chips wrap has a `min-height` and grows, which is the one thing those
 * heights exist to prevent. What that split must not do is duplicate the part
 * that is hard — the filtering, the create predicate, and a highlight that is
 * state with no DOM home because focus never leaves the field.
 *
 * IT OWNS THE LIST AND NEVER THE VALUE, which is the whole boundary. Three
 * things are deliberately absent, and any one of them would bring the rejected
 * `multiple` boolean back in through the basement:
 *
 * - **what is chosen**, and whether that is one key or many;
 * - **what the field displays** — a single-select shows the chosen label, a
 *   multi-select always and only the query;
 * - **whether activating a row closes the surface** — single yes, multiple no.
 *
 * So the contract is: here are the rows, here is where you are, and the caller
 * decides what activating a spot means.
 *
 * EXTRACTED BEFORE THE SECOND CONSUMER EXISTS, which is a deliberate exception
 * to this package's rule that a policy moves at the second copy. The second copy
 * is certain, and every line here was written after an adversarial review found
 * a defect in it — the `Spot` union replacing an index, the clamp inside `move`
 * as well as in render, the offer counted as a row. Copying it would mean
 * copying those defects' absence and hoping.
 */
export function useComboboxList<T>(
  options: ComboboxListOptions<T>,
): ComboboxList<T> {
  const {
    items,
    getLabel,
    filter,
    query,
    searching,
    offersCreation = false,
    canCreate,
  } = options;

  // THE READER'S TAG, not the copy's, which is `useTableFilters`' distinction
  // and its reason: a German app whose copy fell back to English must still
  // fold as German. Reached through the adapters rather than through
  // `useCopyLocale`, exactly as the table's filter does, so a combobox and a
  // table on one screen answer "contains" the same way.
  const locale = useUiAdapters()?.i18n.locale ?? UI_FALLBACK_LOCALE;
  const listId = useId();
  const optionId = (spot: Spot) =>
    `${listId}-${spot === 'create' ? 'create' : String(spot)}`;

  // `null` IS THE OPENING STATE, not `0`. Opening highlights nothing, which is
  // what `aria-autocomplete="list"` declares and what keeps `Enter` the form's
  // until the user has moved to a row: the first version highlighted row 0 on
  // every keystroke, so someone typing "man" and pressing Enter to SUBMIT got
  // "Manchester" committed instead.
  const [active, setActive] = useState<Spot | null>(null);

  const shown =
    !searching || filter === false || query === ''
      ? items
      : items.filter((item) =>
          filter ? filter(item, query) : matches(getLabel(item), query, locale),
        );

  // "NO RECORD ALREADY SAYS THIS" IS NOT NEGOTIABLE, and `canCreate` refines it
  // rather than replacing it. Replacing, a consumer adding a length rule
  // silently took over a duplicate check they were never told they owned.
  //
  // ASKED OF `items` AND NOT OF `shown`: a query the filter rejects leaves an
  // empty list, and a check against an empty list passes trivially — `Milano `
  // with a trailing space showed nothing but the offer to create it.
  const creatable =
    offersCreation &&
    query.trim() !== '' &&
    !items.some((item) => says(getLabel(item), query, locale)) &&
    (canCreate ? canCreate(query, shown) : true);
  const rows = creatable ? shown.length + 1 : shown.length;

  // CLAMPED AT RENDER, because `items` change from outside and nothing in here
  // hears about it. Left alone, a highlight held past the end of a shorter list
  // pointed `aria-activedescendant` at an id that did not exist (a broken IDREF,
  // WCAG 4.1.2) and made `Enter` a silent no-op.
  const highlighted: Spot | null =
    active === 'create'
      ? creatable
        ? 'create'
        : null
      : active !== null && active < shown.length
        ? active
        : null;

  const move = (delta: number) => {
    if (rows === 0) return;
    setActive((current) => {
      // FROM THE CLAMPED POSITION, not the raw one. The render clamps a stale
      // highlight to nothing, but this used to read the state: with `active` at
      // 7 and the list down to 3 rows, `ArrowDown` computed `8 % 3` and landed
      // on the THIRD row — the same "commit a row you never looked at" the
      // manual-selection rule exists to prevent, through the other door.
      const from =
        current === 'create'
          ? creatable
            ? shown.length
            : null
          : current !== null && current < shown.length
            ? current
            : null;
      // From nothing, a step down lands on the first row and a step up on the
      // last — which is what makes "open, then press up" reach the end. The
      // offer to create is the last row, so the same arithmetic reaches it.
      const next =
        from === null
          ? delta > 0
            ? 0
            : rows - 1
          : from + delta < 0
            ? rows - 1
            : (from + delta) % rows;
      return creatable && next === shown.length ? 'create' : next;
    });
  };

  // KEEP THE HIGHLIGHT ON SCREEN. The list scrolls at nine rows, and the
  // highlight is an attribute rather than focus — so nothing scrolls it into
  // view for us, and a keyboard user walking past row nine watched a list that
  // appeared frozen. `nearest` leaves a row that is already visible alone.
  const highlightId = highlighted === null ? null : optionId(highlighted);
  useEffect(() => {
    if (highlightId === null) return;
    document.getElementById(highlightId)?.scrollIntoView({ block: 'nearest' });
  }, [highlightId]);

  return {
    listId,
    optionId,
    shown,
    creatable,
    rows,
    highlighted,
    move,
    clearHighlight: () => {
      setActive(null);
    },
  };
}
