import { useCallback, useEffect, useId } from 'react';
import {
  pointerMoved,
  useWatchPointer,
} from '../../primitives/pointer-moved.js';
import {
  useDescendant,
  emptyDescendants,
} from '../../primitives/use-descendants.js';
import { useMenuContext } from './menu.context.js';
import type { MenuItemData } from './menu.context.js';
import { useMenubarContext } from '../menubar/menubar.context.js';
import type {
  MenuCommandProps,
  UseMenuCommandOptions,
  UseMenuCommandResult,
} from './use-menu-command.types.js';

/**
 * EVERYTHING A ROW IN A MENU OWES, for whatever element the row happens to be.
 *
 * There are three of them now and they are not one element: a command is a
 * `<button>`, and a checkable command is a native `<input type="checkbox">` or
 * `<input type="radio">` — which is not a stylistic choice but the one the
 * platform sanctions ("ARIA in HTML" allows exactly `menuitemcheckbox` on a
 * checkbox input and `menuitemradio` on a radio one), and it is what keeps the
 * mark, its High Contrast treatment and `form.reset()` the browser's.
 *
 * So the shared part cannot be a component. It is this: joining the family so
 * the arrows and typing reach the row, the roving `tabindex` that makes a menu
 * one tab stop, hovering that hands the cursor to the keyboard, and disabled
 * meaning announced-and-inert. Written once because three copies of it is three
 * chances for one of them to stop agreeing.
 */
export function useMenuCommand(
  options: UseMenuCommandOptions = {},
): UseMenuCommandResult {
  const { disabled: inert, textValue, closeOnSelect = true } = options;
  // The document-wide pointer watch, alive for as long as a command is.
  useWatchPointer();

  // The nearest family: a menu, or the bar itself for a command that sits
  // straight on one.
  const menu = useMenuContext();
  const bar = useMenubarContext();
  const family = menu ?? bar;

  const id = useId();
  const disabled = inert === true;
  const descendantRef = useDescendant(
    family?.items ?? emptyDescendants<MenuItemData>(),
    {
      id,
      textValue,
    },
  );

  const setActiveId = family?.setActiveId;
  const active = family?.activeId === id;

  // GOING AWAY, and saying so — the cleanup `MenuItemTrigger` measured and
  // wrote ("no command then carried tabindex=0 and the whole bar dropped out
  // of the tab order") existed in that one row type and not in the three this
  // hook serves. A plain `MenuItem` straight on a bar is a first-class,
  // tested composition: the reader stands on it, a permission unmounts it,
  // `activeId` points at nothing, the bar holds tabIndex={-1} — unreachable
  // by Tab, silently. A menu recovers because its surface takes the focus; a
  // bar has no surface to fall back on. One question, two answers, one
  // already measured wrong.
  useEffect(
    () => () => setActiveId?.((current) => (current === id ? null : current)),
    [setActiveId, id],
  );
  // The whole stack, not this surface: a command chosen in a submenu leaves
  // nothing standing behind it. A command on a BAR closes nothing, because
  // nothing was opened to reach it.
  const closeAll = menu?.closeAll;

  const getCommandProps = useCallback(
    <P extends object>(props?: P): P & MenuCommandProps => {
      const given = (props ?? {}) as P & {
        onClick?: (event: React.MouseEvent<HTMLElement>) => void;
        onFocus?: (event: React.FocusEvent<HTMLElement>) => void;
        onPointerEnter?: (event: React.PointerEvent<HTMLElement>) => void;
      };

      return {
        ...(props as P),
        id,
        // CSS cannot write `tabindex`, so React must — which is why the active
        // row's identity is in state while its HIGHLIGHT is not: the stylesheet
        // reads the focus, so exactly one row is lit by the engine.
        tabIndex: active ? 0 : -1,
        'aria-disabled': disabled || undefined,
        onClick: (event: React.MouseEvent<HTMLElement>) => {
          // INERT, and it has to be said in code: the row is not `disabled` as
          // far as the platform is concerned, so a click, `Enter` and `Space`
          // all reach it — and on an `<input>` they would also toggle it.
          if (disabled) {
            event.preventDefault();
            return;
          }
          given.onClick?.(event);
          // A command runs and the menu goes: staying open would leave the user
          // looking at a list of things they have already done.
          if (event.defaultPrevented || !closeOnSelect) return;
          closeAll?.();
        },
        onFocus: (event: React.FocusEvent<HTMLElement>) => {
          given.onFocus?.(event);
          setActiveId?.(id);
        },
        onPointerEnter: (event: React.PointerEvent<HTMLElement>) => {
          given.onPointerEnter?.(event);
          // Hovering FOCUSES, so the pointer and the keyboard share one cursor
          // and the next arrow continues from the mouse. A disabled row takes
          // the focus like any other: it is the ONE cursor, and leaving it
          // behind on the row the mouse has left is the disagreement this
          // exists to avoid.
          //
          // ONLY WHEN THE POINTER IS THE THING THAT MOVED. An enter also
          // arrives when the page moves under a resting cursor — which is what
          // a menu opening beneath the mouse does — and taking the focus then
          // is the opposite of sharing a cursor: it takes it from the reader
          // who opened the menu with the keyboard and gives it to a row nobody
          // pointed at.
          if (!pointerMoved(event)) return;
          event.currentTarget.focus();
        },
      } as P & MenuCommandProps;
    },
    [id, active, disabled, closeAll, setActiveId, closeOnSelect],
  );

  return { disabled, ref: descendantRef, getCommandProps };
}
