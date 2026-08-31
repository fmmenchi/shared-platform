import { cn } from '../../util/cn.js';
import { useFieldControl } from '../field/field.context.js';
import type { ColorPickerProps } from './color-picker.types.js';
import styles from './color-picker.module.css';

/**
 * Pick a colour.
 *
 *     <Field>
 *       <FieldLabel>Brand colour</FieldLabel>
 *       <ColorPicker name="primary" defaultValue="#635bff" />
 *     </Field>
 *
 * `<input type="color">` and nothing else. The platform already ships the picker
 * — the OS one, which a person knows, which has an eyedropper on the desktops
 * that offer one, and which is reachable by keyboard because the browser made it
 * so. There is no popover here, no canvas, no hue slider and no hex field.
 *
 * SO WHY A COMPONENT AT ALL, when `<Input type="color">` already typechecks: it
 * adds no element and no behaviour, only the styling `Input` cannot carry. A
 * colour input's box IS its value — the swatch is painted by the UA inside
 * `::-webkit-color-swatch` and `::-moz-color-swatch`, which nothing in `Input`'s
 * text-shaped rules reaches — so the two need different stylesheets and the same
 * element. That is the whole of its earn.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. There is no text field beside it. A hex you
 * can type is a second control holding the same value, and two controls holding
 * one value is a synchronisation problem an app then owns: which one wins while a
 * person is mid-keystroke, what `#63` means, what happens on blur. The native
 * control has one value and one source of truth. If typing turns out to be needed,
 * it is a compound part with a measured reason — not a slot added in advance.
 *
 * SRGB HEX IS WHAT COMES OUT, and that is the platform's decision rather than
 * this component's: `value` is always `#rrggbb`, lowercased, with no alpha. A
 * consumer working in oklch converts on the way in and out; the design system does
 * not hide that, because a component that pretended to speak oklch would be
 * lying about what the browser hands it.
 */
function ColorPicker(props: ColorPickerProps) {
  const { className, ...rest } = props;

  // Opt-in Field wiring: inside a <Field>, pick up id/aria-describedby/
  // aria-invalid (the consumer's own props still win); standalone, a no-op.
  const fieldProps = useFieldControl(rest);

  return (
    <input
      type="color"
      className={cn(styles.picker, className)}
      {...fieldProps}
    />
  );
}

export { ColorPicker };
