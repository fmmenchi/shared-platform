import { useCallback, useId } from 'react';
import { useDescendant } from '../../primitives/use-descendants.js';
import { useMenuContext } from './menu.context.js';
import { useMenubarContext } from '../menubar/menubar.context.js';
import type {
  MenuCommandProps,
  UseMenuCommandOptions,
  UseMenuCommandResult,
} from './use-menu-command.types.js';

/** Outside a family there is nothing to join; the row still renders. */
const EMPTY_FAMILY = {
  rootRef: () => undefined,
  items: () => [],
  indexOf: () => -1,
  registry: {
    add: () => undefined,
    update: () => undefined,
    remove: () => undefined,
  },
};

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

  // The nearest family: a menu, or the bar itself for a command that sits
  // straight on one.
  const menu = useMenuContext();
  const bar = useMenubarContext();
  const family = menu ?? bar;

  const id = useId();
  const disabled = inert === true;
  const descendantRef = useDescendant(family?.items ?? EMPTY_FAMILY, {
    id,
    textValue,
  });

  const setActiveId = family?.setActiveId;
  const active = family?.activeId === id;
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
          event.currentTarget.focus();
        },
      } as P & MenuCommandProps;
    },
    [id, active, disabled, closeAll, setActiveId, closeOnSelect],
  );

  return { disabled, ref: descendantRef, getCommandProps };
}
