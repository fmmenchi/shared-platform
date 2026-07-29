import { cn } from '../../util/cn.js';
import { useFieldsetPart } from '../../primitives/context/fieldset.js';
import type { FieldsetLegendProps } from './fieldset.types.js';
import styles from './fieldset.module.css';

/**
 * Names the group. A native `<legend>` is the group's accessible name with no id
 * wiring at all — which is why this component takes no props of its own. Note
 * the rendered legend sits OUTSIDE the fieldset's layout box, so its spacing is
 * a margin rather than the container's `gap`.
 */
function FieldsetLegend(props: FieldsetLegendProps) {
  const { className, ...rest } = props;
  useFieldsetPart('FieldsetLegend');
  return <legend className={cn(styles.legend, className)} {...rest} />;
}

export { FieldsetLegend };
