import type { ChangeEvent, FocusEvent } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useOptionBinding } from '../../form/option-binding.context.js';
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
 *
 * IT IS ALSO WHERE A FORM BINDING LANDS, when there is one. `FormSegmentedControl`
 * binds the FIELD once and each option asks for its own props here, which is
 * what finally gets a `ref` onto every radio: bound through the group instead —
 * the shape the port could express until now — there was no "the input" of a
 * radio group to hand a ref to, so a library could neither focus the field from
 * an error summary nor write a value back into it. Unbound, none of this runs.
 */
function SegmentedControlItem(props: SegmentedControlItemProps) {
  const { value, className, children, onChange, onBlur, ref, ...rest } = props;
  const group = useSegmentedControlPart('SegmentedControlItem');
  const bound = useOptionBinding()?.option(value);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    // Their handler first, and `preventDefault` calls the report off — the same
    // contract the rest of this package offers. The platform has already moved
    // the selection either way; what is being vetoed is telling the consumer.
    if (event.defaultPrevented) return;
    // The BINDING hears it before the group does, because it is what stores the
    // value: a consumer's `onValueChange` firing against a form state that has
    // not moved yet is the disagreement all of this exists to prevent.
    bound?.onChange?.(event);
    if (event.target.checked) group?.select(value);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    onBlur?.(event);
    // Touched-gated adapters write `touched` from here — Formik's do — so a
    // group that swallowed it showed its error only after a submit while every
    // sibling control showed it on leaving.
    if (!event.defaultPrevented) bound?.onBlur?.(event);
  };

  // CONTROLLED OR NOT, decided by the group and never guessed here. The wrong
  // branch is not a cosmetic difference: `checked` without the group driving it
  // freezes the segment, and `defaultChecked` while it does drive it silently
  // stops following the prop.
  //
  // Bound, the answer comes from the adapter instead, and the three shapes are
  // all correct: a controlled library sends `checked`, Conform sends
  // `defaultChecked`, and react-hook-form sends neither because it leaves the
  // state in the DOM. Reading `group` there would be a second holder of one
  // value — the defect this component's own context comment warns about.
  const selection = bound
    ? { checked: bound.checked, defaultChecked: bound.defaultChecked }
    : group?.controlled
      ? { checked: group.value === value }
      : { defaultChecked: group?.defaultValue === value };

  return (
    <label className={cn(styles.item, className)}>
      <input
        className={styles.input}
        {...rest}
        {...selection}
        type="radio"
        // The binding's name wins where there is one: it is the field's, and the
        // group was only ever told it by the same wrapper.
        name={bound?.name ?? group?.name}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        ref={mergeRefs(bound?.ref, ref)}
      />
      {children}
    </label>
  );
}

export { SegmentedControlItem };
