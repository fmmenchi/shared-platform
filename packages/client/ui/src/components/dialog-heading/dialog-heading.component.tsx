import { SurfaceHeading } from '../../primitives/surface-heading.js';
import { useDialogPart } from '../dialog/dialog.context.js';
import type { DialogHeadingProps } from './dialog-heading.types.js';
import styles from './dialog-heading.module.css';

/**
 * Names the dialog: it registers its own id as the surface's `aria-labelledby`,
 * which is the whole reason it is a part rather than any heading you happen to
 * put inside. An `h2` by default, because only the page knows what level
 * follows the heading above it.
 */
function DialogHeading(props: DialogHeadingProps) {
  const dialog = useDialogPart('DialogHeading');

  return (
    <SurfaceHeading
      {...props}
      register={dialog?.registerHeading}
      className={[styles.heading, props.className].filter(Boolean).join(' ')}
    />
  );
}

export { DialogHeading };
