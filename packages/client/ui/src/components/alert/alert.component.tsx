import { cn } from '../../util/cn.js';
import { useMessages } from '../../i18n/provider.js';
import { alertMessages } from './alert.messages.js';
import { alertVariants } from './alert.variants.js';
import type { AlertProps } from './alert.types.js';
import styles from './alert.module.css';

/**
 * A prominent inline message that gives the user feedback — success, a warning,
 * an error, or information. The `variant` carries the meaning through colour AND
 * a visually-hidden severity word, so the status reaches assistive tech too
 * (never colour alone, WCAG 1.4.1). `live` sets the announcement POLITENESS —
 * see {@link AlertProps.live} for the reliability caveat when the alert is
 * inserted already-populated.
 */
function Alert(props: AlertProps) {
  const {
    className,
    variant: variantProp,
    title,
    icon,
    live,
    children,
    ...rest
  } = props;
  // VariantProps allows null (not just undefined) — coalesce both to the default.
  const variant = variantProp ?? 'info';
  const t = useMessages(alertMessages);

  // An error interrupts (assertive); other statuses wait for a pause (polite).
  // `off` leaves no live region — for content already on the page at load.
  const effectiveLive = live ?? (variant === 'error' ? 'assertive' : 'polite');
  const role =
    effectiveLive === 'assertive'
      ? 'alert'
      : effectiveLive === 'polite'
        ? 'status'
        : undefined;

  return (
    // The derived role is applied AFTER {...rest}, so `live` is the single knob
    // and a stray `role` in the spread can't silently kill the announcement.
    // `off` applies none, leaving any custom role the consumer set intact.
    <div
      className={cn(alertVariants({ variant }), className)}
      {...rest}
      {...(role ? { role } : {})}
    >
      {icon != null && (
        <span aria-hidden="true" className={styles.icon}>
          {icon}
        </span>
      )}
      <div className={styles.content}>
        {/* Severity for assistive tech — the status must not be carried by
            colour alone. Visually hidden; the colour + optional icon carry it
            for sighted users. */}
        <span className={styles.srOnly}>{t(variant)}: </span>
        {title != null && <p className={styles.title}>{title}</p>}
        <div className={styles.message}>{children}</div>
      </div>
    </div>
  );
}

export { Alert };
