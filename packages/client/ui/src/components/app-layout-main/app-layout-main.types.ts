import type { ComponentPropsWithRef } from 'react';

/**
 * The page's one `<main>`. Everything a `<main>` takes — except `id`, which the
 * shell owns because the skip link points at it.
 */
export type AppLayoutMainProps = ComponentPropsWithRef<'main'>;
