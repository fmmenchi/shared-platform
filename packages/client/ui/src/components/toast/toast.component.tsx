import { useEffect } from 'react';
import { cn } from '../../util/cn.js';
import { Alert } from '../alert/alert.component.js';
import { Button } from '../button/button.component.js';
import { useMessages } from '../../i18n/provider.js';
import { toastMessages } from './toast.messages.js';
import type { ToastProps } from './toast.types.js';
import styles from './toast.module.css';

/**
 * One transient message.
 *
 * IT IS AN `Alert`, not a second one. The status colours, the icon slot, the
 * title and — the part worth not writing twice — the visually-hidden severity
 * word that keeps the meaning off colour alone (WCAG 1.4.1) all belong to that
 * component. What this adds is the only thing an Alert does not have: it leaves
 * on its own.
 *
 * WITH `live="off"`, and that is the whole reason the region exists. An Alert
 * announces itself by carrying its own live region — which works when it is on
 * the page from the start, and not when it is inserted: assistive technology
 * has to be watching a region that ALREADY exists to notice something appear
 * inside it. `ToastRegion` is that region; a toast that brought its own would
 * be a second one, announced late or not at all.
 *
 * THE TIMER STOPS when the region is paused, and it restarts rather than
 * resuming — a reader who arrives with 200ms left should not be handed 200ms.
 */
function Toast(props: ToastProps) {
  const { id, variant, title, children, onDismiss, paused } = props;
  // Computed rather than a destructuring default: one default reading another
  // binding from the same pattern is order-dependent, and the React Compiler
  // refuses to compile it — correctly, since the order is not something the
  // language guarantees to a reader.
  const duration = props.duration ?? (variant === 'error' ? 0 : 6000);
  const t = useMessages(toastMessages);

  // DEPENDS ON THE CALLBACK, rather than reading it through a ref. The first
  // version kept a "latest ref" so an unstable `onDismiss` could not restart
  // the timer — and writing a ref during render is exactly what the compiler
  // refuses, correctly. It is unnecessary anyway: the region's `dismiss` is a
  // `useCallback` with no dependencies, so it is the same function for the life
  // of the page and this effect runs once per toast.
  useEffect(() => {
    if (duration <= 0 || paused) return;
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, paused, onDismiss]);

  return (
    <div className={cn(styles.toast)} data-toast={id}>
      <Alert
        variant={variant}
        title={title}
        // OFF. The region announces; see above.
        live="off"
      >
        {children}
        {/* INSIDE the alert, though it is positioned against the toast.
            Absolute positioning answers to the nearest positioned ancestor, so
            the placement is unaffected by the depth — but `color` is inherited
            down the DOM, and as a SIBLING the button took the page's foreground
            and sat on the alert's coloured background. That is a pairing the
            token contract never declared, and axe called it: a contrast
            failure on the one control the message has. */}
        <span className={styles.dismiss}>
          <Button
            variant="ghost"
            size="sm"
            aria-label={t('dismiss')}
            onClick={() => onDismiss(id)}
          >
            ✕
          </Button>
        </span>
      </Alert>
    </div>
  );
}

export { Toast };
