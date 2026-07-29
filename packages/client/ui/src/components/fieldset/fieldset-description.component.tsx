import { useEffect, useId, useRef } from 'react';
import { cn } from '../../util/cn.js';
import { hasRenderableChildren } from '../../util/renderable-children.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useFieldsetPart } from './fieldset.context.js';
import type { FieldsetDescriptionProps } from './fieldset.types.js';
import styles from './fieldset.module.css';

/**
 * Helper text for the whole group. Registers its id into the fieldset's
 * `aria-describedby`, so it is announced once when the group is entered — not
 * repeated on each control inside. Like the error, it renders only when it has
 * content: an empty `<p>` would take a grid row and put a blank target in the
 * group's description.
 */
function FieldsetDescription(props: FieldsetDescriptionProps) {
  const { className, children, ref, ...rest } = props;
  const register = useFieldsetPart('FieldsetDescription')?.register;
  const id = useId();
  const node = useRef<HTMLParagraphElement>(null);
  const hasContent = hasRenderableChildren(children);

  // Registers the NODE as well as the id, so the group can order its description
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

export { FieldsetDescription };
