import type { ComponentPropsWithRef } from 'react';

interface ProgressOwnProps {
  /**
   * What is progressing, in a word or two — "Upload", "Import".
   *
   * Required, and not a nicety: a progress bar with no name is announced as
   * "progress bar, 40%" and nothing else, which tells a screen-reader user how
   * far along something they cannot identify is. It is the one thing only you
   * can supply.
   *
   * Pass `aria-labelledby` instead — pointing at text you already show — and it
   * wins: ARIA ranks it above `aria-label` wherever both are present.
   */
  label: string;
  /**
   * How far along, between `0` and `max`.
   *
   * **Omit it for indeterminate** — that is the platform's own rule, not ours:
   * a `<progress>` with no `value` is indeterminate, and both the visual and
   * the announcement follow from it. Passing `0` is a different statement and
   * says the work has not started.
   *
   * Narrowed to a number, where the DOM would also accept a string: a progress
   * value that arrives as `"40"` is a bug in the caller, and the browser
   * silently treats a non-numeric one as indeterminate.
   */
  value?: number;
  /**
   * The value that means finished. Defaults to `1`, which is the platform's
   * default — so `value={0.4}` is 40% with nothing else said. Pass `max={100}`
   * to work in whole percent, or the total bytes to work in bytes.
   */
  max?: number;
}

/**
 * Public Progress props.
 *
 * `children` is omitted deliberately. A `<progress>`'s children are fallback
 * text for browsers without the element, and there are none left; offering the
 * slot would invite a caption that no current engine renders.
 */
export type ProgressProps = ProgressOwnProps &
  Omit<
    ComponentPropsWithRef<'progress'>,
    keyof ProgressOwnProps | 'children' | 'dangerouslySetInnerHTML'
  >;
