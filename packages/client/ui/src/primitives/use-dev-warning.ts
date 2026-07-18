import { useEffect } from 'react';

/**
 * Dev-only warning: logs `message` when `active` is true (re-fires only on
 * condition/message change). A no-op in production. Keeps dev guards out of
 * component bodies — call it with the condition computed at the call site.
 *
 * @example
 * useDevWarning(
 *   isIconOnly && !ariaLabel && !ariaLabelledby,
 *   'Button: an icon-only button needs an `aria-label`.',
 * );
 */
export function useDevWarning(active: boolean, message: string): void {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && active) {
      console.warn(message);
    }
  }, [active, message]);
}
