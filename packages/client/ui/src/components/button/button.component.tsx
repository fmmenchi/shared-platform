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
  const isIconOnly = !!(icon && !children);
  const attrs = rest as Record<string, unknown>;

  useDevWarning(
    isIconOnly && !attrs['aria-label'] && !attrs['aria-labelledby'],
    'Button: an icon-only button has no discernible text — pass `aria-label`.',
  );

  // Loading must block activation on EVERY polymorph. A native button gets
  // `disabled`; an anchor/custom component can't, so it gets `aria-disabled`
  // plus a click guard — the guard (not pointer-events) is the real gate,
  // because keyboard activation on a link fires `click` too, and the
  // `preventDefault` stops the `href` navigation.
  const blocksAsNonNative = !isNativeButton && isLoading;
  const handleClick = blocksAsNonNative
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
      className={cn(buttonVariants({ variant, size }), className)}
      type={isNativeButton ? (type ?? 'button') : type}
      disabled={isNativeButton ? disabled || isLoading : undefined}
      aria-busy={isLoading || undefined}
      {...rest}
      aria-disabled={
        blocksAsNonNative
          ? true
          : (attrs['aria-disabled'] as React.AriaAttributes['aria-disabled'])
      }
      onClick={handleClick}
    >
      {adornment}
      {children}

      {/* Loading status for ASSISTIVE TECH only: `aria-busy` alone is
          unreliable across screen readers, so a visually-hidden text carries
          the state — in the user's language, owned by the DS (the ports
          doctrine forbids asking the app for strings). Never visible: it must
          not change the button's size or wording. */}
      {isLoading && <span className={styles.srOnly}>{t('loading')}</span>}
    </Comp>
  );
}

export { Button };
