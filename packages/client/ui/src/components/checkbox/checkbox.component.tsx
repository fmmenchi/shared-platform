import { useEffect, useRef, type ChangeEvent } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useFieldControl } from '../field/field.context.js';
import type { CheckboxProps } from './checkbox.types.js';
import styles from './checkbox.module.css';

/**
 * An independent yes/no choice, on the native `<input type="checkbox">`. Like
 * `Input` it is transparent (ADR-0013): every native attribute and `ref` passes
 * through and `checked`/`onChange` are never touched.
 *
 * Label it by NESTING it in a `<label>` — `<label><Checkbox /> Accept</label>`.
 * For several related boxes use a `Fieldset` with a `FieldsetLegend`; unlike
 * radios they do NOT pair by `name`, so each carries its own.
 *
 * The mark is the browser's own, tinted with `accent-color`, for the reason
 * measured on `Radio`: a hand-drawn mark is erased in Windows High Contrast.
 *
 * `indeterminate` is the one place this component is not a pure passthrough,
 * and it has to be: see the prop's own note.
 */
function Checkbox(props: CheckboxProps) {
  const { className, indeterminate = false, onChange, ref, ...rest } = props;
  // Opt-in Field wiring: inside a <Field>, pick up id/aria-describedby/aria-invalid.
  const fieldProps = useFieldControl(rest);
  const el = useRef<HTMLInputElement>(null);

  // `indeterminate` is a DOM PROPERTY with no HTML attribute behind it, so React
  // cannot set it from props — and passing it as one is SILENT: measured, the
  // property stays false and React 19 logs no warning at all. Hence the ref.
  useEffect(() => {
    const node = el.current;
    if (node != null) node.indeterminate = indeterminate;
  }, [indeterminate]);

  // Clicking an indeterminate box CLEARS the property natively — it becomes
  // plainly checked. The prop is the source of truth, so re-assert it here,
  // where the browser has just overwritten it. The effect above cannot cover
  // this: if the consumer's handler leaves `indeterminate` as it was, the prop
  // never changes, and under the React Compiler the component may not re-render
  // at all — measured, this is exactly how it failed before.
  //
  // Not state ownership (ADR-0013): the consumer's handler runs first and gets
  // the untouched event, and if it does change `indeterminate` the effect
  // corrects the property on the next render.
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    const node = el.current;
    if (node != null) node.indeterminate = indeterminate;
  };

  return (
    <input
      type="checkbox"
      ref={mergeRefs(el, ref)}
      className={cn(styles.checkbox, className)}
      onChange={handleChange}
      {...fieldProps}
    />
  );
}

export { Checkbox };
