import { useEffect, useMemo, useRef } from 'react';
import { cn } from '../../util/cn.js';
import { UI_FALLBACK_LOCALE } from '../../i18n/messages.js';
import { useMessages, useUiAdapters } from '../../i18n/provider.js';
import { Button } from '../button/button.component.js';
import { Toolbar } from '../toolbar/toolbar.component.js';
import { ToolbarItem } from '../toolbar-item/toolbar-item.component.js';
import { tableMessages } from '../table/table.messages.js';
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
 * IT COMPLETES THE MODEL. `Selection` has always had an `exclude` mode, and
 * until this existed nothing in the package produced one: a consumer had to
 * assemble the "select all 10,000 matching" banner themselves out of an
 * exported constant, which every review of it called a trap. Here it is a
 * button that appears when `total` says there is more than the page, and the
 * escalation is the only path to a rule that covers rows the browser never
 * received.
 *
 * A TOOLBAR, so the bulk actions cost ONE tab stop. Six of them in a `<div>`
 * cost six on the way past, in a bar that is itself conditional — the reader
 * gets a keyboard that grows and shrinks under them. This is the second family
 * to walk `Toolbar`'s ring, which is the threshold this package uses to say an
 * abstraction earned its place.
 *
 * FOCUS COMES BACK. Clearing removes the bar, and with it the button that was
 * just activated: focus falls to `<body>`, which is the classic way a keyboard
 * user loses their place in a page. So the element focused when the bar
 * APPEARED — in practice the checkbox they ticked — is remembered and restored.
 */
function TableSelectionBar({
  selection,
  count,
  total,
  onSelectEverything,
  onClear,
  label,
  className,
  children,
  ...rest
}: TableSelectionBarProps) {
  const t = useMessages(tableMessages);
  const locale = useUiAdapters()?.i18n.locale ?? UI_FALLBACK_LOCALE;

  // Grouped digits, in the reader's language — the same argument that made the
  // collator ours. "Select all 10000" is a number nobody reads at a glance, and
  // a locale that writes its digits differently gets them.
  const numbers = useMemo(() => {
    try {
      return new Intl.NumberFormat(locale);
    } catch {
      return new Intl.NumberFormat(UI_FALLBACK_LOCALE);
    }
  }, [locale]);

  // `exclude` always covers something — after the header box clears it whole,
  // the rule comes back as an empty `include`, so there is no "everything
  // except everything" state to test for.
  const visible = selection.mode === 'exclude' || selection.ids.size > 0;

  // Captured when the bar APPEARS, which is the moment before the reader has
  // had a chance to move: the element holding focus is the checkbox that caused
  // it. Written in an effect and read in a handler — never during render.
  const returnTo = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (visible)
      returnTo.current = document.activeElement as HTMLElement | null;
  }, [visible]);

  if (!visible) return null;

  const escalates =
    onSelectEverything !== undefined &&
    selection.mode === 'include' &&
    total !== undefined &&
    count !== undefined &&
    count < total;

  return (
    <div {...rest} className={cn(styles.bar, className)}>
      {/* NOT a live region. `Table` already announces the change through its
        own, and a second one over the same fact says it twice — the first
        version of the sort work learned that lesson with `Button`'s pending
        regions. This is the PERSISTENT statement; the announcement is the
        transient one, and they are different jobs. */}
      <span className={styles.count}>
        {count === undefined
          ? t('selectionAll')
          : t('selectionCount', { count: numbers.format(count) })}
      </span>

      <Toolbar
        label={label ?? t('selectionActions')}
        className={styles.actions}
      >
        {escalates && (
          <ToolbarItem>
            <Button variant="ghost" size="sm" onClick={onSelectEverything}>
              {t('selectAllMatching', { total: numbers.format(total) })}
            </Button>
          </ToolbarItem>
        )}
        <ToolbarItem>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // BEFORE the clear, so the element is still there to take it.
              const previous = returnTo.current;
              if (previous?.isConnected) previous.focus();
              onClear();
            }}
          >
            {t('clearSelection')}
          </Button>
        </ToolbarItem>
        {children}
      </Toolbar>
    </div>
  );
}

export { TableSelectionBar };
