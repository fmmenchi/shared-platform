import { cn } from '../../util/cn.js';
import { fieldsetContentVariants } from './fieldset-content.variants.js';
import type { FieldsetContentProps } from './fieldset-content.types.js';

/**
 * Lays out the group's controls. It exists because the rendered `<legend>` sits
 * outside the fieldset's own layout box, so a `display: grid|flex` on the
 * `<fieldset>` would never reach it: keeping the controls' layout on this inner
 * element means one `gap` governs them and the legend keeps its own spacing.
 * Content that must NOT sit in that layout (a link, a note) goes beside it,
 * inside the `Fieldset`.
 */
function FieldsetContent(props: FieldsetContentProps) {
  const { className, orientation, ...rest } = props;
  return (
    <div
      className={cn(fieldsetContentVariants({ orientation }), className)}
      {...rest}
    />
  );
}

export { FieldsetContent };
