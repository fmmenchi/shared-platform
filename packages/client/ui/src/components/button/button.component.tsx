import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../util/cn.js';
import type { PolymorphicProps } from '../../primitives/polymorphic.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useMessages } from '../../i18n/provider.js';
import { buttonMessages } from './button.messages.js';
import styles from './button.module.css';

// `cva` maps the public variant API to CSS-module class names. The styling
// lives in `button.module.css`; here we only compose.
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

interface ButtonOwnProps extends ButtonVariants {
  /** Decorative icon (hidden while loading). */
  icon?: React.ReactNode;
  /**
   * Show a spinner + a localized "loading" status and block interaction.
   * The status text is resolved from the active locale (DS-internal copy).
   */
  isLoading?: boolean;
}

type ButtonProps<As extends React.ElementType = 'button'> = PolymorphicProps<
  As,
  ButtonOwnProps
>;

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

export { Button, buttonVariants };
export type { ButtonProps, ButtonVariants };
