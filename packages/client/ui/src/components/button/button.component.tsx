import * as React from 'react';
import { cn } from '../../util/cn.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useMessages } from '../../i18n/provider.js';
import { buttonMessages } from './button.messages.js';
import { buttonVariants } from './button.variants.js';
import type { ButtonProps } from './button.types.js';
import styles from './button.module.css';

/**
 * Lets the user trigger an action — submit, confirm, delete — or, with the
 * `as` prop, navigate with the look of a button (`as="a"`, `as={Link}`).
 * Built on the native `<button>`: accessible and themable out of the box.
 */
function Button<As extends React.ElementType = 'button'>(
  props: ButtonProps<As>,
) {
  // Destructure against the concrete `button` shape so the reads below type
  // cleanly; the public signature stays polymorphic for callers.
  const {
    as,
    className,
    variant,
    size,
    icon,
    iconEnd,
    isLoading = false,
    type,
    disabled,
    children,
    onClick,
    ...rest
  } = props as ButtonProps<'button'> & { as?: As };

  const Comp = (as ?? 'button') as React.ElementType;
  const isNativeButton = Comp === 'button';
  const t = useMessages(buttonMessages);
  const isIconOnly = !!((icon || iconEnd) && !children);
  const attrs = rest as Record<string, unknown>;

  useDevWarning(
    isIconOnly && !attrs['aria-label'] && !attrs['aria-labelledby'],
    'Button: an icon-only button has no discernible text — pass `aria-label`.',
  );

  // Loading is PENDING, not disabled: the control keeps focus (a mid-click
  // `disabled` would drop focus to <body> — WCAG 2.4.3 context loss), keeps
  // its variant colours, and blocks activation with `aria-disabled` + a click
  // guard on EVERY polymorph. The guard (not pointer-events) is the real
  // gate: keyboard activation fires `click` too — Enter/Space on a button,
  // Enter on a link — and `preventDefault` also stops `href` navigation and
  // implicit form submission. Native `disabled` remains what the `disabled`
  // prop (a deliberate state) means.
  const isPending = isLoading && !disabled;
  const handleClick = isPending
    ? (event: React.MouseEvent) => event.preventDefault()
    : onClick;

  // Leading adornment: the spinner while loading, otherwise the icon (if any).
  let adornment: React.ReactNode = null;
  if (isLoading) {
    adornment = <span aria-hidden="true" className={styles.spinner} />;
  } else if (icon) {
    adornment = (
      <span aria-hidden={isIconOnly ? undefined : true} className={styles.icon}>
        {icon}
      </span>
    );
  }

  return (
    <Comp
      className={cn(
        buttonVariants({ variant, size }),
        isIconOnly && styles.iconOnly,
        className,
      )}
      type={isNativeButton ? (type ?? 'button') : type}
      disabled={isNativeButton ? disabled : undefined}
      aria-busy={isLoading || undefined}
      {...rest}
      aria-disabled={
        isPending
          ? true
          : (attrs['aria-disabled'] as React.AriaAttributes['aria-disabled'])
      }
      onClick={handleClick}
    >
      {adornment}
      {children}

      {/* Trailing icon: stays while loading (the leading spinner carries the
          state; removing it would shift the layout). */}
      {iconEnd && (
        <span
          aria-hidden={isIconOnly ? undefined : true}
          className={styles.icon}
        >
          {iconEnd}
        </span>
      )}

      {/* Loading status for ASSISTIVE TECH only: `aria-busy` alone is
          unreliable across screen readers, so a visually-hidden text carries
          the state — in the user's language, owned by the DS (the ports
          doctrine forbids asking the app for strings). Never visible: it must
          not change the button's size or wording. `role="status"` makes the
          transition itself announce (polite) — without it, a screen reader
          only learns the state by re-reading the button. */}
      {isLoading && (
        <span role="status" className={styles.srOnly}>
          {t('loading')}
        </span>
      )}
    </Comp>
  );
}

export { Button };
