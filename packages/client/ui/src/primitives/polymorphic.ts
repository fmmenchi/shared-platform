import type { ComponentPropsWithRef, ElementType } from 'react';

/**
 * Props for a polymorphic component: your own props + `as` + the props of the
 * element/component `as` renders (element props that don't clash with `Own`),
 * including a correctly-typed `ref`. Written once, reused by every component
 * that takes an `as` prop.
 *
 * @example
 * type ButtonProps<As extends ElementType = 'button'> =
 *   PolymorphicProps<As, ButtonOwnProps>;
 * // <Button as="a" href="/x">Go</Button>  → href is typed
 */
export type PolymorphicProps<As extends ElementType, Own = object> = Own & {
  /** Render as this element or component (default: the component's own tag). */
  as?: As;
} & Omit<ComponentPropsWithRef<As>, 'as' | keyof Own>;
