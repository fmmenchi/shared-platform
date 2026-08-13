import { it, expect } from 'vitest';
import { TableColumnsMenu } from './table-columns-menu.component.js';
import type { ColumnListing } from './table-columns-menu.types.js';

const columns: ColumnListing[] = [{ key: 'name', header: 'Nome' }];
const shared = {
  columns,
  hidden: new Set<string>(),
  canHide: () => true,
  onToggle: () => undefined,
};

const move = () => undefined;
const can = () => true;
const at = () => 1;

/**
 * Reordering is THREE PROPS OR NONE.
 *
 * They used to be three optional props and a comment saying "required with
 * `onMove`", which is a rule a type cannot enforce and a component then cannot
 * rely on. Measured with two of the three: every entry announced "Nome, 1 of 2"
 * — telling the reader the column moves and where it sits — and the Alt+arrow
 * gesture called `onMove` zero times.
 */
it('types', () => {
  const ok = (
    <>
      {/* No reordering at all: the menu only decides what is shown. */}
      <TableColumnsMenu {...shared} />
      {/* All three: the wired path, which is one spread of `menuProps`. */}
      <TableColumnsMenu
        {...shared}
        onMove={move}
        canMove={can}
        positionOf={at}
      />
      {/* @ts-expect-error `onMove` without the clamp and the position */}
      <TableColumnsMenu {...shared} onMove={move} />
      {/* @ts-expect-error the halfway state that announced a position it could not honour */}
      <TableColumnsMenu {...shared} onMove={move} positionOf={at} />
      {/* @ts-expect-error a clamp with nothing to clamp */}
      <TableColumnsMenu {...shared} canMove={can} />
      {/* @ts-expect-error a position with no way to change it */}
      <TableColumnsMenu {...shared} positionOf={at} />
    </>
  );
  expect(ok).toBeTruthy();
});
