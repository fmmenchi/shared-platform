import type { ChangeEvent } from 'react';
import { cn } from '../../util/cn.js';
import { useSegmentedControlPart } from '../segmented-control/segmented-control.context.js';
import type { SegmentedControlItemProps } from './segmented-control-item.types.js';
import styles from './segmented-control-item.module.css';

/**
 * One segment of a `SegmentedControl`: a native radio with the button drawn on its
 * own `<label>`.
 *
 * THE INPUT IS HIDDEN FROM SIGHT AND NOTHING ELSE — it keeps its place in the
 * accessibility tree, in the tab order and in the form, which is the entire
 * reason this component is not a `<button>`. That is the one arrangement
 * `VisuallyHidden` refuses to host, and its guard is right to: something
 * focusable that cannot be seen is normally a bug. It is not one here because
 * the LABEL is what the eye follows and what shows the focus ring
 * (`:has(:focus-visible)` in the stylesheet), so the focus is never invisible —
 * it has simply moved to the thing that was drawn for it.
 */
function SegmentedControlItem(props: SegmentedControlItemProps) {
  const { value, className, children, onChange, ...rest } = props;
  const group = useSegmentedControlPart('SegmentedControlItem');

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    // Their handler first, and `preventDefault` calls the report off — the same
    // contract the rest of this package offers. The platform has already moved
    // the selection either way; what is being vetoed is telling the consumer.
    if (!event.defaultPrevented && event.target.checked) group?.select(value);
  };

  // CONTROLLED OR NOT, decided by the group and never guessed here. The wrong
  // branch is not a cosmetic difference: `checked` without the group driving it
  // freezes the segment, and `defaultChecked` while it does drive it silently
  // stops following the prop.
  const selection = group?.controlled
    ? { checked: group.value === value }
    : { defaultChecked: group?.defaultValue === value };

  return (
    <label className={cn(styles.item, className)}>
      <input
        className={styles.input}
        {...rest}
        {...selection}
        type="radio"
        name={group?.name}
        value={value}
        onChange={handleChange}
      />
      {children}
    </label>
  );
}

export { SegmentedControlItem };
