import { useEffect, useRef } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useNativeProperty } from '../../primitives/use-native-property.js';
import { useFieldControl } from '../field/field.context.js';
import type { CheckboxProps } from './checkbox.types.js';
import styles from './checkbox.module.css';

/**
 * An independent yes/no choice — or a THREE-state one — on the native
 * `<input type="checkbox">`. Like `Input` it is transparent (ADR-0013): every
 * native attribute and `ref` passes through, and `onChange` is attached to the
 * element unchanged.
 *
 * The third state is a value of `checked`, not a prop of its own
 * (`checked="indeterminate"`, Radix's model). One source of truth means "mixed"
 * cannot disagree with "checked" — the desync that a separate `indeterminate`
 * prop invites is not expressible.
 *
 * Label it by NESTING it in a `<label>` — `<label><Checkbox /> Accept</label>`.
 * For several related boxes use a `Fieldset` with a `FieldsetLegend`; unlike
 * radios they do NOT pair by `name`, so each carries its own.
 *
 * The mark is the browser's own, tinted with `accent-color`, for the reason
 * measured on `Radio`: a mark drawn with a fill is erased in Windows High
 * Contrast, leaving checked indistinguishable from unchecked.
 */
function Checkbox(props: CheckboxProps) {
  // NOTE there are no defaults inside this pattern. A default in a destructuring
  // pattern makes the React Compiler abandon the whole component (`Expected
  // object property value to be an LVal, got: AssignmentPattern`) — measured,
  // and visible in the shipped bundle, which then carries no memo cache while
  // its siblings do. Nothing reports it: lint stays green.
  const { className, checked, defaultChecked, ref, ...rest } = props;
  const fieldProps = useFieldControl(rest);
  const el = useRef<HTMLInputElement>(null);

  // `indeterminate` is a property with no HTML attribute, so React cannot set it
  // from props — pass it as one and nothing happens, with no warning. Driven
  // when `checked` is, a starting value when only `defaultChecked` is, and
  // restored after a change, which clears it natively.
  const mixed = checked === undefined ? undefined : checked === 'indeterminate';
  useNativeProperty(el, 'indeterminate', {
    value: mixed,
    initial: defaultChecked === 'indeterminate' ? true : undefined,
  });

  // Clicking a mixed box CLEARS the property natively — it becomes plainly
  // checked. When the state is driven, the prop is the truth, so write it again.
  // From the element's OWN listener rather than by wrapping the consumer's
  // `onChange`: a wrapper sits on the element permanently, so React can never
  // see that they forgot theirs, and its "controlled without onChange" warning
  // silently disappears (measured — Radio still emits it, Checkbox had stopped).
  // This listener also runs after React's onChange, so their handler still reads
  // the browser's own post-click values.
  useEffect(() => {
    const node = el.current;
    if (node == null || mixed === undefined) return;
    const restore = () => {
      node.indeterminate = mixed;
    };
    node.addEventListener('change', restore);
    return () => node.removeEventListener('change', restore);
  }, [mixed]);

  return (
    <input
      type="checkbox"
      ref={mergeRefs(el, ref)}
      className={cn(styles.checkbox, className)}
      // The element only ever sees booleans; the third state lives in the
      // property set above. A mixed box is UNCHECKED for form submission.
      checked={checked === 'indeterminate' ? false : checked}
      defaultChecked={
        defaultChecked === 'indeterminate' ? false : defaultChecked
      }
      {...fieldProps}
    />
  );
}

export { Checkbox };
