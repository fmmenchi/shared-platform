import type { CSSProperties } from 'react';
import { cn } from '../../util/cn.js';
import { Alert } from '../alert/alert.component.js';
import { useEffect, useRef, useState } from 'react';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
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
  const { id, variant, title, icon, children, onDismiss, paused } = props;
  const t = useMessages(toastMessages);
  // Computed rather than a destructuring default: one default reading another
  // binding from the same pattern is order-dependent, and the React Compiler
  // refuses to compile it.
  const duration = props.duration ?? 0;
  const timed = duration > 0;

  // A control inside a TIMED toast is a race the reader loses: the split rule
  // gives a timed toast no dismiss button precisely because nothing may race
  // you to a control, and a consumer's own link or Undo button recreates the
  // race with the clock running. Only the DOM can see children, so it is
  // asked after commit — the same probe TableToolbar runs on its summary
  // slot. (No exclusion needed for our own ✕: a timed toast renders none.)
  const shell = useRef<HTMLDivElement | null>(null);
  const [racing, setRacing] = useState(false);
  useEffect(() => {
    setRacing(
      timed === true &&
        shell.current?.querySelector(
          'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) != null,
    );
  });
  useDevWarning(
    racing,
    'Toast: a timed toast contains a control, and the clock races the reader to it. Give this toast no `duration` (it gains a dismiss button), or move the action somewhere that does not disappear.',
  );

  useEffect(() => {
    if (!timed || paused) return;
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, timed, paused, onDismiss]);

  return (
    <div
      ref={shell}
      className={cn(styles.toast)}
      data-toast={id}
      // The status, as a hook this file's own stylesheet can read. It cannot
      // read `--alert-border`: a custom property declared in another CSS module
      // is unreachable from here, which the package's lint rule says out loud —
      // the same wall `CardCover` met over the card's padding.
      data-variant={variant ?? 'info'}
      // The bar below runs on the SAME number the timer does, so the thing on
      // screen and the thing counting cannot disagree.
      style={
        timed
          ? ({ '--toast-duration': `${duration}ms` } as CSSProperties)
          : undefined
      }
    >
      <Alert
        variant={variant}
        title={title}
        icon={icon}
        // OFF. The region announces; see above.
        live="off"
        className={cn(styles.body, timed ? undefined : styles.hasDismiss)}
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
      {timed ? (
        /*
         * HOW LONG IS LEFT, shown rather than guessed at.
         *
         * `aria-hidden`, and not because it does not matter: it is a duplicate
         * of a fact the reader already has by other means, and a bar that
         * announced itself would be a live region inside a live region. What a
         * screen-reader user gets instead is the thing that actually helps —
         * the clock stopping when they arrive.
         *
         * Pure CSS, driven by the same custom property as the timer, and
         * PAUSED by the same state: an indicator that kept running while the
         * clock was stopped would be a lie told once a second.
         */
        <span
          aria-hidden="true"
          data-paused={paused || undefined}
          className={styles.remaining}
        />
      ) : null}
    </div>
  );
}

export { Toast };
