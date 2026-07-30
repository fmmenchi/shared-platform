import type { ComponentPropsWithRef } from 'react';

/**
 * Helper text, registered into the `aria-describedby` of the nearest describable
 * container — the control's when inside a `Field`, the group's when inside a
 * `Fieldset`. Renders only when it has content. The `id` is owned by the part (so
 * the registration can never dangle) — one passed here is ignored.
 */
export type FieldDescriptionProps = ComponentPropsWithRef<'p'>;
