import type { ComponentPropsWithRef } from 'react';

interface CheckboxOwnProps {
  /**
   * The MIXED state — some of what this box summarises is on, some is not.
   * Visual and semantic only: it does not change `checked`, and the browser
   * exposes it as `aria-checked="mixed"` on its own, so do not set that.
   *
   * It exists as a prop because `indeterminate` is a DOM property with no HTML
   * attribute: React cannot set it from props, and passing it as one does
   * nothing at all — with no warning. This component applies it via a ref.
   *
   * It is also TRANSIENT: clicking the box clears it and leaves the box checked.
   * Own it like any other derived value — recompute it from the children it
   * summarises in the `onChange` handler.
   */
  indeterminate?: boolean;
}

/**
 * Public Checkbox props: a transparent native `<input type="checkbox">`
 * (ADR-0013). Every native attribute and `ref` passes through, and
 * `checked`/`onChange` are never hijacked, so it drops into any form library.
 *
 * `type` is omitted rather than defaulted — it is the component's identity, not
 * an axis. There is no `size` and no `variant`.
 */
export type CheckboxProps = CheckboxOwnProps &
  Omit<ComponentPropsWithRef<'input'>, 'type' | keyof CheckboxOwnProps>;
