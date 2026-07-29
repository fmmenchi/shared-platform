import { useEffect, useId, useRef } from 'react';
import { cn } from '../../util/cn.js';
import { hasRenderableChildren } from '../../util/renderable-children.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useFieldPart } from '../../primitives/context/field.js';
import type { FieldDescriptionProps } from './field.types.js';
import styles from './field.module.css';

/**
 * Helper text for the field. Registers its id into the control's
 * `aria-describedby`, so it is announced with the field. Like the error, it
 * renders only when it has content: an empty `<p>` would take a grid row and
 * point the control at a blank target.
 */
function FieldDescription(props: FieldDescriptionProps) {
  const { className, children, ref, ...rest } = props;
  const register = useFieldPart('FieldDescription')?.register;
  const id = useId();
  const node = useRef<HTMLParagraphElement>(null);
  const hasContent = hasRenderableChildren(children);

  // Registers the NODE as well as the id, so the field can order its description
  // ids by document position rather than by who mounted first.
  useEffect(() => {
    const element = node.current;
    if (!hasContent || element == null) return;
    return register?.(id, element);
  }, [register, id, hasContent]);

  if (!hasContent) return null;
  return (
    <p
      {...rest}
      ref={mergeRefs(node, ref)}
      id={id}
      className={cn(styles.description, className)}
    >
      {children}
    </p>
  );
}

export { FieldDescription };
