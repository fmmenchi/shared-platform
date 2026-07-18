import * as React from 'react';
import { Slot, Slottable } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../util/cn.js';
import { useUiT } from '../../i18n/provider.js';
import styles from './button.module.css';

// `cva` maps the public variant API to CSS-module class names (the andes-routes
// pattern). The styling lives in `button.module.css`; here we only compose.
const buttonVariants = cva(styles.button, {
  variants: {
    variant: {
      primary: styles.primary,
      secondary: styles.secondary,
      ghost: styles.ghost,
      destructive: styles.destructive,
    },
    size: {
      sm: styles.sm,
      md: styles.md,
      lg: styles.lg,
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});

type ButtonVariants = VariantProps<typeof buttonVariants>;

interface ButtonProps extends React.ComponentProps<'button'>, ButtonVariants {
  asChild?: boolean;
  icon?: React.ReactNode;
  /**
   * Show a spinner + a localized "loading" status and block interaction.
   * The status text is resolved from the active locale (DS-internal copy).
   */
  isLoading?: boolean;
}

/**
 * Native `<button>` — accessible by default (role, focus, Enter/Space, disabled
 * come from the platform). We add token-driven styles via cva and, with
 * `asChild`, polymorphism via Radix Slot. No behavior is re-implemented.
 */
function Button({
  asChild = false,
  className,
  variant,
  size,
  icon,
  isLoading = false,
  type,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  const t = useUiT();
  const isIconOnly = !!(!asChild && icon && !children);

  if (
    process.env.NODE_ENV !== 'production' &&
    isIconOnly &&
    !props['aria-label'] &&
    !props['aria-labelledby']
  ) {
    console.warn(
      'Button: an icon-only button has no discernible text — pass `aria-label`.',
    );
  }

  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      type={asChild ? undefined : (type ?? 'button')}
      disabled={asChild ? undefined : disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading && <span aria-hidden="true" className={styles.spinner} />}
      {icon && !isLoading && (
        <span
          aria-hidden={isIconOnly ? undefined : true}
          className={styles.icon}
        >
          {icon}
        </span>
      )}
      {isLoading && !children ? (
        // No visible label: surface the localized status text as the content.
        <span>{t('button.loading')}</span>
      ) : (
        <Slottable>{children}</Slottable>
      )}
      {isLoading && children ? (
        // Visible label present: keep it, and announce the status to AT only.
        <span className={styles.srOnly}>{t('button.loading')}</span>
      ) : null}
    </Comp>
  );
}

export { Button, buttonVariants };
export type { ButtonProps, ButtonVariants };
