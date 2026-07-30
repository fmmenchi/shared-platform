import type { ComponentPropsWithRef } from 'react';

/**
 * The error message, registered into the nearest container's `aria-describedby`
 * and rendered only when it has content. The `id` is owned by the part — one
 * passed here is ignored. Announcement of a freshly-appearing error
 * (focus-on-error or an error summary) is the consumer's job.
 */
export type FieldErrorProps = ComponentPropsWithRef<'p'>;
