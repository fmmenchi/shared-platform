import { useEffect, useId, useMemo, useRef } from 'react';
import { cn } from '../../util/cn.js';
import { useCopyLocale, useMessages } from '../../i18n/provider.js';
import { countSelected } from '../../selection/selection.js';
import { Button } from '../button/button.component.js';
import { Toolbar } from '../toolbar/toolbar.component.js';
import { ToolbarItem } from '../toolbar-item/toolbar-item.component.js';
import { tableSelectionBarMessages } from './table-selection-bar.messages.js';
import type { TableSelectionBarProps } from './table-selection-bar.types.js';
import styles from './table-selection-bar.module.css';

/**
 * What is selected, said on the screen — and the one affordance the table
 * cannot offer.
 *
 * THE LIVE REGION IS TRANSIENT AND THIS IS NOT. `Table` announces a change once
 * and falls silent, which is right for an announcement and useless as a state:
 * a reader who arrives a minute later, or who tabs back, has no way to ask how
 * many rows are selected. This is that answer, in words, for everybody — which
 * is also why it is NOT a live region itself. Two of them over one fact would
 * announce it twice.
 *
 * IT IS A LABELLED REGION, and that is the correction to shipping it as a bare
 * `<div>`. The bar appears and disappears, it is not announced when it arrives
 * (deliberately — the table's region carries the count), and in the layout the
 * docs themselves showed it sat BEFORE the table, so forward Tab never reached
 * it. Silent, roleless and behind you is not discoverable by any means at all.
 * As a region named by its own count, it is one stop in the landmark rotor and
 * announces "Selection: 2" as its name.
 *
 * IT COMPLETES THE MODEL. `Selection` has always had an `exclude` mode, and
 * until this existed nothing in the package produced one: a consumer had to
 * assemble the "select all 10,000 matching" banner themselves out of an
 * exported constant, which every review of it called a trap.
 *
 * ONE NUMBER, DERIVED ONCE. It took `count` and `total` as separate props, and
 * two places to put one number is all it takes: measured, a bar offering
 * "Select all 7" that selected 2,450, with nothing warning. `total` is the
 * result set's size and the count comes from it.
 *
 * A TOOLBAR, so the bulk actions cost ONE tab stop. Six of them in a `<div>`
 * cost six on the way past, in a bar that is itself conditional — the reader
 * gets a keyboard that grows and shrinks under them. This is the second family
 * to walk `Toolbar`'s ring, which is the threshold this package uses to say an
 * abstraction earned its place.
 *
 * FOCUS COMES BACK, from any exit. Clearing removes the bar and with it the
 * control that was just used, so focus falls to `<body>`. The element focused
 * when the bar APPEARED is remembered and restored when it goes — which is the
 * lifecycle event, not our Clear button: a consumer's bulk action that empties
 * the selection loses focus exactly the same way, and the first version handled
 * only its own button. Restoring scrolls the page back to that element, which
 * is the point: a focus you cannot see is not a focus.
 */
function TableSelectionBar({
  selection,
  total,
  onSelectEverything,
  onClear,
  label,
  className,
  children,
  ...rest
}: TableSelectionBarProps) {
  const t = useMessages(tableSelectionBarMessages);
  const countId = useId();

  // THE COPY'S LOCALE, not the reader's. Collation asks a different question
  // and gets a different answer (`useTableSort` reads the raw tag); a number
  // inside a sentence has to be written in the sentence's language, or `de-DE`
  // with an English fallback catalog renders "Select all 2.450".
  const locale = useCopyLocale();
  const numbers = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const count = countSelected(selection, total);

  // `undefined` means an `exclude` rule with no total — something is selected
  // and only the server can say how much. Zero means the rule covers nothing,
  // which under `exclude` is reachable by unticking every row one at a time.
  const visible = count === undefined || count > 0;

  const returnTo = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (visible) {
      // NOT `<body>`. A bar that mounts already visible — a restored selection,
      // a route re-entry — captured the body, whose `isConnected` is `true`, so
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

  const said =
    count === undefined
      ? selection.ids.size === 0
        ? t('all')
        : // "All rows selected." is a persistent statement, so it may not be
          // false three inches from a checkbox that is visibly unticked.
          t('allExcept', { count: numbers.format(selection.ids.size) })
      : t('count', { count: numbers.format(count) });

  const escalates =
    onSelectEverything !== undefined &&
    selection.mode === 'include' &&
    total !== undefined &&
    count !== undefined &&
    count < total;

  return (
    <div
      {...rest}
      // NAMED BY THE COUNT. A region whose accessible name is "Selection: 2"
      // delivers this component's stated promise — the answer to "how many?"
      // for a reader who tabs back — through the one navigation route that
      // survives the bar sitting anywhere on the page.
      role="region"
      aria-labelledby={countId}
      className={cn(styles.bar, className)}
    >
      {/* NOT a live region. `Table` already announces the change through its
        own, and a second one over the same fact says it twice. This is the
        PERSISTENT statement; the announcement is the transient one. */}
      <span id={countId} className={styles.count}>
        {said}
      </span>

      <Toolbar
        label={label ?? t('actions')}
        // The count is beside the toolbar, not inside it: without this a reader
        // who tabs in hears "Selection actions, toolbar" and never the number
        // the bar exists to state.
        aria-describedby={countId}
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
        <ToolbarItem>
          <Button variant="ghost" size="sm" onClick={() => onClear()}>
            {t('clear')}
          </Button>
        </ToolbarItem>
        {children}
      </Toolbar>
    </div>
  );
}

export { TableSelectionBar };
