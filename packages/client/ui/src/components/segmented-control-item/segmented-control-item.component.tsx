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

  // THE WHOLE BAG IS SPREAD, minus the few this item COMPOSES rather than
  // takes. An earlier version of this file picked six properties off it, and
  // what that dropped was invisible until it was named: through Conform the bag
  // also carries `required` (so a bound group silently opted out of the native
  // constraint validation `FormInput` keeps, since it spreads), `form` (a
  // control rendered outside the `<form>` stopped submitting) and `id`. The
  // port's own type says "spread onto it"; picking was a second, contradictory
  // contract that no test could compare against the first.
  //
  // `value` and `type` come out too: the item states both itself, from the prop
  // it was given and from what a segment IS, and an adapter can only ever agree
  // with them.
  const boundRest = { ...bound } as Record<string, unknown>;
  for (const own of ['name', 'ref', 'onChange', 'onBlur', 'value', 'type']) {
    delete boundRest[own];
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    // THE BINDING HEARS EVERY PICK, VETO OR NOT — and the first version of this
    // migration got it wrong by returning here on `defaultPrevented`.
    //
    // `preventDefault` is not `stopPropagation`, and React consults neither
    // before running the rest of the path: bound through the GROUP, as this was
    // before, the adapter's handler sat on the wrapper and heard the change
    // regardless. Vetoing it here silently changed what the call site means. The
    // platform has already moved the radio — the DOM shows the new option — so a
    // form that did not hear it holds a value the page contradicts, and which of
    // the two wins is then decided by whether the library is controlled. Same
    // call site, three outcomes, chosen by a swap of library: the leak the
    // shared suite exists to catch.
    //
    // What `preventDefault` vetoes is what it always vetoed: TELLING THE
    // CONSUMER.
    bound?.onChange?.(event);
    if (!event.defaultPrevented && event.target.checked) group?.select(value);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    onBlur?.(event);
    // Unconditional for the same reason, and `focusout` is not cancelable
    // anyway. Touched-gated adapters write `touched` from here — Formik's do —
    // so a group that swallowed it showed its error only after a submit while
    // every sibling control showed it on leaving.
    bound?.onBlur?.(event);
  };

  // CONTROLLED OR NOT, decided by the group and never guessed here. The wrong
  // branch is not a cosmetic difference: `checked` without the group driving it
  // freezes the segment, and `defaultChecked` while it does drive it silently
  // stops following the prop.
  //
  // Bound, this is EMPTY and the adapter's own bag answers instead — see the
  // spread below. The three shapes are all correct: a controlled library sends
  // `checked`, Conform sends `defaultChecked`, and react-hook-form sends
  // neither because it leaves the state in the DOM.
  const selection = bound
    ? {}
    : group?.controlled
      ? { checked: group.value === value }
      : { defaultChecked: group?.defaultValue === value };

  return (
    <label className={cn(styles.item, className)}>
      <input
        className={styles.input}
        {...rest}
        {...boundRest}
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
