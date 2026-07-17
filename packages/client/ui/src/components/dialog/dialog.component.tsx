import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useUi } from '../../i18n/provider.js';
import { Button } from '../button/button.component.js';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
}

/**
 * Native `<dialog>` — the platform provides the modal, focus trap, Escape-to-
 * close and `::backdrop` for free (native-first, lightweight). We add the
 * accessible name wiring and render the DS's own "Close" label, resolved from
 * the active locale — never passed by the consumer.
 */
export function Dialog({ open, onClose, title, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { t } = useUi();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Escape (and requestClose) fire a native `cancel`; keep the component
    // controlled by preventing the native close and letting the app own `open`.
    const onCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    el.addEventListener('cancel', onCancel);
    return () => el.removeEventListener('cancel', onCancel);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="rounded-lg border border-border bg-bg text-fg p-6 backdrop:bg-black/50"
    >
      <div className="flex items-start justify-between gap-6">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <Button
          variant="ghost"
          aria-label={t('dialog.close')}
          onClick={onClose}
        >
          ✕
        </Button>
      </div>
      <div className="mt-4">{children}</div>
    </dialog>
  );
}
