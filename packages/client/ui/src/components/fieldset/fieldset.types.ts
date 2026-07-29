import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { VariantProps } from 'class-variance-authority';
import type { fieldsetContentVariants } from './fieldset.variants.js';

interface FieldsetOwnProps {
  /** The legend, description, content, and error parts. */
  children?: ReactNode;
  /**
   * Error state of the GROUP — exposes `data-invalid` for styling and reveals the
   * error look. It is deliberately not mirrored onto the controls inside: the
   * consumer's validation library owns WHEN this is true (ADR-0013), and marking
   * every radio `aria-invalid` would repeat one problem N times.
   */
  invalid?: boolean;
}

/**
 * A `Fieldset` groups related controls in a native `<fieldset>` named by its
 * `<legend>`, and registers the group's description/error into its
 * `aria-describedby`. Native `disabled` passes straight through and disables
 * every control inside. Layout only; no chrome of its own.
 */
export type FieldsetProps = FieldsetOwnProps &
  Omit<ComponentPropsWithRef<'fieldset'>, keyof FieldsetOwnProps>;

/**
 * The group's name. A native `<legend>` needs no id wiring, so this takes no
 * props of its own.
 */
export type FieldsetLegendProps = ComponentPropsWithRef<'legend'>;

/** Helper text for the group, registered into its `aria-describedby`. */
export type FieldsetDescriptionProps = ComponentPropsWithRef<'p'>;

/**
 * The group's error message, registered into `aria-describedby` and rendered only
 * when it has content. Announcement of a freshly-appearing error (focus-on-error
 * or an error summary) is the consumer's job.
 */
export type FieldsetErrorProps = ComponentPropsWithRef<'p'>;

/** Variant axes of `FieldsetContent`, derived from the cva definition. */
export type FieldsetContentVariants = VariantProps<
  typeof fieldsetContentVariants
>;

interface FieldsetContentOwnProps extends FieldsetContentVariants {
  children?: ReactNode;
}

/**
 * Wraps the group's controls and owns their layout — a stack (`vertical`) or a
 * wrapping row (`horizontal`). It is a separate element because the rendered
 * `<legend>` sits outside the fieldset's layout box and would never receive its
 * `gap`.
 */
export type FieldsetContentProps = FieldsetContentOwnProps &
  Omit<ComponentPropsWithRef<'div'>, keyof FieldsetContentOwnProps>;
