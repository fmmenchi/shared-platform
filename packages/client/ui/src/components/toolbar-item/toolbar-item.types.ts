import type { ReactElement, Ref } from 'react';

export interface ToolbarItemProps {
  /**
   * The control. A SINGLE element that accepts a ref and spreads its props —
   * one of this package's components, or anything of yours that behaves like
   * one. It is cloned, not wrapped, so it keeps every prop, class and role it
   * came with.
   *
   * Typed `ReactElement` rather than `ReactNode`, like the Tooltip's trigger
   * and for the same reason: bare text and an array of elements cannot carry a
   * tab stop, and the compiler is a better place to learn that than the
   * console. What the type CANNOT see — a fragment, or a component that drops
   * the `ref` — is caught after mount instead, by name.
   */
  children: ReactElement;
  /**
   * Merged into the control's own, alongside the toolbar's.
   *
   * There is no element of ours for it to target, so it goes where you meant
   * it: the control. It exists because something outside may need to reach that
   * control THROUGH this — a `Tooltip` wrapping a toolbar button hands its ref
   * down this way, and without it that composition is impossible.
   */
  ref?: Ref<HTMLElement>;
}
