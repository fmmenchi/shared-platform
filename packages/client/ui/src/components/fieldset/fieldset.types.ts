import type { ComponentPropsWithRef, ReactNode } from 'react';

interface FieldsetOwnProps {
  /** The legend, description, content, and error parts. */
  children?: ReactNode;
  /**
   * Error state of the GROUP. It exposes `data-invalid` for your own styling and
   * — only when you also set `role="radiogroup"`, the one role a `<fieldset>` may
   * take that supports it — `aria-invalid`. On a plain `<fieldset>` (`role=group`)
   * `aria-invalid` is not a supported attribute, so the error TEXT is what carries
   * the state to assistive tech. It does not change what renders on its own, and
   * it is not mirrored onto the controls inside: marking every radio `aria-invalid`
   * would repeat one problem N times. The consumer's validation library owns WHEN
   * this is true (ADR-0013).
   */
  invalid?: boolean;
}

/**
 * A `Fieldset` groups related controls in a native `<fieldset>` named by its
 * `<legend>`, and registers the group's description/error into its
 * `aria-describedby`. Native `disabled` passes straight through and disables
 * every control inside, as does `role` — set `role="radiogroup"` for a group of
 * radios. Layout only; no chrome of its own.
 */
export type FieldsetProps = FieldsetOwnProps &
  Omit<ComponentPropsWithRef<'fieldset'>, keyof FieldsetOwnProps>;

/**
 * The group's name. A native `<legend>` needs no id wiring, so this takes no
 * props of its own.
 */
export type FieldsetLegendProps = ComponentPropsWithRef<'legend'>;

/**
 * Helper text for the group, registered into its `aria-describedby`. Renders only
 * when it has content. The `id` is owned by the part (so the registration can
 * never dangle) — one passed here is ignored.
 */
export type FieldsetDescriptionProps = ComponentPropsWithRef<'p'>;

/**
 * The group's error message, registered into `aria-describedby` and rendered only
 * when it has content. The `id` is owned by the part — one passed here is ignored.
 * Announcement of a freshly-appearing error (focus-on-error or an error summary)
 * is the consumer's job.
 */
export type FieldsetErrorProps = ComponentPropsWithRef<'p'>;

/** How `FieldsetContent` lays the controls out. */
export type FieldsetOrientation = 'vertical' | 'horizontal';

interface FieldsetContentOwnProps {
  children?: ReactNode;
  /**
   * A stack (`vertical`, the default) or a wrapping row (`horizontal`). Declared
   * as a plain union rather than inherited from the cva definition, because
   * `VariantProps` also admits `null` — and cva reads `null` as "skip this
   * variant", which would typecheck and silently leave the controls with no
   * layout at all.
   */
  orientation?: FieldsetOrientation;
}

/**
 * Wraps the group's controls and owns their layout. It is a separate element
 * because the rendered `<legend>` sits outside the fieldset's layout box and
 * would never receive its `gap`.
 */
export type FieldsetContentProps = FieldsetContentOwnProps &
  Omit<ComponentPropsWithRef<'div'>, keyof FieldsetContentOwnProps>;
