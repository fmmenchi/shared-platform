import { useEffect, useId, useRef } from 'react';
import { cn } from '../../util/cn.js';
import { hasRenderableChildren } from '../../util/renderable-children.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useFieldsetPart } from './fieldset.context.js';
import type { FieldsetErrorProps } from './fieldset.types.js';
import styles from './fieldset.module.css';

/**
 * The group's error message. Renders (and registers into the fieldset's
 * `aria-describedby`) ONLY when it has content, so an empty error neither shows
 * nor points the group at a blank element. The colour is the `error` status role,
 * and a rule restores the distinction under forced colors, where the hue is
 * overridden — so the error never rests on colour alone. Announcing a
 * freshly-appeared error is the consumer's job.
 */
function FieldsetError(props: FieldsetErrorProps) {
  const { className, children, ref, ...rest } = props;
  const register = useFieldsetPart('FieldsetError')?.register;
  const id = useId();
  const node = useRef<HTMLParagraphElement>(null);
  const hasContent = hasRenderableChildren(children);

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
      className={cn(styles.error, className)}
    >
      {children}
    </p>
  );
}

export { FieldsetError };
