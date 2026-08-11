import type { ButtonLikeProps } from '../../primitives/button-like.types.js';

export interface TableFilterTriggerProps extends Omit<
  ButtonLikeProps,
  'children' | 'onChange' | 'value'
> {
  /**
   * The column's name IN WORDS. It is what the control is called — "Filter
   * City" — so a reader who lands on the fifth one knows which column it
   * narrows, and it cannot be derived from a `header` that is an icon or a
   * `<Badge>`.
   */
  label: string;
  /** What is applied to this column right now, or `''` when nothing is. */
  value: string;
  /**
   * The reader pressed Apply, or cleared. Receives the whole value, never a
   * keystroke: the editor holds a DRAFT and this is the moment it becomes the
   * view. Filtering as they type deletes rows under them continuously, which is
   * the silent change sorting had at a higher rate, and it leaves the live
   * region nothing discrete to announce.
   */
  onApply: (value: string) => void;
}
