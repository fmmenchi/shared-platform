import { useCallback, type ElementType } from 'react';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useDialogPart } from '../dialog/dialog.context.js';
import { commandsSupported } from '../dialog/dialog.commands.js';
import { Button } from '../button/button.component.js';
import type { DialogTriggerProps } from './dialog-trigger.types.js';

/**
 * Opens the dialog. `command="show-modal"` names it and the browser opens it —
 * the attribute IS the behaviour, and it is rendered on the server too, so the
 * control works before React has hydrated.
 *
 * The `onClick` is the fallback for a browser without invoker commands
 * (Baseline "newly"), and it is the one place this family takes a script: a
 * dialog that does not open is not a degradation, it is a broken control. It
 * asks whether commands exist at CLICK time — asked once when the module loads,
 * the answer on a server is "no DOM" and it is wrong forever after.
 *
 * `aria-haspopup="dialog"` says what will appear. There is deliberately NO
 * `aria-expanded` — unlike the Popover's trigger, this one is INERT while the
 * dialog is open, so "expanded" describes a state nobody can observe from here.
 */
function DialogTrigger(props: DialogTriggerProps) {
  const { as, onClick, ref, ...rest } = props;
  const Component = (as ?? Button) as ElementType;
  const dialog = useDialogPart('DialogTrigger');

  const surface = dialog?.surface;
  const controlled = dialog?.open !== undefined;
  const reportOpen = dialog?.reportOpen;

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) return;

      // Controlled: ASK, do not open. Measured before this: the command opened
      // the dialog behind React's back, the `toggle` reached a `sync` that
      // still saw `open={false}`, and it shut again inside the same frame — so
      // a controlled dialog could not be opened from its own trigger at all.
      if (controlled) {
        reportOpen?.(true);
        return;
      }

      if (commandsSupported()) return;
      surface?.showModal();
    },
    [onClick, controlled, reportOpen, surface],
  );

  return (
    <Component
      type="button"
      {...rest}
      ref={mergeRefs(dialog?.setInvoker, ref)}
      onClick={handleClick}
      // No command while controlled — two owners for one state is how the
      // dialog ended up opening and closing itself.
      command={controlled ? undefined : 'show-modal'}
      commandfor={controlled ? undefined : dialog?.surfaceId}
      aria-haspopup="dialog"
    />
  );
}

export { DialogTrigger };
