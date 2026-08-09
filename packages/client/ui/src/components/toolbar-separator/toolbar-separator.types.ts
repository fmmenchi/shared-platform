import type { ComponentPropsWithRef } from 'react';

/**
 * No `orientation` prop: it is the opposite of the bar's, and the bar already
 * knows. A consumer who turns a toolbar vertical should not also have to
 * remember every separator inside it.
 */
export type ToolbarSeparatorProps = ComponentPropsWithRef<'hr'>;
