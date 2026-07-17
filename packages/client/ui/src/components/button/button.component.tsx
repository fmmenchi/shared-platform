import * as React from 'react';
import { Slot, Slottable } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../util/cn.js';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'rounded-md text-sm font-medium transition',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    'disabled:opacity-50 disabled:pointer-events-none',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-fg hover:opacity-90',
        secondary: 'bg-muted/15 text-fg hover:bg-muted/25',
        ghost: 'bg-transparent text-fg hover:bg-muted/10',
        destructive: 'bg-red-600 text-white hover:opacity-90',
      },
      size: {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2',
        lg: 'px-5 py-2.5 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type ButtonVariants = VariantProps<typeof buttonVariants>;

interface ButtonProps extends React.ComponentProps<'button'>, ButtonVariants {
  asChild?: boolean;
  icon?: React.ReactNode;
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
  type,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
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
      {...props}
    >
      {icon && (
        <span
          aria-hidden={isIconOnly ? undefined : true}
          className="inline-flex shrink-0 items-center justify-center"
        >
          {icon}
        </span>
      )}
      <Slottable>{children}</Slottable>
    </Comp>
  );
}

export { Button, buttonVariants };
export type { ButtonProps, ButtonVariants };
