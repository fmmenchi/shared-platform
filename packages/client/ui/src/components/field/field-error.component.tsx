import { useEffect, useId, useRef } from 'react';
import { cn } from '../../util/cn.js';
import { hasRenderableChildren } from '../../util/renderable-children.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useDescribable } from '../../primitives/describable.js';
import type { FieldErrorProps } from './field.types.js';
import styles from './field.module.css';

/**
 * The field's error message. Renders (and registers into `aria-describedby`)
 * ONLY when it has content, so an empty error neither shows nor points the
 * control at a blank element. The colour is the `error` status role plus normal
 * text weight — paired with the control's own invalid look, and with a rule that
 * restores the distinction under forced colors, the error never rests on colour
 * alone. Announcing a freshly-appeared error is the consumer's job.
 */
function FieldError(props: FieldErrorProps) {
  const { className, children, ref, ...rest } = props;
  const register = useDescribable('FieldError')?.register;
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

export { FieldError };
