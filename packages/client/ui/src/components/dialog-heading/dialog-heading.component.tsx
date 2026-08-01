import { useEffect, useId } from 'react';
import { cn } from '../../util/cn.js';
import { useDialogPart } from '../dialog/dialog.context.js';
import type { DialogHeadingProps } from './dialog-heading.types.js';
import styles from './dialog-heading.module.css';

/**
 * Names the dialog: it registers its own id as the surface's `aria-labelledby`,
 * which is the whole reason it is a part rather than any heading you happen to
 * put inside. The `id` is owned by the part, so the reference can never dangle
 * — one passed here is ignored.
 */
function DialogHeading(props: DialogHeadingProps) {
  const { as, className, children, ...rest } = props;
  const Component = as ?? 'h2';
  const dialog = useDialogPart('DialogHeading');
  const id = useId();

  const register = dialog?.registerHeading;
  useEffect(() => register?.(id), [register, id]);

  return (
    <Component {...rest} id={id} className={cn(styles.heading, className)}>
      {children}
    </Component>
  );
}

export { DialogHeading };
