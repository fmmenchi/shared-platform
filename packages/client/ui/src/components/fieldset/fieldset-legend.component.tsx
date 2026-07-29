import { cn } from '../../util/cn.js';
import { useDescribable } from '../../primitives/describable.js';
import type { FieldsetLegendProps } from './fieldset.types.js';
import styles from './fieldset.module.css';

/**
 * Names the group. A native `<legend>` is the group's accessible name with no id
 * wiring at all — which is why this component takes no props of its own. Unlike
 * the description and error, it fits only ONE container: a `<legend>` names a
 * group, never a single field, so it warns inside anything else. Note the rendered
 * legend sits OUTSIDE the fieldset's layout box, so its spacing is a margin rather
 * than the container's `gap`.
 */
function FieldsetLegend(props: FieldsetLegendProps) {
  const { className, ...rest } = props;
  useDescribable('FieldsetLegend', 'Fieldset');
  return <legend className={cn(styles.legend, className)} {...rest} />;
}

export { FieldsetLegend };
