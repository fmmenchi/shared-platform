import type { ComponentPropsWithRef } from 'react';

export interface TableColumnResizerProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'role' | 'aria-label' | 'tabIndex'
> {
  /**
   * The column's name IN WORDS. The handle is called after it — "Resize
   * Città" — because a row of identical grips is a row of controls a screen
   * reader cannot tell apart, and the column heading beside it is not part of
   * this control's name.
   */
  label: string;
  /**
   * The smallest this column may become, in CSS pixels. Below some width a
   * column stops showing anything and the reader has no way back except
   * finding a handle that is no longer where they left it.
   *
   * @default 48
   */
  min?: number;
  /**
   * The reader chose a width, in CSS pixels — one call per gesture, not one per
   * pixel travelled. The handle paints the drag itself, because a width is what
   * the browser is already computing sixty times a second and routing it
   * through React would re-render every row to move one border.
   */
  onResize: (width: number) => void;
  /**
   * Back to the width the column declares. Reached by `Enter`, and by
   * double-clicking the handle — the gesture every table with draggable borders
   * has taught people to expect.
   */
  onReset?: () => void;
}
