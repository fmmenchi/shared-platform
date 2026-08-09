import { useEffect } from 'react';
import { cn } from '../../util/cn.js';
import { Alert } from '../alert/alert.component.js';
import { Button } from '../button/button.component.js';
import { useMessages } from '../../i18n/provider.js';
import { toastMessages } from './toast.messages.js';
import type { ToastProps } from './toast.types.js';
import styles from './toast.module.css';

/**
 * One message. A PART of `ToastRegion`, never rendered on its own — which is
 * why it is not exported: the timer below is correct because the region's
 * `dismiss` is stable for the life of the page, and a caller passing a new
 * function every render would restart the clock on every keystroke.
 *
 * IT IS AN `Alert`, not a second one. The status colours, the icon slot, the
 * title and the visually-hidden severity word that keeps meaning off colour
 * alone (WCAG 1.4.1) all belong to that component. What this adds is the
 * leaving.
 *
 * WITH `live="off"`, and that is the whole reason the region exists. An Alert
 * announces itself by carrying its own live region — which works when it is on
 * the page from the start and not when it is inserted: assistive technology has
 * to be watching a region that ALREADY exists to notice something appear inside
 * it. `ToastRegion` is that region.
 *
 * A TIMED TOAST HAS NO WAY OUT, AND DOES NOT NEED ONE. The first version gave
 * every toast a dismiss button and argued that nothing in it could be
 * unreachable by keyboard because it held no actions — which was circular, as
 * a review pointed out: the dismiss button IS the action, the region renders
 * after the whole app, so it is the last focusable thing in the document, and
 * six seconds is not enough to Tab thirty times. So the two cases are split.
 * One that leaves on its own offers no control to race; one that stays offers
 * a control nothing is racing.
 */
function Toast(props: ToastProps) {
  const { id, variant, title, children, onDismiss, paused } = props;
  const t = useMessages(toastMessages);
  // Computed rather than a destructuring default: one default reading another
  // binding from the same pattern is order-dependent, and the React Compiler
  // refuses to compile it.
  const duration = props.duration ?? 0;
  const timed = duration > 0;

  useEffect(() => {
    if (!timed || paused) return;
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, timed, paused, onDismiss]);

  return (
    <div className={cn(styles.toast)} data-toast={id}>
      <Alert
        variant={variant}
        title={title}
        // OFF. The region announces; see above.
        live="off"
        className={timed ? undefined : styles.body}
      >
        {children}
        {timed ? null : (
          // INSIDE THE ALERT, though it is positioned against the toast.
          // Absolute positioning answers to the nearest positioned ancestor, so
          // the depth costs nothing — but `color` is inherited down the DOM,
          // and as a SIBLING this took nothing at all and computed to black.
          // Written twice now: the first version put it outside and axe caught
          // it, and rebuilding the component put it outside again. The test is
          // what noticed the second time.
          <span className={styles.dismiss}>
            <Button
              variant="ghost"
              size="sm"
              aria-label={t('dismiss')}
              // AS AN ICON, not as children: `Button` decides `isIconOnly` from
              // `icon && !children`, and only an icon-only button is
              // `aspect-square` — so passing the glyph as a child gave a
              // control 44px tall and 32 wide under a finger, which is the
              // shape the button's own comment promises never to ship.
              icon="✕"
              onClick={() => onDismiss(id)}
            />
          </span>
        )}
      </Alert>
    </div>
  );
}

export { Toast };
