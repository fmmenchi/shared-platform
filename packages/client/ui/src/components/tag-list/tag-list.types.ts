import type { ComponentPropsWithRef, ReactNode } from 'react';

interface TagListOwnProps {
  /** The `Tag`s. Anything else is markup a list may not hold. */
  children?: ReactNode;
  /**
   * What this set of tags IS — "Active filters", "Selected cities".
   *
   * Optional, unlike `Nav`'s and `SidePanel`'s: a list is not a landmark, so an
   * unnamed one is not offered in a list of things all called the same word.
   * Pass it whenever a page holds two of these, and prefer `aria-labelledby`
   * pointing at a heading the reader can already see.
   */
  label?: string;
}

/**
 * Public TagList props. It renders a `<ul>`: the tags are a set, and how many
 * there are is the first thing a screen reader user needs — "list, 3 items",
 * before walking them.
 */
export type TagListProps = TagListOwnProps &
  Omit<ComponentPropsWithRef<'ul'>, keyof TagListOwnProps>;
