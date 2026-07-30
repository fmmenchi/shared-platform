import type { ComponentPropsWithRef } from 'react';

/**
 * The group's name. A native `<legend>` needs no id wiring, so this takes no props
 * of its own. It is the one part that fits a single container: a `<legend>` names a
 * group, never a field.
 */
export type FieldsetLegendProps = ComponentPropsWithRef<'legend'>;
