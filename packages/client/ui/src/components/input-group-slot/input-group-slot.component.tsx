import { cn } from '../../util/cn.js';
import { inputGroupSlotVariants } from './input-group-slot.variants.js';
import type { InputGroupSlotProps } from './input-group-slot.types.js';

/**
 * Content inset into a field's border, inside an `InputGroup`: an icon, a text
 * prefix, a clear or reveal button.
 *
 * It carries the field's horizontal inset on its side, which is why the group has
 * none of its own — the slot IS the padding there, so the control's text can never
 * run under it and no width has to be reserved anywhere.
 */
function InputGroupSlot(props: InputGroupSlotProps) {
  const { className, interactive, ...rest } = props;
  return (
    <span
      className={cn(inputGroupSlotVariants({ interactive }), className)}
      {...rest}
    />
  );
}

export { InputGroupSlot };
