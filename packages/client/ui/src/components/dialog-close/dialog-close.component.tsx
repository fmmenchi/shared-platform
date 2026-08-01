import { useCallback, type ElementType } from 'react';
import { COMMANDS_SUPPORTED, useDialogPart } from '../dialog/dialog.context.js';
import { Button } from '../button/button.component.js';
import type { DialogCloseProps } from './dialog-close.types.js';

/**
 * Closes the dialog from inside it — `command="close"`, the same declarative
 * pair as the trigger, with the same fallback.
 *
 * It earns its place for one reason: the dialog's id is generated and internal,
 * so without this part there is no way to write that attribute yourself. For a
 * dialog that RETURNS something — confirmed, cancelled — a
 * `<form method="dialog">` is the platform's own answer and needs no part at
 * all: the submit button's `value` lands in `dialog.returnValue`.
 */
function DialogClose(props: DialogCloseProps) {
  const { as, onClick, ...rest } = props;
  const Component = (as ?? Button) as ElementType;
  const dialog = useDialogPart('DialogClose');

  const surface = dialog?.surface;
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (COMMANDS_SUPPORTED || event.defaultPrevented) return;
      surface?.close();
    },
    [onClick, surface],
  );

  return (
    <Component
      type="button"
      {...rest}
      onClick={handleClick}
      command={COMMANDS_SUPPORTED ? 'close' : undefined}
      commandfor={COMMANDS_SUPPORTED ? dialog?.surfaceId : undefined}
    />
  );
}

export { DialogClose };
