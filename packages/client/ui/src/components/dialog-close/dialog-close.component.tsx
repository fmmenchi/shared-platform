import { useCallback, type ElementType } from 'react';
import { useDialogPart } from '../dialog/dialog.context.js';
import { commandsSupported } from '../dialog/dialog.commands.js';
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
// The prop type is CONCRETE — `Omit<ButtonProps<'button'>, 'as'>` — and not
// `ComponentPropsWithRef<typeof Button>`, nor a generic with a `typeof Button`
// default. Measured, both of those resolve through the `ElementType` constraint
// and degrade the whole bag to a string index signature, so
// `<Trigger nosuchprop onClick={42} as="a" href="/x">` compiled without a word.
// Button's own `as` is omitted before the intersection: two `as` props intersect
// to something nothing satisfies.
function DialogClose(props: DialogCloseProps) {
  const { as, onClick, ...rest } = props;
  const Component = (as ?? Button) as ElementType;
  const dialog = useDialogPart('DialogClose');

  const surface = dialog?.surface;
  const controlled = dialog?.open !== undefined;
  const reportOpen = dialog?.reportOpen;

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) return;

      // Symmetrical with the trigger: while the consumer owns the state, this
      // asks them to close it. (The dialog closes either way — the platform
      // grants every close request — but reporting keeps their prop in step.)
      if (controlled) {
        reportOpen?.(false);
        return;
      }

      if (commandsSupported()) return;
      surface?.close();
    },
    [onClick, controlled, reportOpen, surface],
  );

  return (
    <Component
      type="button"
      {...rest}
      onClick={handleClick}
      command={controlled ? undefined : 'close'}
      commandfor={controlled ? undefined : dialog?.surfaceId}
    />
  );
}

export { DialogClose };
