import * as React from 'react';
import { cn } from '../../util/cn.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { hasRenderableChildren } from '../../util/renderable-children.js';
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
  // THROUGH `hasRenderableChildren`, and the bare `!children` it replaces was
  // wrong in BOTH directions. `children={0}` — a counter at zero beside an
  // icon — is falsy, so the zero was classified icon-only: squeezed into an
  // `aspect-square p-0` box, its icon stripped of `aria-hidden`, and a warning
  // demanding `aria-label` over a label anyone can read. Badge says it in one
  // line: a zero is a real count. And `children={[]}` or whitespace are truthy,
  // so a button with an icon and NO readable text was classified as labelled
  // and never warned — the unnamed control this guard exists to catch.
  const isIconOnly = !!((icon || iconEnd) && !hasRenderableChildren(children));
  const attrs = rest as Record<string, unknown>;

  // A DOM tag other than <button> (as="a") cannot take `disabled` (TS already
  // rejects it there); a CUSTOM component gets it forwarded and owns it.
  const isDomTag = typeof Comp === 'string';

  useDevWarning(
    isIconOnly && !attrs['aria-label'] && !attrs['aria-labelledby'],
    'Button: an icon-only button has no discernible text — pass `aria-label`.',
  );
  useDevWarning(
    !isNativeButton && isDomTag && disabled !== undefined,
    'Button: `disabled` does nothing on a non-button DOM polymorph — use `isLoading`, or handle the state in the target component.',
  );

  // SELF-MANAGED pending: when `onClick` returns a promise, the button holds
  // its own pending state until it settles. The ref is the SYNCHRONOUS gate —
  // two physical clicks can land before React re-renders, and the classic
  // double-submit race lives exactly in that window.
  const [isSettling, setIsSettling] = React.useState(false);
  const settlingRef = React.useRef(false);
  const showLoading = isLoading || isSettling;

  // Loading is PENDING, not disabled: the control keeps focus (a mid-click
  // `disabled` would drop focus to <body> — WCAG 2.4.3 context loss), keeps
  // its variant colours, and blocks activation with `aria-disabled` + a click
  // guard on EVERY polymorph. The guard (not pointer-events) is the real
  // gate: keyboard activation fires `click` too — Enter/Space on a button,
  // Enter on a link — and `preventDefault` also stops `href` navigation and
  // implicit form submission. Native `disabled` remains what the `disabled`
  // prop (a deliberate state) means.
  const isPending = showLoading && !disabled;
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isPending || settlingRef.current) {
      event.preventDefault();
      return;
    }
    const result = onClick?.(event) as unknown;
    if (
      result != null &&
      typeof (result as PromiseLike<unknown>).then === 'function'
    ) {
      settlingRef.current = true;
      setIsSettling(true);
      void Promise.resolve(result as PromiseLike<unknown>).finally(() => {
        settlingRef.current = false;
        setIsSettling(false);
      });
    }
  };

  // Leading adornment: the spinner while loading, otherwise the icon (if any).
  let adornment: React.ReactNode = null;
  if (showLoading) {
    adornment = <span aria-hidden="true" className={styles.spinner} />;
  } else if (icon) {
    adornment = (
      <span aria-hidden={isIconOnly ? undefined : true} className={styles.icon}>
        {icon}
      </span>
    );
  }

  return (
    <>
      <Comp
        className={cn(
          buttonVariants({ variant, size }),
          isIconOnly && styles.iconOnly,
          className,
        )}
        type={isNativeButton ? (type ?? 'button') : type}
        disabled={isNativeButton || !isDomTag ? disabled : undefined}
        {...rest}
        aria-busy={
          showLoading
            ? true
            : (attrs['aria-busy'] as React.AriaAttributes['aria-busy'])
        }
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
      </Comp>

      {/* Loading status for ASSISTIVE TECH, as a PERSISTENT live region OUTSIDE
          the button: inside it, the sr-only text would join the accessible
          name ("Save Loading" — nameFrom: contents recurses into role="status"
          too), and a region mounted already-populated is routinely missed by
          screen readers. Kept always mounted and empty when idle, so flipping
          to loading MUTATES an existing region — the reliable announcement
          path. The copy is DS-owned and localized; the end of loading is
          conveyed by `aria-busy` clearing and the region emptying. */}
      <span role="status" className={styles.srOnly}>
        {showLoading ? t('loading') : ''}
      </span>
    </>
  );
}

export { Button };
