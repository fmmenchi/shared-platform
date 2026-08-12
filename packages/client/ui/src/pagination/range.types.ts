/**
 * One entry in a page range: a page to go to, or the gap where pages were left
 * out. The gap carries an index so React has a stable key for it — there are at
 * most two, and they do not move.
 */
export type PageItem =
  { kind: 'page'; page: number } | { kind: 'gap'; side: 'start' | 'end' };

export interface PageRangeOptions {
  /** How many pages to show on each side of the current one. @default 1 */
  siblingCount?: number;
}
