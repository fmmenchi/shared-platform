import { cn } from '../../util/cn.js';
import { useFieldControl } from '../field/field.context.js';
import { selectVariants } from './select.variants.js';
import { useRefusedWarning, withoutRefused } from './select.guards.js';
import type { SelectProps } from './select.types.js';

/**
 * A single choice from a short list, built on the native `<select>`. The options
 * are its children — `<option>`, `<optgroup>` — and it is fully transparent
 * (ADR-0013): ref and every native attribute pass through, `value`/`onChange`
 * are never touched, so it works uncontrolled or controlled and drops into any
 * form library. Give it a label.
 *
 * The BOX is styled and the LIST stays the browser's. `appearance: none` takes
 * the box — without it WebKit discards the padding entirely, so a Select and an
 * Input started their text at different insets on Safari — and gives up nothing
 * of the list: the popup is still the platform's, still the system picker on a
 * phone. That is the trade this component exists to make; a themed list is what
 * a combobox costs weeks for.
 *
 * What this is NOT is refused in the props AND at runtime: no `multiple` — a
 * fieldset of checkboxes for a few options, a combobox for many — and no search,
 * no icons, no rich rows.
 */
function Select(props: SelectProps) {
  const { className, size, children, ...rest } = props;
  // The type refuses `multiple` and a numeric `size`, but a JSX spread of a
  // non-fresh object is not excess-property-checked — and that spread is the
  // path `FormSelect` takes with the adapter's bag. Measured: `multiple` reached
  // the DOM and flipped the role to `listbox`.
  useRefusedWarning(rest, typeof size === 'number');
  // Opt-in Field wiring: inside a <Field>, pick up id / aria-describedby /
  // aria-invalid (the consumer's own props still win); standalone, a no-op.
  const fieldProps = useFieldControl(withoutRefused(rest));

  return (
    <select
      className={cn(
        // A numeric `size` arriving through a spread would not merely be
        // ignored: cva's default fires only on `undefined`, so it would drop
        // the height class and leave the control unsized.
        selectVariants({ size: typeof size === 'number' ? undefined : size }),
        className,
      )}
      {...fieldProps}
    >
      {children}
    </select>
  );
}

export { Select };
