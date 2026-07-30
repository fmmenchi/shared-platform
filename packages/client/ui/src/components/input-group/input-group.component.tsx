import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { inputGroupVariants } from './input-group.variants.js';
import type { InputGroupProps } from './input-group.types.js';

/** Anything a click is already going to the right place for. */
const INTERACTIVE = 'input, textarea, select, button, a, [tabindex]';
const CONTROL = 'input, textarea';

/**
 * Puts content inside a field's border — an icon, a prefix, a clear button —
 * around a control that stays a plain, transparent child.
 *
 * @example
 * <InputGroup>
 *   <InputGroupSlot><SearchIcon aria-hidden /></InputGroupSlot>
 *   <Input placeholder="Search" />
 * </InputGroup>
 */
function InputGroup(props: InputGroupProps) {
  const { className, size, children, ref, onMouseDown, ...rest } = props;
  const el = useRef<HTMLDivElement>(null);

  // A group with no control is a styled box that looks like a field and does
  // nothing — the one misuse this component can silently produce. Measured from
  // the committed DOM, because the control may be rendered by a child component
  // this one never sees, and re-measured on any change beneath.
  const [empty, setEmpty] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const node = el.current;
    if (node == null) return;
    const check = () => setEmpty(node.querySelector(CONTROL) == null);
    check();
    const observer = new MutationObserver(check);
    observer.observe(node, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  useDevWarning(
    empty,
    'InputGroup: no control inside — it renders a field-shaped box that nothing can type into.',
  );

  /**
   * Clicking the field anywhere focuses the control, which is what a bare input
   * does and what a user expects of something drawn as one field. Only for clicks
   * that were not already headed somewhere: a decorative slot lets them through
   * (`pointer-events: none`), while a clear button keeps its own.
   */
  function focusControl(event: MouseEvent<HTMLDivElement>) {
    onMouseDown?.(event);
    if (event.defaultPrevented) return;
    if ((event.target as Element).closest(INTERACTIVE) != null) return;
    const control = event.currentTarget.querySelector<HTMLElement>(CONTROL);
    if (control == null) return;
    // Without this the mousedown moves focus to the group's own box first, and
    // the control would take it only to lose it again on mouseup.
    event.preventDefault();
    control.focus();
  }

  return (
    <div
      className={cn(inputGroupVariants({ size }), className)}
      {...rest}
      ref={mergeRefs(el, ref)}
      onMouseDown={focusControl}
    >
      {children}
    </div>
  );
}

export { InputGroup };
