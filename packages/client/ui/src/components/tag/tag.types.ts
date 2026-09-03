import type { ComponentPropsWithRef, ReactNode } from 'react';

interface TagOwnProps {
  /**
   * The value this tag stands for — the words on screen.
   *
   * A plain string (or a number) is also what names the remove control:
   * "Remove Milano". Anything richer has no string to put in that sentence, so
   * pass `name` as well.
   */
  children?: ReactNode;
  /**
   * Take this value back. **Required**, and it is the component's whole
   * admission test: a label you cannot remove is a `Badge`, which is
   * presentational and says so. See the Tag page for the boundary.
   *
   * The tag does not remove itself — it has no state to remove from. This is
   * called, the app drops the value, and the tag stops being rendered. What
   * happens to the FOCUS the button was holding is `TagList`'s business.
   */
  onRemove: () => void;
  /**
   * The tag's text, when `children` are not a plain string — an avatar beside a
   * name, a highlighted match. It goes into the remove control's accessible
   * name and is never drawn, so it is not a second label: it is the same label,
   * in the form a sentence can hold.
   *
   * Omit it with rich children and the control falls back to "Remove", with a
   * development warning — eight buttons all called "Remove" is a list a screen
   * reader user cannot navigate.
   */
  name?: string;
}

/**
 * Public Tag props. It renders an `<li>`, because a tag belongs to a set and
 * `TagList` is the set: "list, 3 items" is what a screen reader announces, and
 * it is what tells someone how many filters are on before they walk them.
 */
export type TagProps = TagOwnProps &
  Omit<ComponentPropsWithRef<'li'>, keyof TagOwnProps>;
