import type { ComponentPropsWithRef } from 'react';

/**
 * `type` is not a prop: it IS the component. Everything else an `<input>` takes
 * comes through untouched, because the native colour control is the whole of the
 * behaviour here.
 */
export type ColorPickerProps = Omit<ComponentPropsWithRef<'input'>, 'type'>;
