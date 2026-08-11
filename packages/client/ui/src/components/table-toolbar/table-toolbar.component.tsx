import { useEffect, useId, useMemo, useRef, type ReactNode } from 'react';
import { cn } from '../../util/cn.js';
import { useCopyLocale, useMessages } from '../../i18n/provider.js';
import { countSelected } from '../../selection/selection.js';
import { hasRenderableChildren } from '../../util/renderable-children.js';
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
  className,
  children,
  ...rest
}: TableToolbarProps) {
  const t = useMessages(tableToolbarMessages);
  const summaryId = useId();

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

  // ANYTHING TO SAY OR ANYTHING TO DO. A toolbar with neither is chrome.
  const visible =
    picked || hasRenderableChildren(summary) || hasRenderableChildren(children);

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

  if (!visible) return null;

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

  const escalates =
    onSelectEverything !== undefined &&
    selection?.mode === 'include' &&
    total !== undefined &&
    count !== undefined &&
    count < total;

  return (
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
      <div id={summaryId} className={styles.summary}>
        {summary}
        {said}
      </div>

      <Toolbar label={t('actions')} className={styles.actions}>
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
  );
}

export { TableToolbar };
