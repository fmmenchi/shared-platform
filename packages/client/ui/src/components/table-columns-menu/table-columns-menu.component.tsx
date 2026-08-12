import { useId } from 'react';
import { useMessages } from '../../i18n/provider.js';
import { VisuallyHidden } from '../visually-hidden/visually-hidden.component.js';
import { Menu } from '../menu/menu.component.js';
import { MenuTrigger } from '../menu-trigger/menu-trigger.component.js';
import { MenuContent } from '../menu-content/menu-content.component.js';
import { MenuItemCheckbox } from '../menu-item-checkbox/menu-item-checkbox.component.js';
import { tableColumnsMenuMessages } from './table-columns-menu.messages.js';
import type { TableColumnsMenuProps } from './table-columns-menu.types.js';

/**
 * A column's name as a string, for the places a node cannot go.
 *
 * `label` FIRST, because that is what it is for. Reading only the header left
 * an icon-headed column with an empty name — a menu entry that began with a
 * comma and never said which column it was.
 */
const textOf = (column: { header: unknown; label?: string }): string =>
  column.label ??
  (typeof column.header === 'string' || typeof column.header === 'number'
    ? String(column.header)
    : '');

/**
 * Which columns the table is showing, and the control that changes it.
 *
 * IT BELONGS TO THE VIEW, not to a column — which is why it lives in the
 * toolbar rather than in a header cell. A header cell's controls decide things
 * about THAT column: how it sorts, what it filters by. Deciding which columns
 * exist is a decision about the whole table, and a control for it hidden inside
 * one column's menu is a control nobody finds.
 *
 * IT HOLDS NOTHING. `useColumnVisibility` owns the state and both refusals;
 * this draws them. Spread `visibility.menuProps` and the two line up.
 *
 * THE MENU STAYS OPEN. Putting three columns away is three decisions, and a
 * menu that closed after each would make the reader reopen it twice — so every
 * entry passes `closeOnSelect={false}`, which is the one place this differs
 * from an ordinary command menu.
 */
function TableColumnsMenu(props: TableColumnsMenuProps) {
  const {
    columns,
    hidden,
    canHide,
    onToggle,
    onMove,
    canMove,
    positionOf,
    variant = 'ghost',
  } = props;
  const hintId = useId();
  const reorderable = onMove !== undefined && positionOf !== undefined;
  const t = useMessages(tableColumnsMenuMessages);

  const shown = columns.filter((column) => !hidden.has(column.key)).length;

  return (
    <Menu>
      {/*
       * THE COUNT IS IN THE NAME, not only in the list behind it. "Some columns
       * are put away" drawn as a glyph is carried by a picture; carried by the
       * accessible name it reaches everybody, and a reader arriving by keyboard
       * has the whole state before opening anything.
       */}
      <MenuTrigger variant={variant} size="sm">
        {t('name', { shown, total: columns.length })}
      </MenuTrigger>

      <MenuContent aria-describedby={reorderable ? hintId : undefined}>
        {reorderable && (
          // ONCE, ON THE MENU. A hint repeated in every entry is four identical
          // clauses read on every arrow press; here it is announced when the
          // menu opens, which is when it is useful.
          <VisuallyHidden id={hintId}>{t('moveHint')}</VisuallyHidden>
        )}
        {columns.map((column) => {
          const isHidden = hidden.has(column.key);
          const locked = !canHide(column.key);
          const name = textOf(column);

          // WHY IT IS LOCKED, said rather than implied. A disabled control with
          // no reason is a dead end; and the two reasons are different facts —
          // one column names the rows, one is the last still shown — so a single
          // "unavailable" would teach nothing. Which applies is derivable here
          // because only a VISIBLE column can be the last one.
          // WHY IT IS LOCKED, said rather than implied — a disabled control
          // with no reason is a dead end. The two reasons are different facts,
          // so a shared "unavailable" would teach neither; which applies is
          // derivable here, because only a VISIBLE column can be the last one.
          const reason = locked
            ? isHidden
              ? undefined
              : shown === 1
                ? t('lastOne')
                : t('required')
            : undefined;

          // WHERE IT SITS, because that is what changes as the reader moves it
          // and the list alone cannot say it — a screen reader announces one
          // item, not the sequence around it.
          //
          // BUILT FROM PARTS, because a locked column can still be moved: the
          // first version let the reason replace the position, so the one
          // column that never moves was also the one that never said where it
          // was. The gesture is NOT here — repeated per entry it is four
          // identical clauses read on every arrow press, so it lives on the
          // menu instead.
          const base = reorderable
            ? t('at', {
                column: name,
                position: positionOf(column.key),
                total: columns.length,
              })
            : name;
          const label = reason === undefined ? base : `${base}, ${reason}`;

          return (
            <MenuItemCheckbox
              key={column.key}
              checked={!isHidden}
              disabled={locked}
              onChange={() => onToggle(column.key)}
              // A DECISION PER COLUMN, and usually more than one of them.
              closeOnSelect={false}
              // Typeahead and the accessible name both want a string; the
              // header may be a node, and then there is nothing to say.
              textValue={name || undefined}
              aria-label={label === name ? undefined : label}
              onKeyDown={(event) => {
                if (!reorderable || !event.altKey) return;
                const delta =
                  event.key === 'ArrowUp'
                    ? -1
                    : event.key === 'ArrowDown'
                      ? 1
                      : 0;
                if (delta === 0) return;

                // PREVENTED WHETHER OR NOT IT MOVES: the menu's own arrows walk
                // the list, and letting a refused move fall through would send
                // the focus away from the column the reader is holding — the
                // opposite of what a clamp is for.
                event.preventDefault();
                if (canMove?.(column.key, delta)) onMove(column.key, delta);
              }}
            >
              {column.header}
            </MenuItemCheckbox>
          );
        })}
      </MenuContent>
    </Menu>
  );
}

export { TableColumnsMenu };
