import { useCallback, type ElementType } from 'react';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { COMMANDS_SUPPORTED, useDialogPart } from '../dialog/dialog.context.js';
import { Button } from '../button/button.component.js';
import type { DialogTriggerProps } from './dialog-trigger.types.js';

/**
 * Opens the dialog. `command="show-modal"` names the dialog and the browser
 * opens it — no handler, and it works before React has hydrated.
 *
 * The `onClick` below is the fallback for a browser without invoker commands
 * (Baseline "newly"), and it is the one place this family takes a script: a
 * dialog that does not open is not a degradation, it is a broken control.
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
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (COMMANDS_SUPPORTED || event.defaultPrevented) return;
      surface?.showModal();
    },
    [onClick, surface],
  );

  return (
    <Component
      type="button"
      {...rest}
      ref={mergeRefs(dialog?.setInvoker, ref)}
      onClick={handleClick}
      command={COMMANDS_SUPPORTED ? 'show-modal' : undefined}
      commandfor={COMMANDS_SUPPORTED ? dialog?.surfaceId : undefined}
      aria-haspopup="dialog"
    />
  );
}

export { DialogTrigger };
