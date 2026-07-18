import * as React from 'react';
import { cn } from '../../util/cn.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useMessages } from '../../i18n/provider.js';
import { buttonMessages } from './button.messages.js';
import { buttonVariants } from './button.variants.js';
import type { ButtonProps } from './button.types.js';
import styles from './button.module.css';

/**
 * Polymorphic, native-first button. Renders a `<button>` by default; pass `as`
 * to render another element/component (`as="a"`, `as={Link}`) while keeping the
 * button's look. Accessibility comes from the underlying native element — no
 * behaviour is re-implemented.
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

  const loadingLabel = t('loading');

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
    >
      {adornment}

      {/* The caller's content, or the loading label when there's nothing else. */}
      {children ?? (isLoading ? loadingLabel : null)}

      {/* When loading over visible content, announce the status to AT only. */}
      {isLoading && children != null && (
        <span className={styles.srOnly}>{loadingLabel}</span>
      )}
    </Comp>
  );
}

export { Button };
