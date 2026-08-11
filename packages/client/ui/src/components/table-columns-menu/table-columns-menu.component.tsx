import { useMessages } from '../../i18n/provider.js';
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
  const { columns, hidden, canHide, onToggle, variant = 'ghost' } = props;
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

      <MenuContent>
        {columns.map((column) => {
          const isHidden = hidden.has(column.key);
          const locked = !canHide(column.key);
          const name = textOf(column);

          // WHY IT IS LOCKED, said rather than implied. A disabled control with
          // no reason is a dead end; and the two reasons are different facts —
          // one column names the rows, one is the last still shown — so a single
          // "unavailable" would teach nothing. Which applies is derivable here
          // because only a VISIBLE column can be the last one.
          const label = locked
            ? isHidden
              ? name
              : shown === 1
                ? t('lastOne', { column: name })
                : t('required', { column: name })
            : name;

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
              aria-label={locked && label !== name ? label : undefined}
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
