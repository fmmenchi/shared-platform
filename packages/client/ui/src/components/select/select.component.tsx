import { cn } from '../../util/cn.js';
import { useFieldControl } from '../field/field.context.js';
import { selectVariants } from './select.variants.js';
import type { SelectProps } from './select.types.js';

/**
 * A single choice from a short list, built on the native `<select>`. The options
 * are its children — `<option>`, `<optgroup>` — and it is fully transparent
 * (ADR-0013): ref and every native attribute pass through, `value`/`onChange`
 * are never touched, so it works uncontrolled or controlled and drops into any
 * form library. Give it a label.
 *
 * The control keeps its NATIVE rendering, arrow included — the same decision as
 * `Checkbox` and `Radio`, and for the same reason. Removing it with
 * `appearance: none` buys a drawn arrow and risks the thing that makes a select
 * worth using: on a phone the browser opens the system picker, which no popup
 * of ours reaches for thumb comfort. Styling stops at the box.
 *
 * What this is NOT is written into the props: no `multiple` — a fieldset of
 * checkboxes for a few options, a combobox for many — and no search, no icons,
 * no rich rows. The open list belongs to the browser here; when it has to
 * belong to us, that is a different component with a different cost.
 */
function Select(props: SelectProps) {
  const { className, size, children, ...rest } = props;
  // Opt-in Field wiring: inside a <Field>, pick up id / aria-describedby /
  // aria-invalid (the consumer's own props still win); standalone, a no-op.
  const fieldProps = useFieldControl(rest);

  return (
    <select className={cn(selectVariants({ size }), className)} {...fieldProps}>
      {children}
    </select>
  );
}

export { Select };
