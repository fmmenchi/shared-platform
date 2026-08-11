import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '../../util/cn.js';
import { useCopyLocale, useMessages } from '../../i18n/provider.js';
import { countSelected } from '../../selection/selection.js';
import { activeFilters } from '../../filtering/filter.js';
import { hasRenderableChildren } from '../../util/renderable-children.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { VisuallyHidden } from '../visually-hidden/visually-hidden.component.js';
import { Button } from '../button/button.component.js';
import { Toolbar } from '../toolbar/toolbar.component.js';
import { ToolbarItem } from '../toolbar-item/toolbar-item.component.js';
import { tableToolbarMessages } from './table-toolbar.messages.js';
import type { TableToolbarProps } from './table-toolbar.types.js';
import styles from './table-toolbar.module.css';

/**
 * The table's own controls, and what the view is showing — above the rows.
 *
 * ONE CONTAINER, NOT ONE PER FEATURE, and that was the correction. It began as
 * a selection bar, and filters were about to arrive as a second one: two
 * landmarks appearing and disappearing on unrelated schedules, which is two
 * entries coming and going from a reader's rotor for reasons they cannot
 * correlate. A container that is PERMANENT and whose contents change has none
 * of that — the destination is stable, only what it says moves.
 *
 * ABOVE THE TABLE, and that is a reversal worth recording. The selection bar
 * shipped after the table, because a bar that APPEARED behind the reader was
 * never reached by forward Tab. A permanent one is not a surprise: it is there
 * before you act, and it is a named landmark, so it is one jump for a screen
 * reader and a few Shift+Tabs otherwise. Against that, filters DESCRIBE what
 * you are about to read — "12 rows of 240, filtered by city" is worthless
 * after the rows — and a description has to come first. The residual cost is
 * real and stated: acting on a selection means going back up.
 *
 * IT IS PERMANENT FOR TABLES THAT HAVE TABLE-LEVEL FEATURES, not for all of
 * them. Given nothing to say and nothing to do it renders nothing, because a
 * container that contains nothing is an element the consumer pays for on every
 * page.
 *
 * NAMED, NOT COUNTED. Its predecessor took its accessible name from its own
 * count, which made the landmark answer "how many?" — good for a bar that only
 * existed while something was selected, wrong for a permanent one, whose name
 * would then change under the reader every time the view did. The count is a
 * DESCRIPTION now: `aria-describedby` on the region, which is announced on
 * entry, so the answer survives and the name stops moving.
 *
 * A TOOLBAR for the actions, so six of them cost ONE tab stop rather than six.
 * The second family to walk `Toolbar`'s ring, which is the threshold this
 * package uses to say an abstraction earned its place.
 *
 * FOCUS COMES BACK, from any exit. When the toolbar goes — a bulk action that
 * empties the selection, a filter cleared — it takes the control that was just
 * used with it, and focus falls to `<body>`. The element focused when it
 * appeared is remembered and restored.
 */
function TableToolbar({
  summary,
  label,
  selection,
  total,
  onSelectEverything,
  onClear,
  filters,
  rowCount,
  filterLabels,
  onClearFilters,
  className,
  children,
  ...rest
}: TableToolbarProps) {
  const t = useMessages(tableToolbarMessages);
  const summaryId = useId();
  const slotRef = useRef<HTMLDivElement>(null);

  // THE COPY'S LOCALE, not the reader's. Collation asks a different question
  // and gets a different answer (`useTableSort` reads the raw tag); a number
  // inside a sentence has to be written in the sentence's language, or `de-DE`
  // with an English fallback catalog renders "Select all 2.450".
  const locale = useCopyLocale();
  const numbers = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const count =
    selection === undefined ? undefined : countSelected(selection, total);

  // `undefined` with a selection means an `exclude` rule and no total —
  // something is picked and only the server can say how much. Zero means the
  // rule covers nothing, reachable under `exclude` by unticking every row.
  const picked = selection !== undefined && (count === undefined || count > 0);

  // A blank value is not a filter that matches nothing — it is no filter, so a
  // cleared box leaves nothing behind to describe.
  const active = filters === undefined ? [] : activeFilters(filters);
  const filtered = active.length > 0;

  // ANYTHING TO SAY OR ANYTHING TO DO. A toolbar with neither is chrome.
  const visible =
    picked ||
    filtered ||
    hasRenderableChildren(summary) ||
    hasRenderableChildren(children);

  useDevWarning(
    filtered && active.some((key) => filterLabels?.[key] === undefined),
    `TableToolbar: a filtered column has no entry in \`filterLabels\`, so the summary prints its key — a developer identifier, untranslated, inside localized copy. Pass the column's header text, the way a column passes \`label\`.`,
  );

  // SHOWN ONLY WHEN FILTERED, which is the same rule that keeps the live region
  // silent on arrival: the count of an unfiltered table is not news. With a
  // `total` it is a fraction — "12 of 240" is what a reader needs to know they
  // are not seeing everything — and without one it says what it can.
  const shown = !filtered
    ? null
    : rowCount === undefined
      ? null
      : total === undefined
        ? t('filteredCount', { shown: numbers.format(rowCount) })
        : t('filtered', {
            shown: numbers.format(rowCount),
            total: numbers.format(total),
          });

  // ANNOUNCED, because nothing else can. Applying a filter deletes rows, and
  // `Table`'s live region only exists when sorting or selection is wired —
  // filtering happens outside the component entirely, so a reader who could not
  // see the table was told nothing at all. Silent on arrival, like every other
  // region in this family: the first render is not news.
  const [announcement, setAnnouncement] = useState('');
  const arrived = useRef(false);
  // Was it filtered a moment ago — the fact the clear needs and the props no
  // longer carry once the filter is gone.
  const wasFiltered = useRef(false);

  // A control in the summary slot is a tab stop outside the toolbar's ring —
  // one more stop than the toolbar exists to save. Dev only, after the commit,
  // because only the DOM can answer it.
  const [slotHasControls, setSlotHasControls] = useState(false);
  useEffect(() => {
    setSlotHasControls(
      slotRef.current?.querySelector(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) != null,
    );
  });
  useDevWarning(
    slotHasControls,
    "TableToolbar: `summary` contains a control. It keeps a tab stop of its own, before the toolbar — which is one more stop than the toolbar exists to save — and its label is flattened into the region's description. Pass controls as `children`, wrapped in `ToolbarItem`.",
  );

  const returnTo = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (visible) {
      // NOT `<body>`. One that mounts already visible — a restored selection, a
      // route re-entry — captured the body, whose `isConnected` is `true`, so
      // the guard passed and `body.focus()` did nothing at all.
      const active = document.activeElement;
      if (active instanceof HTMLElement && active !== document.body) {
        returnTo.current = active;
      }
      return;
    }

    // It went away, by whatever route. Only when the focus was actually
    // orphaned: a consumer who moved it deliberately keeps it.
    const previous = returnTo.current;
    if (
      previous?.isConnected === true &&
      document.activeElement === document.body &&
      previous.checkVisibility({ visibilityProperty: true })
    ) {
      previous.focus();
    }
  }, [visible]);

  useEffect(() => {
    if (!arrived.current) {
      arrived.current = true;
      wasFiltered.current = filtered;
      return;
    }
    // The row count IS the news — "your filter left twelve rows" — and the
    // sentence is the same one on screen, so the two cannot drift. When there
    // is no sentence but there WAS one, the news is that the filter went: the
    // old code rendered `''` here, and emptying a `role="status"` announces
    // NOTHING — it implies `aria-relevant="additions text"`, so a removal is
    // not relevant. Every row came back and nobody was told, which is the trap
    // sorting's "original order" stop already fell into once.
    const next =
      shown ??
      (wasFiltered.current
        ? total === undefined
          ? t('unfiltered')
          : t('unfilteredCount', { total: numbers.format(total) })
        : null);
    wasFiltered.current = filtered;
    if (next !== null) setAnnouncement(next);
  }, [shown, filtered, total, t, numbers]);

  // OUTSIDE THE CHROME, and that is the whole fix. The bar renders nothing when
  // it has nothing to show, and the live region used to go with it — so the
  // FIRST application inserted a region already containing its sentence, which
  // is the canonical case a screen reader does not speak, and the clear that
  // emptied the bar took the region away before it could say the rows were
  // back. Mounted for as long as the caller is filtering at all, it sits there
  // present, empty and silent until it has news.
  const status =
    filters === undefined ? null : (
      <VisuallyHidden role="status" data-toolbar-status="">
        {announcement}
      </VisuallyHidden>
    );

  if (!visible) return status;

  const said: ReactNode =
    selection === undefined || !picked
      ? null
      : count === undefined
        ? selection.ids.size === 0
          ? t('all')
          : // "All rows selected." is a persistent statement, so it may not be
            // false three inches from a checkbox that is visibly unticked.
            t('allExcept', { count: numbers.format(selection.ids.size) })
        : t('count', { count: numbers.format(count) });

  // THE COLUMNS, NOT THE VALUES. A value can be anything the reader typed and
  // belongs beside its own column's control, where it is editable; here it
  // would be a sentence that grows without bound and says less the longer it
  // gets.
  //
  // NAMED, not keyed. The first version joined the raw keys, so an Italian
  // reader was told "Filtrato per: created_at" — a developer identifier inside
  // localized copy, which is the failure `Column.label` exists to prevent
  // one feature over.
  const by = filtered
    ? t('filteredBy', {
        columns: active.map((key) => filterLabels?.[key] ?? key).join(', '),
      })
    : null;

  // NOT WHILE A FILTER IS ON. "Select all matching" is documented as everything
  // the QUERY matched, and the query a reader can see is the filter — but
  // `total` is the unfiltered size, so the offer sat inches from "Showing 3 of
  // 240" and took the 237 rows they had just filtered away. The two numbers
  // cannot be reconciled from here, so the offer waits until there is only one.
  const escalates =
    onSelectEverything !== undefined &&
    !filtered &&
    selection?.mode === 'include' &&
    total !== undefined &&
    count !== undefined &&
    count < total;

  return (
    <>
      {status}
      <div
        {...rest}
        role="region"
        aria-label={label ?? t('region')}
        // THE COUNT AS A DESCRIPTION. A reader entering the landmark hears its
        // name and then this, so "how many?" is still answered — without the name
        // itself moving every time the view does.
        aria-describedby={summaryId}
        className={cn(styles.bar, className)}
      >
        {/* NOT a live region. `Table` already announces a change through its own,
        and a second one over the same fact says it twice. This is the
        PERSISTENT statement; the announcement is the transient one. */}
        <div className={styles.summary}>
          {/* THE CONSUMER'S SLOT IS NOT PART OF THE DESCRIPTION. Pointed at the
          whole summary, `aria-describedby` flattened whatever was passed here
          into prose — a button in it was announced as words with no hint it was
          operable, and it took a tab stop of its own BEFORE the toolbar,
          defeating the one-stop property the toolbar exists for. */}
          <div ref={slotRef}>{summary}</div>
          <div id={summaryId} className={styles.summary}>
            {shown !== null && <span>{shown}</span>}
            {by !== null && <span className={styles.quiet}>{by}</span>}
            {said !== null && <span>{said}</span>}
          </div>
        </div>

        <Toolbar
          label={t('actions')}
          // ALSO ON THE TOOLBAR. The region carries it for a reader entering the
          // landmark; a keyboard user who tabs straight into the actions never
          // enters it, and the predecessor put it here for exactly that reason.
          aria-describedby={summaryId}
          className={styles.actions}
        >
          {escalates && (
            <ToolbarItem>
              <Button
                variant="ghost"
                size="sm"
                // Wrapped: `onClick={onSelectEverything}` hands the callback a
                // click event that its `() => void` type says it never receives,
                // which TypeScript cannot see and a variadic consumer can.
                onClick={() => onSelectEverything()}
              >
                {t('selectAllMatching', { total: numbers.format(total) })}
              </Button>
            </ToolbarItem>
          )}
          {filtered && onClearFilters !== undefined && (
            <ToolbarItem>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onClearFilters()}
              >
                {t('clearFilters')}
              </Button>
            </ToolbarItem>
          )}
          {picked && onClear !== undefined && (
            <ToolbarItem>
              <Button variant="ghost" size="sm" onClick={() => onClear()}>
                {t('clear')}
              </Button>
            </ToolbarItem>
          )}
          {children}
        </Toolbar>
      </div>
    </>
  );
}

export { TableToolbar };
